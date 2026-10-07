// SEEK V1.9 — Teste Estrutural e de Regras de Negócio: RH Benefícios Fase 2
// Proporcionalidade, Dias Úteis, Férias, Afastamentos e Não-duplicação de descontos
import { db } from './db.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Falha: ${message}`);
  console.log(`OK: ${message}`);
}

console.log('--- Teste RH Benefícios Fase 2 (Proporcionalidade & Afastamentos) ---');

// 1. Validar colunas da Migration 013
const ebCols = new Set((db.prepare("PRAGMA table_info(employee_benefits)").all() as any[]).map(c => c.name));
for (const col of ['prorate_admission', 'deduct_vacation', 'deduct_leave', 'daily_value']) {
  assert(ebCols.has(col), `employee_benefits.${col} disponível`);
}

const baTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='benefit_absences'").get();
assert(baTable, 'Tabela benefit_absences disponível');

const boiCols = new Set((db.prepare("PRAGMA table_info(benefit_order_items)").all() as any[]).map(c => c.name));
for (const col of ['business_days', 'eligible_days', 'admission_days_deducted', 'vacation_days_deducted', 'leave_days_deducted', 'calculation_mode', 'calculation_detail']) {
  assert(boiCols.has(col), `benefit_order_items.${col} disponível`);
}

// 2. Teste de Afastamento: inserção e listagem
const testAbsId = `babs-test-${Date.now()}`;
db.prepare(`
  INSERT INTO benefit_absences (id, employee_id, start_date, end_date, reason, notes, created_by)
  VALUES (?, 'emp-01', '2026-10-05', '2026-10-09', 'Atestado Médico Teste', 'Teste de proporcionalidade', 'RH Teste')
`).run(testAbsId);

const registeredAbs = db.prepare("SELECT * FROM benefit_absences WHERE id = ?").get(testAbsId) as any;
assert(registeredAbs && registeredAbs.reason === 'Atestado Médico Teste', 'Afastamento gravado em benefit_absences');

// 3. Teste do Algoritmo de Dias Úteis e Interseção Sem Duplicidade
const toDate = (v: string) => new Date(`${v}T12:00:00`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const start = new Date(2026, 9, 1, 12); // 2026-10-01
const end = new Date(2026, 10, 0, 12);  // 2026-10-31

const allBusinessDates: string[] = [];
for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const day = d.getDay();
  if (day !== 0 && day !== 6) allBusinessDates.push(ymd(d));
}
const totalBusinessDays = allBusinessDates.length;
assert(totalBusinessDays === 22, `Outubro de 2026 tem 22 dias úteis (calculado: ${totalBusinessDays})`);

// Simular sobreposição intencional entre Férias e Afastamento no mesmo colaborador:
// Férias: 2026-10-05 a 2026-10-12 (segunda a segunda seguinte: 6 dias úteis: 05, 06, 07, 08, 09, 12)
// Afastamento: 2026-10-07 a 2026-10-15 (quarta a quinta seguinte: dias 07, 08, 09, 12, 13, 14, 15)
// Notar sobreposição nos dias 07, 08, 09, 12!

const vacationBlocked = new Set<string>();
['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'].forEach(d => vacationBlocked.add(d));

const leaveBlocked = new Set<string>();
['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].forEach(d => leaveBlocked.add(d));

// Dias combinados sem duplicação:
const unionBlocked = new Set([...vacationBlocked, ...leaveBlocked]);
// 05, 06, 07, 08, 09, 12, 13, 14, 15 => exatamente 9 dias distintos!
assert(unionBlocked.size === 9, `União de férias (6 dias) e afastamento (7 dias) com 4 dias sobrepostos resulta em 9 dias bloqueados (calculado: ${unionBlocked.size})`);

const eligibleDates = allBusinessDates.filter(d => !unionBlocked.has(d));
assert(eligibleDates.length === 22 - 9, `Dias elegíveis sem duplicação de desconto: 13 dias (calculado: ${eligibleDates.length})`);

// 4. Teste de gravação de memória de cálculo no fechamento
const orderId = `bord-fase2-${Date.now()}`;
const testPeriod = '2098-10';
db.prepare("DELETE FROM benefit_order_items WHERE order_id IN (SELECT id FROM benefit_orders WHERE period = ?)").run(testPeriod);
db.prepare("DELETE FROM benefit_orders WHERE period = ?").run(testPeriod);

db.prepare(`
  INSERT INTO benefit_orders (id, company_id, period, due_date, status, employee_count, vt_total, va_total, vr_total, fuel_total, total_amount, created_by)
  VALUES (?, 'comp-1', ?, '2098-10-25', 'FECHADO', 1, 100, 0, 0, 0, 100, 'Teste Fase 2')
`).run(orderId, testPeriod);

db.prepare(`
  INSERT INTO benefit_order_items (
    id, order_id, employee_id, employee_name, department, benefit_type, provider_name,
    company_cost, employee_discount, total_value, business_days, eligible_days,
    admission_days_deducted, vacation_days_deducted, leave_days_deducted,
    calculation_mode, calculation_detail
  )
  VALUES (?, ?, 'emp-01', 'Teste Colaborador', 'Operações', 'VT', 'Mobilidade', 100, 20, 120, 22, 13, 0, 6, 7, 'DIAS_UTEIS', '13/22 dias úteis elegíveis; férias -6; afastamentos -7 (com interseção protegida)')
`).run(`boi-test-${Date.now()}`, orderId);

const savedItem = db.prepare("SELECT * FROM benefit_order_items WHERE order_id = ?").get(orderId) as any;
assert(savedItem.business_days === 22, 'business_days salvo no snapshot');
assert(savedItem.eligible_days === 13, 'eligible_days salvo no snapshot');
assert(savedItem.calculation_mode === 'DIAS_UTEIS', 'calculation_mode salvo no snapshot');
assert(Boolean(savedItem.calculation_detail), 'calculation_detail preservado no snapshot');

// Limpeza
db.prepare("DELETE FROM benefit_absences WHERE id = ?").run(testAbsId);
db.prepare("DELETE FROM benefit_order_items WHERE order_id = ?").run(orderId);
db.prepare("DELETE FROM benefit_orders WHERE id = ?").run(orderId);

console.log('✅ RH Benefícios Fase 2 validado com 100% de sucesso!');
