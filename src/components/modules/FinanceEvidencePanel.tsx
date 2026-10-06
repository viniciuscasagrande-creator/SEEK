import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, RefreshCw, Search, ShieldCheck, Landmark, FileSpreadsheet, BookOpen, Activity } from 'lucide-react';
import { api } from '../../services/api';

const money=(v:any)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dt=(v:any)=>v ? new Date(v).toLocaleString('pt-BR') : '—';

export const FinanceEvidencePanel:React.FC=()=>{
  const [records,setRecords]=useState<any[]>([]);
  const [cash,setCash]=useState<any[]>([]);
  const [audits,setAudits]=useState<any[]>([]);
  const [recordId,setRecordId]=useState('');
  const [trace,setTrace]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  const load=async()=>{
    const [r,c,a]=await Promise.all([
      api.getFinanceRecords('ALL','ALL','ALL',''),
      api.getRealizedCashFlow(),
      api.getAuditLogs()
    ]);
    setRecords(r||[]); setCash(c||[]); setAudits((a||[]).filter((x:any)=>x.module==='Financeiro'||x.module==='Tesouraria').slice(0,30));
    if(!recordId && r?.length){
      const preferred=r.find((x:any)=>x.status==='PAGO' && Number(x.amount)===5000) || r.find((x:any)=>x.status==='PAGO') || r[0];
      if(preferred) setRecordId(preferred.id);
    }
  };
  useEffect(()=>{void load();},[]);

  const loadTrace=async(id=recordId)=>{
    if(!id)return;
    setLoading(true);setError('');
    try{setTrace(await api.getFinanceTrace(id));}
    catch(e:any){setTrace(null);setError(e.message||'Falha ao carregar rastreabilidade.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{if(recordId) void loadTrace(recordId);},[recordId]);

  const totals=useMemo(()=>cash.reduce((a:any,r:any)=>({inflow:a.inflow+Number(r.inflow||0),outflow:a.outflow+Number(r.outflow||0),net:a.net+Number(r.net||0)}),{inflow:0,outflow:0,net:0}),[cash]);

  return <div className="space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900">Comprovação do fluxo financeiro ponta a ponta</h3>
          <p className="mt-1 text-xs text-slate-500">Dados reais do Core: título → pagamento → banco → OFX → conciliação → contabilidade → auditoria.</p>
        </div>
        <div className="flex min-w-0 gap-2">
          <select value={recordId} onChange={e=>setRecordId(e.target.value)} className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
            <option value="">Selecione um título</option>
            {records.map((r:any)=><option key={r.id} value={r.id}>{r.code} — {r.title} — {money(r.amount)}</option>)}
          </select>
          <button onClick={()=>loadTrace()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5"/>Atualizar</button>
        </div>
      </div>
      {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
      {loading && <div className="mt-4 text-xs text-slate-500">Carregando evidências transacionais...</div>}
      {trace && <>
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          {trace.stages.map((s:any)=><div key={s.key} className={`rounded-lg border p-3 ${s.ok?'border-emerald-200 bg-emerald-50':'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center gap-2">{s.ok?<CheckCircle2 className="h-4 w-4 text-emerald-700"/>:<CircleDashed className="h-4 w-4 text-slate-400"/>}<span className="text-[11px] font-black text-slate-800">{s.label}</span></div>
            <div className="mt-2 text-[10px] text-slate-500">{s.ok?'Confirmado':'Pendente'}</div>
          </div>)}
        </div>
        <div className={`mt-4 rounded-lg border p-4 ${trace.completed?'border-emerald-300 bg-emerald-50':'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4"/>{trace.completed?'Ciclo transacional comprovado':'Ciclo ainda possui etapas pendentes'}</div>
          <div className="mt-1 text-xs">Título {trace.record.code} • {trace.record.title} • {money(trace.record.amount)} • Status {trace.record.status}</div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-black"><Landmark className="h-4 w-4"/>Banco</div><div className="mt-2 text-2xl font-black">{trace.bankTransactions.length}</div><div className="text-[11px] text-slate-500">movimentação(ões) vinculada(s)</div></div>
          <div className="rounded-lg border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-black"><FileSpreadsheet className="h-4 w-4"/>OFX / Conciliação</div><div className="mt-2 text-2xl font-black">{trace.ofxMatches.length}</div><div className="text-[11px] text-slate-500">{trace.ofxMatches[0]?.fitid?`FITID ${trace.ofxMatches[0].fitid}`:'sem correspondência conciliada'}</div></div>
          <div className="rounded-lg border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-black"><BookOpen className="h-4 w-4"/>Contabilidade</div><div className="mt-2 text-2xl font-black">{trace.accountingEntries.length}</div><div className="text-[11px] text-slate-500">lançamento(ões) relacionado(s)</div></div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Etapa</th><th className="p-3">Identificador</th><th className="p-3">Data</th><th className="p-3">Valor</th><th className="p-3">Situação</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            <tr><td className="p-3 font-bold">Título</td><td className="p-3 font-mono">{trace.record.code}</td><td className="p-3">{dt(trace.record.created_at)}</td><td className="p-3">{money(trace.record.amount)}</td><td className="p-3">{trace.record.status}</td></tr>
            {trace.bankTransactions.map((x:any)=><tr key={x.id}><td className="p-3 font-bold">Banco</td><td className="p-3 font-mono">{x.id}</td><td className="p-3">{dt(x.transaction_date)}</td><td className="p-3">{money(x.amount)}</td><td className="p-3">{x.reconciled?'Conciliado':'Pendente'}</td></tr>)}
            {trace.ofxMatches.map((x:any)=><tr key={x.id}><td className="p-3 font-bold">OFX</td><td className="p-3 font-mono">{x.fitid}</td><td className="p-3">{dt(x.posted_at)}</td><td className="p-3">{money(Math.abs(x.statement_amount))}</td><td className="p-3">Conciliado • score {x.score}</td></tr>)}
            {trace.accountingEntries.map((x:any)=><tr key={x.id}><td className="p-3 font-bold">Contabilidade</td><td className="p-3 font-mono">{x.code}</td><td className="p-3">{dt(x.date)}</td><td className="p-3">{money(x.amount)}</td><td className="p-3">D {x.debit_account_code} / C {x.credit_account_code}</td></tr>)}
          </tbody></table>
        </div>
      </>}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-black"><Activity className="h-4 w-4"/>Fluxo de Caixa Realizado</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-500">Entradas</div><div className="mt-1 text-sm font-black text-emerald-700">{money(totals.inflow)}</div></div>
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-500">Saídas</div><div className="mt-1 text-sm font-black text-rose-700">{money(totals.outflow)}</div></div>
          <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-500">Líquido</div><div className="mt-1 text-sm font-black">{money(totals.net)}</div></div>
        </div>
        <div className="mt-3 space-y-2">{cash.map((x:any)=><div key={x.period} className="flex justify-between rounded-lg border border-slate-100 p-2 text-xs"><span className="font-bold">{x.period}</span><span>Entradas {money(x.inflow)} • Saídas {money(x.outflow)} • <b>{money(x.net)}</b></span></div>)}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-black">Auditoria Financeira recente</div>
        <div className="mt-3 max-h-64 space-y-2 overflow-auto">{audits.length?audits.map((a:any)=><div key={a.id} className="rounded-lg border border-slate-100 p-3"><div className="flex justify-between gap-3 text-[11px]"><b>{a.action}</b><span className="text-slate-400">{dt(a.timestamp)}</span></div><div className="mt-1 text-xs text-slate-600">{a.description}</div><div className="mt-1 text-[10px] text-slate-400">{a.user_name} • {a.user_role}</div></div>):<div className="text-xs text-slate-500">Nenhum evento financeiro auditado.</div>}</div>
      </div>
    </div>
  </div>;
};
