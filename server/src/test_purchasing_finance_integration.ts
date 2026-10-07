import assert from 'node:assert';
import { db } from './db.js';
import { purchasingService } from './services/purchasing.service.js';
import { financeService } from './services/finance.service.js';

console.log('=== TESTE: Compras → Financeiro → Contabilidade ===');

// 1. Criar e aprovar ordem de compra
const testOrderId = `po-test-${Date.now()}`;
const testOrderCode = `OC-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
const amount = 14500.0;

db.prepare(`
  INSERT INTO purchase_orders (id, code, title, department, cost_center, requester_name, supplier_name, total_amount, status, required_date)
  VALUES (?, ?, 'Aquisição de Servidores Dell PowerEdge', 'TI & Infraestrutura', 'Tecnologia da Informação', 'Lucas TI', 'Dell Computadores do Brasil Ltda', ?, 'PENDENTE_APROVACAO', '2026-11-20')
`).run(testOrderId, testOrderCode, amount);

// Aprovar ordem de compra
const approveResult = purchasingService.approveOrder(
  testOrderId,
  { id: 'usr-exec', email: 'diretor@seek.com.br', fullName: 'Diretor de Operações', roleLevel: 'DIRETORIA', roleTitle: 'Diretoria Executiva', companyId: 'comp-1', branchId: 'Curitiba (Matriz)', department: 'Diretoria', approvalLimitAmount: 500000, accessibleModules: ['ALL'] },
  '127.0.0.1'
);

assert.strictEqual(approveResult.success, true);
assert.strictEqual(approveResult.order.status, 'APROVADO');

// REGRA CRÍTICA: Aprovação de PO NÃO pode gerar contas a pagar antecipado
const preFinancial = db.prepare(`SELECT * FROM financial_records WHERE origin_type = 'PO' AND origin_id = ?`).get(testOrderId);
assert.strictEqual(preFinancial, undefined, 'Aprovação de PO não pode criar Contas a Pagar antes do recebimento fiscal!');
console.log('OK: Aprovação de ordem autoriza sem gerar título antecipado.');

// 2. Recebimento físico/fiscal com NF-e
const nfNumber = `NF-${Math.floor(10000 + Math.random() * 90000)}`;
const invoiceDate = '2026-10-15';
const dueDate = '2026-11-15';

const receiveResult = purchasingService.receiveOrder(
  testOrderId,
  {
    invoiceNumber: nfNumber,
    invoiceDate,
    dueDate,
    userName: 'Almoxarifado Central',
    userRole: 'Compras & Estoque'
  },
  { id: 'usr-stock', email: 'estoque@seek.com.br', fullName: 'Almoxarifado Central', roleLevel: 'GESTOR', roleTitle: 'Compras & Estoque', companyId: 'comp-1', branchId: 'Curitiba (Matriz)', department: 'Compras', approvalLimitAmount: 50000, accessibleModules: ['ALL'] },
  '127.0.0.1'
);

assert.strictEqual(receiveResult.success, true);
assert.strictEqual(receiveResult.order.status, 'RECEBIDO');
assert.ok(receiveResult.financialRecord);
assert.ok(receiveResult.receipt);

// Verificar persistência de purchase_receipts
const receiptRow: any = db.prepare('SELECT * FROM purchase_receipts WHERE order_id = ?').get(testOrderId);
assert.ok(receiptRow, 'Recebimento deve estar persistido em purchase_receipts');
assert.strictEqual(receiptRow.invoice_number, nfNumber);
assert.strictEqual(receiptRow.status, 'FATURADO');
console.log('OK: Recebimento físico/fiscal gerou purchase_receipts.');

// Verificar contas a pagar gerado
const financialRow: any = db.prepare('SELECT * FROM financial_records WHERE id = ?').get(receiveResult.financialRecord.id);
assert.ok(financialRow, 'Título financeiro deve ter sido criado');
assert.strictEqual(financialRow.type, 'PAGAR');
assert.strictEqual(financialRow.amount, amount);
assert.strictEqual(financialRow.origin_type, 'PO');
assert.strictEqual(financialRow.origin_id, testOrderId);
console.log('OK: Título a pagar criado com vínculo de origem PO.');

// Verificar reconhecimento contábil por partidas dobradas
const recognitionEntry: any = db.prepare(`SELECT * FROM accounting_entries WHERE origin_id = ?`).get(financialRow.id);
assert.ok(recognitionEntry, 'Reconhecimento contábil deve existir');
assert.strictEqual(recognitionEntry.debit_account_code, '4.02.01.002');
assert.strictEqual(recognitionEntry.credit_account_code, '2.01.01.001');
console.log('OK: Reconhecimento contábil por partidas dobradas efetuado.');

// 3. Liquidação financeira do título
const liquidation = financeService.liquidateRecord(
  financialRow.id,
  {
    paymentDate: '2026-11-14',
    paymentMethod: 'Boleto Bancário',
    bankId: 'bank-1',
    userName: 'Tesoureiro Geral',
    userRole: 'Financeiro'
  },
  { id: 'usr-fin', email: 'tesouraria@seek.com.br', fullName: 'Tesoureiro Geral', roleLevel: 'FINANCEIRO', roleTitle: 'Tesoureiro', companyId: 'comp-1', branchId: 'Curitiba (Matriz)', department: 'Financeiro', approvalLimitAmount: 100000, accessibleModules: ['ALL'] },
  '127.0.0.1'
);

assert.ok(liquidation.accountingEntry, 'Lançamento de liquidação contábil gerado');

// Verificar devolução do status PAGO para Compras e Recebimento
const updatedOrder: any = db.prepare('SELECT status FROM purchase_orders WHERE id = ?').get(testOrderId);
assert.strictEqual(updatedOrder.status, 'PAGO', 'Ordem de compra deve mudar para PAGO após liquidação financeira');

const updatedReceipt: any = db.prepare('SELECT status FROM purchase_receipts WHERE order_id = ?').get(testOrderId);
assert.strictEqual(updatedReceipt.status, 'PAGO', 'Recebimento deve mudar para PAGO após liquidação financeira');

console.log('OK: Liquidação financeira atualizou Ordem e Recebimento para PAGO.');
console.log('Fluxo Compras → Financeiro → Contabilidade → Auditoria 100% validado com sucesso!');
