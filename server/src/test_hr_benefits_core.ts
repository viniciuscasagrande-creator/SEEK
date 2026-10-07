// SEEK V1.9 — Teste Estrutural: RH Benefícios (VT, VA, VR, Combustível)
import { db } from './db.js';

function assert(ok: unknown, message: string) {
  if (!ok) throw new Error(`FALHA: ${message}`);
  console.log(`OK: ${message}`);
}

assert(Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_benefits'").get()), 'Tabela employee_benefits disponível');
assert(Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='benefit_orders'").get()), 'Tabela benefit_orders disponível');
assert(Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='benefit_order_items'").get()), 'Tabela benefit_order_items disponível');

const cols = db.prepare("PRAGMA table_info(employee_benefits)").all() as any[];
const colNames = new Set(cols.map(c => c.name));
for (const col of ['benefit_type', 'enabled', 'company_cost', 'employee_discount', 'monthly_value']) {
  assert(colNames.has(col), `employee_benefits.${col} disponível`);
}
const count = db.prepare("SELECT COUNT(*) as count FROM employee_benefits").get() as { count: number };
assert(count.count >= 0, `Registros de employee_benefits: ${count.count}`);

console.log('Integração estrutural RH Benefícios 100% validada.');
