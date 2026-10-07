-- SEEK V1.9 — RH Benefícios Fase 3: operadoras, ajustes e pedidos de compra
CREATE TABLE IF NOT EXISTS benefit_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  benefit_type TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  payment_method TEXT,
  billing_day INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, benefit_type)
);

CREATE TABLE IF NOT EXISTS benefit_adjustments (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  benefit_type TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS benefit_purchase_batches (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES benefit_orders(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  benefit_type TEXT NOT NULL,
  employee_count INTEGER NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'AGUARDANDO_COMPRA',
  financial_record_id TEXT,
  sent_at TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id, provider_name, benefit_type)
);

ALTER TABLE benefit_order_items ADD COLUMN adjustment_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE benefit_order_items ADD COLUMN final_company_cost REAL NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_benefit_adjustments_period_employee ON benefit_adjustments(period, employee_id, benefit_type);
CREATE INDEX IF NOT EXISTS idx_benefit_purchase_batches_order ON benefit_purchase_batches(order_id);

-- Backfill de fechamentos já existentes: cria pedidos de compra agrupados por benefício e operadora.
INSERT OR IGNORE INTO benefit_purchase_batches (id,order_id,provider_name,benefit_type,employee_count,total_amount,status)
SELECT
  'bp-backfill-' || substr(hex(randomblob(8)),1,16),
  i.order_id,
  COALESCE(NULLIF(TRIM(i.provider_name),''),'Operadora não definida'),
  i.benefit_type,
  COUNT(DISTINCT i.employee_id),
  ROUND(SUM(CASE WHEN COALESCE(i.final_company_cost,0)>0 THEN i.final_company_cost ELSE i.company_cost END),2),
  'AGUARDANDO_COMPRA'
FROM benefit_order_items i
GROUP BY i.order_id, COALESCE(NULLIF(TRIM(i.provider_name),''),'Operadora não definida'), i.benefit_type;
