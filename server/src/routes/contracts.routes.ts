import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const contractsRouter = Router();

// Lista todos os contratos com recálculo dinâmico de dias restantes
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
      const end = new Date(c.end_date);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysRemaining = diffDays > 0 ? diffDays : 0;
      let calculatedStatus = c.status;
      if (c.status !== 'RESCINDIDO') {
        if (daysRemaining <= 30) calculatedStatus = 'VENCENDO';
        else calculatedStatus = 'VIGENTE';
      }

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
        signedDate: c.signed_date
      };
    });

    const totalMonthlyBilling = contracts.reduce((acc, c) => acc + c.monthlyValue, 0);

    return res.json({
      total: contracts.length,
      totalMonthlyBilling,
      contracts
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Alertas de vencimento para governança
contractsRouter.get('/alerts', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM contracts WHERE status != 'RESCINDIDO' ORDER BY end_date ASC").all() as any[];
    const today = new Date();

    const alerts30: any[] = [];
    const alerts60: any[] = [];
    const alerts90: any[] = [];

    for (const c of rows) {
      const diffDays = Math.ceil((new Date(c.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const formatted = { ...c, daysRemaining: diffDays > 0 ? diffDays : 0 };
      if (diffDays <= 30) alerts30.push(formatted);
      else if (diffDays <= 60) alerts60.push(formatted);
      else if (diffDays <= 90) alerts90.push(formatted);
    }

    return res.json({
      within30Days: alerts30,
      within60Days: alerts60,
      within90Days: alerts90,
      totalAlerts: alerts30.length + alerts60.length + alerts90.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro de novo contrato corporativo
contractsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { partyName, type, monthlyValue, startDate, endDate, readjustmentIndex, userName, userRole } = req.body;

    if (!partyName || !monthlyValue || !startDate || !endDate) {
      return res.status(400).json({ error: 'Campos obrigatórios: partyName, monthlyValue, startDate, endDate.' });
    }

    const id = `ct-${Date.now()}`;
    const contractNumber = `CT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedValue = parseFloat(monthlyValue);
    const index = readjustmentIndex || 'IPCA';
    const contractType = type || 'CLIENTE';

    const diffDays = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    db.prepare(`
      INSERT INTO contracts (id, contract_number, party_name, type, monthly_value, start_date, end_date, days_remaining, readjustment_index, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'VIGENTE')
    `).run(id, contractNumber, partyName, contractType, parsedValue, startDate, endDate, diffDays > 0 ? diffDays : 0, index);

    logAudit(
      userName || 'Departamento Jurídico',
      userRole || 'Jurídico',
      'CREATE',
      'Contratos & Jurídico',
      `Contrato ${contractNumber}`,
      `Cadastrado contrato com ${partyName} no valor mensal de R$ ${parsedValue.toFixed(2)} (Índice: ${index})`,
      req.ip || '189.44.120.10'
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
        daysRemaining: diffDays,
        readjustmentIndex: index,
        status: 'VIGENTE'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Aplicação de reajuste contratual (ex: IPCA 4.2%)
contractsRouter.post('/:id/readjust', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { percentage, indexName, userName, userRole } = req.body;

    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as any;
    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado.' });
    }

    const rate = parseFloat(percentage);
    const oldValue = contract.monthly_value;
    const newValue = oldValue * (1 + rate / 100);

    db.prepare(`
      UPDATE contracts
      SET monthly_value = ?, readjustment_index = ?
      WHERE id = ?
    `).run(newValue, indexName || contract.readjustment_index, id);

    logAudit(
      userName || 'Controladoria & Jurídico',
      userRole || 'Jurídico',
      'UPDATE',
      'Contratos & Jurídico',
      `Contrato ${contract.contract_number}`,
      `Reajuste de ${rate.toFixed(2)}% (${indexName || contract.readjustment_index}) aplicado. De R$ ${oldValue.toFixed(2)} para R$ ${newValue.toFixed(2)}`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      contractNumber: contract.contract_number,
      oldMonthlyValue: oldValue,
      newMonthlyValue: newValue,
      percentage: rate
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Renovação de contrato
contractsRouter.post('/:id/renew', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { months, userName, userRole } = req.body;

    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as any;
    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado.' });
    }

    const additionalMonths = parseInt(months) || 12;
    const currentEnd = new Date(contract.end_date);
    currentEnd.setMonth(currentEnd.getMonth() + additionalMonths);
    const newEndDate = currentEnd.toISOString().substring(0, 10);

    const diffDays = Math.ceil((currentEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    db.prepare(`
      UPDATE contracts
      SET end_date = ?, days_remaining = ?, status = 'VIGENTE'
      WHERE id = ?
    `).run(newEndDate, diffDays, id);

    logAudit(
      userName || 'Gestão de Contratos',
      userRole || 'Jurídico',
      'UPDATE',
      'Contratos & Jurídico',
      `Contrato ${contract.contract_number}`,
      `Renovado por mais ${additionalMonths} meses. Novo vencimento: ${newEndDate}`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      contractNumber: contract.contract_number,
      newEndDate,
      daysRemaining: diffDays,
      status: 'VIGENTE'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
