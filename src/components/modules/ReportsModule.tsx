import React, { useMemo, useState } from 'react';
import { BarChart3, Download, Search, FileSpreadsheet, BookOpen, Receipt, ShoppingCart, Users2, Briefcase, ShieldCheck } from 'lucide-react';

const reports = [
 ['Financeiro','Fluxo de Caixa por Período','Receitas, despesas, resultado e projeção por competência.'],
 ['Financeiro','Extrato Financeiro','Lançamentos por conta, categoria, centro de custo e contraparte.'],
 ['Financeiro','Conciliação Bancária','Movimentos conciliados, pendências e diferenças por conta bancária.'],
 ['Financeiro','Contas a Pagar e Receber','Vencidos, a vencer, liquidados e previsões.'],
 ['Financeiro','DRE Gerencial','Resultado consolidado e por centro de custo.'],
 ['Contabilidade','Balancete de Verificação','Saldos e movimentos do plano de contas.'],
 ['Contabilidade','Livro Diário e Razão','Lançamentos contábeis com rastreabilidade de origem.'],
 ['Fiscal','Notas Fiscais','Documentos fiscais por período, situação e tomador/prestador.'],
 ['Fiscal','Apuração e Obrigações','Tributos apurados e calendário de obrigações.'],
 ['Compras','Compras por Fornecedor','Pedidos, valores, prazos e saving por fornecedor.'],
 ['Compras','Mapa Comparativo','Comparativo de cotações e decisões de compra.'],
 ['RH','Folha, Encargos e Benefícios','Consolidação mensal de custos de pessoal.'],
 ['RH','Freelance / Taxas','Convocações, presença, fechamento de taxa e pagamento.'],
 ['CRM & Comercial','Funil Comercial','Oportunidades, conversão, propostas e previsão.'],
 ['Projetos','Custos por Projeto','Planejado, comprometido e realizado por projeto.'],
 ['Governança','Auditoria e Aprovações','Trilha de auditoria, decisões, usuários e datas.'],
 ['Administração','Acessos e Permissões','Usuários, perfis e permissões efetivas.']
] as const;
const iconMap:any={Financeiro:FileSpreadsheet,Contabilidade:BookOpen,Fiscal:Receipt,Compras:ShoppingCart,RH:Users2,'CRM & Comercial':Briefcase,Projetos:BarChart3,Governança:ShieldCheck,Administração:ShieldCheck};
export const ReportsModule: React.FC = () => {
 const [search,setSearch]=useState(''); const [category,setCategory]=useState('Todos');
 const categories=['Todos',...Array.from(new Set(reports.map(r=>r[0])))];
 const visible=useMemo(()=>reports.filter(r=>(category==='Todos'||r[0]===category)&&(`${r[0]} ${r[1]} ${r[2]}`.toLowerCase().includes(search.toLowerCase()))),[search,category]);
 const exportCsv=(r:readonly string[])=>{ const csv=`Relatório;Categoria;Descrição\n"${r[1]}";"${r[0]}";"${r[2]}"\n`; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=`seek-${r[1].toLowerCase().replace(/[^a-z0-9]+/g,'-')}.csv`; a.click(); URL.revokeObjectURL(a.href); };
 return <div className="space-y-5"><div className="border-b pb-4"><h1 className="text-xl font-black text-slate-900">Central de Relatórios</h1><p className="text-xs text-slate-500 mt-1">Catálogo corporativo de relatórios do SEEK, organizado por área e processo.</p></div>
 <div className="rounded-xl border bg-white p-4"><div className="grid md:grid-cols-[1fr_240px] gap-3"><div className="flex items-center gap-2 rounded-lg border px-3"><Search className="h-4 w-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} className="w-full py-2 text-xs outline-none" placeholder="Buscar relatório por nome, área ou finalidade..."/></div><select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-lg border px-3 py-2 text-xs bg-white">{categories.map(c=><option key={c}>{c}</option>)}</select></div></div>
 {categories.filter(c=>c!=='Todos'&&(category==='Todos'||category===c)).map(c=>{const group=visible.filter(r=>r[0]===c); if(!group.length)return null; const I=iconMap[c]||BarChart3; return <section key={c} className="rounded-xl border bg-white overflow-hidden"><div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3"><I className="h-4 w-4 text-blue-700"/><h2 className="text-sm font-black">{c}</h2><span className="text-[10px] text-slate-400">{group.length} relatórios</span></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">{group.map((r,i)=><div key={i} className="rounded-lg border p-4 hover:border-blue-300 transition"><h3 className="text-xs font-bold text-slate-900">{r[1]}</h3><p className="text-[11px] text-slate-500 mt-1 min-h-8">{r[2]}</p><button onClick={()=>exportCsv(r)} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700"><Download className="h-3.5 w-3.5"/>Gerar / Exportar</button></div>)}</div></section>})}
 {visible.length===0&&<div className="rounded-xl border bg-white p-10 text-center text-xs text-slate-400">Nenhum relatório encontrado para os filtros informados.</div>}</div>;
};
