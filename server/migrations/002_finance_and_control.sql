-- Migration 002: Financeiro, Tesouraria, Conciliação e Controladoria
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  agency TEXT NOT NULL,
  account_number TEXT NOT NULL,
  current_balance REAL DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS financial_records (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- PAGAR, RECEBER
  title TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  cost_center TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  payment_date TEXT,
  status TEXT NOT NULL DEFAULT 'PREVISTO', -- PREVISTO, CONFIRMADO, PAGO
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  origin_type TEXT DEFAULT 'AVULSO',
  origin_id TEXT,
  bank_id TEXT,
  bank_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  type TEXT NOT NULL, -- CREDITO, DEBITO
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  transaction_date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT DEFAULT 'MANUAL',
  reference_id TEXT,
  reconciled INTEGER DEFAULT 0,
  reconciled_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  period TEXT NOT NULL,
  statement_balance REAL NOT NULL,
  system_balance REAL NOT NULL,
  difference REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONCILIADO', -- CONCILIADO, DIVERGENTE, PENDENTE
  reconciled_by TEXT NOT NULL,
  reconciled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS cost_center_budgets (
  id TEXT PRIMARY KEY,
  cost_center TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL DEFAULT 2026,
  category TEXT NOT NULL,
  planned_amount REAL NOT NULL,
  committed_amount REAL NOT NULL DEFAULT 0,
  realized_amount REAL NOT NULL DEFAULT 0,
  alert_threshold_percent REAL DEFAULT 85.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_closings (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  module TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ABERTO',
  closed_by TEXT,
  closed_at TEXT,
  checklist_json TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
