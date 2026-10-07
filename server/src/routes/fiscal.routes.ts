import { Router, Request, Response } from 'express';
import { db, logAudit, createCorporateNotification } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { financeService } from '../services/finance.service.js';

const router = Router();

// 1. GET /api/fiscal/taxes - Obrigações tributárias com rastreabilidade financeira
router.get('/taxes', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { period, status } = req.query;
    const companyId = (req.query.companyId as string) || authReq.companyId || authReq.user?.companyId;
    let query = `
      SELECT t.*,
        f.code AS financial_code,
        f.status AS financial_status,
        f.payment_date AS financial_payment_date,
        f.bank_name AS financial_bank_name
      FROM tax_obligations t
      LEFT JOIN financial_records f ON f.id = t.financial_record_id
      WHERE 1=1`;
    const params: any[] = [];

    if (companyId) { query += ' AND COALESCE(t.company_id, ?) = ?'; params.push(companyId, companyId); }
    if (period) { query += ' AND t.period = ?'; params.push(period); }
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    query += ' ORDER BY t.due_date ASC';

    const obligations = db.prepare(query).all(...params) as any[];
    const totalPendente = obligations
      .filter(o => o.status !== 'PAGO')
      .reduce((acc, o) => acc + (o.tax_amount || 0), 0);
    const totalPago = obligations
      .filter(o => o.status === 'PAGO')
      .reduce((acc, o) => acc + (o.tax_amount || 0), 0);
    const enviadosFinanceiro = obligations.filter(o => Boolean(o.financial_record_id) && o.status !== 'PAGO').length;

    res.json({ success: true, obligations, summary: { totalPendente, totalPago, count: obligations.length, enviadosFinanceiro } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1.1 POST /api/fiscal/taxes/:id/send-finance - Fiscal gera obrigação; Financeiro executa o pagamento
router.post('/taxes/:id/send-finance', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const obligationId = req.params.id as string;
    const obligation = db.prepare('SELECT * FROM tax_obligations WHERE id = ?').get(obligationId) as any;
    if (!obligation) return res.status(404).json({ success: false, message: 'Obrigação fiscal não encontrada.' });
    if (obligation.status === 'PAGO') return res.status(409).json({ success: false, message: 'Obrigação fiscal já liquidada.' });

    if (obligation.financial_record_id) {
      const existing = db.prepare('SELECT * FROM financial_records WHERE id = ?').get(obligation.financial_record_id) as any;
      if (existing) return res.json({ success: true, reused: true, message: `Obrigação já enviada ao Financeiro como ${existing.code}.`, financialRecord: existing });
    }

    const existingByOrigin = db.prepare("SELECT * FROM financial_records WHERE origin_type='FISCAL' AND origin_id=?").get(obligation.id) as any;
    if (existingByOrigin) {
      db.prepare(`UPDATE tax_obligations SET financial_record_id=?, sent_to_finance_at=COALESCE(sent_to_finance_at, CURRENT_TIMESTAMP) WHERE id=?`)
        .run(existingByOrigin.id, obligation.id);
      return res.json({ success: true, reused: true, message: `Título fiscal existente ${existingByOrigin.code} foi vinculado à obrigação.`, financialRecord: existingByOrigin });
    }

    const operator = authReq.user?.fullName || req.body.userName || 'Especialista Fiscal';
    const operatorRole = authReq.user?.roleTitle || req.body.userRole || 'Fiscal';
    const entityName = obligation.entity_name || (obligation.tax_type === 'ISS' ? 'Município / Secretaria de Finanças' : 'Receita Federal / Órgão Arrecadador');
    const category = `Tributos — ${obligation.tax_type}`;

    const tx = db.transaction(() => {
      const financialRecord = financeService.createRecord({
        type: 'PAGAR',
        title: `${obligation.tax_type} — competência ${obligation.period} — ${obligation.code}`,
        entityName,
        costCenter: obligation.cost_center || 'Administrativo & Fiscal',
        category,
        amount: obligation.tax_amount,
        dueDate: obligation.due_date,
        paymentMethod: 'GUIA / DÉBITO BANCÁRIO',
        originType: 'FISCAL',
        originId: obligation.id,
        companyId: obligation.company_id || authReq.user?.companyId || 'comp-1',
        userName: operator,
        userRole: operatorRole
      }, authReq.user, req.ip || '127.0.0.1');

      db.prepare(`
        UPDATE tax_obligations
        SET financial_record_id=?, status='CALCULADO', sent_to_finance_at=?, sent_to_finance_by=?
        WHERE id=?
      `).run(financialRecord.id, new Date().toISOString(), operator, obligation.id);

      return financialRecord;
    });

    const financialRecord = tx();
    createCorporateNotification({
      title: 'Imposto aguardando pagamento',
      message: `${obligation.code} — ${obligation.tax_type} no valor de R$ ${Number(obligation.tax_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, vencimento ${obligation.due_date}.`,
      type: 'FINANCE',
      linkRoute: 'finance-payables'
    });
    logAudit(operator, operatorRole, 'SEND_TO_FINANCE', 'Fiscal', obligation.code, `Obrigação ${obligation.tax_type} enviada ao Financeiro. Título ${financialRecord.code}, R$ ${Number(obligation.tax_amount).toFixed(2)}, vencimento ${obligation.due_date}.`, req.ip || '127.0.0.1', authReq.correlationId);

    return res.status(201).json({ success: true, message: `Obrigação ${obligation.code} enviada ao Financeiro como ${financialRecord.code}.`, financialRecord });
  } catch (error: any) {
    const status = error.statusCode || (String(error.message).includes('UNIQUE') ? 409 : 500);
    return res.status(status).json({ success: false, message: error.message });
  }
});

// 2. POST /api/fiscal/calculate - Calculadora Fiscal de Retenções na Fonte e Impostos
router.post('/calculate', (req: Request, res: Response) => {
  try {
    const { baseAmount, issRate = 5.0 } = req.body;
    const base = parseFloat(baseAmount) || 0;

    const iss = (base * Number(issRate)) / 100;
    const pis = (base * 0.65) / 100;
    const cofins = (base * 3.0) / 100;
    const irpj = (base * 1.5) / 100;
    const csll = (base * 1.0) / 100;
    const retencoesFederais = pis + cofins + irpj + csll;
    const totalImpostos = iss + retencoesFederais;
    const valorLiquido = base - totalImpostos;

    res.json({
      success: true,
      calculation: {
        baseAmount: base,
        issRate: Number(issRate),
        issAmount: iss,
        pisAmount: pis,
        cofinsAmount: cofins,
        irpjAmount: irpj,
        csllAmount: csll,
        retencoesFederais,
        totalImpostos,
        valorLiquido,
        aliquotaEfetivaPercent: base > 0 ? ((totalImpostos / base) * 100).toFixed(2) : '0.00'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/fiscal/pay-tax - Compatibilidade: pagamento deve ocorrer no Financeiro
router.post('/pay-tax', (req: Request, res: Response) => {
  try {
    const { obligationId } = req.body;
    if (!obligationId) return res.status(400).json({ success: false, message: 'ID da obrigação fiscal é obrigatório.' });
    const obligation = db.prepare(`
      SELECT t.*, f.code AS financial_code, f.status AS financial_status
      FROM tax_obligations t
      LEFT JOIN financial_records f ON f.id=t.financial_record_id
      WHERE t.id=?
    `).get(obligationId) as any;
    if (!obligation) return res.status(404).json({ success: false, message: 'Obrigação fiscal não encontrada.' });
    if (obligation.status === 'PAGO') return res.status(409).json({ success: false, message: 'Esta obrigação fiscal já foi liquidada.' });
    if (!obligation.financial_record_id) {
      return res.status(409).json({ success: false, code: 'SEND_TO_FINANCE_REQUIRED', message: 'Envie primeiro a obrigação ao Financeiro. A liquidação fiscal não é executada diretamente pelo módulo Fiscal.' });
    }
    return res.status(409).json({
      success: false,
      code: 'PAY_IN_FINANCE',
      message: `O título ${obligation.financial_code || obligation.financial_record_id} deve ser liquidado em Financeiro > Contas a Pagar. O status retornará automaticamente ao Fiscal.`,
      financialRecordId: obligation.financial_record_id
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. GET /api/fiscal/calendar - Calendário de Compliance Tributário
router.get('/calendar', (req: Request, res: Response) => {
  try {
    const calendar = [
      {
        id: 'cal-01',
        title: 'DARF Consolidado - Tributos Federais (PIS/COFINS/CSLL/IRPJ)',
        frequency: 'Mensal',
        dueDate: '2026-10-20',
        obligationType: 'PRINCIPAL',
        responsibleAgency: 'Receita Federal do Brasil (RFB)',
        status: 'EM_ANDAMENTO',
        urgency: 'ALTA'
      },
      {
        id: 'cal-02',
        title: 'ISSQN Próprio & Retido - Prefeitura Municipal de Curitiba',
        frequency: 'Mensal',
        dueDate: '2026-10-10',
        obligationType: 'PRINCIPAL',
        responsibleAgency: 'Secretaria Municipal de Finanças (SMFI)',
        status: 'PENDENTE',
        urgency: 'CRITICA'
      },
      {
        id: 'cal-03',
        title: 'DCTFWeb e Transmissão EFD-Reinf Competência 09/2026',
        frequency: 'Mensal',
        dueDate: '2026-10-15',
        obligationType: 'ACESSORIA',
        responsibleAgency: 'SPED / RFB',
        status: 'PRONTO_ENVIO',
        urgency: 'ALTA'
      },
      {
        id: 'cal-04',
        title: 'Guia Previdenciária INSS / FGTS Digital',
        frequency: 'Mensal',
        dueDate: '2026-10-07',
        obligationType: 'PRINCIPAL',
        responsibleAgency: 'Caixa Econômica / Previdência',
        status: 'LIQUIDADO',
        urgency: 'CONCLUIDA'
      },
      {
        id: 'cal-05',
        title: 'EFD-Contribuições (PIS/COFINS Bloco A/C/M)',
        frequency: 'Mensal',
        dueDate: '2026-10-14',
        obligationType: 'ACESSORIA',
        responsibleAgency: 'SPED Contábil',
        status: 'EM_ANDAMENTO',
        urgency: 'MEDIA'
      }
    ];

    res.json({ success: true, calendar });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. GET /api/fiscal/invoices - Consulta de Documentos Fiscais (NFS-e / NF-e)
router.get('/invoices', (req: Request, res: Response) => {
  try {
    const { type, search } = req.query;
    let query = 'SELECT * FROM fiscal_invoices';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    if (search) {
      const clause = params.length ? ' AND' : ' WHERE';
      query += `${clause} (number LIKE ? OR entity_name LIKE ? OR document_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY issue_date DESC, created_at DESC';

    const invoices = db.prepare(query).all(...params);
    res.json({ success: true, invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. POST /api/fiscal/invoices - Emissão de NFS-e com Cálculo Automático de Retenções
router.post('/invoices', (req: Request, res: Response) => {
  try {
    const {
      entity_name,
      document_number,
      total_amount,
      iss_rate = 5.0,
      userName,
      userRole
    } = req.body;

    const total = parseFloat(total_amount);
    if (!total || total <= 0) {
      return res.status(400).json({ success: false, message: 'Valor total da nota fiscal deve ser maior que zero.' });
    }

    if (!entity_name || !document_number) {
      return res.status(400).json({ success: false, message: 'Tomador do serviço e CNPJ são obrigatórios.' });
    }

    // Calcula retenções na fonte
    const iss_amount = (total * Number(iss_rate)) / 100;
    const pis_amount = (total * 0.65) / 100;
    const cofins_amount = (total * 3.0) / 100;
    const irrf_amount = (total * 1.5) / 100;
    const csll_amount = (total * 1.0) / 100;
    const net_amount = total - (iss_amount + pis_amount + cofins_amount + irrf_amount + csll_amount);

    const countRes = db.prepare("SELECT COUNT(*) as count FROM fiscal_invoices WHERE type = 'EMITIDA'").get() as { count: number };
    const nextNumber = `NFS-2026-${String(150 + countRes.count).padStart(4, '0')}`;
    const id = `nfe-${Date.now()}`;
    const today = new Date().toISOString().substring(0, 10);
    const xmlKey = `412610${document_number.replace(/\D/g, '').padEnd(14, '0')}55001000${String(Date.now()).slice(-8)}`;

    db.prepare(`
      INSERT INTO fiscal_invoices (id, number, series, type, entity_name, document_number, total_amount, iss_amount, pis_amount, cofins_amount, irrf_amount, csll_amount, net_amount, issue_date, status, xml_key)
      VALUES (?, ?, '1', 'EMITIDA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AUTORIZADA', ?)
    `).run(
      id,
      nextNumber,
      entity_name,
      document_number,
      total,
      iss_amount,
      pis_amount,
      cofins_amount,
      irrf_amount,
      csll_amount,
      net_amount,
      today,
      xmlKey
    );

    logAudit(
      userName || 'Camila Zanin',
      userRole || 'Especialista Fiscal',
      'CREATE',
      'Fiscal',
      nextNumber,
      `Emissão de NFS-e ${nextNumber} para ${entity_name}: Bruto R$ ${total.toFixed(2)}, Líquido R$ ${net_amount.toFixed(2)}.`
    );

    res.status(201).json({
      success: true,
      message: `NFS-e ${nextNumber} emitida e homologada com sucesso! Chave: ${xmlKey}`,
      invoice: {
        id,
        number: nextNumber,
        net_amount,
        xml_key: xmlKey
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
