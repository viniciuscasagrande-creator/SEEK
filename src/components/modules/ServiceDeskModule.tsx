import React, { useState } from 'react';
import { Headphones, Plus, Clock, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import { MY_TICKETS } from '../../data/mockData';
import { TicketItem } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';

export const ServiceDeskModule: React.FC = () => {
  const [tickets, setTickets] = useState<TicketItem[]>(MY_TICKETS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<TicketItem['department']>('TI');
  const [priority, setPriority] = useState<TicketItem['priority']>('MEDIA');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket: TicketItem = {
      id: `tkt-${Date.now()}`,
      code: `CH-2026-0${Math.floor(882 + Math.random() * 50)}`,
      title,
      department,
      status: 'ABERTO',
      priority,
      slaHoursRemaining: priority === 'CRITICA' ? 4 : priority === 'ALTA' ? 8 : 24,
      requesterName: 'Colaborador Ativo',
      createdAt: '05/10/2026 16:45'
    };
    setTickets(prev => [newTicket, ...prev]);
    setIsModalOpen(false);
    setTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Service Desk */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Atendimento Interno & Service Desk</h1>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              SEEK Relacionamento
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Central de chamados internos para TI, RH, Financeiro, Jurídico e Administrativo com gestão de SLA e filas.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            <span>Abrir Chamado Interno</span>
          </button>
        </div>
      </div>

      {/* KPIs do Service Desk */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chamados em Aberto"
          value={tickets.filter(t => t.status !== 'RESOLVIDO').length}
          subtitle="Em atendimento nas filas"
          icon={Headphones}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="SLA Médio de Atendimento"
          value="98.2%"
          change="+1.1 p.p."
          changeType="positive"
          subtitle="Atendidos dentro do prazo"
          icon={Clock}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Chamados Resolvidos (Mês)"
          value="142"
          subtitle="Índice de satisfação: 4.9/5"
          icon={CheckCircle2}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Fila Mais Demandada"
          value="TI Corporativo"
          subtitle="Acessos, catracas e redes"
          icon={AlertCircle}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Tabela de Chamados */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Número</th>
                <th className="py-3 px-4">Assunto / Descrição</th>
                <th className="py-3 px-4">Fila / Departamento</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4 text-center">Prioridade</th>
                <th className="py-3 px-4 text-center">SLA Restante</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{t.code}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">{t.title}</span>
                    <span className="block text-[10px] text-slate-400">Aberto em {t.createdAt}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {t.department}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{t.requesterName}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={t.priority} />
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    {t.slaHoursRemaining > 0 ? (
                      <span className="text-amber-700">{t.slaHoursRemaining}h</span>
                    ) : (
                      <span className="text-emerald-700">Resolvido</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Abertura de Chamado */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Chamado no Service Desk"
        subtitle="Abra uma solicitação interna para qualquer departamento corporativo."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Assunto / Descrição Sumária</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Liberação de acesso ao módulo Financeiro para novo analista"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Departamento de Destino</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value as TicketItem['department'])}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="TI">TI & Infraestrutura</option>
                <option value="RH">Recursos Humanos & DP</option>
                <option value="Financeiro">Financeiro & Controladoria</option>
                <option value="Jurídico">Jurídico & Contratos</option>
                <option value="Administrativo">Administrativo</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TicketItem['priority'])}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="BAIXA">Baixa (Até 48h)</option>
                <option value="MEDIA">Média (Até 24h)</option>
                <option value="ALTA">Alta (Até 8h)</option>
                <option value="CRITICA">Crítica (Até 4h)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800"
            >
              Registrar Chamado
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
