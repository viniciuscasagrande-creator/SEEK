import React from 'react';
import { KanbanSquare, CheckCircle2, Clock, Users, Plus, Target } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';

export const ProjectsModule: React.FC = () => {
  const projects = [
    {
      id: 'prj-01',
      code: 'PRJ-2026-01',
      name: 'Implantação da Plataforma Integrada SEEK V1',
      department: 'Tecnologia & Operações',
      progress: 85,
      budget: 150000.00,
      spent: 118000.00,
      status: 'EM_ANDAMENTO',
      leader: 'Eduardo Martins',
      deadline: '15/11/2026'
    },
    {
      id: 'prj-02',
      code: 'PRJ-2026-02',
      name: 'Expansão Operacional Filial São Paulo (Faria Lima)',
      department: 'Diretoria & Comercial',
      progress: 60,
      budget: 450000.00,
      spent: 280000.00,
      status: 'EM_ANDAMENTO',
      leader: 'Lucas Bertolli Costa',
      deadline: '30/12/2026'
    },
    {
      id: 'prj-03',
      code: 'PRJ-2026-03',
      name: 'Operação de Bilheteria & Acessos Festival Curitiba Sounds',
      department: 'Operações de Eventos',
      progress: 95,
      budget: 80000.00,
      spent: 78500.00,
      status: 'EM_ANDAMENTO',
      leader: 'Beatriz Castro Lima',
      deadline: '20/10/2026'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Projetos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Projetos & Operações</h1>
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
              SEEK Gestão
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Planejamento estratégico de projetos, tarefas, alocação de horas e monitoramento de orçamento consumido.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800">
            <Plus className="h-4 w-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* KPIs de Projetos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projetos Estratégicos"
          value={projects.length}
          subtitle="Com orçamento aprovado"
          icon={KanbanSquare}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Taxa de Entregas no Prazo"
          value="94.8%"
          change="+3.2 p.p."
          changeType="positive"
          subtitle="Milestones cumpridos"
          icon={Target}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Orçamento Consolidado"
          value="R$ 680,0k"
          subtitle="CapEx e OpEx alocados"
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Colaboradores Alocados"
          value="28"
          subtitle="Em squads multifuncionais"
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Cards de Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {projects.map(p => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700">{p.code}</span>
              <StatusBadge status={p.status} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">{p.name}</h3>
              <span className="text-[11px] text-slate-500 block mt-1">{p.department}</span>
            </div>

            {/* Barra de Progresso */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Progresso</span>
                <span>{p.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Orçamento Realizado:</span>
                <span className="font-bold text-slate-800">
                  R$ {(p.spent / 1000).toFixed(1)}k / {(p.budget / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Líder Responsável:</span>
                <span className="font-medium text-slate-800">{p.leader}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Prazo Final:</span>
                <span className="font-medium text-slate-800">{p.deadline}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
