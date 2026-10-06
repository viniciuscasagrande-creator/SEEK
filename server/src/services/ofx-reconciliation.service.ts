// SEEK V1.9 — Serviço OFX e Conciliação Bancária Transacional
import crypto from 'node:crypto';
import { db, logAudit } from '../db.js';
import { TokenPayload } from '../middleware/auth.js';

type OfxTx = { fitid:string; type:string; postedAt:string; amount:number; memo:string; name:string; checkNumber?:string };

function tag(block:string, name:string): string {
  const xml = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i'));
  if (xml) return xml[1].trim();
  const sgml = block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, 'i'));
  return sgml ? sgml[1].trim() : '';
}
function isoDate(raw:string): string {
  if (!raw) return '';
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return raw;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]||'00'}:${m[5]||'00'}:${m[6]||'00'}`;
}
function days(a:string,b:string){ return Math.abs(new Date(a).getTime()-new Date(b).getTime())/86400000; }

export class OfxReconciliationService {
  parse(content:string) {
    if (!content || !/<OFX>|<STMTTRN>/i.test(content)) throw Object.assign(new Error('Arquivo OFX inválido ou sem movimentações.'), {statusCode:400});
    const blocks = content.match(/<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi) || [];
    const transactions:OfxTx[] = blocks.map(b => ({
      fitid: tag(b,'FITID'),
      type: tag(b,'TRNTYPE') || 'OTHER',
      postedAt: isoDate(tag(b,'DTPOSTED')),
      amount: Number((tag(b,'TRNAMT')||'0').replace(',','.')),
      memo: tag(b,'MEMO'),
      name: tag(b,'NAME'),
      checkNumber: tag(b,'CHECKNUM') || undefined
    })).filter(t => t.fitid && Number.isFinite(t.amount));
    if (!transactions.length) throw Object.assign(new Error('Nenhuma transação válida com FITID foi encontrada no OFX.'), {statusCode:400});
    return {
      bankId: tag(content,'BANKID'),
      accountRef: tag(content,'ACCTID'),
      periodStart: isoDate(tag(content,'DTSTART')),
      periodEnd: isoDate(tag(content,'DTEND')),
      ledgerBalance: Number((tag(content,'BALAMT')||'0').replace(',','.')),
      transactions
    };
  }

  importOfx(data:{accountId:string; fileName:string; content:string}, user?:TokenPayload, ip='') {
    if (!data.accountId || !data.fileName || !data.content) throw Object.assign(new Error('accountId, fileName e content são obrigatórios.'), {statusCode:400});
    const account:any = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(data.accountId);
    if (!account) throw Object.assign(new Error('Conta bancária não encontrada.'), {statusCode:404});
    const parsed=this.parse(data.content);
    const hash=crypto.createHash('sha256').update(data.content).digest('hex');
    const duplicate:any=db.prepare('SELECT id FROM ofx_imports WHERE account_id=? AND file_hash=?').get(data.accountId,hash);
    if (duplicate) throw Object.assign(new Error(`Este arquivo OFX já foi importado (${duplicate.id}).`), {statusCode:409});
    const companyId=user?.companyId || 'comp-1';
    const importId=`ofx-${crypto.randomUUID()}`;
    let inserted=0, duplicates=0;
    const tx=db.transaction(()=>{
      db.prepare(`INSERT INTO ofx_imports
        (id,company_id,account_id,file_name,file_hash,bank_id,account_ref,period_start,period_end,ledger_balance,transaction_count,imported_by,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(importId,companyId,data.accountId,data.fileName,hash,parsed.bankId,parsed.accountRef,parsed.periodStart,parsed.periodEnd,parsed.ledgerBalance,parsed.transactions.length,user?.fullName||'Financeiro','IMPORTADO');
      const ins=db.prepare(`INSERT OR IGNORE INTO ofx_statement_transactions
        (id,import_id,company_id,account_id,fitid,transaction_type,posted_at,amount,memo,name,check_number,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,'PENDENTE')`);
      for(const t of parsed.transactions){
        const r=ins.run(`ofxtx-${crypto.randomUUID()}`,importId,companyId,data.accountId,t.fitid,t.type,t.postedAt,t.amount,t.memo,t.name,t.checkNumber||null);
        r.changes ? inserted++ : duplicates++;
      }
    });
    tx();
    logAudit(user?.fullName||'Financeiro', user?.roleTitle||'Financeiro','IMPORT_OFX','Financeiro',importId,
      `OFX ${data.fileName}: ${inserted} movimentos importados, ${duplicates} FITIDs ignorados por idempotência.`,ip||'N/A');
    return {importId, inserted, duplicates, ledgerBalance:parsed.ledgerBalance, transactionCount:parsed.transactions.length};
  }

  listStatement(accountId:string, status?:string) {
    let sql='SELECT * FROM ofx_statement_transactions WHERE account_id=?'; const p:any[]=[accountId];
    if(status && status!=='ALL'){sql+=' AND status=?';p.push(status);}
    sql+=' ORDER BY posted_at DESC, created_at DESC';
    return db.prepare(sql).all(...p);
  }

  suggest(statementId:string) {
    const st:any=db.prepare('SELECT * FROM ofx_statement_transactions WHERE id=?').get(statementId);
    if(!st) throw Object.assign(new Error('Movimento OFX não encontrado.'),{statusCode:404});
    const expectedType=st.amount < 0 ? 'DEBITO' : 'CREDITO';
    const candidates:any[]=db.prepare(`SELECT * FROM bank_transactions
      WHERE account_id=? AND reconciled=0 AND type=? AND ABS(amount-?) < 0.01
      ORDER BY transaction_date DESC LIMIT 20`).all(st.account_id,expectedType,Math.abs(st.amount)) as any[];
    return candidates.map(c=>{
      const d=days(st.posted_at,c.transaction_date);
      const desc=((st.memo||'')+' '+(st.name||'')).toLowerCase();
      const cdesc=(c.description||'').toLowerCase();
      let score=70;
      if(d<=1) score+=20; else if(d<=3) score+=10; else if(d>7) score-=20;
      const words=desc.split(/\W+/).filter((x:string)=>x.length>3);
      if(words.some((w:string)=>cdesc.includes(w))) score+=10;
      return {...c, score:Math.max(0,Math.min(100,score)), dateDistanceDays:Number(d.toFixed(1))};
    }).sort((a,b)=>b.score-a.score);
  }

  reconcile(statementId:string, bankTransactionId:string, user?:TokenPayload, ip='') {
    const st:any=db.prepare('SELECT * FROM ofx_statement_transactions WHERE id=?').get(statementId);
    const bt:any=db.prepare('SELECT * FROM bank_transactions WHERE id=?').get(bankTransactionId);
    if(!st || !bt) throw Object.assign(new Error('Movimento OFX ou transação bancária não encontrado.'),{statusCode:404});
    if(st.account_id!==bt.account_id) throw Object.assign(new Error('Os movimentos pertencem a contas bancárias diferentes.'),{statusCode:409});
    if(st.status==='CONCILIADO' || bt.reconciled) throw Object.assign(new Error('Um dos movimentos já está conciliado.'),{statusCode:409});
    const expected=st.amount<0?'DEBITO':'CREDITO';
    const amountDiff=Math.abs(Math.abs(st.amount)-Number(bt.amount));
    if(expected!==bt.type || amountDiff>=0.01) throw Object.assign(new Error('Tipo ou valor divergente; conciliação automática bloqueada.'),{statusCode:409});
    const suggestion=this.suggest(statementId).find((x:any)=>x.id===bankTransactionId);
    const score=suggestion?.score||70;
    const now=new Date().toISOString(); const actor=user?.fullName||'Financeiro';
    const matchId=`match-${crypto.randomUUID()}`;
    db.transaction(()=>{
      db.prepare(`INSERT INTO reconciliation_matches
        (id,company_id,account_id,statement_transaction_id,bank_transaction_id,score,status,matched_by,matched_at)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(matchId,user?.companyId||st.company_id,st.account_id,statementId,bankTransactionId,score,'CONCILIADO',actor,now);
      db.prepare(`UPDATE ofx_statement_transactions SET status='CONCILIADO', matched_bank_transaction_id=?, match_score=?, matched_at=?, matched_by=?, divergence_reason=NULL WHERE id=?`)
        .run(bankTransactionId,score,now,actor,statementId);
      db.prepare(`UPDATE bank_transactions SET reconciled=1,reconciled_at=? WHERE id=?`).run(now,bankTransactionId);
    })();
    logAudit(actor,user?.roleTitle||'Financeiro','RECONCILE_OFX','Financeiro',matchId,
      `FITID ${st.fitid} conciliado com ${bankTransactionId}; valor R$ ${Math.abs(st.amount).toFixed(2)}; score ${score}.`,ip||'N/A');
    return {matchId, statementId, bankTransactionId, score, status:'CONCILIADO'};
  }

  markDivergence(statementId:string, reason:string, user?:TokenPayload, ip='') {
    if(!reason?.trim()) throw Object.assign(new Error('Informe o motivo da divergência.'),{statusCode:400});
    const st:any=db.prepare('SELECT * FROM ofx_statement_transactions WHERE id=?').get(statementId);
    if(!st) throw Object.assign(new Error('Movimento OFX não encontrado.'),{statusCode:404});
    db.prepare(`UPDATE ofx_statement_transactions SET status='DIVERGENTE', divergence_reason=?, matched_by=?, matched_at=? WHERE id=?`)
      .run(reason.trim(),user?.fullName||'Financeiro',new Date().toISOString(),statementId);
    logAudit(user?.fullName||'Financeiro',user?.roleTitle||'Financeiro','OFX_DIVERGENCE','Financeiro',statementId,reason.trim(),ip||'N/A');
    return {statementId,status:'DIVERGENTE',reason:reason.trim()};
  }

  reconciliationSummary(accountId:string) {
    const rows:any[]=db.prepare(`SELECT status,COUNT(*) qty,COALESCE(SUM(ABS(amount)),0) total FROM ofx_statement_transactions WHERE account_id=? GROUP BY status`).all(accountId) as any[];
    const out:any={PENDENTE:{qty:0,total:0},CONCILIADO:{qty:0,total:0},DIVERGENTE:{qty:0,total:0}};
    for(const r of rows) out[r.status]={qty:r.qty,total:r.total};
    return out;
  }
}
export const ofxReconciliationService=new OfxReconciliationService();
