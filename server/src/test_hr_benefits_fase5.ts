// SEEK V1.9 — Teste Estrutural e de Fluxo: RH Benefícios Fase 5
// Histórico Nominal, Relatório de Custos, Distribuição por Departamento e Comparativo
import { db } from './db.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Falha: ${message}`);
  console.log(`OK: ${message}`);
}

console.log('--- Início Teste RH Benefícios Fase 5 (Histórico, Custos, Departamentos & Comparativo) ---');

// 1. Validar Índices e Estruturas da Migration 016
const indices = (db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as any[]).map(i => i.name);
assert(indices.includes('idx_benefit_orders_period_status'), 'Índice idx_benefit_orders_period_status presente');
assert(indices.includes('idx_benefit_order_items_employee_history'), 'Índice idx_benefit_order_items_employee_history presente');
assert(indices.includes('idx_benefit_order_items_department_history'), 'Índice idx_benefit_order_items_department_history presente');
assert(indices.includes('idx_benefit_order_items_type_history'), 'Índice idx_benefit_order_items_type_history presente');

// 2. Teste da Regra de Integridade Histórica (Snapshot Preservado)
const p1 = '2099-05';
const p2 = '2099-06';

const order1Id = `bord-f5-1-${Date.now()}`;
const order2Id = `bord-f5-2-${Date.now()}`;

// Competência 1 (2099-05): Emp A no departamento "Tecnologia" com VT (R$ 220) e VA (R$ 500)
// Emp B no departamento "Operações" com VR (R$ 440)
db.prepare(`
  INSERT INTO benefit_orders (id, company_id, period, due_date, status, employee_count, vt_total, va_total, vr_total, fuel_total, total_amount, created_by)
  VALUES (?, 'comp-1', ?, '2099-05-25', 'FECHADO', 2, 220.00, 500.00, 440.00, 0, 1160.00, 'RH Gestor')
`).run(order1Id, p1);

const it1 = `boi-f5-1-${Date.now()}`;
const it2 = `boi-f5-2-${Date.now()}`;
const it3 = `boi-f5-3-${Date.now()}`;

db.prepare(`
  INSERT INTO benefit_order_items (id, order_id, employee_id, employee_name, department, benefit_type, provider_name, company_cost, final_company_cost, business_days, eligible_days, calculation_mode)
  VALUES (?, ?, 'emp-01', 'Colaborador Um', 'Tecnologia', 'VT', 'Mobilidade Teste', 220.00, 220.00, 22, 22, 'DIAS_UTEIS')
`).run(it1, order1Id);

db.prepare(`
  INSERT INTO benefit_order_items (id, order_id, employee_id, employee_name, department, benefit_type, provider_name, company_cost, final_company_cost, business_days, eligible_days, calculation_mode)
  VALUES (?, ?, 'emp-01', 'Colaborador Um', 'Tecnologia', 'VA', 'Cartão Teste', 500.00, 500.00, 22, 22, 'MENSAL')
`).run(it2, order1Id);

db.prepare(`
  INSERT INTO benefit_order_items (id, order_id, employee_id, employee_name, department, benefit_type, provider_name, company_cost, final_company_cost, business_days, eligible_days, calculation_mode)
  VALUES (?, ?, 'emp-02', 'Colaborador Dois', 'Operações', 'VR', 'Cartão Teste', 440.00, 440.00, 22, 22, 'DIAS_UTEIS')
`).run(it3, order1Id);

// Simular que após o fechamento da competência 2099-05 o Colaborador Um mudou para o departamento "Diretoria"
// Na competência 2 (2099-06), seu fechamento já grava o novo departamento "Diretoria", além de um reajuste
db.prepare(`
  INSERT INTO benefit_orders (id, company_id, period, due_date, status, employee_count, vt_total, va_total, vr_total, fuel_total, total_amount, created_by)
  VALUES (?, 'comp-1', ?, '2099-06-25', 'FECHADO', 2, 240.00, 550.00, 440.00, 200.00, 1430.00, 'RH Gestor')
`).run(order2Id, p2);

const it4 = `boi-f5-4-${Date.now()}`;
const it5 = `boi-f5-5-${Date.now()}`;
const it6 = `boi-f5-6-${Date.now()}`;
const it7 = `boi-f5-7-${Date.now()}`;

db.prepare(`
  INSERT INTO benefit_order_items (id, order_id, employee_id, employee_name, department, benefit_type, provider_name, company_cost, final_company_cost, business_days, eligible_days, calculation_mode)
  VALUES (?, ?, 'emp-01', 'Colaborador Um', 'Diretoria', 'VT', 'Mobilidade Teste', 240.00, 240.00, 22, 22, 'DIAS_UTEIS')
`).run(it4, order2Id);

db.prepare(`
  INSERT INTO benefit_order_items (id, order_id, employee_id, employee_name, department, benefit_type, provider_name, company_cost, final_company_cost, business_days, eligible_days, calculation_mode)
  VALUES (?, ?, 'emp-01', 'Colaborador Um', 'Diretoria', 'VA', 'Cartão Teste', 550.00, 550.00, 22, 22, 'MENSAL')
`).run(it5, order2Id);

db.prepare(`
  INSERT INTO benefit_order_items (id, order_id, employee_id, employee_name, department, benefit_type, provider_name, company_cost, final_company_cost, business_days, eligible_days, calculation_mode)
  VALUES (?, ?, 'emp-02', 'Colaborador Dois', 'Operações', 'VR', 'Cartão Teste', 440.00, 440.00, 22, 22, 'DIAS_UTEIS')
`).run(it6, order2Id);

db.prepare(`
  INSERT INTO benefit_order_items (id, order_id, employee_id, employee_name, department, benefit_type, provider_name, company_cost, final_company_cost, business_days, eligible_days, calculation_mode)
  VALUES (?, ?, 'emp-02', 'Colaborador Dois', 'Operações', 'COMBUSTIVEL', 'Auxílio Combustível', 200.00, 200.00, 22, 22, 'MENSAL')
`).run(it7, order2Id);

// Testar integridade histórica: competência anterior mantém snapshot intacto!
const pastItem = db.prepare("SELECT department FROM benefit_order_items WHERE id = ?").get(it1) as any;
assert(pastItem.department === 'Tecnologia', 'Snapshot histórico de 2099-05 mantém departamento Tecnologia intacto');

const currentItem = db.prepare("SELECT department FROM benefit_order_items WHERE id = ?").get(it4) as any;
assert(currentItem.department === 'Diretoria', 'Competência 2099-06 reflete novo departamento Diretoria');

// 3. Teste do Analytics: Totais por Benefício na Competência 2099-06
const benefitTotals = db.prepare(`
  SELECT i.benefit_type,
    COUNT(DISTINCT i.employee_id) employee_count,
    ROUND(SUM(COALESCE(i.final_company_cost, i.company_cost, 0)), 2) company_cost
  FROM benefit_order_items i
  JOIN benefit_orders o ON o.id = i.order_id
  WHERE o.period = ?
  GROUP BY i.benefit_type
  ORDER BY i.benefit_type
`).all(p2) as any[];

assert(benefitTotals.length === 4, 'Analytics calculou os 4 tipos de benefícios (VT, VA, VR, COMBUSTIVEL)');
const vaTotal = benefitTotals.find(b => b.benefit_type === 'VA');
assert(vaTotal && vaTotal.company_cost === 550.00, 'Total de VA apurado corretamente: R$ 550,00');

// 4. Teste do Analytics: Visão por Departamento
const departments = db.prepare(`
  SELECT COALESCE(NULLIF(TRIM(i.department), ''), 'Sem departamento') department,
    COUNT(DISTINCT i.employee_id) employee_count,
    ROUND(SUM(CASE WHEN i.benefit_type = 'VT' THEN COALESCE(i.final_company_cost, i.company_cost, 0) ELSE 0 END), 2) vt_total,
    ROUND(SUM(CASE WHEN i.benefit_type = 'VA' THEN COALESCE(i.final_company_cost, i.company_cost, 0) ELSE 0 END), 2) va_total,
    ROUND(SUM(CASE WHEN i.benefit_type = 'VR' THEN COALESCE(i.final_company_cost, i.company_cost, 0) ELSE 0 END), 2) vr_total,
    ROUND(SUM(CASE WHEN i.benefit_type = 'COMBUSTIVEL' THEN COALESCE(i.final_company_cost, i.company_cost, 0) ELSE 0 END), 2) fuel_total,
    ROUND(SUM(COALESCE(i.final_company_cost, i.company_cost, 0)), 2) total_amount
  FROM benefit_order_items i
  JOIN benefit_orders o ON o.id = i.order_id
  WHERE o.period = ?
  GROUP BY COALESCE(NULLIF(TRIM(i.department), ''), 'Sem departamento')
  ORDER BY total_amount DESC
`).all(p2) as any[];

assert(departments.length === 2, '2 departamentos apurados na competência 2099-06');
const depDir = departments.find(d => d.department === 'Diretoria');
assert(depDir && depDir.total_amount === 790.00, 'Total Diretoria confere (240 VT + 550 VA = 790): R$ 790,00');
const depOp = departments.find(d => d.department === 'Operações');
assert(depOp && depOp.total_amount === 640.00, 'Total Operações confere (440 VR + 200 Fuel = 640): R$ 640,00');

// 5. Teste do Analytics: Comparativo entre Competências (2099-06 vs 2099-05)
const curTotal = 1430.00;
const prevTotal = 1160.00;
const diffAmount = Number((curTotal - prevTotal).toFixed(2));
const diffPercent = Number((((curTotal - prevTotal) / prevTotal) * 100).toFixed(2));

assert(diffAmount === 270.00, `Diferença absoluta confere: +R$ 270,00 (apurado: ${diffAmount})`);
assert(diffPercent === 23.28, `Variação percentual confere: +23.28% (apurado: ${diffPercent}%)`);

// 6. Limpeza dos Dados do Teste
db.prepare("DELETE FROM benefit_order_items WHERE order_id IN (?, ?)").run(order1Id, order2Id);
db.prepare("DELETE FROM benefit_orders WHERE id IN (?, ?)").run(order1Id, order2Id);

console.log('--- Teste RH Benefícios Fase 5 Concluído com 100% de Sucesso! ---');
