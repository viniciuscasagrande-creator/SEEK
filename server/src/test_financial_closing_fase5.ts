// SEEK V1.9 — Teste Transacional de Fechamento Mensal, Pré-Fechamento e Trava Retroativa
// Critério de Aceite Fase 5:
// 1. Selecionar competência -> 2. Executar pré-fechamento -> 3. Visualizar pendências ->
// 4. Corrigir pendências -> 5. Obter todos os checks verdes -> 6. Fechar competência ->
// 7. Tentar lançar retroativamente -> SEEK bloquear -> 8. Consultar auditoria do fechamento.
import { db } from './db.js';
import { financialClosingService } from './services/financial-closing.service.js';
import { financeService } from './services/finance.service.js';

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FALHA: ${message}`);
    throw new Error(`Falha: ${message}`);
  }
  console.log(`OK: ${message}`);
}

console.log('========================================================================');
console.log('INÍCIO DA BATERIA DE TESTES: FECHAMENTO MENSAL REAL & PERIOD LOCK (FASE 5)');
console.log('========================================================================');

const testPeriod = '2099-11';
const testCompany = 'comp-1';

// 1. Limpeza de ambiente de teste anterior
db.prepare('DELETE FROM financial_closings WHERE period = ?').run(testPeriod);
db.prepare('DELETE FROM financial_closing_audits WHERE period = ?').run(testPeriod);
db.prepare('DELETE FROM accounting_periods WHERE period = ?').run(testPeriod);
db.prepare('DELETE FROM ofx_statement_transactions WHERE posted_at LIKE ?').run(`${testPeriod}%`);
db.prepare('DELETE FROM bank_transactions WHERE transaction_date LIKE ?').run(`${testPeriod}%`);
db.prepare('DELETE FROM financial_records WHERE due_date LIKE ? OR payment_date LIKE ?').run(`${testPeriod}%`, `${testPeriod}%`);
db.prepare('DELETE FROM accounting_entries WHERE period = ?').run(testPeriod);

// 2. Validar Estrutura de Banco e Migration 017
const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(t => t.name);
assert(tables.includes('financial_closing_audits'), 'Tabela financial_closing_audits presente no banco');

const fcCols = (db.prepare("PRAGMA table_info(financial_closings)").all() as any[]).map(c => c.name);
assert(fcCols.includes('validation_results_json'), 'Coluna validation_results_json presente em financial_closings');
assert(fcCols.includes('reopened_by'), 'Coluna reopened_by presente em financial_closings');
assert(fcCols.includes('reopen_reason'), 'Coluna reopen_reason presente em financial_closings');

// 3. Simular Cenário Inicial COM PENDÊNCIAS na competência
// a) Uma importação e transação OFX pendente
const importId = `imp-test-f5-${Date.now()}`;
db.prepare(`
  INSERT INTO ofx_imports (id, company_id, account_id, file_name, file_hash, transaction_count, imported_by)
  VALUES (?, 'comp-1', 'bank-1', 'extrato_teste.ofx', ?, 1, 'Auditor Teste')
`).run(importId, `hash-${Date.now()}`);

const ofxTxId = `ofx-f5-test-${Date.now()}`;
db.prepare(`
  INSERT INTO ofx_statement_transactions (id, import_id, account_id, fitid, transaction_type, posted_at, amount, memo, status)
  VALUES (?, ?, 'bank-1', 'fitid-test-f5', 'DEBIT', ?, -150.00, 'Tarifa Bancária Pendente', 'PENDENTE')
`).run(ofxTxId, importId, `${testPeriod}-10 14:00:00`);

// b) Uma movimentação bancária não conciliada
const btxId = `btx-f5-test-${Date.now()}`;
db.prepare(`
  INSERT INTO bank_transactions (id, account_id, type, category, amount, transaction_date, description, reference_type, reference_id, reconciled)
  VALUES (?, 'bank-1', 'DEBITO', 'Despesas', 200.00, ?, 'TED Fornecedor não conciliado', 'AVULSO', 'ref-1', 0)
`).run(btxId, `${testPeriod}-12`);

// c) Um título a pagar vencido e não liquidado
const finRecId = `fin-f5-test-${Date.now()}`;
db.prepare(`
  INSERT INTO financial_records (id, company_id, code, type, title, entity_name, cost_center, category, amount, due_date, status, payment_method, origin_type)
  VALUES (?, 'comp-1', 'CP-TEST-99', 'PAGAR', 'Licença de Software Teste', 'Fornecedor Tech', 'Tecnologia', 'Software', 500.00, ?, 'ATRASADO', 'PIX', 'AVULSO')
`).run(finRecId, `${testPeriod}-05`);

// 4. Teste do Pré-Fechamento com Pendências
console.log('\n--- Executando Pré-Fechamento Inicial (Deve Detectar Bloqueios) ---');
const preCheckInitial = financialClosingService.preCheck(testPeriod, testCompany);
assert(preCheckInitial.canClose === false, 'canClose é false quando existem pendências obrigatórias');
assert(preCheckInitial.summary.blockingCount >= 3, `Detectados ${preCheckInitial.summary.blockingCount} bloqueios de conformidade`);

const ofxCheck = preCheckInitial.checks.find(c => c.id === 'ofx_pending');
assert(ofxCheck && ofxCheck.status === 'BLOQUEIO' && ofxCheck.count === 1, 'Check 1 (OFX Pendente) identificou 1 transação pendente com status BLOQUEIO');

const bankCheck = preCheckInitial.checks.find(c => c.id === 'unreconciled_bank_transactions');
assert(bankCheck && bankCheck.status === 'BLOQUEIO' && bankCheck.count === 1, 'Check 3 (Movimentação Bancária) identificou 1 movimento não conciliado com status BLOQUEIO');

const titleCheck = preCheckInitial.checks.find(c => c.id === 'title_inconsistencies');
assert(titleCheck && titleCheck.status === 'BLOQUEIO' && titleCheck.count === 1, 'Check 4 (Títulos Inconsistentes) identificou 1 título atrasado com status BLOQUEIO');

// 5. Tentativa de Fechamento com Bloqueios Ativos (Deve ser Rejeitada pelo SEEK)
console.log('\n--- Tentativa de Fechamento com Bloqueios (Deve Falhar com HTTP 422) ---');
let closeRejected = false;
try {
  financialClosingService.lockPeriod({
    period: testPeriod,
    userName: 'Controlador Teste',
    userRole: 'Controladoria'
  });
} catch (e: any) {
  closeRejected = true;
  assert(e.statusCode === 422, 'Fechamento rejeitado com código 422');
  assert(e.message.includes('Não é possível fechar a competência'), 'Mensagem de erro explícita sobre pendências');
}
assert(closeRejected, 'SEEK bloqueou formalmente o fechamento com pendências ativas');

// 6. Saneamento e Correção de Todas as Pendências
console.log('\n--- Saneamento e Regularização das Pendências da Competência ---');
// a) Concilia a transação OFX
db.prepare(`UPDATE ofx_statement_transactions SET status = 'CONCILIADO' WHERE id = ?`).run(ofxTxId);
// b) Concilia a transação bancária
db.prepare(`UPDATE bank_transactions SET reconciled = 1 WHERE id = ?`).run(btxId);
// c) Regulariza o título financeiro: liquida com conta bancária e gera partida dobrada
db.prepare(`
  UPDATE financial_records 
  SET status = 'PAGO', payment_date = ?, bank_id = 'bank-1', bank_name = 'Banco Bradesco'
  WHERE id = ?
`).run(`${testPeriod}-15`, finRecId);

// Registra a movimentação bancária da liquidação para passar no check 5
const btxSettleId = `btx-settle-${finRecId}`;
db.prepare(`
  INSERT INTO bank_transactions (id, account_id, type, category, amount, transaction_date, description, reference_type, reference_id, reconciled)
  VALUES (?, 'bank-1', 'DEBITO', 'Software', 500.00, ?, 'Liquidação CP-TEST-99', 'TITULO', ?, 1)
`).run(btxSettleId, `${testPeriod}-15`, finRecId);

// Registra a partida dobrada da liquidação no Livro Diário para passar nos checks 6 e 7
const entryId = `entry-settle-${finRecId}`;
db.prepare(`
  INSERT INTO accounting_entries (id, code, date, period, description, debit_account_code, credit_account_code, amount, cost_center, origin_type, origin_id, created_by)
  VALUES (?, 'LAN-2099-9999', ?, ?, 'Liquidação CP-TEST-99', '2.01.01.001', '1.01.01.001', 500.00, 'Tecnologia', 'LIQUIDACAO_FINANCEIRA', ?, 'Controlador Teste')
`).run(entryId, `${testPeriod}-15`, testPeriod, finRecId);

// 7. Executar Novo Pré-Fechamento Após Saneamento (Deve Estar 100% Verde)
console.log('\n--- Novo Pré-Fechamento Pós-Saneamento (Deve Estar 100% OK) ---');
const preCheckClean = financialClosingService.preCheck(testPeriod, testCompany);
assert(preCheckClean.canClose === true, 'canClose é true após saneamento de todas as pendências');
assert(preCheckClean.summary.blockingCount === 0, 'Zero bloqueios detectados');
assert(preCheckClean.summary.pendingCount === 0, 'Zero pendências detectadas');
assert(preCheckClean.summary.okCount === 8, 'Todas as 8 verificações obrigatórias estão APROVADAS (OK)');

// 8. Homologar Fechamento e Ativar Trava de Período (Period Lock)
console.log('\n--- Homologando Fechamento da Competência ---');
const closeResult = financialClosingService.lockPeriod({
  period: testPeriod,
  userName: 'Vinicius Controlador',
  userRole: 'Controladoria Geral',
  notes: 'Fechamento da competência 2099-11 100% homologado após auditoria canônica.'
});
assert(closeResult.success === true, 'Fechamento realizado com sucesso');
assert(closeResult.status === 'BLOQUEADO', 'Status da competência transitou para BLOQUEADO');

const dbClosing = db.prepare('SELECT * FROM financial_closings WHERE period = ?').get(testPeriod) as any;
assert(dbClosing && dbClosing.status === 'BLOQUEADO', 'Registro gravado no banco financial_closings como BLOQUEADO');
assert(dbClosing.closed_by === 'Vinicius Controlador', 'Responsável pelo fechamento registrado no banco');

const dbAccPeriod = db.prepare('SELECT * FROM accounting_periods WHERE period = ?').get(testPeriod) as any;
assert(dbAccPeriod && dbAccPeriod.status === 'BLOQUEADO', 'Módulo contábil sincronizado com trava de período (BLOQUEADO)');

// 9. TESTE CRÍTICO: Tentar Lançar Retroativamente na Competência Fechada (SEEK DEVE BLOQUEAR)
console.log('\n--- Teste de Trava Retroativa (Tentativa de Lançamento na Competência Fechada) ---');
let retroactiveCreateBlocked = false;
try {
  financeService.createRecord({
    type: 'PAGAR',
    title: 'Despesa Extemporânea Não Autorizada',
    amount: 1200.00,
    dueDate: `${testPeriod}-20`, // Data cai dentro da competência BLOQUEADA!
    category: 'Gerais'
  });
} catch (e: any) {
  retroactiveCreateBlocked = true;
  console.log('Mensagem capturada no createRecord:', e.message);
  assert(e.statusCode === 422, 'Inclusão de título retroativo rejeitada com código 422');
  assert(e.message.toLowerCase().includes(testPeriod) && e.message.toLowerCase().includes('bloqueada'), 'Mensagem clara de trava de competência');
}
assert(retroactiveCreateBlocked, 'SEEK BLOQUEOU formalmente a criação de título financeiro na competência fechada');

// 10. TESTE CRÍTICO: Tentar Liquidar Retroativamente na Competência Fechada (SEEK DEVE BLOQUEAR)
console.log('\n--- Teste de Trava Retroativa (Tentativa de Liquidação na Competência Fechada) ---');
// Cria um título em período aberto
const openPeriodRec = financeService.createRecord({
  type: 'PAGAR',
  title: 'Título Válido Período Aberto',
  amount: 300.00,
  dueDate: '2099-12-10'
});

let retroactivePayBlocked = false;
try {
  financeService.liquidateRecord(openPeriodRec.id, {
    bankId: 'bank-1',
    paymentDate: `${testPeriod}-28` // Tentativa de liquidar com data dentro da competência BLOQUEADA!
  });
} catch (e: any) {
  retroactivePayBlocked = true;
  console.log('Mensagem capturada no liquidateRecord:', e.message);
  assert(e.statusCode === 422, 'Liquidação retroativa rejeitada com código 422');
  assert(e.message.toLowerCase().includes(testPeriod) && e.message.toLowerCase().includes('bloqueada'), 'Mensagem clara de bloqueio de liquidação');
}
assert(retroactivePayBlocked, 'SEEK BLOQUEOU formalmente a liquidação financeira na competência fechada');

// 11. Consultar Auditoria Imutável do Fechamento
console.log('\n--- Consulta à Trilha de Auditoria do Fechamento ---');
const audits = financialClosingService.getClosingAudit(testPeriod);
assert(audits.length >= 1, 'Registro de auditoria encontrado na tabela financial_closing_audits');
const lockAudit = audits.find(a => a.action === 'LOCK');
assert(lockAudit !== undefined, 'Ação LOCK registrada na trilha imutável');
assert(lockAudit.user_name === 'Vinicius Controlador', 'Auditoria preserva o operador responsável');
assert(lockAudit.checks_json !== null && lockAudit.checks_json.includes('ofx_pending'), 'Auditoria preserva o snapshot dos 8 checks executados no momento do fechamento');

// 12. Teste de Reabertura Formal com Justificativa
console.log('\n--- Teste de Reabertura Formal com Justificativa ---');
let shortReasonBlocked = false;
try {
  financialClosingService.reopenPeriod({
    period: testPeriod,
    userName: 'Diretoria Financeira',
    reason: 'curto' // Menos de 10 caracteres
  });
} catch (e: any) {
  shortReasonBlocked = true;
  assert(e.statusCode === 422, 'Reabertura sem justificativa adequada rejeitada com código 422');
}
assert(shortReasonBlocked, 'Reabertura exige justificativa formal com no mínimo 10 caracteres');

const reopenResult = financialClosingService.reopenPeriod({
  period: testPeriod,
  userName: 'Diretoria Financeira',
  reason: 'Ajuste extraordinário determinado por auditoria externa independente.'
});
assert(reopenResult.success === true, 'Reabertura formal homologada');
assert(reopenResult.status === 'ABERTO', 'Status da competência transitou para ABERTO');

// Agora que está ABERTO, criação deve ser permitida
const allowedAfterReopen = financeService.createRecord({
  type: 'PAGAR',
  title: 'Despesa Regularizada Após Reabertura',
  amount: 450.00,
  dueDate: `${testPeriod}-22`
});
assert(allowedAfterReopen && allowedAfterReopen.id !== undefined, 'Lançamento permitido com sucesso após reabertura formal');

console.log('========================================================================');
console.log('BATERIA DE TESTES CONCLUÍDA COM 100% DE SUCESSO! CRITÉRIO DE ACEITE ATENDIDO');
console.log('========================================================================');
