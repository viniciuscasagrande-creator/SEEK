-- SEEK V1.9 — RH Benefícios Fase 5: histórico e relatórios gerenciais
-- Os relatórios usam os snapshots já gravados em benefit_order_items; não duplicam dados históricos.
CREATE INDEX IF NOT EXISTS idx_benefit_orders_period_status ON benefit_orders(period, status);
CREATE INDEX IF NOT EXISTS idx_benefit_order_items_employee_history ON benefit_order_items(employee_id, order_id);
CREATE INDEX IF NOT EXISTS idx_benefit_order_items_department_history ON benefit_order_items(department, order_id);
CREATE INDEX IF NOT EXISTS idx_benefit_order_items_type_history ON benefit_order_items(benefit_type, order_id);

-- Compatibilidade com fechamentos anteriores à Fase 3: somente snapshots sem memória de cálculo.
UPDATE benefit_order_items SET final_company_cost = company_cost WHERE COALESCE(final_company_cost,0)=0 AND COALESCE(company_cost,0)>0 AND calculation_detail IS NULL;
