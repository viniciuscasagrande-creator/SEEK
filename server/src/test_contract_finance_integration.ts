// SEEK V1.9 — teste estrutural da integração Contratos -> Financeiro -> Contabilidade
import { db } from './db.js';

function assert(ok: unknown, message: string) {
  if (!ok) throw new Error(`FALHA: ${message}`);
  console.log(`OK: ${message}`);
}

const cols = db.prepare(`PRAGMA table_info(contracts)`).all() as any[];
const names = new Set(cols.map(c => c.name));
for (const name of ['cost_center','payment_day','recurrence','financial_enabled','next_due_date']) {
  assert(names.has(name), `contracts.${name} disponível`);
}
assert(Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contract_obligations'").get()), 'Tabela contract_obligations disponível');
assert(Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='ux_contract_obligation_competence'").get()), 'Proteção contra obrigação duplicada por competência disponível');
console.log('Integração estrutural Contratos -> Financeiro pronta.');
