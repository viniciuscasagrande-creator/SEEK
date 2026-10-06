-- SEEK V1.9 — Core Transacional Financeiro
CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_tx_reference ON bank_transactions(reference_type, reference_id) WHERE reference_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_accounting_settlement_origin ON accounting_entries(origin_type, origin_id) WHERE origin_id IS NOT NULL AND origin_type = 'LIQUIDACAO_FINANCEIRA';
CREATE INDEX IF NOT EXISTS ix_financial_records_company_status_due ON financial_records(company_id, status, due_date);
CREATE INDEX IF NOT EXISTS ix_bank_transactions_account_reconciled_date ON bank_transactions(account_id, reconciled, transaction_date);
