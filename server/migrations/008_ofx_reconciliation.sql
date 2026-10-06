-- SEEK V1.9 — Fase 3: Conciliação Bancária OFX Real & Idempotência FITID
CREATE TABLE IF NOT EXISTS ofx_imports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  company_id TEXT DEFAULT 'comp-1',
  filename TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  bank_code TEXT,
  account_number TEXT,
  start_date TEXT,
  end_date TEXT,
  total_transactions INTEGER DEFAULT 0,
  imported_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ofx_transactions (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES ofx_imports(id),
  account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  company_id TEXT DEFAULT 'comp-1',
  fitid TEXT NOT NULL,
  type TEXT NOT NULL, -- 'CREDITO' | 'DEBITO'
  amount REAL NOT NULL,
  posted_date TEXT NOT NULL, -- YYYY-MM-DD
  memo TEXT,
  check_number TEXT,
  status TEXT NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE' | 'CONCILIADO' | 'IGNORADO'
  matched_bank_tx_id TEXT REFERENCES bank_transactions(id),
  reconciled_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ofx_tx_account_fitid ON ofx_transactions(account_id, fitid);
CREATE INDEX IF NOT EXISTS ix_ofx_imports_account_date ON ofx_imports(account_id, created_at);
CREATE INDEX IF NOT EXISTS ix_ofx_tx_account_status ON ofx_transactions(account_id, status);
CREATE INDEX IF NOT EXISTS ix_ofx_tx_matched_bank_tx ON ofx_transactions(matched_bank_tx_id);
CREATE INDEX IF NOT EXISTS ix_bank_tx_reconciled ON bank_transactions(account_id, reconciled);
