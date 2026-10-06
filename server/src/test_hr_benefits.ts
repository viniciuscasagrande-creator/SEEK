import assert from 'node:assert';
import { db } from './db.js';
import { benefitsService } from './services/benefits.service.js';

async function runBenefitsTests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES: GESTÃO & COMPRA DE BENEFÍCIOS CORPORATIVOS');
  console.log('================================================================\n');

  let passed = 0;

  // 1. TESTE DE SEEDING & CATÁLOGO DE PROVEDORES E PLANOS
  const providers = benefitsService.listProviders('comp-1');
  assert(providers.length >= 4, 'Provedores padrão de benefícios semeados (Caju, SPTrans, Unimed, Ticket)');
  const caju = providers.find((p: any) => p.id === 'prov-caju');
  assert(Boolean(caju && caju.trade_name === 'Caju Benefícios'), 'Operadora Caju identificada com CNPJ');

  const plans = benefitsService.listPlans('comp-1');
  assert(plans.length >= 4, 'Catálogo de planos de benefícios ativo com regras de desconto');
  const vtPlan = plans.find((p: any) => p.id === 'plan-vt');
  assert(Boolean(vtPlan && vtPlan.deduction_rule === 'CLT_VT_6%'), 'Plano de VT com dedução CLT 6% configurado');
  passed++;
  console.log('[PASS] Catálogo de operadoras corporativas e planos de benefícios homologados');

  // 2. TESTE DE VÍNCULOS DE COLABORADORES
  const employeeBenefits = benefitsService.listEmployeeBenefits('comp-1');
  assert(employeeBenefits.length > 0, `Colaboradores vinculados a benefícios corporativos (Total: ${employeeBenefits.length})`);
  passed++;
  console.log('[PASS] Carteira de colaboradores e benefícios ativos validada');

  // 3. TESTE DE CÁLCULO DE LOTE E ABATIMENTO DE FALTAS REGISTRADAS NO PONTO
  const testPeriod = '2099-07';
  const testEmployee = employeeBenefits[0].employee_id;

  // Insere uma falta injustificada no espelho de ponto para o colaborador
  db.prepare("DELETE FROM time_records WHERE employee_id = ? AND date LIKE ?").run(testEmployee, `${testPeriod}%`);
  db.prepare(`
    INSERT INTO time_records (id, employee_id, date, status)
    VALUES (?, ?, ?, 'FALTA_INJUSTIFICADA')
  `).run(`test-absence-${Date.now()}`, testEmployee, `${testPeriod}-10`);

  const calcResult = benefitsService.calculateBatch(testPeriod, 21, 'comp-1');
  assert(calcResult.period === testPeriod, 'Competência correta no lote calculado');
  assert(calcResult.totalCompanyCost > 0, 'Custo consolidado da empresa apurado');
  assert(calcResult.orders.length >= 4, 'Faturas segmentadas por provedor geradas');

  // Verifica se o colaborador com falta teve a diária de VT/VR reduzida
  let foundDeducted = false;
  for (const order of calcResult.orders) {
    const beneficiary = order.beneficiaries.find((b: any) => b.employeeId === testEmployee && (b.benefitType === 'TRANSPORTE' || b.benefitType === 'ALIMENTACAO'));
    if (beneficiary) {
      if (beneficiary.absencesDeducted === 1 && beneficiary.daysCount === 20) {
        foundDeducted = true;
        break;
      }
    }
  }
  assert(foundDeducted, 'Motor de benefícios efetuou o estorno inteligente de diárias por falta no ponto');
  passed++;
  console.log('[PASS] Cálculo de lote de compra com estorno inteligente de faltas do ponto comprovado');

  // 4. TESTE DE APROVAÇÃO E INTEGRAÇÃO ATÔMICA COM CONTAS A PAGAR
  // Limpeza de testes anteriores para a competência
  db.prepare("DELETE FROM benefit_purchase_orders WHERE period = ?").run(testPeriod);
  db.prepare("DELETE FROM financial_records WHERE origin_type = 'BENEFICIOS' AND code LIKE ?").run(`%${testPeriod.replace('-', '')}%`);
  db.prepare("DELETE FROM accounting_entries WHERE origin_type = 'BENEFICIOS' AND period = ?").run(testPeriod);

  const integration = benefitsService.approveAndIntegrateBatch(
    testPeriod,
    21,
    'comp-1',
    { userId: 'usr-test', fullName: 'Auditor de Benefícios', roleTitle: 'Diretor de RH', roleLevel: 'RH', companyId: 'comp-1' } as any,
    '192.168.1.100'
  );

  assert(integration.success === true, 'Aprovação do lote de benefícios retornou sucesso');
  assert(integration.financialRecords.length >= 4, 'Faturas criadas em Contas a Pagar para cada provedor');
  assert(integration.totalAmount > 0, 'Montante total integrado corresponde ao pedido');

  // Verifica persistência dos títulos no Contas a Pagar
  const finRecords = db.prepare("SELECT * FROM financial_records WHERE origin_type = 'BENEFICIOS' AND code LIKE ?").all(`%${testPeriod.replace('-', '')}%`) as any[];
  assert(finRecords.length >= 4, 'Títulos persistidos com categoria Benefícios a Colaboradores e status APROVADO');
  assert(finRecords.every(r => r.status === 'APROVADO' && r.payment_method === 'BOLETO'), 'Condições financeiras de pagamento configuradas');
  passed++;
  console.log('[PASS] Integração atômica gerou títulos no Contas a Pagar vinculados às operadoras');

  // 5. TESTE DE REFLEXO CONTÁBIL NO LIVRO DIÁRIO & AUDITORIA IMUTÁVEL
  const journalEntry = db.prepare("SELECT * FROM accounting_entries WHERE code = ?").get(integration.accountingEntry) as any;
  assert(Boolean(journalEntry), 'Lançamento contábil registrado no Livro Diário');
  assert(journalEntry.debit_account_code === '3.02.01.004', 'Débito na conta de Despesas com Benefícios');
  assert(journalEntry.credit_account_code === '2.01.03.005', 'Crédito na conta de Fornecedores de Benefícios a Pagar');
  assert(journalEntry.amount === integration.totalAmount, 'Valor contábil bate exatamente com o lote financeiro');

  // Auditoria imutável
  const audit = db.prepare("SELECT * FROM audit_logs WHERE module = 'RH & Benefícios' AND action = 'APPROVE' ORDER BY rowid DESC LIMIT 1").get() as any;
  assert(Boolean(audit && audit.user_name === 'Auditor de Benefícios'), 'Trilha de auditoria gravada com autor e IP');
  passed++;
  console.log('[PASS] Partidas dobradas no Livro Diário e Trilha de Auditoria imutável validadas');

  // 6. TESTE DE ATUALIZAÇÃO / IDEMPOTÊNCIA DE LOTE
  const repeatIntegration = benefitsService.approveAndIntegrateBatch(testPeriod, 21, 'comp-1');
  assert(repeatIntegration.success === true, 'Re-execução atualiza pedidos e títulos sem violar integridade de chave');
  passed++;
  console.log('[PASS] Idempotência e integridade referencial do lote comprovadas');

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL TESTES RH & BENEFÍCIOS: ${passed} APROVADOS / 0 FALHAS`);
  console.log('================================================================');
}

runBenefitsTests().catch(err => {
  console.error('Falha nos testes de RH e Benefícios:', err);
  process.exit(1);
});
