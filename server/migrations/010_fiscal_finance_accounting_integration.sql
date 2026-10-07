-- SEEK V1.9 — Integração Fiscal → Financeiro → Contabilidade
-- A obrigação fiscal nasce no Fiscal. O Financeiro recebe um título único e é o único responsável pela liquidação.

ALTER TABLE tax_obligations ADD COLUMN company_id TEXT DEFAULT 'comp-1';
ALTER TABLE tax_obligations ADD COLUMN entity_name TEXT DEFAULT 'Órgão Arrecadador';
ALTER TABLE tax_obligations ADD COLUMN cost_center TEXT DEFAULT 'Administrativo & Fiscal';
ALTER TABLE tax_obligations ADD COLUMN guide_number TEXT;
ALTER TABLE tax_obligations ADD COLUMN barcode TEXT;
ALTER TABLE tax_obligations ADD COLUMN financial_record_id TEXT;
ALTER TABLE tax_obligations ADD COLUMN sent_to_finance_at TEXT;
ALTER TABLE tax_obligations ADD COLUMN sent_to_finance_by TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tax_obligation_financial_record
  ON tax_obligations(financial_record_id)
  WHERE financial_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_financial_fiscal_origin
  ON financial_records(origin_type, origin_id)
  WHERE origin_type = 'FISCAL' AND origin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tax_obligations_company_period_status_due
  ON tax_obligations(company_id, period, status, due_date);

-- Conta específica para tributos sobre resultado/administrativos ainda não cobertos por deduções da receita.
INSERT INTO chart_of_accounts (id, company_id, code, name, type, nature, level, parent_code, balance)
SELECT 'coa-43', 'comp-1', '4.03', 'DESPESAS TRIBUTÁRIAS', 'SINTETICA', 'DEVEDORA', 2, '4', 0.0
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code='4.03');

INSERT INTO chart_of_accounts (id, company_id, code, name, type, nature, level, parent_code, balance)
SELECT 'coa-431', 'comp-1', '4.03.01.001', 'IRPJ, CSLL e Tributos sobre Resultado', 'ANALITICA', 'DEVEDORA', 3, '4.03', 0.0
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code='4.03.01.001');
