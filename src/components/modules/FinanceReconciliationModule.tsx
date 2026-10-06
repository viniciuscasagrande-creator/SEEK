import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, Upload, History, Search, CheckCircle2, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export const FinanceReconciliationModule: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'importar'|'movimentos'|'historico'>('importar');
  const [fileName, setFileName] = useState('');
  const [ofxPreview, setOfxPreview] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const reload = async (id?: string) => {
    const a = await api.getBankAccounts(); setAccounts(a);
    const selected = id || accountId || a[0]?.id || '';
    if (selected) { setAccountId(selected); setTransactions(await api.getBankTransactions(selected)); }
    setHistory(await api.getBankReconciliations());
  };
  useEffect(() => { reload(); }, []);
  useEffect(() => { if(accountId) api.getBankTransactions(accountId).then(setTransactions); }, [accountId]);

  const parseOfx = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) || [];
    const val=(b:string,t:string)=>{ const m=b.match(new RegExp(`<${t}>([^<\\r\\n]+)`, 'i')); return m?.[1]?.trim() || ''; };
    setOfxPreview(blocks.slice(0,100).map((b,i)=>({ id:i, date:val(b,'DTPOSTED').slice(0,8), memo:val(b,'MEMO')||val(b,'NAME'), fitid:val(b,'FITID'), amount:Number(val(b,'TRNAMT')||0) })));
  };
  const filtered = useMemo(()=>transactions.filter(t => JSON.stringify(t).toLowerCase().includes(search.toLowerCase())),[transactions,search]);
  const reconciled = transactions.filter(t=>Boolean(t.reconciled)).length;

  return <div className="space-y-5">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-slate-200 pb-4">
      <div><h1 className="text-xl font-black text-slate-900">Conciliação Bancária</h1><p className="text-xs text-slate-500 mt-1">Importação OFX, conferência de movimentos, pendências e histórico de conciliações.</p></div>
      <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs" value={accountId} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.bank_name || a.bankName} • {a.agency}/{a.account_number || a.accountNumber}</option>)}</select>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="rounded-xl border bg-white p-4"><span className="text-[10px] font-bold uppercase text-slate-400">Movimentos</span><div className="text-2xl font-black mt-1">{transactions.length}</div></div>
      <div className="rounded-xl border bg-white p-4"><span className="text-[10px] font-bold uppercase text-slate-400">Conciliados</span><div className="text-2xl font-black text-emerald-700 mt-1">{reconciled}</div></div>
      <div className="rounded-xl border bg-white p-4"><span className="text-[10px] font-bold uppercase text-slate-400">Pendentes</span><div className="text-2xl font-black text-amber-700 mt-1">{Math.max(0,transactions.length-reconciled)}</div></div>
    </div>
    <div className="flex gap-2 border-b border-slate-200">{[['importar','Importar OFX',Upload],['movimentos','Movimentações',Landmark],['historico','Histórico',History]].map(([k,l,I]:any)=><button key={k} onClick={()=>setTab(k)} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 ${tab===k?'border-blue-700 text-blue-700':'border-transparent text-slate-500'}`}><I className="h-4 w-4"/>{l}</button>)}</div>
    {tab==='importar' && <div className="rounded-xl border bg-white p-5 space-y-4"><div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><Upload className="h-8 w-8 mx-auto text-blue-600 mb-2"/><h3 className="font-bold text-sm">Importar extrato bancário OFX</h3><p className="text-xs text-slate-500 mt-1">Selecione o arquivo exportado pelo banco. O SEEK faz a leitura local para pré-conferência antes da conciliação.</p><label className="inline-flex mt-4 cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white">Selecionar arquivo OFX<input type="file" accept=".ofx,.qfx" className="hidden" onChange={e=>e.target.files?.[0]&&parseOfx(e.target.files[0])}/></label>{fileName&&<p className="text-xs mt-3 font-semibold">Arquivo: {fileName} • {ofxPreview.length} movimentos identificados</p>}</div>{ofxPreview.length>0&&<div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-50 text-left"><th className="p-2">Data</th><th>Descrição</th><th>Identificador</th><th className="text-right pr-2">Valor</th></tr></thead><tbody>{ofxPreview.slice(0,12).map(x=><tr key={x.id} className="border-t"><td className="p-2">{x.date}</td><td>{x.memo||'Sem descrição'}</td><td>{x.fitid||'—'}</td><td className="text-right pr-2 font-bold">{x.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>)}</tbody></table><p className="text-[10px] text-slate-400 mt-3">Pré-visualização. A gravação definitiva deverá passar pela validação transacional do backend.</p></div>}</div>}
    {tab==='movimentos' && <div className="rounded-xl border bg-white overflow-hidden"><div className="p-3 border-b flex items-center gap-2"><Search className="h-4 w-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar movimentação..." className="w-full outline-none text-xs"/><button onClick={()=>reload(accountId)}><RefreshCw className="h-4 w-4"/></button></div><div className="overflow-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Data</th><th className="text-left">Descrição</th><th className="text-left">Tipo</th><th className="text-right">Valor</th><th className="text-center">Conciliação</th></tr></thead><tbody>{filtered.map(t=><tr key={t.id} className="border-t"><td className="p-3">{t.transaction_date||t.date||'—'}</td><td>{t.description||t.memo||'Movimentação bancária'}</td><td>{t.transaction_type||t.type||'—'}</td><td className="text-right font-bold">{Number(t.amount||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="text-center">{t.reconciled?<span className="text-emerald-700 inline-flex gap-1"><CheckCircle2 className="h-4 w-4"/>Conciliado</span>:<span className="text-amber-700 inline-flex gap-1"><AlertTriangle className="h-4 w-4"/>Pendente</span>}</td></tr>)}</tbody></table></div></div>}
    {tab==='historico' && <div className="rounded-xl border bg-white overflow-hidden"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Período</th><th className="text-left">Conta</th><th className="text-right">Extrato</th><th className="text-right">Sistema</th><th className="text-right">Diferença</th><th>Status</th></tr></thead><tbody>{history.map((h:any)=><tr key={h.id} className="border-t"><td className="p-3">{h.period}</td><td>{h.bank_name||h.account_id}</td><td className="text-right">{Number(h.statement_balance||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="text-right">{Number(h.system_balance||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="text-right font-bold">{Number(h.difference||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>{h.status}</td></tr>)}</tbody></table>{history.length===0&&<div className="p-8 text-center text-xs text-slate-400"><FileText className="h-8 w-8 mx-auto mb-2"/>Nenhuma conciliação registrada.</div>}</div>}
  </div>;
};
