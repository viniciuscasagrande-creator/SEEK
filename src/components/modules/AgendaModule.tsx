import React from 'react';
import { Calendar, Clock, MapPin, Users, Plus, CheckCircle2 } from 'lucide-react';
import { AGENDA_EVENTS } from '../../data/mockData';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';

export const AgendaModule: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Banner Agenda */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Agenda Corporativa & Prazos</h1>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              SEEK Início
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visão unificada de compromissos, reuniões executivas, entregas operacionais e obrigações fiscais.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800">
            <Plus className="h-4 w-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs da Agenda */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Compromissos Hoje"
          value="3"
          subtitle="Reuniões & alinhamentos"
          icon={Calendar}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Obrigações da Semana"
          value="7"
          subtitle="Fiscais, contratos & projetos"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Eventos Operacionais"
          value="2"
          subtitle="Festivais em Curitiba & SP"
          icon={MapPin}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Taxa de Pontualidade"
          value="98.5%"
          subtitle="Prazos cumpridos no mês"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Linha do Tempo de Compromissos */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Próximos Compromissos Agendados</h3>
        <div className="divide-y divide-slate-100">
          {AGENDA_EVENTS.map(ev => (
            <div key={ev.id} className="py-3.5 flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{ev.title}</h4>
                  <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500">
                    <span className="font-semibold text-blue-700">{ev.date}</span>
                    <span>•</span>
                    <span>Lotação Matriz Curitiba</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={ev.type} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
