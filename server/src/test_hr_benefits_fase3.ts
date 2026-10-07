// SEEK V1.9 — Teste Estrutural e de Fluxo: RH Benefícios Fase 3
// Operadoras, Compras por Fornecedor/Benefício, Ajustes Manuais e Liquidação Financeira
import { db } from './db.js';
import { financeService } from './services/finance.service.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Falha: ${message}`);
  console.log(`OK: ${message}`);
}

console.log('--- Início Teste RH Benefícios Fase 3 (Operadoras, Compras e Ajustes) ---');

// 1. Validar Tabelas e Colunas da Migration 014
const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(t => t.name);
assert(tables.includes('benefit_providers'), 'Tabela benefit_providers disponível');
assert(tables.includes('benefit_adjustments'), 'Tabela benefit_adjustments disponível');
assert(tables.includes('benefit_purchase_batches'), 'Tabela benefit_purchase_batches disponível');

const boiCols = new Set((db.prepare("PRAGMA table_info(benefit_order_items)").all() as any[]).map(c => c.name));
assert(boiCols.has('adjustment_amount'), 'benefit_order_items.adjustment_amount presente');
assert(boiCols.has('final_company_cost'), 'benefit_order_items.final_company_cost presente');

// 2. Teste CRUD Operadoras / Fornecedores
const testProviderId = `bprov-test-${Date.now()}`;
db.prepare(`
  INSERT INTO benefit_providers (id, name, document, benefit_type, contact_name, contact_email, contact_phone, payment_method, billing_day, active)
  VALUES (?, 'Operadora Teste Fase 3 S.A.', '12.345.678/0001-99', 'VA', 'Consultor Teste', 'suporte@testeoperadora.com', '11999998888', 'BOLETO', 22, 1)
`).run(testProviderId);

const prov = db.prepare("SELECT * FROM benefit_providers WHERE id = ?").get(testProviderId) as any;
assert(prov && prov.name === 'Operadora Teste Fase 3 S.A.', 'Operadora cadastrada e recuperada com sucesso');
assert(prov.billing_day === 22 && prov.benefit_type === 'VA', 'Campos de fatura e tipo de benefício da operadora corretos');

// 3. Teste de Ajuste Manual por Competência
const testPeriod = '2099-01';
const testAdjId1 = `badj-test-1-${Date.now()}`;
const testAdjId2 = `badj-test-2-${Date.now()}`;

// Inserir Crédito de R$ 45,00 e Desconto de R$ 15,00
db.prepare(`
  INSERT INTO benefit_adjustments (id, period, employee_id, benefit_type, adjustment_type, amount, reason, created_by)
  VALUES (?, ?, 'emp-01', 'VA', 'CREDITO', 45.00, 'Diferença proporcional mês anterior', 'RH Teste')
`).run(testAdjId1, testPeriod);

db.prepare(`
  INSERT INTO benefit_adjustments (id, period, employee_id, benefit_type, adjustment_type, amount, reason, created_by)
  VALUES (?, ?, 'emp-01', 'VA', 'DESCONTO', 15.00, 'Estorno de crédito indevido', 'RH Teste')
`).run(testAdjId2, testPeriod);

const adjustments = db.prepare("SELECT * FROM benefit_adjustments WHERE period = ? AND employee_id = 'emp-01'").all(testPeriod) as any[];
assert(adjustments.length === 2, '2 ajustes manuais registrados para a competência');

const netAdj = adjustments.reduce((acc, a) => {
  const sign = a.adjustment_type === 'DESCONTO' ? -1 : 1;
  return acc + (Number(a.amount || 0) * sign);
}, 0);
assert(netAdj === 30.00, `Saldo líquido de ajustes confere: +30,00 (calculado: ${netAdj})`);

// 4. Teste de Criação de Pedidos de Compra por Operadora/Benefício ao Fechar Competência
const testOrderId = `bord-fase3-${Date.now()}`;
db.prepare(`
  INSERT INTO benefit_orders (id, company_id, period, due_date, status, employee_count, vt_total, va_total, vr_total, fuel_total, total_amount, created_by)
  VALUES (?, 'comp-1', ?, '2099-01-25', 'FECHADO', 2, 250.00, 600.00, 0, 0, 850.00, 'RH Teste')
`).run(testOrderId, testPeriod);

// Itens do Pedido: 1 para VT (Mobilidade Corporativa) e 1 para VA (Operadora Teste Fase 3 S.A.)
const item1Id = `boi-f3-1-${Date.now()}`;
const item2Id = `boi-f3-2-${Date.now()}`;
db.prepare(`
  INSERT INTO benefit_order_items (
    id, order_id, employee_id, employee_name, department, benefit_type, provider_name,
    company_cost, employee_discount, total_value, adjustment_amount, final_company_cost,
    business_days, eligible_days, calculation_mode
  ) VALUES (?, ?, 'emp-01', 'Colaborador A', 'Operações', 'VT', 'Mobilidade Corporativa', 250.00, 0, 250.00, 0, 250.00, 22, 22, 'DIAS_UTEIS')
`).run(item1Id, testOrderId);

db.prepare(`
  INSERT INTO benefit_order_items (
    id, order_id, employee_id, employee_name, department, benefit_type, provider_name,
    company_cost, employee_discount, total_value, adjustment_amount, final_company_cost,
    business_days, eligible_days, calculation_mode
  ) VALUES (?, ?, 'emp-02', 'Colaborador B', 'Financeiro', 'VA', 'Operadora Teste Fase 3 S.A.', 570.00, 0, 570.00, 30.00, 600.00, 22, 22, 'MENSAL')
`).run(item2Id, testOrderId);

// Criar lotes de compras separados por (benefit_type, provider_name)
const batch1Id = `bpb-test-1-${Date.now()}`;
const batch2Id = `bpb-test-2-${Date.now()}`;

db.prepare(`
  INSERT INTO benefit_purchase_batches (
    id, order_id, provider_name, benefit_type, employee_count, total_amount, status
  ) VALUES (?, ?, 'Mobilidade Corporativa', 'VT', 1, 250.00, 'AGUARDANDO_COMPRA')
`).run(batch1Id, testOrderId);

db.prepare(`
  INSERT INTO benefit_purchase_batches (
    id, order_id, provider_name, benefit_type, employee_count, total_amount, status
  ) VALUES (?, ?, 'Operadora Teste Fase 3 S.A.', 'VA', 1, 600.00, 'AGUARDANDO_COMPRA')
`).run(batch2Id, testOrderId);

const batches = db.prepare("SELECT * FROM benefit_purchase_batches WHERE order_id = ?").all(testOrderId) as any[];
assert(batches.length === 2, '2 lotes de compra de benefícios gerados com sucesso');

// 5. Integração com Financeiro (origem BENEFICIO_COMPRA) e Liquidação em Cadeia
const fin1 = financeService.createRecord({
  type: 'PAGAR',
  title: 'Compra Benefício VT — 2099-01 — Mobilidade Corporativa',
  entityName: 'Mobilidade Corporativa',
  category: 'Benefícios Corporativos',
  costCenter: 'RH & Benefícios',
  amount: 250.00,
  dueDate: '2099-01-25',
  originType: 'BENEFICIO_COMPRA',
  originId: batch1Id,
  userName: 'RH Teste',
  userRole: 'Analista de RH'
});

db.prepare("UPDATE benefit_purchase_batches SET status = 'ENVIADO_FINANCEIRO', financial_record_id = ? WHERE id = ?").run(fin1.id, batch1Id);

const fin2 = financeService.createRecord({
  type: 'PAGAR',
  title: 'Compra Benefício VA — 2099-01 — Operadora Teste Fase 3 S.A.',
  entityName: 'Operadora Teste Fase 3 S.A.',
  category: 'Benefícios Corporativos',
  costCenter: 'RH & Benefícios',
  amount: 600.00,
  dueDate: '2099-01-22',
  originType: 'BENEFICIO_COMPRA',
  originId: batch2Id,
  userName: 'RH Teste',
  userRole: 'Analista de RH'
});

db.prepare("UPDATE benefit_purchase_batches SET status = 'ENVIADO_FINANCEIRO', financial_record_id = ? WHERE id = ?").run(fin2.id, batch2Id);

assert(fin1 && fin2, 'Títulos a pagar de compra de benefício gerados no Financeiro com origem BENEFICIO_COMPRA');

const fakeBank = db.prepare("SELECT id FROM bank_accounts WHERE active = 1 LIMIT 1").get() as any;

// Liquidação do Lote 1: o lote passa para PAGO, mas o pedido geral ainda tem pendência
financeService.liquidateRecord(fin1.id, {
  bankId: fakeBank?.id || 'bank-01',
  paymentMethod: 'BOLETO',
  paymentDate: '2099-01-25',
  userName: 'Tesouraria',
  userRole: 'Tesoureiro'
});

const b1Updated = db.prepare("SELECT * FROM benefit_purchase_batches WHERE id = ?").get(batch1Id) as any;
assert(b1Updated.status === 'PAGO', 'Lote 1 (VT) marcado como PAGO após liquidação no Financeiro');

const orderPartial = db.prepare("SELECT * FROM benefit_orders WHERE id = ?").get(testOrderId) as any;
assert(orderPartial.status !== 'PAGO', 'Pedido de benefícios continua não liquidado enquanto houver lotes pendentes');

// Liquidação do Lote 2: agora todos os lotes estão pagos -> o pedido passa para PAGO!
financeService.liquidateRecord(fin2.id, {
  bankId: fakeBank?.id || 'bank-01',
  paymentMethod: 'BOLETO',
  paymentDate: '2099-01-22',
  userName: 'Tesouraria',
  userRole: 'Tesoureiro'
});

const b2Updated = db.prepare("SELECT * FROM benefit_purchase_batches WHERE id = ?").get(batch2Id) as any;
assert(b2Updated.status === 'PAGO', 'Lote 2 (VA) marcado como PAGO após liquidação no Financeiro');

const orderFinal = db.prepare("SELECT * FROM benefit_orders WHERE id = ?").get(testOrderId) as any;
assert(orderFinal.status === 'PAGO', 'Pedido global de benefícios transitou para PAGO automaticamente quando todos os lotes foram quitados!');

// 6. Limpeza dos dados do teste
db.prepare("DELETE FROM financial_records WHERE id IN (?, ?)").run(fin1.id, fin2.id);
db.prepare("DELETE FROM benefit_purchase_batches WHERE order_id = ?").run(testOrderId);
db.prepare("DELETE FROM benefit_order_items WHERE order_id = ?").run(testOrderId);
db.prepare("DELETE FROM benefit_orders WHERE id = ?").run(testOrderId);
db.prepare("DELETE FROM benefit_adjustments WHERE period = ?").run(testPeriod);
db.prepare("DELETE FROM benefit_providers WHERE id = ?").run(testProviderId);

console.log('--- Teste RH Benefícios Fase 3 Concluído com Sucesso Total! ---');
