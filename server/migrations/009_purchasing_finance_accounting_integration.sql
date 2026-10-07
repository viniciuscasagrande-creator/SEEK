-- SEEK V1.9 — Integração Compras → Financeiro → Contabilidade
-- Regra: aprovação autoriza/reserva e recebimento físico/fiscal gera a obrigação financeira.

ALTER TABLE purchase_orders ADD COLUMN requisition_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN cost_center TEXT;
ALTER TABLE purchase_orders ADD COLUMN approved_at TEXT;
ALTER TABLE purchase_orders ADD COLUMN approved_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN received_at TEXT;
ALTER TABLE purchase_orders ADD COLUMN invoice_number TEXT;
ALTER TABLE purchase_orders ADD COLUMN financial_record_id TEXT;

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES purchase_orders(id) ON DELETE CASCADE,
  company_id TEXT,
  requisition_id TEXT,
  supplier_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  cost_center TEXT NOT NULL,
  received_by TEXT NOT NULL,
  received_at TEXT NOT NULL,
  financial_record_id TEXT NOT NULL,
  financial_record_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'FATURADO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_order ON purchase_receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_finance ON purchase_receipts(financial_record_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_financial_record ON purchase_orders(financial_record_id);
