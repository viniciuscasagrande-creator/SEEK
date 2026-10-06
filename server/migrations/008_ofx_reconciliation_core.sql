-- SEEK V1.9 — Core Transacional Financeiro Fase 2
-- OFX persistente, idempotência FITID, matching e conciliação item a item.

CREATE TABLE IF NOT EXISTS ofx_imports (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  bank_id TEXT,
  account_ref TEXT,
  period_start TEXT,
  period_end TEXT,
  ledger_balance REAL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  imported_by TEXT NOT NULL,
  imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'IMPORTADO',
  UNIQUE(account_id, file_hash)
);

CREATE TABLE IF NOT EXISTS ofx_statement_transactions (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES ofx_imports(id) ON DELETE CASCADE,
  company_id TEXT,
  account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  fitid TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  amount REAL NOT NULL,
  memo TEXT,
  name TEXT,
  check_number TEXT,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  matched_bank_transaction_id TEXT REFERENCES bank_transactions(id),
  match_score REAL,
  matched_at TEXT,
  matched_by TEXT,
  divergence_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, fitid)
);

CREATE INDEX IF NOT EXISTS ix_ofx_tx_account_status_date
  ON ofx_statement_transactions(account_id, status, posted_at);

CREATE INDEX IF NOT EXISTS ix_ofx_tx_match
  ON ofx_statement_transactions(matched_bank_transaction_id);

CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  statement_transaction_id TEXT NOT NULL REFERENCES ofx_statement_transactions(id),
  bank_transaction_id TEXT NOT NULL REFERENCES bank_transactions(id),
  score REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONCILIADO',
  matched_by TEXT NOT NULL,
  matched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  UNIQUE(statement_transaction_id),
  UNIQUE(bank_transaction_id)
);
