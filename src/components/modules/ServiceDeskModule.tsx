import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  MessageSquare,
  UserCheck,
  Building,
  ArrowRight,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { MY_TICKETS } from '../../data/mockData';
import { TicketItem } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const ServiceDeskModule: React.FC = () => {
  const { currentUser } = useAuth();

  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<'TI' | 'RH' | 'Financeiro' | 'Jurídico' | 'Administrativo'>('TI');
  const [priority, setPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('MEDIA');

  const loadData = async () => {
    try {
      const res = await api.getTickets(selectedDept, selectedStatus);
      if (res && res.length > 0) {
        setTickets(res);
      } else {
        // Fallback default tickets
        setTickets([
          ...MY_TICKETS,
          {
            id: 'tkt-04',
            code: 'CH-2026-0895',
            title: 'Erro de certificado digital na emissão de NFS-e Curitiba',
            department: 'Financeiro',
            status: 'ABERTO',
            priority: 'ALTA',
            slaHoursRemaining: 6,
            requesterName: 'Camila Fernandes Souza',
            createdAt: '05/10/2026 14:15'
          },
          {
            id: 'tkt-05',
            code: 'CH-2026-0896',
            title: 'Solicitação de novo token e acesso VPN para home office',
            department: 'TI',
            status: 'EM_ATENDIMENTO',
            priority: 'MEDIA',
            slaHoursRemaining: 18,
            requesterName: 'Rodrigo Mattos',
            createdAt: '05/10/2026 11:30'
          },
          {
            id: 'tkt-06',
            code: 'CH-2026-0897',
            title: 'Homologação de aditivo contratual de locação de geradores',
            department: 'Jurídico',
            status: 'ABERTO',
            priority: 'CRITICA',
            slaHoursRemaining: 3,
            requesterName: 'Lucas Bertolli Costa',
            createdAt: '05/10/2026 16:00'
          }
        ]);
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDept, selectedStatus]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const slaHours = priority === 'CRITICA' ? 4 : priority === 'ALTA' ? 8 : priority === 'MEDIA' ? 24 : 48;

    const payload = {
      title,
      description,
      department,
      priority,
      slaHoursRemaining: slaHours,
      requesterName: currentUser.fullName
    };

    const res = await api.createTicket(payload);
    if (res && res.ticket) {
      setTickets(prev => [res.ticket, ...prev]);
    } else {
      const newTicket = {
        id: `tkt-${Date.now()}`,
        code: `CH-2026-0${Math.floor(900 + Math.random() * 99)}`,
        title,
        description,
        department,
        status: 'ABERTO',
        priority,
        slaHoursRemaining: slaHours,
        requesterName: currentUser.fullName,
        createdAt: '05/10/2026 17:00'
      };
      setTickets(prev => [newTicket, ...prev]);
    }

    setNotification(`Chamado aberto com sucesso na fila de ${department} com SLA inicial de ${slaHours}h.`);
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    await api.updateTicketStatus(ticketId, newStatus, currentUser.fullName, currentUser.fullName);
    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              status: newStatus,
              slaHoursRemaining: newStatus === 'RESOLVIDO' ? 0 : t.slaHoursRemaining
            }
          : t
      )
    );
    setNotification(
      newStatus === 'RESOLVIDO'
        ? 'Chamado encerrado com sucesso e SLA cumprido.'
        : 'Chamado assumido para atendimento.'
    );
    setTimeout(() => setNotification(null), 3000);
  };

  // KPIs
  const openTickets = tickets.filter(t => t.status !== 'RESOLVIDO').length;
  const criticalTickets = tickets.filter(t => t.priority === 'CRITICA' && t.status !== 'RESOLVIDO').length;
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVIDO').length;

  const filteredTickets = tickets.filter(t => {
    const matchesDept = selectedDept === 'ALL' || t.department === selectedDept;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.requesterName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesStatus && matchesSearch;
  });

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
            Central de chamados corporativos para TI, RH, Financeiro, Jurídico e Administrativo com SLA rigoroso e filas dedicadas.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Abrir Chamado Interno</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {notification && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPIs do Service Desk */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chamados em Aberto"
          value={openTickets}
          subtitle="Aguardando ou em fila de atendimento"
          icon={Headphones}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="SLA Médio no Prazo"
          value="98.5%"
          change="+1.3 p.p."
          changeType="positive"
          subtitle="Atendidos dentro do limite estabelecido"
          icon={Clock}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Demandas Críticas"
          value={criticalTickets}
          subtitle="Com SLA menor que 4 horas"
          icon={Flame}
          iconColor={criticalTickets > 0 ? 'text-rose-600' : 'text-slate-600'}
          iconBg={criticalTickets > 0 ? 'bg-rose-50' : 'bg-slate-50'}
        />
        <StatCard
          title="Chamados Resolvidos"
          value={resolvedTickets}
          subtitle="Índice de satisfação interna: 4.9/5"
          icon={CheckCircle2}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Filtros e Barra de Pesquisa */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Filas Departamentais */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'ALL', label: 'Todas as Filas' },
            { id: 'TI', label: 'TI & Infra' },
            { id: 'RH', label: 'RH & DP' },
            { id: 'Financeiro', label: 'Financeiro' },
            { id: 'Jurídico', label: 'Jurídico' },
            { id: 'Administrativo', label: 'Administrativo' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedDept(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedDept === tab.id
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status & Busca */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ABERTO">Aberto</option>
            <option value="EM_ATENDIMENTO">Em Atendimento</option>
            <option value="RESOLVIDO">Resolvido</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por protocolo, solicitante ou assunto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-56 md:w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Chamados com Gestão de SLA */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Fila Corporativa de Chamados</h3>
            <p className="text-[11px] text-slate-500">Monitoramento em tempo real do tempo restante de SLA por severidade.</p>
          </div>
          <span className="text-xs font-bold text-slate-600">
            Total: {filteredTickets.length} chamados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Protocolo</th>
                <th className="py-3 px-4">Assunto / Descrição</th>
                <th className="py-3 px-4">Fila / Depto</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4 text-center">Prioridade</th>
                <th className="py-3 px-4 text-center">SLA Restante</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.map(t => {
                const hours = Number(t.slaHoursRemaining) || 0;
                const isUrgent = hours <= 4 && t.status !== 'RESOLVIDO';
                const isModerate = hours <= 12 && t.status !== 'RESOLVIDO';

                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{t.code}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-bold text-slate-900 block">{t.title}</span>
                      <span className="text-[10px] text-slate-400">Aberto em {t.createdAt}</span>
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
                      {t.status === 'RESOLVIDO' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Concluído</span>
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 animate-pulse">
                          <Clock className="h-3 w-3" />
                          <span>{hours}h restantes</span>
                        </span>
                      ) : isModerate ? (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Clock className="h-3 w-3" />
                          <span>{hours}h restantes</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-slate-600 font-mono">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{hours}h restantes</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.status === 'ABERTO' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'EM_ATENDIMENTO')}
                          className="rounded bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          Atender
                        </button>
                      )}
                      {t.status === 'EM_ATENDIMENTO' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'RESOLVIDO')}
                          className="rounded bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        >
                          Resolver ✓
                        </button>
                      )}
                      {t.status === 'RESOLVIDO' && (
                        <span className="text-[11px] text-slate-400">Encerrado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    Nenhum chamado encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Abertura de Chamado */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Chamado no Service Desk"
        subtitle="Abra uma solicitação interna com direcionamento para a fila corporativa competente."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Assunto / Descrição Sumária</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Liberação de permissão contábil para novo gestor financeiro"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Detalhamento da Necessidade</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Informe os detalhes, justificativa de negócio e impactos caso não seja atendido..."
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fila / Departamento de Destino</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value as any)}
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
              <label className="block font-bold text-slate-700 mb-1">Prioridade / Severidade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="BAIXA">Baixa (SLA de 48 horas)</option>
                <option value="MEDIA">Média (SLA de 24 horas)</option>
                <option value="ALTA">Alta (SLA de 8 horas)</option>
                <option value="CRITICA">Crítica (SLA de 4 horas)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              Registrar Chamado
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
