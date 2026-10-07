// SEEK V1.9 — teste estrutural do fluxo Fiscal → Financeiro → Contabilidade
import { db } from './db.js';
import { financeService } from './services/finance.service.js';

const tax = db.prepare("SELECT * FROM tax_obligations WHERE status!='PAGO' AND financial_record_id IS NULL ORDER BY due_date LIMIT 1").get() as any;
if (!tax) throw new Error('Nenhuma obrigação fiscal pendente disponível para teste.');

const record: any = financeService.createRecord({
  type: 'PAGAR',
  title: `TESTE ${tax.tax_type} — ${tax.code}`,
  entityName: tax.entity_name || 'Órgão Arrecadador',
  costCenter: tax.cost_center || 'Administrativo & Fiscal',
  category: `Tributos — ${tax.tax_type}`,
  amount: tax.tax_amount,
  dueDate: tax.due_date,
  paymentMethod: 'GUIA / DÉBITO BANCÁRIO',
  originType: 'FISCAL',
  originId: tax.id,
  companyId: tax.company_id || 'comp-1',
  userName: 'Teste Fiscal',
  userRole: 'Fiscal'
});

const recognition = db.prepare("SELECT * FROM accounting_entries WHERE origin_type='RECONHECIMENTO_FINANCEIRO' AND origin_id=?").get(record.id) as any;
if (!recognition) throw new Error('Reconhecimento contábil fiscal não foi criado.');
if (record.originType !== 'FISCAL') throw new Error('Origem financeira fiscal inválida.');

console.log('OK Fiscal → Financeiro → Contabilidade', {
  tax: tax.code,
  financial: record.code,
  debit: recognition.debit_account_code,
  credit: recognition.credit_account_code
});

// limpa somente registros produzidos pelo teste
try { db.prepare("DELETE FROM notifications WHERE message LIKE ?").run(`%${record.code}%`); } catch {}
db.prepare("DELETE FROM accounting_entries WHERE origin_id=?").run(record.id);
db.prepare("DELETE FROM financial_records WHERE id=?").run(record.id);
