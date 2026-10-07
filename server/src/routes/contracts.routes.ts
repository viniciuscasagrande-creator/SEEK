import { Router, Request, Response } from 'express';
import { db, logAudit, createCorporateNotification } from '../db.js';
import { financeService } from '../services/finance.service.js';

export const contractsRouter = Router();

function nextDueDate(paymentDay: number, fromDate = new Date()): string {
  const y = fromDate.getFullYear();
  const m = fromDate.getMonth();
  let d = new Date(y, m, Math.min(Math.max(paymentDay, 1), 28));
  if (d < new Date(fromDate.toDateString())) d = new Date(y, m + 1, Math.min(Math.max(paymentDay, 1), 28));
  return d.toISOString().slice(0, 10);
}

function competenceFromDate(date: string) {
  return date.slice(0, 7);
}

contractsRouter.get('/', (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;
    let query = 'SELECT * FROM contracts WHERE 1=1';
    const params: any[] = [];
    if (type && type !== 'ALL') {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY end_date ASC';
    const rows = db.prepare(query).all(...params) as any[];
    const today = new Date();
    const contracts = rows.map(c => {
      const diffDays = Math.ceil((new Date(c.end_date).getTime() - today.getTime()) / 86400000);
      const daysRemaining = Math.max(diffDays, 0);
      let calculatedStatus = c.status;
      if (c.status !== 'RESCINDIDO') {
        calculatedStatus = daysRemaining <= 30 ? 'VENCENDO' : 'VIGENTE';
      }
      const pending = db.prepare("SELECT COUNT(*) count, COALESCE(SUM(amount),0) amount FROM contract_obligations WHERE contract_id=? AND status!='PAGO'").get(c.id) as any;
      return {
        id: c.id,
        contractNumber: c.contract_number,
        partyName: c.party_name,
        type: c.type,
        monthlyValue: c.monthly_value,
        startDate: c.start_date,
        endDate: c.end_date,
        daysRemaining,
        readjustmentIndex: c.readjustment_index,
        status: calculatedStatus,
        signedDate: c.signed_date,
        costCenter: c.cost_center || 'Administrativo & Operações',
        paymentDay: c.payment_day || 10,
        recurrence: c.recurrence || 'MENSAL',
        financialEnabled: Boolean(c.financial_enabled),
        nextDueDate: c.next_due_date || null,
        pendingObligations: pending?.count || 0,
        pendingAmount: pending?.amount || 0
      };
    });
    return res.json({ total: contracts.length, totalMonthlyBilling: contracts.reduce((a, c) => a + c.monthlyValue, 0), contracts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

contractsRouter.get('/alerts', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM contracts WHERE status!='RESCINDIDO' ORDER BY end_date ASC").all() as any[];
    const today = new Date();
    const a30: any[] = [];
    const a60: any[] = [];
    const a90: any[] = [];
    for (const c of rows) {
      const d = Math.ceil((new Date(c.end_date).getTime() - today.getTime()) / 86400000);
      const f = { ...c, daysRemaining: Math.max(d, 0) };
      if (d <= 30) a30.push(f);
      else if (d <= 60) a60.push(f);
      else if (d <= 90) a90.push(f);
    }
    return res.json({ within30Days: a30, within60Days: a60, within90Days: a90, totalAlerts: a30.length + a60.length + a90.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

contractsRouter.get('/obligations', (req: Request, res: Response) => {
  try {
    const contractId = req.query.contractId as string | undefined;
    const rows = db.prepare(`SELECT o.*, c.contract_number, c.party_name, f.code financial_code, f.status financial_status
      FROM contract_obligations o JOIN contracts c ON c.id=o.contract_id
      LEFT JOIN financial_records f ON f.id=o.financial_record_id
      ${contractId ? 'WHERE o.contract_id=?' : ''} ORDER BY o.due_date DESC`).all(...(contractId ? [contractId] : []));
    return res.json({ obligations: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

contractsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { partyName, type, monthlyValue, startDate, endDate, readjustmentIndex, costCenter, paymentDay, recurrence, financialEnabled, userName, userRole } = req.body;
    if (!partyName || !monthlyValue || !startDate || !endDate) {
      return res.status(400).json({ error: 'Campos obrigatórios: partyName, monthlyValue, startDate, endDate.' });
    }
    const id = `ct-${Date.now()}`;
    const contractNumber = `CT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedValue = parseFloat(monthlyValue);
    const index = readjustmentIndex || 'IPCA';
    const contractType = type || 'CLIENTE';
    const pday = Math.min(Math.max(parseInt(paymentDay) || 10, 1), 28);
    const enabled = Boolean(financialEnabled) && contractType !== 'CLIENTE';
    const due = enabled ? nextDueDate(pday, new Date(startDate)) : null;
    const diffDays = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);

    db.prepare(`INSERT INTO contracts (id,contract_number,party_name,type,monthly_value,start_date,end_date,days_remaining,readjustment_index,status,cost_center,payment_day,recurrence,financial_enabled,next_due_date)
      VALUES(?,?,?,?,?,?,?,?,?,'VIGENTE',?,?,?,?,?)`).run(
      id, contractNumber, partyName, contractType, parsedValue, startDate, endDate,
      Math.max(diffDays, 0), index, costCenter || 'Administrativo & Operações', pday, recurrence || 'MENSAL', enabled ? 1 : 0, due
    );

    logAudit(
      userName || 'Gestão de Contratos',
      userRole || 'Jurídico',
      'CREATE',
      'Contratos & Jurídico',
      `Contrato ${contractNumber}`,
      `Contrato com ${partyName}; R$ ${parsedValue.toFixed(2)}/mês; financeiro recorrente ${enabled ? 'habilitado' : 'desabilitado'}.`,
      req.ip || '127.0.0.1'
    );

    return res.status(201).json({
      success: true,
      contract: {
        id,
        contractNumber,
        partyName,
        type: contractType,
        monthlyValue: parsedValue,
        startDate,
        endDate,
        daysRemaining: Math.max(diffDays, 0),
        readjustmentIndex: index,
        status: 'VIGENTE',
        costCenter: costCenter || 'Administrativo & Operações',
        paymentDay: pday,
        recurrence: recurrence || 'MENSAL',
        financialEnabled: enabled,
        nextDueDate: due
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

contractsRouter.post('/:id/generate-obligation', (req: Request, res: Response) => {
  try {
    const c = db.prepare('SELECT * FROM contracts WHERE id=?').get(req.params.id) as any;
    if (!c) return res.status(404).json({ error: 'Contrato não encontrado.' });
    if (c.type === 'CLIENTE') return res.status(422).json({ error: 'Esta fase gera Contas a Pagar para contratos de fornecedor/prestador/locação.' });
    if (!c.financial_enabled) return res.status(422).json({ error: 'Geração financeira recorrente não está habilitada neste contrato.' });

    const dueDate = req.body.dueDate || c.next_due_date || nextDueDate(c.payment_day || 10);
    const competence = req.body.competence || competenceFromDate(dueDate);
    const existing = db.prepare('SELECT * FROM contract_obligations WHERE contract_id=? AND competence=?').get(c.id, competence) as any;
    if (existing) return res.status(409).json({ error: `Obrigação ${competence} já gerada para este contrato.`, obligation: existing });

    const obligationId = `cob-${c.id}-${competence}`;
    const operator = req.body.userName || 'Gestão de Contratos';
    let record: any;

    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO contract_obligations(id,contract_id,competence,due_date,amount,status) VALUES(?,?,?,?,?,'GERADA')`).run(
        obligationId, c.id, competence, dueDate, c.monthly_value
      );
      record = financeService.createRecord({
        type: 'PAGAR',
        title: `Contrato ${c.contract_number} — ${competence}`,
        entityName: c.party_name,
        costCenter: c.cost_center || 'Administrativo & Operações',
        category: 'Contratos recorrentes',
        amount: c.monthly_value,
        dueDate,
        paymentMethod: 'PIX',
        originType: 'CONTRATO',
        originId: obligationId,
        userName: operator,
        userRole: req.body.userRole || 'Contratos'
      }, undefined, req.ip || '127.0.0.1');

      db.prepare('UPDATE contract_obligations SET financial_record_id=? WHERE id=?').run(record.id, obligationId);
      const next = new Date(dueDate + 'T12:00:00');
      next.setMonth(next.getMonth() + 1);
      const nd = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(Math.min(c.payment_day || 10, 28)).padStart(2, '0')}`;
      db.prepare('UPDATE contracts SET next_due_date=? WHERE id=?').run(nd, c.id);
    });
    tx();

    logAudit(
      operator,
      req.body.userRole || 'Contratos',
      'CREATE',
      'Contratos & Jurídico',
      `Obrigação ${c.contract_number}/${competence}`,
      `Obrigação recorrente enviada ao Financeiro: ${record.code}, R$ ${Number(c.monthly_value).toFixed(2)}, vencimento ${dueDate}.`,
      req.ip || '127.0.0.1'
    );

    createCorporateNotification({
      title: 'Contrato gerou obrigação financeira',
      message: `${c.contract_number} — ${c.party_name}: ${record.code} no valor de R$ ${Number(c.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, vencimento ${dueDate}.`,
      type: 'FINANCE',
      linkRoute: 'finance-payables'
    });

    return res.status(201).json({
      success: true,
      obligation: db.prepare('SELECT * FROM contract_obligations WHERE id=?').get(obligationId),
      financialRecord: record
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

contractsRouter.post('/generate-due/batch', (req: Request, res: Response) => {
  try {
    const today = (req.body.referenceDate || new Date().toISOString().slice(0, 10)) as string;
    const contracts = db.prepare("SELECT * FROM contracts WHERE financial_enabled=1 AND status!='RESCINDIDO' AND next_due_date IS NOT NULL AND next_due_date<=?").all(today) as any[];
    const generated: any[] = [];
    const skipped: any[] = [];

    for (const c of contracts) {
      const competence = competenceFromDate(c.next_due_date);
      const exists = db.prepare('SELECT id FROM contract_obligations WHERE contract_id=? AND competence=?').get(c.id, competence);
      if (exists) {
        skipped.push(c.contract_number);
        continue;
      }
      const oid = `cob-${c.id}-${competence}`;
      db.prepare(`INSERT INTO contract_obligations(id,contract_id,competence,due_date,amount,status) VALUES(?,?,?,?,?,'GERADA')`).run(
        oid, c.id, competence, c.next_due_date, c.monthly_value
      );
      const fr = financeService.createRecord({
        type: 'PAGAR',
        title: `Contrato ${c.contract_number} — ${competence}`,
        entityName: c.party_name,
        costCenter: c.cost_center || 'Administrativo & Operações',
        category: 'Contratos recorrentes',
        amount: c.monthly_value,
        dueDate: c.next_due_date,
        paymentMethod: 'PIX',
        originType: 'CONTRATO',
        originId: oid,
        userName: req.body.userName || 'Job Contratos',
        userRole: 'Sistema'
      }, undefined, req.ip || '127.0.0.1');

      db.prepare('UPDATE contract_obligations SET financial_record_id=? WHERE id=?').run(fr.id, oid);
      const n = new Date(c.next_due_date + 'T12:00:00');
      n.setMonth(n.getMonth() + 1);
      const nd = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(Math.min(c.payment_day || 10, 28)).padStart(2, '0')}`;
      db.prepare('UPDATE contracts SET next_due_date=? WHERE id=?').run(nd, c.id);
      generated.push({ contract: c.contract_number, financialCode: fr.code, competence });
    }
    return res.json({ success: true, generated, skipped });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

contractsRouter.post('/:id/readjust', (req: Request, res: Response) => {
  try {
    const c = db.prepare('SELECT * FROM contracts WHERE id=?').get(req.params.id) as any;
    if (!c) return res.status(404).json({ error: 'Contrato não encontrado.' });
    const rate = parseFloat(req.body.percentage);
    const oldValue = c.monthly_value;
    const newValue = oldValue * (1 + rate / 100);
    db.prepare('UPDATE contracts SET monthly_value=?,readjustment_index=? WHERE id=?').run(newValue, req.body.indexName || c.readjustment_index, c.id);
    logAudit(
      req.body.userName || 'Controladoria & Jurídico',
      req.body.userRole || 'Jurídico',
      'UPDATE',
      'Contratos & Jurídico',
      `Contrato ${c.contract_number}`,
      `Reajuste de ${rate.toFixed(2)}%. De R$ ${oldValue.toFixed(2)} para R$ ${newValue.toFixed(2)}.`,
      req.ip || '127.0.0.1'
    );
    return res.json({ success: true, contractNumber: c.contract_number, oldMonthlyValue: oldValue, newMonthlyValue: newValue, percentage: rate });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

contractsRouter.post('/:id/renew', (req: Request, res: Response) => {
  try {
    const c = db.prepare('SELECT * FROM contracts WHERE id=?').get(req.params.id) as any;
    if (!c) return res.status(404).json({ error: 'Contrato não encontrado.' });
    const months = parseInt(req.body.months) || 12;
    const end = new Date(c.end_date);
    end.setMonth(end.getMonth() + months);
    const newEndDate = end.toISOString().slice(0, 10);
    const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
    db.prepare("UPDATE contracts SET end_date=?,days_remaining=?,status='VIGENTE' WHERE id=?").run(newEndDate, days, c.id);
    logAudit(
      req.body.userName || 'Gestão de Contratos',
      req.body.userRole || 'Jurídico',
      'UPDATE',
      'Contratos & Jurídico',
      `Contrato ${c.contract_number}`,
      `Renovado por ${months} meses. Novo vencimento: ${newEndDate}.`,
      req.ip || '127.0.0.1'
    );
    return res.json({ success: true, contractNumber: c.contract_number, newEndDate, daysRemaining: days, status: 'VIGENTE' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
