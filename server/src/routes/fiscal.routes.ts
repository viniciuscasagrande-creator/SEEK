import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

const router = Router();

// 1. GET /api/fiscal/taxes - Lista Obrigações Tributárias e Apuração
router.get('/taxes', (req: Request, res: Response) => {
  try {
    const { period, status } = req.query;
    let query = 'SELECT * FROM tax_obligations';
    const params: any[] = [];

    if (period) {
      query += ' WHERE period = ?';
      params.push(period);
    }

    if (status) {
      query += (params.length ? ' AND' : ' WHERE') + ' status = ?';
      params.push(status);
    }

    query += ' ORDER BY due_date ASC';

    const obligations = db.prepare(query).all(...params) as any[];

    const totalPendente = obligations
      .filter(o => o.status === 'PENDENTE' || o.status === 'CALCULADO')
      .reduce((acc, o) => acc + (o.tax_amount || 0), 0);

    const totalPago = obligations
      .filter(o => o.status === 'PAGO')
      .reduce((acc, o) => acc + (o.tax_amount || 0), 0);

    res.json({
      success: true,
      obligations,
      summary: {
        totalPendente,
        totalPago,
        count: obligations.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
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

// 3. POST /api/fiscal/pay-tax - Baixa / Recolhimento de Guia Fiscal com Integração Contábil & Financeira
router.post('/pay-tax', (req: Request, res: Response) => {
  try {
    const { obligationId, paymentMethod = 'Débito em Conta C/C Bradesco', userName, userRole } = req.body;

    if (!obligationId) {
      return res.status(400).json({ success: false, message: 'ID da obrigação fiscal é obrigatório.' });
    }

    const obligation = db.prepare('SELECT * FROM tax_obligations WHERE id = ?').get(obligationId) as any;
    if (!obligation) {
      return res.status(404).json({ success: false, message: 'Obrigação fiscal não encontrada.' });
    }

    if (obligation.status === 'PAGO') {
      return res.status(400).json({ success: false, message: 'Esta obrigação fiscal já foi liquidada.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const today = now.substring(0, 10);
    const period = today.substring(0, 7);

    const payTx = db.transaction(() => {
      // 1. Atualiza guia tributária para PAGO
      db.prepare(`
        UPDATE tax_obligations
        SET status = 'PAGO', payment_date = ?
        WHERE id = ?
      `).run(now, obligationId);

      // 2. Cria lançamento contábil automático por partidas dobradas
      // Débito: 2.01.03.001 (Impostos Federais) ou 2.01.03.002 (ISS)
      // Crédito: 1.01.01.001 (Banco Bradesco C/C)
      const debitAccount = obligation.tax_type === 'ISS' ? '2.01.03.002' : '2.01.03.001';
      const creditAccount = '1.01.01.001';
      const entryId = `entry-${Date.now()}`;
      const entryCode = `LAN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      db.prepare(`
        INSERT INTO accounting_entries (id, code, date, period, description, debit_account_code, credit_account_code, amount, cost_center, origin_type, origin_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'FINANCEIRO', ?, ?)
      `).run(
        entryId,
        entryCode,
        today,
        period,
        `Recolhimento tributário guia ${obligation.code} (${obligation.tax_type})`,
        debitAccount,
        creditAccount,
        obligation.tax_amount,
        'Administrativo & Recursos Humanos',
        obligation.id,
        userName || 'Camila Zanin'
      );

      // Atualiza saldos contábeis
      db.prepare('UPDATE chart_of_accounts SET balance = balance - ? WHERE code = ?').run(obligation.tax_amount, debitAccount);
      db.prepare('UPDATE chart_of_accounts SET balance = balance - ? WHERE code = ?').run(obligation.tax_amount, creditAccount);
    });

    payTx();

    logAudit(
      userName || 'Camila Zanin',
      userRole || 'Especialista Fiscal',
      'APPROVE',
      'Fiscal',
      obligation.code,
      `Recolhimento efetuado para guia fiscal ${obligation.code} (${obligation.tax_type}) no valor de R$ ${obligation.tax_amount.toFixed(2)}.`
    );

    res.json({
      success: true,
      message: `Guia ${obligation.code} liquidada com sucesso e integrada à Contabilidade e Financeiro!`,
      obligationId
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
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
      description,
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
