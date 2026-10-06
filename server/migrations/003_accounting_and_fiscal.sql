-- Migration 003: Contabilidade, Partidas Dobradas e Calendário Fiscal
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT DEFAULT 'comp-1',
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- SINTETICA, ANALITICA
  nature TEXT NOT NULL, -- DEVEDORA, CREDORA
  level INTEGER NOT NULL, -- 1, 2, 3, 4
  parent_code TEXT,
  balance REAL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounting_entries (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  period TEXT NOT NULL, -- YYYY-MM
  description TEXT NOT NULL,
  debit_account_code TEXT NOT NULL,
  credit_account_code TEXT NOT NULL,
  amount REAL NOT NULL,
  cost_center TEXT,
  origin_type TEXT NOT NULL, -- FINANCEIRO, COMPRAS, FOLHA, MANUAL, DEPRECIACAO
  origin_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounting_periods (
  id TEXT PRIMARY KEY,
  period TEXT UNIQUE NOT NULL, -- YYYY-MM
  status TEXT DEFAULT 'ABERTO', -- ABERTO, FECHADO, BLOQUEADO
  closed_by TEXT,
  closed_at TEXT,
  net_result REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS tax_obligations (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  tax_type TEXT NOT NULL, -- ISS, PIS, COFINS, IRPJ, CSLL, INSS, FGTS
  period TEXT NOT NULL, -- YYYY-MM
  base_amount REAL NOT NULL,
  rate_percent REAL NOT NULL,
  tax_amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT DEFAULT 'PENDENTE', -- PENDENTE, CALCULADO, PAGO, ATRASADO
  payment_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
