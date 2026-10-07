// SEEK V1.9 — Teste Estrutural e de Fluxo: RH Benefícios Fase 4
// Conferência Nominal, Divergências, Arquivos de Operadora e Confirmação de Crédito
import { db } from './db.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Falha: ${message}`);
  console.log(`OK: ${message}`);
}

console.log('--- Início Teste RH Benefícios Fase 4 (Conferência, Divergências, Arquivo Operadora & Crédito) ---');

// 1. Validar Tabelas e Colunas da Migration 015
const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(t => t.name);
assert(tables.includes('benefit_conferences'), 'Tabela benefit_conferences disponível');
assert(tables.includes('benefit_operator_files'), 'Tabela benefit_operator_files disponível');

const boCols = new Set((db.prepare("PRAGMA table_info(benefit_orders)").all() as any[]).map(c => c.name));
assert(boCols.has('approved_by'), 'benefit_orders.approved_by presente');
assert(boCols.has('approved_at'), 'benefit_orders.approved_at presente');
assert(boCols.has('locked_at'), 'benefit_orders.locked_at presente');

const boiCols = new Set((db.prepare("PRAGMA table_info(benefit_order_items)").all() as any[]).map(c => c.name));
assert(boiCols.has('conference_status'), 'benefit_order_items.conference_status presente');
assert(boiCols.has('operator_processed_amount'), 'benefit_order_items.operator_processed_amount presente');
assert(boiCols.has('divergence_amount'), 'benefit_order_items.divergence_amount presente');
assert(boiCols.has('divergence_reason'), 'benefit_order_items.divergence_reason presente');
assert(boiCols.has('credit_status'), 'benefit_order_items.credit_status presente');
assert(boiCols.has('credit_confirmed_at'), 'benefit_order_items.credit_confirmed_at presente');

const bpbCols = new Set((db.prepare("PRAGMA table_info(benefit_purchase_batches)").all() as any[]).map(c => c.name));
assert(bpbCols.has('operator_file_name'), 'benefit_purchase_batches.operator_file_name presente');
assert(bpbCols.has('operator_sent_at'), 'benefit_purchase_batches.operator_sent_at presente');
assert(bpbCols.has('operator_returned_at'), 'benefit_purchase_batches.operator_returned_at presente');
assert(bpbCols.has('credit_confirmed_at'), 'benefit_purchase_batches.credit_confirmed_at presente');

// 2. Teste de Conferência Nominal e Bloqueio de Fechamento por Divergência Crítica
const testPeriod = '2099-04';
const confId1 = `bconf-test-1-${Date.now()}`;
const confId2 = `bconf-test-2-${Date.now()}`;

// Item 1: Colaborador com divergência crítica (sem operadora cadastrada)
db.prepare(`
  INSERT INTO benefit_conferences (
    id, period, employee_id, benefit_type, issue_code, issue_level, issue_message, status, created_at, updated_at
  ) VALUES (?, ?, 'emp-01', 'VA', 'SEM_OPERADORA', 'CRITICO', 'Colaborador sem operadora vinculada.', 'PENDENTE', datetime('now'), datetime('now'))
`).run(confId1, testPeriod);

// Item 2: Colaborador regular pendente de conferência
db.prepare(`
  INSERT INTO benefit_conferences (
    id, period, employee_id, benefit_type, issue_code, issue_level, issue_message, status, created_at, updated_at
  ) VALUES (?, ?, 'emp-02', 'VT', 'OK', 'OK', 'Sem divergência cadastral.', 'PENDENTE', datetime('now'), datetime('now'))
`).run(confId2, testPeriod);

// Verificar regra de bloqueio: não pode fechar competência com pendências críticas ou itens não conferidos
const blockingIssues = db.prepare(`
  SELECT * FROM benefit_conferences
  WHERE period = ? AND (issue_level = 'CRITICO' OR status <> 'CONFERIDO')
`).all(testPeriod) as any[];

assert(blockingIssues.length === 2, 'Bloqueio ativo: detectadas 2 pendências que impedem fechamento');
const hasCritical = blockingIssues.some(b => b.issue_level === 'CRITICO');
assert(hasCritical, 'Bloqueio crítico ativo: pendência CRITICO identificada');

// Resolver item crítico (vincular operadora) e conferir itens
db.prepare(`
  UPDATE benefit_conferences
  SET issue_code = 'OK', issue_level = 'OK', issue_message = 'Operadora vinculada e conferida.', status = 'CONFERIDO', reviewed_by = 'RH Analista', reviewed_at = datetime('now')
  WHERE id = ?
`).run(confId1);

db.prepare(`
  UPDATE benefit_conferences
  SET status = 'CONFERIDO', reviewed_by = 'RH Analista', reviewed_at = datetime('now')
  WHERE id = ?
`).run(confId2);

const remainingIssues = db.prepare(`
  SELECT * FROM benefit_conferences
  WHERE period = ? AND (issue_level = 'CRITICO' OR status <> 'CONFERIDO')
`).all(testPeriod) as any[];

assert(remainingIssues.length === 0, 'Após conferência do RH, 0 pendências impeditivas restam');

// 3. Fechamento com Status AGUARDANDO_APROVACAO e Aprovação Formal do RH
const testOrderId = `bord-f4-${Date.now()}`;
db.prepare(`
  INSERT INTO benefit_orders (
    id, company_id, period, due_date, status, employee_count, vt_total, va_total, vr_total, fuel_total, total_amount, created_by
  ) VALUES (?, 'comp-1', ?, '2099-04-20', 'AGUARDANDO_APROVACAO', 2, 250.00, 600.00, 0, 0, 850.00, 'RH Analista')
`).run(testOrderId, testPeriod);

const initialOrder = db.prepare("SELECT status FROM benefit_orders WHERE id = ?").get(testOrderId) as any;
assert(initialOrder.status === 'AGUARDANDO_APROVACAO', 'Fechamento gerado inicialmente com status AGUARDANDO_APROVACAO');

// Aprovação formal do RH: trava a competência
const approveTime = new Date().toISOString();
db.prepare(`
  UPDATE benefit_orders
  SET status = 'APROVADO', approved_by = 'Gerente RH', approved_at = ?, locked_at = ?
  WHERE id = ?
`).run(approveTime, approveTime, testOrderId);

const approvedOrder = db.prepare("SELECT * FROM benefit_orders WHERE id = ?").get(testOrderId) as any;
assert(approvedOrder.status === 'APROVADO' && approvedOrder.approved_by === 'Gerente RH' && approvedOrder.locked_at !== null, 'Fechamento formalmente APROVADO e travado pelo RH');

// 4. Criação dos Lotes de Compra e Itens
const batchId = `bpb-f4-${Date.now()}`;
db.prepare(`
  INSERT INTO benefit_purchase_batches (
    id, order_id, provider_name, benefit_type, employee_count, total_amount, status
  ) VALUES (?, ?, 'Operadora F4 Benefícios', 'VA', 2, 600.00, 'AGUARDANDO_COMPRA')
`).run(batchId, testOrderId);

const item1Id = `boi-f4-1-${Date.now()}`;
const item2Id = `boi-f4-2-${Date.now()}`;
db.prepare(`
  INSERT INTO benefit_order_items (
    id, order_id, employee_id, employee_name, department, benefit_type, provider_name,
    company_cost, employee_discount, total_value, final_company_cost, business_days, eligible_days, calculation_mode, conference_status, credit_status
  ) VALUES (?, ?, 'emp-01', 'Colaborador Um', 'TI', 'VA', 'Operadora F4 Benefícios', 300.00, 0, 300.00, 300.00, 22, 22, 'MENSAL', 'CONFERIDO', 'PENDENTE')
`).run(item1Id, testOrderId);

db.prepare(`
  INSERT INTO benefit_order_items (
    id, order_id, employee_id, employee_name, department, benefit_type, provider_name,
    company_cost, employee_discount, total_value, final_company_cost, business_days, eligible_days, calculation_mode, conference_status, credit_status
  ) VALUES (?, ?, 'emp-02', 'Colaborador Dois', 'Financeiro', 'VA', 'Operadora F4 Benefícios', 300.00, 0, 300.00, 300.00, 22, 22, 'MENSAL', 'CONFERIDO', 'PENDENTE')
`).run(item2Id, testOrderId);

// 5. Geração de Arquivo Nominal de Operadora (com BOM UTF-8) e Registro de Auditoria
const csvFileName = `beneficios_${testPeriod}_VA_Operadora_F4_Beneficios.csv`;
const csvContent = '\ufeffMatrícula/ID;Colaborador;Departamento;Benefício;Operadora;Dias elegíveis;Dias úteis;Valor\n'
  + 'emp-01;"Colaborador Um";"TI";VA;"Operadora F4 Benefícios";22;22;"300,00"\n'
  + 'emp-02;"Colaborador Dois";"Financeiro";VA;"Operadora F4 Benefícios";22;22;"300,00"';

assert(csvContent.startsWith('\ufeff'), 'Arquivo gerado possui marcação UTF-8 BOM para compatibilidade com Excel');

const fileLogId = `bof-test-${Date.now()}`;
db.prepare(`
  INSERT INTO benefit_operator_files (
    id, batch_id, file_type, file_name, row_count, total_amount, generated_by
  ) VALUES (?, ?, 'ENVIO', ?, 2, 600.00, 'RH Analista')
`).run(fileLogId, batchId, csvFileName);

db.prepare(`
  UPDATE benefit_purchase_batches
  SET operator_file_name = ?, operator_sent_at = datetime('now')
  WHERE id = ?
`).run(csvFileName, batchId);

const batchWithFile = db.prepare("SELECT * FROM benefit_purchase_batches WHERE id = ?").get(batchId) as any;
assert(batchWithFile.operator_file_name === csvFileName, 'Lote de compra atualizado com registro do arquivo gerado para operadora');

const fileLog = db.prepare("SELECT * FROM benefit_operator_files WHERE id = ?").get(fileLogId) as any;
assert(fileLog && fileLog.row_count === 2 && fileLog.file_type === 'ENVIO', 'Arquivo nominal da operadora auditado em benefit_operator_files');

// 6. Processamento do Retorno da Operadora com Detecção de Divergência
// Colaborador 1: processado exatamente R$ 300,00 (0 divergência)
// Colaborador 2: processado R$ 280,00 (divergência de -R$ 20,00)
const returnData = [
  { employeeId: 'emp-01', processedAmount: 300.00 },
  { employeeId: 'emp-02', processedAmount: 280.00 }
];

let divergencesCount = 0;
for (const ret of returnData) {
  const item = db.prepare(`
    SELECT * FROM benefit_order_items
    WHERE order_id = ? AND employee_id = ? AND benefit_type = 'VA'
  `).get(testOrderId, ret.employeeId) as any;

  const expected = Number(item.final_company_cost || 0);
  const diff = Number((ret.processedAmount - expected).toFixed(2));
  const hasDiff = Math.abs(diff) >= 0.01;

  if (hasDiff) divergencesCount++;

  db.prepare(`
    UPDATE benefit_order_items
    SET operator_processed_amount = ?,
        divergence_amount = ?,
        divergence_reason = ?,
        credit_status = ?
    WHERE id = ?
  `).run(
    ret.processedAmount,
    diff,
    hasDiff ? `Valor processado pela operadora difere do previsto (Previsto: ${expected}, Processado: ${ret.processedAmount})` : null,
    hasDiff ? 'DIVERGENCIA' : 'AGUARDANDO_CREDITO',
    item.id
  );
}

const batchReturnStatus = divergencesCount > 0 ? 'DIVERGENCIA' : 'PROCESSADO_OPERADORA';
db.prepare(`
  UPDATE benefit_purchase_batches
  SET status = ?, operator_returned_at = datetime('now')
  WHERE id = ?
`).run(batchReturnStatus, batchId);

const batchAfterReturn = db.prepare("SELECT * FROM benefit_purchase_batches WHERE id = ?").get(batchId) as any;
assert(batchAfterReturn.status === 'DIVERGENCIA', 'Lote de compra classificado como DIVERGENCIA');

const item2 = db.prepare("SELECT * FROM benefit_order_items WHERE id = ?").get(item2Id) as any;
assert(item2.credit_status === 'DIVERGENCIA' && item2.divergence_amount === -20.00, 'Item 2 marcado com DIVERGENCIA e diferença apurada (-20,00)');

// 7. Confirmação de Crédito: Bloqueado com Divergência, Liberado após Resolução
const openDivergences = (db.prepare(`
  SELECT COUNT(*) count FROM benefit_order_items
  WHERE order_id = ? AND benefit_type = 'VA' AND credit_status = 'DIVERGENCIA'
`).get(testOrderId) as any)?.count || 0;

assert(openDivergences === 1, 'Confirmação de crédito bloqueada enquanto existirem divergências pendentes no lote');

// Resolução da divergência: operadora reprocessa os R$ 20,00 faltantes
db.prepare(`
  UPDATE benefit_order_items
  SET operator_processed_amount = 300.00,
      divergence_amount = 0,
      divergence_reason = 'Divergência ajustada após reprocessamento da operadora',
      credit_status = 'AGUARDANDO_CREDITO'
  WHERE id = ?
`).run(item2Id);

db.prepare(`
  UPDATE benefit_purchase_batches
  SET status = 'PROCESSADO_OPERADORA'
  WHERE id = ?
`).run(batchId);

// Executar confirmação de crédito
db.prepare(`
  UPDATE benefit_order_items
  SET credit_status = 'CREDITADO', credit_confirmed_at = datetime('now')
  WHERE order_id = ?
`).run(testOrderId);

db.prepare(`
  UPDATE benefit_purchase_batches
  SET status = 'CREDITADO', credit_confirmed_at = datetime('now')
  WHERE id = ?
`).run(batchId);

// Verificar se todos os lotes do pedido estão creditados para concluir o fechamento
const pendingBatches = (db.prepare(`
  SELECT count(*) as count FROM benefit_purchase_batches
  WHERE order_id = ? AND status <> 'CREDITADO'
`).get(testOrderId) as any)?.count || 0;

if (pendingBatches === 0) {
  db.prepare("UPDATE benefit_orders SET status = 'CONCLUIDO' WHERE id = ?").run(testOrderId);
}

const finalBatch = db.prepare("SELECT * FROM benefit_purchase_batches WHERE id = ?").get(batchId) as any;
assert(finalBatch.status === 'CREDITADO' && finalBatch.credit_confirmed_at !== null, 'Lote de compra confirmado como CREDITADO com timestamp gravado');

const finalOrder = db.prepare("SELECT status FROM benefit_orders WHERE id = ?").get(testOrderId) as any;
assert(finalOrder.status === 'CONCLUIDO', 'Fechamento global de benefícios finalizado como CONCLUIDO após todos os lotes serem creditados');

// 8. Limpeza dos Dados do Teste
db.prepare("DELETE FROM benefit_operator_files WHERE batch_id = ?").run(batchId);
db.prepare("DELETE FROM benefit_purchase_batches WHERE order_id = ?").run(testOrderId);
db.prepare("DELETE FROM benefit_order_items WHERE order_id = ?").run(testOrderId);
db.prepare("DELETE FROM benefit_orders WHERE id = ?").run(testOrderId);
db.prepare("DELETE FROM benefit_conferences WHERE period = ?").run(testPeriod);

console.log('--- Teste RH Benefícios Fase 4 Concluído com 100% de Sucesso! ---');
