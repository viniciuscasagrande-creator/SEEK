import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  AlertTriangle,
  Building,
  ArrowUpRight,
  ShieldCheck,
  FileCheck,
  Percent,
  Calendar,
  Layers,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { CONTRACTS_RECORDS, FINANCIAL_ENTRIES, CRM_OPPORTUNITIES } from '../../data/mockData';
import { api } from '../../services/api';

export const ExecutiveDashboard: React.FC = () => {
  const { activeCompany, activeBranch } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>(CONTRACTS_RECORDS);
  const [crmDeals, setCrmDeals] = useState<any[]>(CRM_OPPORTUNITIES);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const d = await api.getDashboard();
        if (d) setDashboardData(d);

        const c = await api.getContracts();
        if (c && c.contracts && c.contracts.length > 0) setContracts(c.contracts);

        const deals = await api.getCrmDeals();
        if (deals && deals.length > 0) setCrmDeals(deals);
      } catch {
        // fallback to defaults
      }
    };
    fetchData();
  }, []);

  // Métricas calculadas para a visão executiva com fallback
  const totalReceitas = dashboardData?.finance?.totalReceitas ?? FINANCIAL_ENTRIES.filter(f => f.type === 'RECEBER').reduce((a, b) => a + b.amount, 0);
  const totalDespesas = dashboardData?.finance?.totalDespesas ?? FINANCIAL_ENTRIES.filter(f => f.type === 'PAGAR').reduce((a, b) => a + b.amount, 0);
  const totalPipeline = dashboardData?.crm?.pipelineTotal ?? CRM_OPPORTUNITIES.reduce((a, b) => a + b.value, 0);
  const ebitdaPercent = dashboardData?.finance?.ebitdaPercent ?? 24.8;
  const pendingApprovalsCount = dashboardData?.operations?.pendingApprovalsCount ?? 2;
  const expiringContractsCount = dashboardData?.contracts?.expiringSoonCount ?? 1;

  return (
    <div className="space-y-6">
      {/* Top Banner Executivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Dashboard Executivo Integrado</h1>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              Visão Consolidada C-Level
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Empresa ativa: <strong className="text-slate-800">{activeCompany.tradeName}</strong> ({activeBranch.name})
            — Indicadores financeiros, vendas, contratos, suprimentos e operações em tempo real.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs flex items-center space-x-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>Outubro / 2026</span>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Corporativos de Alto Impacto */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receita Prevista (Mês)"
          value={`R$ ${(totalReceitas / 1000).toFixed(1)}k`}
          change="+14.2% vs set"
          changeType="positive"
          subtitle="Taxas e contratos homologados"
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />

        <StatCard
          title="Despesas & Obrigações"
          value={`R$ ${(totalDespesas / 1000).toFixed(1)}k`}
          change="-3.8% dentro do budget"
          changeType="positive"
          subtitle="Folha, infra & compras"
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />

        <StatCard
          title="Pipeline Comercial (CRM)"
          value={`R$ ${(totalPipeline / 1000000).toFixed(2)}M`}
          change={`${crmDeals.length} contas em negociação`}
          changeType="neutral"
          subtitle="Turnês, Festivais e Arenas"
          icon={Briefcase}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />

        <StatCard
          title="EBITDA Projetado"
          value={`${ebitdaPercent}%`}
          change="+1.5 p.p."
          changeType="positive"
          subtitle="Margem de contribuição saudável"
          icon={Percent}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      {/* Seção 2: Gráficos e Distribuição Departamental */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Painel Orçamentário e Despesas por Departamento */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Execução Orçamentária por Departamento</h3>
              <p className="text-xs text-slate-500">Acompanhamento do teto aprovado vs despesas comprometidas</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">Exercício 2026</span>
          </div>

          <div className="mt-5 space-y-4">
            {/* Departamento 1: Operações & Serviços */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                <span>Operações & Serviços Corporativos</span>
                <span className="text-rose-600 font-bold">104.2% (R$ 312.600 / R$ 300.000)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '100%' }} />
              </div>
              <span className="text-[10px] text-slate-600 block mt-0.5">Alerta: Excedeu R$ 12.600 devido à expansão emergencial de capacidade de Datacenter</span>
            </div>

            {/* Departamento 2: Tecnologia da Informação */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                <span>Tecnologia & Infraestrutura Cloud</span>
                <span className="text-slate-700">91.8% (R$ 275.400 / R$ 300.000)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '91.8%' }} />
              </div>
            </div>

            {/* Departamento 3: Comercial & Marketing */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                <span>Comercial, CRM & Marketing Corporativo</span>
                <span className="text-slate-700">78.5% (R$ 157.000 / R$ 200.000)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78.5%' }} />
              </div>
            </div>

            {/* Departamento 4: RH & Administrativo */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                <span>RH, DP & Administrativo</span>
                <span className="text-slate-700">82.0% (R$ 164.000 / R$ 200.000)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '82%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Painel Alertas Críticos de Governança & Contratos */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Alertas de Governança</h3>
            <span className="flex h-2 w-2 rounded-full bg-rose-500" />
          </div>

          <div className="mt-4 space-y-3.5">
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-900">
                  {expiringContractsCount} Contrato(s) em Alerta de Renovação
                </span>
              </div>
              <p className="mt-1 text-[11px] text-amber-800 leading-tight">
                <strong>Grupo Votorantim</strong> (R$ 85k/mês) entra na janela de renovação e reajuste por IPCA.
              </p>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-blue-900">
                  {pendingApprovalsCount} Alçadas Pendentes de Deliberação
                </span>
              </div>
              <p className="mt-1 text-[11px] text-blue-800 leading-tight">
                Processos de compras e contratos aguardando validação de Diretoria e Gerência.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-900">Saving Acumulado em Compras</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-800 leading-tight">
                Negociações com concorrência geraram <strong>R$ 48.750,00</strong> de economia direta no trimestre.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3: Visão de Contratos e Oportunidades Comerciais */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contratos Estratégicos */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Contratos Ativos & Vencimentos</h3>
            <span className="text-xs text-slate-500">SEEK Jurídico</span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {contracts.slice(0, 5).map((c: any) => (
              <div key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{c.partyName || c.party_name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {c.contractNumber || c.contract_number} • Término: {c.endDate || c.end_date} ({c.daysRemaining ?? c.days_remaining} dias)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900">
                    R$ {(c.monthlyValue || c.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </span>
                  <span className="block text-[10px] text-slate-400">Índice: {c.readjustmentIndex || c.readjustment_index}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funil Comercial Executivo */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Previsão Comercial & Grandes Contas</h3>
            <span className="text-xs text-slate-500">SEEK CRM</span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {crmDeals.slice(0, 5).map((op: any) => (
              <div key={op.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{op.clientName || op.client_name}</span>
                    <StatusBadge status={op.stage} />
                  </div>
                  <span className="text-[11px] text-slate-500">{op.title}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900">
                    R$ {(op.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[10px] font-bold text-indigo-600">
                    {op.probability}% de probabilidade
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
