// SEEK V1.9 — Teste Integrado E2E do Ciclo Transacional Financeiro Completo
// Fluxo: Despesa -> Aprovação -> Título -> Pagamento -> Banco -> OFX Real -> Conciliação -> Contabilidade -> Auditoria
import { db } from './db.js';
import { financeService } from './services/finance.service.js';
import { financeRepository } from './repositories/finance.repository.js';
import { TokenPayload } from './middleware/auth.js';

async function runFinanceE2eTest() {
  console.log('================================================================');
  console.log('INICIANDO TESTE E2E: CICLO TRANSACIONAL FINANCEIRO + OFX REAL');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const mockUser: TokenPayload = {
    id: 'usr-admin-1',
    email: 'admin@seek.corp',
    fullName: 'Carlos Eduardo Nogueira',
    companyId: 'comp-1',
    branchId: 'branch-1',
    roleLevel: 'ADMIN_GERAL',
    roleTitle: 'Diretor Financeiro & Controladoria',
    department: 'Controladoria & Finanças',
    approvalLimitAmount: 500000.0,
    accessibleModules: ['*'],
    sessionId: 'sess-e2e-1'
  };

  const accountId = `bank-itau-${Date.now()}`;
  const initialBalance = 50000.0;

  // 1. SETUP: Criação de Conta Bancária Corporativa
  financeRepository.createBankAccount({
    id: accountId,
    bank_name: 'Banco Itaú S.A.',
    bank_code: '341',
    agency: '0057',
    account_number: '98765-4',
    current_balance: initialBalance,
    active: 1
  });

  const createdAccount = financeRepository.findBankAccountById(accountId);
  assert(Boolean(createdAccount) && createdAccount?.current_balance === 50000.0, 'Setup: Conta bancária criada com saldo de R$ 50.000,00');

  // 2. CADASTRO DE TÍTULO DE DESPESA (R$ 5.000,00)
  const expenseRecord = financeService.createRecord({
    title: 'Infraestrutura Cloud & Servidores Dedicados',
    entityName: 'Cloud Services Brasil SA',
    costCenter: 'Operações & Infraestrutura',
    category: 'Infraestrutura Cloud',
    amount: 5000.0,
    dueDate: '2026-10-15',
    type: 'PAGAR',
    paymentMethod: 'PIX',
    companyId: 'comp-1'
  }, mockUser);

  assert(expenseRecord.status === 'PREVISTO', 'Título financeiro criado com status PREVISTO');
  assert(expenseRecord.amount === 5000.0, 'Valor do título validado em R$ 5.000,00');

  // Verifica se o reflexo contábil de reconhecimento da despesa foi gerado (D-Despesa / C-Fornecedores)
  const recognitionEntry = db.prepare(`
    SELECT * FROM accounting_entries
    WHERE origin_type = 'RECONHECIMENTO_FINANCEIRO' AND origin_id = ?
  `).get(expenseRecord.id) as any;
  assert(Boolean(recognitionEntry) && recognitionEntry.debit_account_code.startsWith('4.') && recognitionEntry.credit_account_code.startsWith('2.'), 'Contabilidade: Reconhecimento da despesa registrado em partidas dobradas (D 4.x / C 2.x)');

  // 3. PROGRAMAÇÃO E LIQUIDAÇÃO BANCÁRIA
  const settleResult = financeService.liquidateRecord(expenseRecord.id, {
    bankId: accountId,
    paymentMethod: 'PIX',
    paymentDate: '2026-10-06'
  }, mockUser);

  assert(settleResult.success === true, 'Liquidação efetuada com sucesso');

  const reloadedAccountAfterSettle = financeRepository.findBankAccountById(accountId);
  assert(reloadedAccountAfterSettle?.current_balance === 45000.0, 'Saldo bancário debitado atomicamente de R$ 50.000,00 para R$ 45.000,00');

  const systemBankTx = db.prepare(`
    SELECT * FROM bank_transactions WHERE id = ?
  `).get(settleResult.bankTransactionId) as any;
  assert(Boolean(systemBankTx) && systemBankTx.reconciled === 0, 'Movimentação bancária criada no extrato interno com reconciled = 0 (Pendente)');

  const settlementAccounting = db.prepare(`
    SELECT * FROM accounting_entries
    WHERE origin_type = 'LIQUIDACAO_FINANCEIRA' AND origin_id = ?
  `).get(expenseRecord.id) as any;
  assert(Boolean(settlementAccounting) && settlementAccounting.debit_account_code.startsWith('2.') && settlementAccounting.credit_account_code.startsWith('1.'), 'Contabilidade: Baixa financeira registrada em partidas dobradas (D Fornecedores / C Banco)');

  // 4. PREPARAÇÃO E IMPORTAÇÃO DO ARQUIVO OFX
  const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>20261006120000
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>341
<ACCTID>98765-4
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20261001
<DTEND>20261006
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261006120000[-03:EST]
<TRNAMT>-5000.00
<FITID>202610060001001
<CHECKNUM>001001
<MEMO>PIX TRANSF CLOUD SERVICES BRASIL
</STMTTRN>
<STMTTRN>
<TRNTYPE>FEE
<DTPOSTED>20261006120000[-03:EST]
<TRNAMT>-45.00
<FITID>202610060001002
<CHECKNUM>001002
<MEMO>TARIFA MENSAL MANUTENCAO CONTA PIX
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>44955.00
<DTASOF>20261006
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  const importResult = financeService.importOfx(accountId, ofxContent, 'extrato_itau_outubro.ofx', mockUser);
  assert(importResult.success === true, 'Importação OFX realizada com sucesso');
  assert(importResult.newCount === 2, '2 novas transações inseridas a partir do extrato OFX');
  assert(importResult.duplicateCount === 0, 'Zero transações duplicadas na primeira importação');

  // 5. TESTE DE IDEMPOTÊNCIA BANCÁRIA (FITID DEDUPLICATION)
  const reImportResult = financeService.importOfx(accountId, ofxContent, 'extrato_itau_outubro.ofx', mockUser);
  assert(reImportResult.newCount === 0, 'Idempotência: Nenhuma nova transação inserida ao reimportar o mesmo OFX');
  assert(reImportResult.duplicateCount === 2, 'Idempotência: 2 transações duplicadas detectadas e preservadas via FITID');

  // 6. SUGESTÃO E CONCILIAÇÃO INTELIGENTE (MATCH DE MOVIMENTOS)
  const ofxList = financeService.listOfxTransactions(accountId);
  const ofx5000 = ofxList.find(t => t.fitid === '202610060001001');
  assert(Boolean(ofx5000), 'Transação OFX R$ 5.000,00 localizada no banco');
  assert(Boolean(ofx5000?.candidates && ofx5000.candidates.length > 0), 'Motor de conciliação sugeriu com sucesso a movimentação correspondente do sistema');

  const matchResult = financeService.matchAndReconcile(ofx5000!.id, systemBankTx.id, mockUser);
  assert(matchResult.success === true, 'Match e conciliação efetuados com sucesso');

  const reloadedSystemBankTx = db.prepare('SELECT * FROM bank_transactions WHERE id = ?').get(systemBankTx.id) as any;
  assert(reloadedSystemBankTx.reconciled === 1, 'Movimentação do sistema atualizada para reconciled = 1');

  const reloadedOfx5000 = db.prepare('SELECT * FROM ofx_transactions WHERE id = ?').get(ofx5000!.id) as any;
  assert(reloadedOfx5000.status === 'CONCILIADO' && reloadedOfx5000.matched_bank_tx_id === systemBankTx.id, 'Transação OFX atualizada para CONCILIADO com vínculo de chave estrangeira');

  // 7. CONCILIAÇÃO AVULSA COM GERAÇÃO CONTÁBIL AUTOMÁTICA (TARIFA R$ 45,00)
  const ofx45 = ofxList.find(t => t.fitid === '202610060001002');
  assert(Boolean(ofx45), 'Transação de tarifa OFX R$ 45,00 localizada');

  const avulsoResult = financeService.createAndReconcileAvulso(ofx45!.id, {
    category: 'Despesas Bancárias',
    costCenter: 'Controladoria & Finanças',
    description: 'Tarifa Mensal Manutenção de Conta Bancária'
  }, mockUser);

  assert(avulsoResult.success === true, 'Conciliação avulsa executada com sucesso');

  const entryCode = (avulsoResult.accountingEntry as any)?.code || avulsoResult.accountingEntry;
  const avulsoAccounting = db.prepare('SELECT * FROM accounting_entries WHERE code = ? OR id = ?').get(entryCode, entryCode) as any;
  assert(Boolean(avulsoAccounting) && avulsoAccounting.amount === 45.0, 'Reflexo contábil automático gerado para a tarifa bancária em partidas dobradas');

  const finalAccount = financeRepository.findBankAccountById(accountId);
  assert(finalAccount?.current_balance === 44955.0, 'Saldo bancário ajustado exatamente para o saldo do extrato OFX (R$ 44.955,00)');

  // 8. TESTE DE REVERSÃO / DESCONCILIAÇÃO
  const unmatchResult = financeService.unmatchReconciliation(ofx5000!.id, mockUser);
  assert(unmatchResult.success === true, 'Desconciliação executada com sucesso');

  const unhitBankTx = db.prepare('SELECT * FROM bank_transactions WHERE id = ?').get(systemBankTx.id) as any;
  assert(unhitBankTx.reconciled === 0, 'Movimentação do sistema retornou ao estado reconciled = 0');

  // Reconcilia novamente para fechar o ciclo como 100% conciliado
  financeService.matchAndReconcile(ofx5000!.id, systemBankTx.id, mockUser);

  // 9. AUDITORIA IMUTÁVEL
  const audits = db.prepare(`
    SELECT * FROM audit_logs
    WHERE module = 'Financeiro'
    ORDER BY timestamp DESC
    LIMIT 10
  `).all() as any[];

  const auditActions = audits.map(a => a.action);
  assert(auditActions.includes('CREATE'), 'Auditoria: Criação de despesa registrada');
  assert(auditActions.includes('LIQUIDATE'), 'Auditoria: Liquidação bancária registrada');
  assert(auditActions.includes('IMPORT'), 'Auditoria: Importação OFX registrada com quantidade de transações');
  assert(auditActions.includes('RECONCILE'), 'Auditoria: Conciliação de match registrada');
  assert(auditActions.includes('RECONCILE_AVULSO'), 'Auditoria: Conciliação avulsa registrada');

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL TESTE E2E: ${passed} APROVADOS / ${failed} FALHAS`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFinanceE2eTest().catch(err => {
  console.error('Falha na execução do teste E2E Financeiro + OFX:', err);
  process.exit(1);
});
