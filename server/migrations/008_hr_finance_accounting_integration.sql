-- SEEK V1.9 — Integração RH → Financeiro → Contabilidade → Auditoria
CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ABERTO',
  employee_count INTEGER NOT NULL DEFAULT 0,
  gross_amount REAL NOT NULL DEFAULT 0,
  adjustments_amount REAL NOT NULL DEFAULT 0,
  deductions_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL DEFAULT 0,
  financial_record_id TEXT,
  closed_by TEXT,
  closed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, period)
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id TEXT PRIMARY KEY,
  payroll_run_id TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  department TEXT,
  base_salary REAL NOT NULL DEFAULT 0,
  adjustments REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vacation_requests ADD COLUMN gross_amount REAL;
ALTER TABLE vacation_requests ADD COLUMN payment_due_date TEXT;
ALTER TABLE vacation_requests ADD COLUMN financial_record_id TEXT;
