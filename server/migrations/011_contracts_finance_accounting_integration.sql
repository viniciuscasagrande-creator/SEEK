-- SEEK V1.9 — Integração Contratos -> Financeiro -> Contabilidade
ALTER TABLE contracts ADD COLUMN cost_center TEXT DEFAULT 'Administrativo & Operações';
ALTER TABLE contracts ADD COLUMN payment_day INTEGER DEFAULT 10;
ALTER TABLE contracts ADD COLUMN recurrence TEXT DEFAULT 'MENSAL';
ALTER TABLE contracts ADD COLUMN financial_enabled INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN next_due_date TEXT;

CREATE TABLE IF NOT EXISTS contract_obligations (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  competence TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  financial_record_id TEXT,
  status TEXT NOT NULL DEFAULT 'GERADA', -- GERADA, PAGA, CANCELADA
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (financial_record_id) REFERENCES financial_records(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_contract_obligation_competence
  ON contract_obligations(contract_id, competence);
CREATE INDEX IF NOT EXISTS ix_contract_obligations_due_status
  ON contract_obligations(due_date, status);
CREATE INDEX IF NOT EXISTS ix_financial_contract_origin
  ON financial_records(origin_type, origin_id)
  WHERE origin_type='CONTRATO';
