-- SEEK V1.9 — RH Benefícios: VT, VA, VR e Auxílio Combustível
CREATE TABLE IF NOT EXISTS employee_benefits (
  id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id), benefit_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1, provider_name TEXT, calculation_mode TEXT NOT NULL DEFAULT 'MENSAL',
  unit_value REAL NOT NULL DEFAULT 0, quantity REAL NOT NULL DEFAULT 1, monthly_value REAL NOT NULL DEFAULT 0,
  employee_discount REAL NOT NULL DEFAULT 0, company_cost REAL NOT NULL DEFAULT 0,
  valid_from TEXT, valid_to TEXT, notes TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, benefit_type)
);
CREATE TABLE IF NOT EXISTS benefit_orders (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, period TEXT NOT NULL, due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RASCUNHO', employee_count INTEGER NOT NULL DEFAULT 0,
  vt_total REAL NOT NULL DEFAULT 0, va_total REAL NOT NULL DEFAULT 0, vr_total REAL NOT NULL DEFAULT 0,
  fuel_total REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0, financial_record_id TEXT,
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, sent_at TEXT, paid_at TEXT,
  UNIQUE(company_id, period)
);
CREATE TABLE IF NOT EXISTS benefit_order_items (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES benefit_orders(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id), employee_name TEXT NOT NULL, department TEXT,
  benefit_type TEXT NOT NULL, provider_name TEXT, company_cost REAL NOT NULL DEFAULT 0,
  employee_discount REAL NOT NULL DEFAULT 0, total_value REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_employee ON employee_benefits(employee_id);
CREATE INDEX IF NOT EXISTS idx_benefit_order_items_order ON benefit_order_items(order_id);
