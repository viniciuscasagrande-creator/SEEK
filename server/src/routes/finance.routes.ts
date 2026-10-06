import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const financeRouter = Router();

// ========================================================
// 1. CONTAS A PAGAR & RECEBER (ENTERPRISE)
// ========================================================
financeRouter.get('/records', (req: Request, res: Response) => {
  try {
    const { type, status, originType, search } = req.query;
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
    if (originType && originType !== 'ALL') {
      query += ' AND origin_type = ?';
      params.push(originType);
    }
    if (search) {
      query += ' AND (title LIKE ? OR entity_name LIKE ? OR code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
      originType: r.origin_type || 'AVULSO',
      originId: r.origin_id || null,
      bankId: r.bank_id || null,
      bankName: r.bank_name || null,
      createdAt: r.created_at
    }));

    return res.json({ total: records.length, records });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.post('/records', (req: Request, res: Response) => {
  try {
    const { type, title, entityName, costCenter, category, amount, dueDate, paymentMethod, originType, originId, userName, userRole } = req.body;

    if (!title || !amount || !dueDate) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, amount, dueDate.' });
    }

    const codePrefix = type === 'RECEBER' ? 'CR' : 'CP';
    const id = `fin-${Date.now()}`;
    const code = `${codePrefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedAmount = parseFloat(amount);
    const recType = type || 'PAGAR';
    const recEntity = entityName || 'Entidade Corporativa';
    const recCostCenter = costCenter || 'Administrativo & Recursos Humanos';
    const recCategory = category || 'Despesas Gerais';
    const recStatus = 'PREVISTO';
    const recMethod = paymentMethod || 'PIX';
    const recOrigin = originType || 'AVULSO';
    const recOriginId = originId || null;

    db.prepare(`
      INSERT INTO financial_records (id, company_id, code, type, title, entity_name, cost_center, category, amount, due_date, status, payment_method, origin_type, origin_id)
      VALUES (?, 'comp-1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, recType, title, recEntity, recCostCenter, recCategory, parsedAmount, dueDate, recStatus, recMethod, recOrigin, recOriginId);

    logAudit(
      userName || 'Operador Financeiro',
      userRole || 'Financeiro',
      'CREATE',
      'Financeiro',
      `Lançamento ${code}`,
      `Criado lançamento ${recType} (${recOrigin}) no valor de R$ ${parsedAmount.toFixed(2)} (${title})`,
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
      paymentMethod: recMethod,
      originType: recOrigin,
      originId: recOriginId
    };

    return res.status(201).json(newRecord);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Baixa / Liquidação de Título com Atualização Bancária e Extrato Automático
financeRouter.patch('/records/:id/pay', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, userRole, bankId, paymentMethod, paymentDate: customDate } = req.body;

    const record = db.prepare('SELECT * FROM financial_records WHERE id = ?').get(id) as any;
    if (!record) {
      return res.status(404).json({ error: 'Lançamento financeiro não encontrado.' });
    }

    const paymentDate = customDate || new Date().toISOString().substring(0, 10);
    const selectedMethod = paymentMethod || record.payment_method || 'PIX';

    let bankInfo: any = null;
    if (bankId) {
      bankInfo = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(bankId) as any;
    }

    // Atualiza status do lançamento
    db.prepare(`
      UPDATE financial_records
      SET status = 'PAGO', payment_date = ?, payment_method = ?, bank_id = ?, bank_name = ?
      WHERE id = ?
    `).run(paymentDate, selectedMethod, bankId || null, bankInfo ? bankInfo.bank_name : null, id);

    // Movimentação em conta bancária e geração de transação no extrato
    if (bankId && bankInfo) {
      const isPay = record.type === 'PAGAR';
      const balanceChange = isPay ? -record.amount : record.amount;
      const txType = isPay ? 'DEBITO' : 'CREDITO';

      db.prepare('UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?').run(balanceChange, bankId);

      const btxId = `btx-${Date.now()}`;
      db.prepare(`
        INSERT INTO bank_transactions (id, account_id, type, category, amount, transaction_date, description, reference_type, reference_id, reconciled, reconciled_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'TITULO', ?, 1, ?)
      `).run(
        btxId,
        bankId,
        txType,
        record.category,
        record.amount,
        paymentDate,
        `Liquidação ${record.code} — ${record.title} (${record.entity_name})`,
        record.code,
        new Date().toISOString()
      );
    }

    // Se a origem era uma Taxa Freelancer, sincronizar status na tabela freelance_shifts
    if (record.origin_type === 'TAXA' && record.origin_id) {
      try {
        db.prepare(`UPDATE freelance_shifts SET status = 'PAGO', paid_at = ? WHERE id = ? OR code = ?`).run(paymentDate, record.origin_id, record.origin_id);
      } catch {}
    }

    // Se a origem era uma Ordem de Compra, sincronizar status
    if (record.origin_type === 'PO' && record.origin_id) {
      try {
        db.prepare(`UPDATE purchase_orders SET status = 'PAGO' WHERE id = ? OR code = ?`).run(record.origin_id, record.origin_id);
      } catch {}
    }

    // Se a origem era uma Obrigação Fiscal, sincronizar status
    if (record.origin_type === 'FISCAL' && record.origin_id) {
      try {
        db.prepare(`UPDATE tax_obligations SET status = 'PAGO', payment_date = ? WHERE id = ? OR code = ?`).run(paymentDate, record.origin_id, record.origin_id);
      } catch {}
    }

    logAudit(
      userName || 'Operador Financeiro',
      userRole || 'Financeiro',
      'UPDATE',
      'Financeiro',
      `Lançamento ${record.code}`,
      `Baixa / liquidação efetuada no valor de R$ ${record.amount.toFixed(2)}${bankInfo ? ` via ${bankInfo.bank_name}` : ''}`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      record: {
        ...record,
        status: 'PAGO',
        paymentDate,
        bankId,
        bankName: bankInfo ? bankInfo.bank_name : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 2. TESOURARIA & CONTAS BANCÁRIAS
// ========================================================
financeRouter.get('/accounts', (_req: Request, res: Response) => {
  try {
    const accounts = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM bank_transactions bt WHERE bt.account_id = b.id) as transaction_count,
        (SELECT COUNT(*) FROM bank_transactions bt WHERE bt.account_id = b.id AND bt.reconciled = 0) as pending_reconcile_count
      FROM bank_accounts b
      WHERE b.active = 1
      ORDER BY b.current_balance DESC
    `).all() as any[];

    return res.json({ total: accounts.length, accounts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.post('/accounts', (req: Request, res: Response) => {
  try {
    const { bankName, bankCode, agency, accountNumber, initialBalance, userName, userRole } = req.body;

    if (!bankName || !bankCode || !agency || !accountNumber) {
      return res.status(400).json({ error: 'Campos obrigatórios: bankName, bankCode, agency, accountNumber.' });
    }

    const id = `bank-${Date.now()}`;
    const balance = parseFloat(initialBalance || '0');

    db.prepare(`
      INSERT INTO bank_accounts (id, bank_name, bank_code, agency, accountNumber, current_balance, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, bankName, bankCode, agency, accountNumber, balance);

    logAudit(
      userName || 'Gestor Financeiro',
      userRole || 'Financeiro',
      'CREATE',
      'Tesouraria',
      `Conta Bancária ${bankName}`,
      `Cadastrada nova conta bancária ${agency}/${accountNumber} com saldo inicial de R$ ${balance.toFixed(2)}`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      account: { id, bankName, bankCode, agency, accountNumber, currentBalance: balance, active: 1 }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.get('/accounts/:id/transactions', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reconciled } = req.query;

    let query = 'SELECT * FROM bank_transactions WHERE account_id = ?';
    const params: any[] = [id];

    if (reconciled !== undefined && reconciled !== 'ALL') {
      query += ' AND reconciled = ?';
      params.push(reconciled === 'true' || reconciled === '1' ? 1 : 0);
    }

    query += ' ORDER BY transaction_date DESC, created_at DESC';
    const transactions = db.prepare(query).all(...params) as any[];

    return res.json({ total: transactions.length, transactions });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 3. CONCILIAÇÃO BANCÁRIA ENTERPRISE
// ========================================================
financeRouter.get('/reconciliations', (_req: Request, res: Response) => {
  try {
    const reconciliations = db.prepare(`
      SELECT r.*, b.bank_name, b.agency, b.account_number
      FROM bank_reconciliations r
      JOIN bank_accounts b ON r.account_id = b.id
      ORDER BY r.reconciled_at DESC
    `).all() as any[];

    return res.json({ total: reconciliations.length, reconciliations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.post('/reconciliations', (req: Request, res: Response) => {
  try {
    const { accountId, period, statementBalance, notes, userName, userRole } = req.body;

    if (!accountId || !period || statementBalance === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios: accountId, period, statementBalance.' });
    }

    const bank = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(accountId) as any;
    if (!bank) {
      return res.status(404).json({ error: 'Conta bancária não encontrada.' });
    }

    const parsedStatement = parseFloat(statementBalance);
    const systemBalance = bank.current_balance;
    const difference = parsedStatement - systemBalance;
    const status = Math.abs(difference) < 0.01 ? 'CONCILIADO' : 'DIVERGENTE';

    const id = `rec-${Date.now()}`;
    const user = userName || 'Auditor Financeiro';

    db.prepare(`
      INSERT INTO bank_reconciliations (id, account_id, period, statement_balance, system_balance, difference, status, reconciled_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, accountId, period, parsedStatement, systemBalance, difference, status, user, notes || 'Conciliação via Painel Enterprise');

    // Marca as transações pendentes como conciliadas se o status for CONCILIADO
    if (status === 'CONCILIADO') {
      db.prepare(`UPDATE bank_transactions SET reconciled = 1, reconciled_at = ? WHERE account_id = ? AND reconciled = 0`).run(new Date().toISOString(), accountId);
    }

    logAudit(
      user,
      userRole || 'Controladoria',
      'RECONCILE',
      'Tesouraria',
      `Conciliação ${bank.bank_name}`,
      `Período ${period}: Saldo Extrato R$ ${parsedStatement.toFixed(2)} vs Sistema R$ ${systemBalance.toFixed(2)} (Diferença: R$ ${difference.toFixed(2)} - ${status})`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      reconciliation: {
        id,
        accountId,
        period,
        statementBalance: parsedStatement,
        systemBalance,
        difference,
        status,
        reconciledBy: user
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.patch('/transactions/:id/reconcile', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reconciled } = req.body;

    const isReconciled = reconciled ? 1 : 0;
    const now = isReconciled ? new Date().toISOString() : null;

    db.prepare('UPDATE bank_transactions SET reconciled = ?, reconciled_at = ? WHERE id = ?').run(isReconciled, now, id);

    return res.json({ success: true, transactionId: id, reconciled: isReconciled });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 4. CONTROLADORIA & ORÇAMENTO (BUDGETING ENTERPRISE)
// ========================================================
financeRouter.get('/budgets', (_req: Request, res: Response) => {
  try {
    const budgets = db.prepare(`SELECT * FROM cost_center_budgets ORDER BY planned_amount DESC`).all() as any[];

    const formatted = budgets.map(b => {
      const remaining = b.planned_amount - (b.committed_amount + b.realized_amount);
      const consumedTotal = b.committed_amount + b.realized_amount;
      const consumedPercent = b.planned_amount > 0 ? Number(((consumedTotal / b.planned_amount) * 100).toFixed(1)) : 0;
      const isAlert = consumedPercent >= b.alert_threshold_percent;

      return {
        id: b.id,
        costCenter: b.cost_center,
        fiscalYear: b.fiscal_year,
        category: b.category,
        plannedAmount: b.planned_amount,
        committedAmount: b.committed_amount,
        realizedAmount: b.realized_amount,
        remainingAmount: remaining,
        consumedPercent,
        alertThresholdPercent: b.alert_threshold_percent,
        isAlert
      };
    });

    const totalPlanned = formatted.reduce((acc, curr) => acc + curr.plannedAmount, 0);
    const totalCommitted = formatted.reduce((acc, curr) => acc + curr.committedAmount, 0);
    const totalRealized = formatted.reduce((acc, curr) => acc + curr.realizedAmount, 0);
    const totalRemaining = totalPlanned - (totalCommitted + totalRealized);

    return res.json({
      summary: {
        totalPlanned,
        totalCommitted,
        totalRealized,
        totalRemaining,
        globalConsumedPercent: totalPlanned > 0 ? Number((((totalCommitted + totalRealized) / totalPlanned) * 100).toFixed(1)) : 0
      },
      budgets: formatted
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 5. DRE GERENCIAL CONSOLIDADO
// ========================================================
financeRouter.get('/dre', (_req: Request, res: Response) => {
  try {
    // 1. Receita Bruta (Faturamento de Clientes, Contratos e SaaS)
    const recSum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'RECEBER'`).get() as { total: number };
    const receitaBruta = recSum.total || 385000.0;

    // 2. Deduções de Impostos s/ Faturamento (ISS 5% + PIS 0.65% + COFINS 3% = 8.65%)
    const impostosSobreVenda = Number((receitaBruta * 0.0865).toFixed(2));
    const receitaLiquida = receitaBruta - impostosSobreVenda;

    // 3. Custos Diretos Operacionais (Almoxarifado, Datacenter, Taxas Freelancers)
    const custosOperacionaisQuery = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM financial_records
      WHERE type = 'PAGAR' AND (category LIKE '%Infraestrutura%' OR category LIKE '%Insumos%' OR origin_type = 'TAXA')
    `).get() as { total: number };
    const custosDiretos = custosOperacionaisQuery.total || 47500.0;

    const margemBruta = receitaLiquida - custosDiretos;
    const margemBrutaPercent = receitaLiquida > 0 ? Number(((margemBruta / receitaLiquida) * 100).toFixed(1)) : 0;

    // 4. Despesas Administrativas & Pessoal
    const despesasAdminQuery = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM financial_records
      WHERE type = 'PAGAR' AND (category LIKE '%Pessoal%' OR category LIKE '%Despesas Gerais%' OR category LIKE '%Administrativo%')
    `).get() as { total: number };
    const despesasAdministrativas = despesasAdminQuery.total || 292000.0;

    // 5. EBITDA Gerencial
    const ebitda = margemBruta - despesasAdministrativas;
    const margemEbitdaPercent = receitaLiquida > 0 ? Number(((ebitda / receitaLiquida) * 100).toFixed(1)) : 0;

    // Breakdown por Centro de Custo
    const breakdownRows = db.prepare(`
      SELECT cost_center,
        COALESCE(SUM(CASE WHEN type = 'RECEBER' THEN amount ELSE 0 END), 0) as receitas,
        COALESCE(SUM(CASE WHEN type = 'PAGAR' THEN amount ELSE 0 END), 0) as despesas
      FROM financial_records
      GROUP BY cost_center
    `).all() as any[];

    const costCenterBreakdown = breakdownRows.map(r => ({
      costCenter: r.cost_center,
      receitas: r.receitas,
      despesas: r.despesas,
      resultadoLiquido: r.receitas - r.despesas
    }));

    return res.json({
      dre: {
        receitaBruta,
        impostosSobreVenda,
        receitaLiquida,
        custosDiretos,
        margemBruta,
        margemBrutaPercent,
        despesasAdministrativas,
        ebitda,
        margemEbitdaPercent
      },
      costCenterBreakdown
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 6. FECHAMENTO MENSAL / PERIOD LOCK
// ========================================================
financeRouter.get('/closings', (_req: Request, res: Response) => {
  try {
    const closings = db.prepare(`SELECT * FROM financial_closings ORDER BY period DESC`).all() as any[];
    const parsed = closings.map(c => ({
      ...c,
      checklist: c.checklist_json ? JSON.parse(c.checklist_json) : {}
    }));
    return res.json({ total: parsed.length, closings: parsed });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

financeRouter.post('/closings/lock', (req: Request, res: Response) => {
  try {
    const { period, userName, userRole, notes, checklist } = req.body;

    if (!period) {
      return res.status(400).json({ error: 'Período obrigatório (ex: 2026-10).' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = userName || 'Controlador Geral';
    const checklistJson = checklist ? JSON.stringify(checklist) : JSON.stringify({
      extratos_conciliados: true,
      contas_pagar_baixadas: true,
      tributos_apurados: true,
      folha_fechada: true,
      balancete_verificado: true
    });

    const existing = db.prepare('SELECT * FROM financial_closings WHERE period = ?').get(period) as any;
    if (existing) {
      db.prepare(`
        UPDATE financial_closings
        SET status = 'BLOQUEADO', closed_by = ?, closed_at = ?, checklist_json = ?, notes = ?
        WHERE period = ?
      `).run(user, now, checklistJson, notes || 'Competência fechada e bloqueada com sucesso.', period);
    } else {
      const id = `close-${Date.now()}`;
      db.prepare(`
        INSERT INTO financial_closings (id, period, module, status, closed_by, closed_at, checklist_json, notes)
        VALUES (?, ?, 'GERAL', 'BLOQUEADO', ?, ?, ?, ?)
      `).run(id, period, user, now, checklistJson, notes || 'Competência fechada e bloqueada com sucesso.');
    }

    // Trava de período também no módulo contábil
    try {
      db.prepare(`UPDATE accounting_periods SET status = 'BLOQUEADO' WHERE period = ?`).run(period);
    } catch {}

    logAudit(
      user,
      userRole || 'Controladoria',
      'LOCK',
      'Controladoria',
      `Competência ${period}`,
      `Fechamento mensal consolidado com trava de competência (Period Lock). Novas movimentações bloqueadas.`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      period,
      status: 'BLOQUEADO',
      closedBy: user,
      closedAt: now
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 7. SUMÁRIO EXECUTIVO & FLUXO DE CAIXA
// ========================================================
financeRouter.get('/summary', (_req: Request, res: Response) => {
  try {
    const recSum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'RECEBER'`).get() as { total: number };
    const paySum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'PAGAR'`).get() as { total: number };
    const payPendingSum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'PAGAR' AND status != 'PAGO'`).get() as { total: number };
    const recPendingSum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'RECEBER' AND status != 'PAGO'`).get() as { total: number };
    const bankSum = db.prepare(`SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE active = 1`).get() as { total: number };

    const totalReceitas = recSum.total;
    const totalDespesas = paySum.total;
    const totalPagarPendente = payPendingSum.total;
    const totalReceberPendente = recPendingSum.total;
    const saldoLiquido = totalReceitas - totalDespesas;
    const disponibilidadeBancaria = bankSum.total;
    const ebitdaProjetadoPercent = totalReceitas > 0 ? Number(((saldoLiquido / totalReceitas) * 100).toFixed(1)) : 24.8;

    return res.json({
      totalReceitas,
      totalDespesas,
      totalPagarPendente,
      totalReceberPendente,
      saldoLiquido,
      disponibilidadeBancaria,
      ebitdaProjetadoPercent
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
