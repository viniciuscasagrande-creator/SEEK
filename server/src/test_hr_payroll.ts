import assert from 'node:assert';
import { db } from './db.js';
import { payrollService } from './services/payroll.service.js';

async function runPayrollTests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES: MOTOR DE RH & FOLHA DE PAGAMENTO (CLT)');
  console.log('================================================================\n');

  let passed = 0;

  // 1. TESTE DE CÁLCULO TRABALHISTA CLT
  const calc5000 = payrollService.calculateTaxes(5000.0, 0, 1, true);
  assert(calc5000.baseSalary === 5000.0, 'Salário base R$ 5.000,00 registrado');
  assert(calc5000.grossSalary === 5000.0, 'Salário bruto sem HE igual ao salário base');
  // INSS para R$ 5.000,00: faixa 14% -> (5000 * 0.14) - 181.18 = 518.82
  assert(calc5000.inssDeduction > 500 && calc5000.inssDeduction < 530, `INSS progressivo calculado corretamente (R$ ${calc5000.inssDeduction})`);
  // IRRF: Base = 5000 - INSS - (1 * 189.59) ~ 4291.59 -> faixa 22.5% - 662.77
  assert(calc5000.irrfDeduction > 250 && calc5000.irrfDeduction < 350, `IRRF com dedução de dependente calculado (R$ ${calc5000.irrfDeduction})`);
  // FGTS 8% de 5000 = 400.00
  assert(calc5000.fgtsAmount === 400.0, `FGTS patronal de 8% calculado exatamente (R$ ${calc5000.fgtsAmount})`);
  // VT limitado a R$ 250.00
  assert(calc5000.vtDeduction === 250.0, `Vale transporte descontado com teto (R$ ${calc5000.vtDeduction})`);
  // Salário Líquido = Bruto - Descontos
  assert(calc5000.netSalary === Math.round((calc5000.grossSalary - calc5000.totalDeductions) * 100) / 100, 'Salário líquido bate com total de proventos menos descontos');
  passed++;
  console.log('[PASS] Motor de cálculo CLT oficial validado (INSS progressivo, IRRF c/ dependentes, FGTS e VT)');

  // 2. TESTE DE HORAS EXTRAS & REFLEXO DSR
  const calcWithOvertime = payrollService.calculateTaxes(4400.0, 10, 0, false);
  // Valor hora = 4400 / 220 = 20. HE 50% = 30 * 10 = 300. DSR = (300 / 25) * 5 = 60. Bruto = 4760
  assert(calcWithOvertime.overtimeAmount === 300.0, `Horas extras 50% calculadas (R$ ${calcWithOvertime.overtimeAmount})`);
  assert(calcWithOvertime.dsrAmount === 60.0, `Reflexo de DSR sobre horas extras apurado (R$ ${calcWithOvertime.dsrAmount})`);
  assert(calcWithOvertime.grossSalary === 4760.0, `Salário bruto incorporou HE e DSR (R$ ${calcWithOvertime.grossSalary})`);
  passed++;
  console.log('[PASS] Horas extras com adicional 50% e reflexo em DSR calculados com precisão');

  // 3. TESTE DE SIMULAÇÃO DE HOLERITE VIA SERVIÇO
  const sim = payrollService.simulatePayslip('emp-01', { overtimeHours: 5, dependentsCount: 2 });
  assert(sim.employee.fullName === 'Administrador Geral', 'Simulação identificou o colaborador correto');
  assert(sim.calculation.grossSalary > sim.calculation.baseSalary, 'Simulação aplicou proventos de horas extras');
  passed++;
  console.log('[PASS] Simulação interativa de holerite individual em tempo real aprovada');

  // 4. TESTE DE PROCESSAMENTO EM LOTE DA FOLHA (BATCH RUN)
  const testPeriod = `2099-${String((Date.now() % 12) + 1).padStart(2, '0')}`;
  db.prepare('DELETE FROM payslips WHERE period = ?').run(testPeriod);
  db.prepare('DELETE FROM payroll_runs WHERE period = ?').run(testPeriod);
  db.prepare("DELETE FROM financial_records WHERE origin_type = 'FOLHA_PAGAMENTO' AND code LIKE ?").run(`%${testPeriod.replace('-', '')}%`);
  db.prepare("DELETE FROM accounting_entries WHERE origin_type = 'FOLHA_PAGAMENTO' AND period = ?").run(testPeriod);

  const runResult = payrollService.processPayrollRun(testPeriod, 'comp-1');
  assert(runResult.totalEmployees > 0, `Folha processada para ${runResult.totalEmployees} colaboradores`);
  assert(runResult.totalGross > 0 && runResult.totalNet > 0, 'Totais da folha calculados com sucesso');
  assert(runResult.payslipsCount === runResult.totalEmployees, 'Todos os colaboradores ativos receberam holerite');
  passed++;
  console.log(`[PASS] Fechamento em lote da folha da competência ${testPeriod} gerou ${runResult.payslipsCount} holerites`);

  // 5. TESTE DE INTEGRAÇÃO COM FINANCEIRO E CONTABILIDADE (E2E ERP)
  const integration = payrollService.integrateRunWithFinanceAndAccounting(runResult.runId);
  assert(integration.success === true, 'Integração da folha concluída com sucesso');
  assert(integration.status === 'APROVADO', 'Status da folha atualizado para APROVADO');
  assert(integration.financialRecords.length === 3, '3 títulos criados no Contas a Pagar (Salários Líquidos, FGTS e INSS)');

  // Verifica persistência no Contas a Pagar
  const finSalaries = db.prepare("SELECT * FROM financial_records WHERE code LIKE ?").get(`%${testPeriod.replace('-', '')}%`) as any;
  assert(Boolean(finSalaries), 'Título de salários líquidos persistido em financial_records');

  // Verifica persistência no Livro Diário
  const journalEntry = db.prepare("SELECT * FROM accounting_entries WHERE origin_id = ?").get(runResult.runId) as any;
  assert(Boolean(journalEntry), 'Lançamento contábil de provisão da folha registrado no Livro Diário em partidas dobradas');

  // Verifica trilha de auditoria
  const audit = db.prepare("SELECT * FROM audit_logs WHERE module = 'RH & Folha de Pagamento' AND action = 'APPROVE' ORDER BY rowid DESC LIMIT 1").get() as any;
  assert(Boolean(audit && audit.action === 'APPROVE'), 'Auditoria imutável registrou a aprovação formal da folha');
  passed++;
  console.log('[PASS] Integração E2E: Folha gerou títulos no Contas a Pagar, partidas dobradas na Contabilidade e auditoria');

  // 6. TESTE DE IDEMPOTÊNCIA E BLOQUEIO DE DUPLICIDADE
  let duplicateBlocked = false;
  try {
    payrollService.integrateRunWithFinanceAndAccounting(runResult.runId);
  } catch (err: any) {
    duplicateBlocked = err.statusCode === 409;
  }
  assert(duplicateBlocked, 'Tentativa de re-integrar folha já aprovada é rejeitada com HTTP 409');
  passed++;
  console.log('[PASS] Idempotência corporativa: bloqueio contra integração de folha em duplicidade ativo');

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL TESTES RH & PAYROLL: ${passed} APROVADOS / 0 FALHAS`);
  console.log('================================================================');
}

runPayrollTests().catch(err => {
  console.error('Falha nos testes de RH e Folha:', err);
  process.exit(1);
});
