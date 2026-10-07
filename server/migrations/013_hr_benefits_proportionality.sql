-- SEEK V1.9 — RH Benefícios Fase 2: dias úteis, proporcionalidade, admissão, férias e afastamentos
ALTER TABLE employee_benefits ADD COLUMN prorate_admission INTEGER NOT NULL DEFAULT 1;
ALTER TABLE employee_benefits ADD COLUMN deduct_vacation INTEGER NOT NULL DEFAULT 1;
ALTER TABLE employee_benefits ADD COLUMN deduct_leave INTEGER NOT NULL DEFAULT 1;
ALTER TABLE employee_benefits ADD COLUMN daily_value REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS benefit_absences (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE benefit_order_items ADD COLUMN business_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE benefit_order_items ADD COLUMN eligible_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE benefit_order_items ADD COLUMN admission_days_deducted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE benefit_order_items ADD COLUMN vacation_days_deducted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE benefit_order_items ADD COLUMN leave_days_deducted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE benefit_order_items ADD COLUMN calculation_mode TEXT NOT NULL DEFAULT 'MENSAL';
ALTER TABLE benefit_order_items ADD COLUMN calculation_detail TEXT;

CREATE INDEX IF NOT EXISTS idx_benefit_absences_employee_dates ON benefit_absences(employee_id, start_date, end_date);
