// SEEK V1.9 — teste estrutural do fluxo RH → Financeiro → Contabilidade
// Executar após migrations com: npx tsx src/test_hr_finance_integration.ts
import { db } from './db.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Falha: ${message}`);
  console.log(`OK: ${message}`);
}

const payrollRuns = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='payroll_runs'").get();
const payrollItems = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='payroll_items'").get();
assert(payrollRuns, 'Tabela payroll_runs disponível');
assert(payrollItems, 'Tabela payroll_items disponível');

const vacationCols = db.prepare('PRAGMA table_info(vacation_requests)').all() as any[];
assert(vacationCols.some(c => c.name === 'financial_record_id'), 'Férias possuem vínculo com obrigação financeira');

const financeCols = db.prepare('PRAGMA table_info(financial_records)').all() as any[];
assert(financeCols.some(c => c.name === 'origin_type'), 'Financeiro preserva módulo de origem');
assert(financeCols.some(c => c.name === 'origin_id'), 'Financeiro preserva entidade de origem');

console.log('Fluxo estrutural RH → Financeiro → Contabilidade validado.');
