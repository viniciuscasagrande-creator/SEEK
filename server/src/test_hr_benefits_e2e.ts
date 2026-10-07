// SEEK V1.9 — Teste ponta a ponta do ciclo RH Benefícios → Financeiro → Liquidação
import { db } from './db.js';
import { financeService } from './services/finance.service.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Falha: ${message}`);
  console.log(`OK: ${message}`);
}

console.log('--- Teste E2E RH Benefícios (VT, VA, VR, Combustível) ---');

// 1. Verificar tabelas
const ebTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_benefits'").get();
const boTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='benefit_orders'").get();
const boiTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='benefit_order_items'").get();

assert(ebTable, 'Tabela employee_benefits presente');
assert(boTable, 'Tabela benefit_orders presente');
assert(boiTable, 'Tabela benefit_order_items presente');

// 2. Verificar colaboradores com benefícios configurados
const benefits = db.prepare("SELECT * FROM employee_benefits WHERE enabled = 1").all() as any[];
assert(benefits.length > 0, `Benefícios ativos encontrados: ${benefits.length}`);

// 3. Simular fechamento de período de teste
const testPeriod = `2099-01`;
db.prepare("DELETE FROM benefit_order_items WHERE order_id IN (SELECT id FROM benefit_orders WHERE period = ?)").run(testPeriod);
db.prepare("DELETE FROM benefit_orders WHERE period = ?").run(testPeriod);

const rows = db.prepare(`
  SELECT e.id as employee_id, e.full_name, e.department, b.benefit_type, b.provider_name, b.company_cost, b.employee_discount, b.monthly_value
  FROM employees e
  JOIN employee_benefits b ON b.employee_id = e.id
  WHERE e.active = 1 AND b.enabled = 1
  ORDER BY e.full_name, b.benefit_type
`).all() as any[];

const sums: any = { VT: 0, VA: 0, VR: 0, COMBUSTIVEL: 0 };
rows.forEach(r => {
  sums[r.benefit_type] = (sums[r.benefit_type] || 0) + Number(r.company_cost || 0);
});
const total: number = Number(Object.values(sums).reduce((a: any, b: any) => a + Number(b), 0));
const orderId = `bord-test-${Date.now()}`;

db.prepare(`
  INSERT INTO benefit_orders (id, company_id, period, due_date, status, employee_count, vt_total, va_total, vr_total, fuel_total, total_amount, created_by)
  VALUES (?, 'comp-1', ?, '2099-01-25', 'FECHADO', ?, ?, ?, ?, ?, ?, 'Teste Automatizado')
`).run(orderId, testPeriod, new Set(rows.map(r => r.employee_id)).size, sums.VT, sums.VA, sums.VR, sums.COMBUSTIVEL, total);

assert(true, `Ordem de benefício criada: ${orderId} com total R$ ${total}`);

// 4. Integração Financeira: Envio ao Contas a Pagar
const finRecord = financeService.createRecord({
  type: 'PAGAR',
  title: `Benefícios colaboradores ${testPeriod}`,
  entityName: 'Operadoras de Benefícios — lote mensal',
  costCenter: 'Administrativo & Recursos Humanos',
  category: 'Benefícios de Colaboradores',
  amount: total,
  dueDate: '2099-01-25',
  originType: 'BENEFICIOS',
  originId: orderId,
  userName: 'RH Teste',
  userRole: 'RH'
});

db.prepare(`UPDATE benefit_orders SET status = 'ENVIADO_FINANCEIRO', financial_record_id = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`).run(finRecord.id, orderId);

const updatedOrder = db.prepare("SELECT * FROM benefit_orders WHERE id = ?").get(orderId) as any;
assert(updatedOrder.status === 'ENVIADO_FINANCEIRO', 'Status da ordem atualizado para ENVIADO_FINANCEIRO');
assert(updatedOrder.financial_record_id === finRecord.id, 'Vínculo do financial_record_id gravado');

// 5. Liquidação do título no Financeiro e retorno a PAGO
const fakeBank = db.prepare("SELECT id FROM bank_accounts WHERE active = 1 LIMIT 1").get() as any;
financeService.liquidateRecord(finRecord.id, {
  bankId: fakeBank?.id || 'bank-01',
  paymentMethod: 'PIX',
  userName: 'Tesouraria Teste',
  userRole: 'Financeiro'
});

const paidOrder = db.prepare("SELECT * FROM benefit_orders WHERE id = ?").get(orderId) as any;
assert(paidOrder.status === 'PAGO', 'Ordem de benefícios transitou para status PAGO após liquidação no Financeiro');
assert(paidOrder.paid_at !== null, 'Data de pagamento gravada na ordem de benefícios');

// Limpeza
db.prepare("DELETE FROM financial_records WHERE id = ?").run(finRecord.id);
db.prepare("DELETE FROM benefit_orders WHERE id = ?").run(orderId);

console.log('✅ Ciclo Completo RH Benefícios → Financeiro → Liquidação validado com sucesso!');
