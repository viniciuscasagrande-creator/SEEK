import { initializeDatabase, db } from './db.js';
import { financeService } from './services/finance.service.js';
initializeDatabase();
const suffix = Date.now();
const bankId = `bank-test-${suffix}`;
db.prepare(`INSERT INTO bank_accounts(id,bank_name,bank_code,agency,account_number,current_balance,active) VALUES(?,?,?,?,?,?,1)`).run(bankId,'Banco Teste','999','0001',String(suffix),10000);
const rec:any = financeService.createRecord({ type:'PAGAR', title:'Teste transacional', entityName:'Fornecedor Teste', costCenter:'Administrativo & Operações', category:'Teste', amount:5000, dueDate:'2026-10-10' });
const before = (db.prepare('SELECT current_balance FROM bank_accounts WHERE id=?').get(bankId) as any).current_balance;
const result:any = financeService.liquidateRecord(rec.id,{bankId,paymentMethod:'PIX',paymentDate:'2026-10-06'});
const after = (db.prepare('SELECT current_balance FROM bank_accounts WHERE id=?').get(bankId) as any).current_balance;
const entry = db.prepare("SELECT * FROM accounting_entries WHERE origin_type='LIQUIDACAO_FINANCEIRA' AND origin_id=?").get(rec.id) as any;
const btx = db.prepare("SELECT * FROM bank_transactions WHERE reference_type='TITULO' AND reference_id=?").get(rec.id) as any;
if (before-after !== 5000) throw new Error('Saldo bancário não foi atualizado corretamente');
if (!entry || entry.amount !== 5000) throw new Error('Lançamento contábil não foi criado');
if (!btx || btx.reconciled !== 0) throw new Error('Movimento bancário pendente de conciliação não foi criado');
let duplicateBlocked=false; try { financeService.liquidateRecord(rec.id,{bankId}); } catch { duplicateBlocked=true; }
if (!duplicateBlocked) throw new Error('Liquidação duplicada não foi bloqueada');
console.log(JSON.stringify({ok:true, recordId:rec.id, bankBefore:before, bankAfter:after, accountingEntry:entry.code, bankTransaction:btx.id, duplicateBlocked},null,2));
