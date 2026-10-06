import { db } from './db.js';
import { financeService } from './services/finance.service.js';
import { ofxReconciliationService } from './services/ofx-reconciliation.service.js';

const user:any={userId:'test-fin',email:'financeiro@seek.test',fullName:'Teste Financeiro',roleLevel:'ADMIN',roleTitle:'Administrador',department:'Financeiro',approvalLimitAmount:999999999,accessibleModules:['*'],companyId:'comp-1',branchId:'branch-1'};
const stamp=Date.now();
const accountId=`bank-e2e-${stamp}`;
db.prepare(`INSERT INTO bank_accounts(id,bank_name,bank_code,agency,account_number,current_balance,active) VALUES (?,?,?,?,?,?,1)`)
 .run(accountId,'Banco Teste','999','0001',String(stamp),10000);

const rec:any=financeService.createRecord({
 type:'PAGAR',title:'Despesa E2E OFX',entityName:'Fornecedor Teste',costCenter:'Administrativo',
 category:'Despesas Gerais',amount:5000,dueDate:'2026-10-10',paymentMethod:'PIX',companyId:'comp-1'
},user,'127.0.0.1');

financeService.liquidateRecord(rec.id,{bankId:accountId,paymentMethod:'PIX',paymentDate:'2026-10-06',userName:user.fullName,userRole:user.roleTitle},user,'127.0.0.1');
const bt:any=db.prepare(`SELECT * FROM bank_transactions WHERE reference_type='TITULO' AND reference_id=?`).get(rec.id);
if(!bt || bt.reconciled) throw new Error('Movimento bancário de liquidação não foi criado corretamente.');

const ofx=`OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>999<ACCTID>${stamp}</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20261001000000<DTEND>20261031235959
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261006000000<TRNAMT>-5000.00<FITID>FIT-${stamp}<NAME>Fornecedor Teste<MEMO>Despesa E2E OFX</STMTTRN>
</BANKTRANLIST><LEDGERBAL><BALAMT>5000.00<DTASOF>20261006235959</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const imp=ofxReconciliationService.importOfx({accountId,fileName:'teste.ofx',content:ofx},user,'127.0.0.1');
if(imp.inserted!==1) throw new Error('OFX não inseriu a transação esperada.');
let duplicateBlocked=false;
try { ofxReconciliationService.importOfx({accountId,fileName:'teste.ofx',content:ofx},user,'127.0.0.1'); } catch(e:any){ duplicateBlocked=e.statusCode===409; }
if(!duplicateBlocked) throw new Error('Idempotência do arquivo OFX falhou.');
const st:any=db.prepare(`SELECT * FROM ofx_statement_transactions WHERE account_id=? AND fitid=?`).get(accountId,`FIT-${stamp}`);
const suggestions:any[]=ofxReconciliationService.suggest(st.id);
if(!suggestions.some(s=>s.id===bt.id)) throw new Error('Matching não encontrou a liquidação de R$ 5.000.');
const match=ofxReconciliationService.reconcile(st.id,bt.id,user,'127.0.0.1');
const bt2:any=db.prepare(`SELECT * FROM bank_transactions WHERE id=?`).get(bt.id);
const st2:any=db.prepare(`SELECT * FROM ofx_statement_transactions WHERE id=?`).get(st.id);
if(!bt2.reconciled || st2.status!=='CONCILIADO') throw new Error('Conciliação não persistiu nos dois lados.');
const accounting:any=db.prepare(`SELECT * FROM accounting_entries WHERE origin_type='LIQUIDACAO_FINANCEIRA' AND origin_id=?`).get(rec.id);
if(!accounting) throw new Error('Reflexo contábil da liquidação não existe.');
const paid:any=db.prepare(`SELECT * FROM financial_records WHERE id=?`).get(rec.id);
if(paid.status!=='PAGO') throw new Error('Título não está pago.');
console.log(JSON.stringify({ok:true,flow:'Despesa → Pagamento → Banco → OFX → Matching → Conciliação → Contabilidade → Auditoria',recordId:rec.id,bankTransactionId:bt.id,fitid:st.fitid,matchId:match.matchId},null,2));
