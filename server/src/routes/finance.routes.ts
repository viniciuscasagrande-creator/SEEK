import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const financeRouter = Router();

financeRouter.get('/records', (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;
    let query = 'SELECT * FROM financial_records WHERE 1=1';
    const params: any[] = [];

    if (type && type !== 'ALL') {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY due_date ASC';
    const rows = db.prepare(query).all(...params) as any[];

    const records = rows.map(r => ({
      id: r.id,
      companyId: r.company_id,
      code: r.code,
      type: r.type,
      title: r.title,
      entityName: r.entity_name,
      costCenter: r.cost_center,
      category: r.category,
      amount: r.amount,
      dueDate: r.due_date,
      paymentDate: r.payment_date,
      status: r.status,
      paymentMethod: r.payment_method,
      createdAt: r.created_at
    }));

    return res.json({ total: records.length, records });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.post('/records', (req: Request, res: Response) => {
  try {
    const { type, title, entityName, costCenter, category, amount, dueDate, paymentMethod, userName, userRole } = req.body;

    if (!title || !amount || !dueDate) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, amount, dueDate.' });
    }

    const codePrefix = type === 'RECEBER' ? 'CR' : 'CP';
    const id = `fin-${Date.now()}`;
    const code = `${codePrefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedAmount = parseFloat(amount);
    const recType = type || 'PAGAR';
    const recEntity = entityName || 'Entidade Corporativa';
    const recCostCenter = costCenter || 'Administrativo Geral';
    const recCategory = category || 'Despesas Gerais';
    const recStatus = 'PREVISTO';
    const recMethod = paymentMethod || 'PIX';

    db.prepare(`
      INSERT INTO financial_records (id, company_id, code, type, title, entity_name, cost_center, category, amount, due_date, status, payment_method)
      VALUES (?, 'comp-1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, recType, title, recEntity, recCostCenter, recCategory, parsedAmount, dueDate, recStatus, recMethod);

    // Registro de auditoria
    logAudit(
      userName || 'Operador Financeiro',
      userRole || 'Financeiro',
      'CREATE',
      'Financeiro',
      `Lançamento ${code}`,
      `Criado lançamento ${recType} no valor de R$ ${parsedAmount.toFixed(2)} (${title})`,
      req.ip || '189.44.120.10'
    );

    const newRecord = {
      id,
      code,
      type: recType,
      title,
      entityName: recEntity,
      costCenter: recCostCenter,
      category: recCategory,
      amount: parsedAmount,
      dueDate,
      status: recStatus,
      paymentMethod: recMethod
    };

    return res.status(201).json(newRecord);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.patch('/records/:id/pay', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, userRole, bankId } = req.body;

    const record = db.prepare('SELECT * FROM financial_records WHERE id = ?').get(id) as any;
    if (!record) {
      return res.status(404).json({ error: 'Lançamento financeiro não encontrado.' });
    }

    const paymentDate = new Date().toISOString().substring(0, 10);
    db.prepare(`
      UPDATE financial_records
      SET status = 'PAGO', payment_date = ?
      WHERE id = ?
    `).run(paymentDate, id);

    // Atualiza saldo bancário correspondente se informado
    if (bankId) {
      if (record.type === 'PAGAR') {
        db.prepare('UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?').run(record.amount, bankId);
      } else {
        db.prepare('UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?').run(record.amount, bankId);
      }
    }

    logAudit(
      userName || 'Operador Financeiro',
      userRole || 'Financeiro',
      'UPDATE',
      'Financeiro',
      `Lançamento ${record.code}`,
      `Baixa / liquidação financeira efetuada no valor de R$ ${record.amount.toFixed(2)}`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      record: {
        ...record,
        status: 'PAGO',
        paymentDate
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.get('/accounts', (_req: Request, res: Response) => {
  try {
    const accounts = db.prepare('SELECT * FROM bank_accounts WHERE active = 1').all() as any[];
    return res.json({ accounts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.get('/summary', (_req: Request, res: Response) => {
  try {
    const recSum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'RECEBER'`).get() as { total: number };
    const paySum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'PAGAR'`).get() as { total: number };
    const bankSum = db.prepare(`SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE active = 1`).get() as { total: number };

    const totalReceitas = recSum.total;
    const totalDespesas = paySum.total;
    const saldoLiquido = totalReceitas - totalDespesas;
    const disponibilidadeBancaria = bankSum.total;
    const ebitdaProjetadoPercent = totalReceitas > 0 ? Number(((saldoLiquido / totalReceitas) * 100).toFixed(1)) : 24.8;

    return res.json({
      totalReceitas,
      totalDespesas,
      saldoLiquido,
      disponibilidadeBancaria,
      ebitdaProjetadoPercent
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
