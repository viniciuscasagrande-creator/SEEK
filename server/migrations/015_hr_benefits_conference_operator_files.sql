-- SEEK V1.9 — RH Benefícios Fase 4: conferência, divergências, arquivos de operadora e crédito
CREATE TABLE IF NOT EXISTS benefit_conferences (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  benefit_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  issue_level TEXT NOT NULL DEFAULT 'OK',
  issue_code TEXT,
  issue_message TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(period, employee_id, benefit_type)
);

CREATE TABLE IF NOT EXISTS benefit_operator_files (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES benefit_purchase_batches(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  generated_by TEXT,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  imported_at TEXT,
  notes TEXT
);

ALTER TABLE benefit_orders ADD COLUMN approved_by TEXT;
ALTER TABLE benefit_orders ADD COLUMN approved_at TEXT;
ALTER TABLE benefit_orders ADD COLUMN locked_at TEXT;

ALTER TABLE benefit_order_items ADD COLUMN conference_status TEXT NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE benefit_order_items ADD COLUMN operator_processed_amount REAL;
ALTER TABLE benefit_order_items ADD COLUMN divergence_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE benefit_order_items ADD COLUMN divergence_reason TEXT;
ALTER TABLE benefit_order_items ADD COLUMN credit_status TEXT NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE benefit_order_items ADD COLUMN credit_confirmed_at TEXT;

ALTER TABLE benefit_purchase_batches ADD COLUMN operator_file_name TEXT;
ALTER TABLE benefit_purchase_batches ADD COLUMN operator_sent_at TEXT;
ALTER TABLE benefit_purchase_batches ADD COLUMN operator_returned_at TEXT;
ALTER TABLE benefit_purchase_batches ADD COLUMN credit_confirmed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_benefit_conferences_period ON benefit_conferences(period,status,issue_level);
CREATE INDEX IF NOT EXISTS idx_benefit_operator_files_batch ON benefit_operator_files(batch_id,file_type);
