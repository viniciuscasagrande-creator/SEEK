import React from 'react';
import { ShieldCheck, AlertTriangle, CheckSquare, FileText, Lock } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';

export const GovernanceModule: React.FC = () => {
  const risks = [
    {
      id: 'rsk-01',
      title: 'Pico de Tráfego e Indisponibilidade de Bilheteria Online',
      category: 'Tecnologia / Operações',
      probability: 'MÉDIA',
      impact: 'CRÍTICO',
      status: 'MITIGADO',
      mitigationPlan: 'Auto-scaling em cluster AWS + Fila virtual de espera implementada.'
    },
    {
      id: 'rsk-02',
      title: 'Vazamento ou Incidente de Dados Pessoais (LGPD)',
      category: 'Segurança / Jurídico',
      probability: 'BAIXA',
      impact: 'CRÍTICO',
      status: 'MONITORADO',
      mitigationPlan: 'Criptografia ponta a ponta, tokenização de cartões e DPO ativo.'
    },
    {
      id: 'rsk-03',
      title: 'Inadimplência de Produtor de Eventos em Fechamento de Lote',
      category: 'Financeiro',
      probability: 'BAIXA',
      impact: 'ALTO',
      status: 'CONTROLADO',
      mitigationPlan: 'Retenção automática de repasses e garantia caução em contrato.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Governança */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Governança, Riscos & Compliance</h1>
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
              SEEK Estratégia
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Matriz corporativa de riscos, conformidade com a LGPD, auditorias internas e planos de contingência.
          </p>
        </div>
      </div>

      {/* KPIs Governança */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Índice Geral de Compliance"
          value="98.5%"
          change="+0.5 p.p."
          changeType="positive"
          subtitle="Aderência às políticas do SEEK"
          icon={ShieldCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Riscos Críticos Mapeados"
          value="3"
          subtitle="Todos com plano de mitigação ativo"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Conformidade LGPD"
          value="100%"
          subtitle="DPO & encarregado homologados"
          icon={Lock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Planos de Ação Concluídos"
          value="18"
          subtitle="Exercício 2026 auditado"
          icon={CheckSquare}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Matriz de Riscos */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Matriz de Riscos Corporativos Prioritários</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Risco Mapeado</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-center">Probabilidade</th>
                <th className="py-3 px-4 text-center">Impacto</th>
                <th className="py-3 px-4">Plano de Mitigação & Controle</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {risks.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{r.title}</td>
                  <td className="py-3 px-4 text-slate-600">{r.category}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">{r.probability}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-black ${
                        r.impact === 'CRÍTICO' ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    >
                      {r.impact}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{r.mitigationPlan}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
