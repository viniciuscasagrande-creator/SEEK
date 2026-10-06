// SEEK Core — Repositório Financeiro, Tesouraria, Conciliação e Controladoria
import { db } from '../db.js';

export interface FinancialRecordEntity {
  id: string;
  company_id?: string;
  code: string;
  type: string; // 'PAGAR' | 'RECEBER'
  title: string;
  entity_name: string;
  cost_center: string;
  category: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: string; // 'PREVISTO' | 'CONFIRMADO' | 'PAGO'
  payment_method: string;
  origin_type?: string; // 'AVULSO' | 'TAXA' | 'PO' | 'FISCAL'
  origin_id?: string;
  bank_id?: string;
  bank_name?: string;
  created_at?: string;
}

export interface BankAccountEntity {
  id: string;
  bank_name: string;
  bank_code: string;
  agency: string;
  account_number: string;
  current_balance: number;
  active: number;
}

export interface BankTransactionEntity {
  id: string;
  account_id: string;
  type: string; // 'CREDITO' | 'DEBITO'
  category: string;
  amount: number;
  transaction_date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  reconciled: number;
  reconciled_at?: string;
  created_at?: string;
}

export interface CostCenterBudgetEntity {
  id: string;
  cost_center: string;
  fiscal_year: number;
  category: string;
  planned_amount: number;
  committed_amount: number;
  realized_amount: number;
  alert_threshold_percent: number;
  created_at?: string;
}

export interface FinancialClosingEntity {
  id: string;
  period: string;
  module: string;
  status: string;
  closed_by?: string;
  closed_at?: string;
  checklist_json?: string;
  notes?: string;
  created_at?: string;
}

export interface BankReconciliationEntity {
  id: string;
  account_id: string;
  period: string;
  statement_balance: number;
  system_balance: number;
  difference: number;
  status: string;
  reconciled_by: string;
  reconciled_at?: string;
  notes?: string;
}

export class FinanceRepository {
  // --- TÍTULOS FINANCEIROS (PAGAR / RECEBER) ---
  listRecords(filters: {
    companyId?: string;
    type?: string;
    status?: string;
    originType?: string;
    search?: string;
  } = {}): FinancialRecordEntity[] {
    let sql = 'SELECT * FROM financial_records WHERE 1=1';
    const params: any[] = [];

    if (filters.companyId) {
      sql += ' AND (company_id = ? OR company_id IS NULL)';
      params.push(filters.companyId);
    }
    if (filters.type && filters.type !== 'ALL') {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters.status && filters.status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.originType && filters.originType !== 'ALL') {
      sql += ' AND origin_type = ?';
      params.push(filters.originType);
    }
    if (filters.search) {
      sql += ' AND (title LIKE ? OR entity_name LIKE ? OR code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY due_date ASC';
    return db.prepare(sql).all(...params) as FinancialRecordEntity[];
  }

  findRecordById(id: string): FinancialRecordEntity | undefined {
    return db.prepare('SELECT * FROM financial_records WHERE id = ?').get(id) as FinancialRecordEntity | undefined;
  }

  findRecordByCode(code: string): FinancialRecordEntity | undefined {
    return db.prepare('SELECT * FROM financial_records WHERE code = ?').get(code) as FinancialRecordEntity | undefined;
  }

  createRecord(data: FinancialRecordEntity): void {
    db.prepare(`
      INSERT INTO financial_records (
        id, company_id, code, type, title, entity_name, cost_center, category,
        amount, due_date, status, payment_method, origin_type, origin_id, bank_id, bank_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.company_id || 'comp-1',
      data.code,
      data.type,
      data.title,
      data.entity_name,
      data.cost_center,
      data.category,
      data.amount,
      data.due_date,
      data.status || 'PREVISTO',
      data.payment_method || 'PIX',
      data.origin_type || 'AVULSO',
      data.origin_id || null,
      data.bank_id || null,
      data.bank_name || null
    );
  }

  updateRecordStatus(id: string, status: string): void {
    db.prepare('UPDATE financial_records SET status = ? WHERE id = ?').run(status, id);
  }

  payRecord(id: string, updateData: {
    paymentDate: string;
    paymentMethod: string;
    bankId?: string | null;
    bankName?: string | null;
  }): void {
    db.prepare(`
      UPDATE financial_records
      SET status = 'PAGO', payment_date = ?, payment_method = ?, bank_id = ?, bank_name = ?
      WHERE id = ?
    `).run(
      updateData.paymentDate,
      updateData.paymentMethod,
      updateData.bankId || null,
      updateData.bankName || null,
      id
    );
  }

  // --- TESOURARIA & CONTAS BANCÁRIAS ---
  listBankAccounts(): BankAccountEntity[] {
    return db.prepare('SELECT * FROM bank_accounts WHERE active = 1 ORDER BY bank_name ASC').all() as BankAccountEntity[];
  }

  findBankAccountById(id: string): BankAccountEntity | undefined {
    return db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(id) as BankAccountEntity | undefined;
  }

  createBankAccount(data: BankAccountEntity): void {
    db.prepare(`
      INSERT INTO bank_accounts (id, bank_name, bank_code, agency, account_number, current_balance, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(data.id, data.bank_name, data.bank_code, data.agency, data.account_number, data.current_balance || 0);
  }

  updateAccountBalance(id: string, deltaAmount: number): void {
    db.prepare('UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?').run(deltaAmount, id);
  }

  createBankTransaction(tx: BankTransactionEntity): void {
    db.prepare(`
      INSERT INTO bank_transactions (id, account_id, type, category, amount, transaction_date, description, reference_type, reference_id, reconciled, reconciled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tx.id,
      tx.account_id,
      tx.type,
      tx.category,
      tx.amount,
      tx.transaction_date,
      tx.description,
      tx.reference_type || 'MANUAL',
      tx.reference_id || null,
      tx.reconciled || 0,
      tx.reconciled_at || null
    );
  }

  listBankTransactions(accountId?: string, limit: number = 100): BankTransactionEntity[] {
    if (accountId) {
      return db.prepare('SELECT * FROM bank_transactions WHERE account_id = ? ORDER BY transaction_date DESC, created_at DESC LIMIT ?').all(accountId, limit) as BankTransactionEntity[];
    }
    return db.prepare('SELECT * FROM bank_transactions ORDER BY transaction_date DESC, created_at DESC LIMIT ?').all(limit) as BankTransactionEntity[];
  }

  // --- CONCILIAÇÃO BANCÁRIA ---
  listReconciliations(accountId?: string): BankReconciliationEntity[] {
    if (accountId) {
      return db.prepare('SELECT * FROM bank_reconciliations WHERE account_id = ? ORDER BY period DESC').all(accountId) as BankReconciliationEntity[];
    }
    return db.prepare('SELECT * FROM bank_reconciliations ORDER BY period DESC').all() as BankReconciliationEntity[];
  }

  createReconciliation(data: BankReconciliationEntity): void {
    db.prepare(`
      INSERT INTO bank_reconciliations (id, account_id, period, statement_balance, system_balance, difference, status, reconciled_by, reconciled_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.account_id,
      data.period,
      data.statement_balance,
      data.system_balance,
      data.difference,
      data.status || 'CONCILIADO',
      data.reconciled_by,
      data.reconciled_at || new Date().toISOString(),
      data.notes || null
    );
  }

  // --- ORÇAMENTOS POR CENTRO DE CUSTO ---
  listCostCenterBudgets(year: number = 2026): CostCenterBudgetEntity[] {
    return db.prepare('SELECT * FROM cost_center_budgets WHERE fiscal_year = ? ORDER BY cost_center ASC').all(year) as CostCenterBudgetEntity[];
  }

  findCostCenterBudgetById(id: string): CostCenterBudgetEntity | undefined {
    return db.prepare('SELECT * FROM cost_center_budgets WHERE id = ?').get(id) as CostCenterBudgetEntity | undefined;
  }

  createCostCenterBudget(data: CostCenterBudgetEntity): void {
    db.prepare(`
      INSERT INTO cost_center_budgets (id, cost_center, fiscal_year, category, planned_amount, committed_amount, realized_amount, alert_threshold_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.cost_center,
      data.fiscal_year,
      data.category,
      data.planned_amount,
      data.committed_amount || 0,
      data.realized_amount || 0,
      data.alert_threshold_percent || 85.0
    );
  }

  updateCostCenterBudget(id: string, data: Partial<CostCenterBudgetEntity>): void {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.planned_amount !== undefined) { fields.push('planned_amount = ?'); values.push(data.planned_amount); }
    if (data.committed_amount !== undefined) { fields.push('committed_amount = ?'); values.push(data.committed_amount); }
    if (data.realized_amount !== undefined) { fields.push('realized_amount = ?'); values.push(data.realized_amount); }
    if (data.alert_threshold_percent !== undefined) { fields.push('alert_threshold_percent = ?'); values.push(data.alert_threshold_percent); }
    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE cost_center_budgets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  // --- FECHAMENTO FINANCEIRO ---
  listClosings(period?: string): FinancialClosingEntity[] {
    if (period) {
      return db.prepare('SELECT * FROM financial_closings WHERE period = ? ORDER BY created_at DESC').all(period) as FinancialClosingEntity[];
    }
    return db.prepare('SELECT * FROM financial_closings ORDER BY period DESC').all() as FinancialClosingEntity[];
  }

  findClosingById(id: string): FinancialClosingEntity | undefined {
    return db.prepare('SELECT * FROM financial_closings WHERE id = ?').get(id) as FinancialClosingEntity | undefined;
  }

  createClosing(data: FinancialClosingEntity): void {
    db.prepare(`
      INSERT INTO financial_closings (id, period, module, status, closed_by, closed_at, checklist_json, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.period,
      data.module,
      data.status || 'ABERTO',
      data.closed_by || null,
      data.closed_at || null,
      data.checklist_json || null,
      data.notes || null
    );
  }

  updateClosingStatus(id: string, status: string, closedBy: string, closedAt: string): void {
    db.prepare('UPDATE financial_closings SET status = ?, closed_by = ?, closed_at = ? WHERE id = ?').run(status, closedBy, closedAt, id);
  }
}

export const financeRepository = new FinanceRepository();
