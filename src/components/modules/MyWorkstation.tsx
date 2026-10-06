import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileSignature,
  Headphones,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  CheckSquare,
  AlertTriangle,
  WalletCards,
  ArrowRight,
  RefreshCw,
  LayoutDashboard,
  Layers,
  Inbox
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { MY_TASKS, MY_TICKETS, DOCUMENTS_TO_SIGN } from '../../data/mockData';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { ScrollSpyNav } from '../common/ScrollSpyNav';
import { api } from '../../services/api';
import type { ActiveView } from '../layout/Sidebar';

interface MyWorkstationProps {
  onNavigate?: (view: ActiveView) => void;
}

interface WorkCenterData {
  summary: { pendingActions: number; critical: number; approvals: number; overdue: number; unreadNotifications: number };
  queue: Array<{ id: string; kind: string; module: string; title: string; description: string; route: string; priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'; status: string; dueDate?: string | null; amount?: number | null }>;
}

export const MyWorkstation: React.FC<MyWorkstationProps> = ({ onNavigate }) => {
  const { currentUser, activeCompany, activeBranch } = useAuth();
  const { approvals, approveRequest, rejectRequest } = useWorkflow();

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject';
    requestId: string;
    requestTitle: string;
  }>({
    isOpen: false,
    type: 'approve',
    requestId: '',
    requestTitle: ''
  });

  const [decisionComment, setDecisionComment] = useState('');
  const [tasks, setTasks] = useState(MY_TASKS);
  const [documents, setDocuments] = useState(DOCUMENTS_TO_SIGN);
  const [workCenter, setWorkCenter] = useState<WorkCenterData | null>(null);
  const [workLoading, setWorkLoading] = useState(false);

  const loadWorkCenter = async () => {
    setWorkLoading(true);
    try {
      const data = await api.getWorkCenter();
      if (data?.summary && Array.isArray(data?.queue)) setWorkCenter(data);
    } finally {
      setWorkLoading(false);
    }
  };

  useEffect(() => {
    loadWorkCenter();
  }, [activeCompany.id, activeBranch.id]);

  const workSummary = workCenter?.summary;
  const workQueue = useMemo(() => workCenter?.queue || [], [workCenter]);

  // Filtrar aprovações pendentes que competem ao perfil ou departamento
  const myPendingApprovals = approvals.filter(a => a.status === 'PENDENTE');

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status: t.status === 'CONCLUIDA' ? 'EM_ANDAMENTO' : 'CONCLUIDA' }
          : t
      )
    );
  };

  const handleSignDocument = (docId: string) => {
    setDocuments(prev =>
      prev.map(d => (d.id === docId ? { ...d, status: 'ASSINADO' } : d))
    );
  };

  const openDecisionModal = (type: 'approve' | 'reject', requestId: string, title: string) => {
    setDecisionModal({
      isOpen: true,
      type,
      requestId,
      requestTitle: title
    });
    setDecisionComment('');
  };

  const confirmDecision = () => {
    if (decisionModal.type === 'approve') {
      approveRequest(decisionModal.requestId, decisionComment);
    } else {
      rejectRequest(decisionModal.requestId, decisionComment);
    }
    setDecisionModal({ isOpen: false, type: 'approve', requestId: '', requestTitle: '' });
  };

  return (
    <div className="space-y-6">
      {/* ScrollSpy Navigation */}
      <ScrollSpyNav
        sections={[
          { id: 'work-banner', label: 'Panorama Geral', icon: LayoutDashboard },
          { id: 'work-indicators', label: 'Indicadores do Dia', icon: Layers },
          { id: 'work-queue', label: 'Fila Operacional', icon: Inbox },
          { id: 'work-approvals', label: 'Aprovações & Tarefas', icon: CheckSquare },
          { id: 'work-docs', label: 'Documentos & Suporte', icon: FileSignature }
        ]}
      />

      {/* Top Banner de Boas-vindas Corporativo */}
      <div id="work-banner" className="rounded-2xl border border-slate-200 bg-linear-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                Central de Trabalho SEEK
              </span>
              <span className="text-xs text-slate-300">• {activeCompany.tradeName} — {activeBranch.name}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
              Bom dia, {currentUser.fullName}!
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Aqui está o panorama consolidado do seu dia: pendências, alçadas, prazos e documentos prioritários.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-xs border border-white/10 text-center">
              <span className="block text-[11px] font-semibold text-blue-200">Alçada de Aprovação</span>
              <span className="text-base font-bold text-white">
                R$ {currentUser.approvalLimitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-xs border border-white/10 text-center">
              <span className="block text-[11px] font-semibold text-emerald-300">Nível RBAC</span>
              <span className="text-base font-bold text-emerald-400">{currentUser.roleLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Indicadores Pessoais / Meu Dia */}
      <div id="work-indicators" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Minhas Aprovações"
          value={myPendingApprovals.length}
          subtitle="Aguardando seu parecer"
          icon={CheckCircle2}
          iconColor="text-amber-700"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Minhas Tarefas"
          value={tasks.filter(t => t.status !== 'CONCLUIDA').length}
          subtitle="Prazos para esta semana"
          icon={CheckSquare}
          iconColor="text-blue-700"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Meus Chamados Abertos"
          value={MY_TICKETS.filter(t => t.status !== 'RESOLVIDO').length}
          subtitle="Atendimento no Service Desk"
          icon={Headphones}
          iconColor="text-indigo-700"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Assinaturas Pendentes"
          value={documents.filter(d => d.status === 'PENDENTE').length}
          subtitle="Contratos e termos corporativos"
          icon={FileSignature}
          iconColor="text-rose-700"
          iconBg="bg-rose-50"
        />
      </div>

      {/* SEEK V1.9 — Fila Operacional Integrada do Core */}
      <div id="work-queue" className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <WalletCards className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Fila Operacional Integrada</h2>
                <p className="text-[11px] text-slate-500">Pendências reais consolidadas de aprovações, Financeiro, Fiscal, Compras, RH e Contratos conforme sua permissão.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">{workSummary?.pendingActions ?? workQueue.length} ações</span>
            <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700">{workSummary?.critical ?? 0} críticas</span>
            <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700">{workSummary?.overdue ?? 0} vencidas</span>
            <button onClick={loadWorkCenter} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              <RefreshCw className={`h-3.5 w-3.5 ${workLoading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {workQueue.slice(0, 10).map(item => (
            <button
              type="button"
              key={item.id}
              onClick={() => onNavigate?.(item.route as ActiveView)}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.priority === 'CRITICA' ? 'bg-rose-50 text-rose-700' : item.priority === 'ALTA' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                {item.priority === 'CRITICA' ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{item.module}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${item.priority === 'CRITICA' ? 'bg-rose-100 text-rose-700' : item.priority === 'ALTA' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{item.priority}</span>
                </div>
                <div className="mt-0.5 truncate text-xs font-bold text-slate-900">{item.title}</div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">{item.description}</div>
              </div>
              {typeof item.amount === 'number' && <div className="hidden shrink-0 text-right sm:block"><div className="text-xs font-black text-slate-900">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div><div className="text-[10px] text-slate-400">{item.status.replaceAll('_', ' ')}</div></div>}
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </button>
          ))}
          {!workLoading && workQueue.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400">Nenhuma pendência operacional disponível para o seu perfil neste momento.</div>
          )}
        </div>
      </div>

      {/* Grid Central: Minhas Aprovações & Minhas Tarefas */}
      <div id="work-approvals" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BLOCO 1: Minhas Aprovações Pendentes (Motor de Workflows) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Aprovações Aguardando Parecer</h2>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {myPendingApprovals.length} pendentes
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {myPendingApprovals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma solicitação de aprovação pendente no momento.
              </div>
            ) : (
              myPendingApprovals.map(item => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-3.5 hover:border-slate-300 transition-all bg-slate-50/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={item.entityType} />
                        <span className="text-xs font-semibold text-slate-500">{item.department}</span>
                      </div>
                      <h4 className="mt-1 text-xs font-bold text-slate-900">{item.title}</h4>
                      <p className="mt-0.5 text-[11px] text-slate-600">{item.description}</p>
                    </div>
                    {item.amount && (
                      <span className="text-xs font-extrabold text-slate-900 shrink-0 ml-2">
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span>
                      Solicitante: <strong className="text-slate-700">{item.requesterName}</strong> ({item.requesterRole})
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => openDecisionModal('reject', item.id, item.title)}
                        className="flex items-center space-x-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        <span>Rejeitar</span>
                      </button>
                      <button
                        onClick={() => openDecisionModal('approve', item.id, item.title)}
                        className="flex items-center space-x-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span>Aprovar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BLOCO 2: Minhas Tarefas Prioritárias */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CheckSquare className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Minhas Tarefas & Prazos</h2>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">Ver todas</button>
          </div>

          <div className="mt-4 space-y-2.5">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => toggleTaskStatus(task.id)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                  task.status === 'CONCLUIDA'
                    ? 'border-slate-200 bg-slate-50 opacity-60'
                    : 'border-slate-200 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'CONCLUIDA'}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span
                      className={`text-xs font-bold text-slate-900 ${
                        task.status === 'CONCLUIDA' ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {task.title}
                    </span>
                    <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500">
                      <span className="font-semibold text-blue-700">{task.module}</span>
                      <span>•</span>
                      <span>{task.relatedEntity}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <StatusBadge status={task.priority} />
                  <span className="text-[10px] font-semibold text-slate-500">{task.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Inferior: Documentos para Assinar & Chamados no Service Desk */}
      <div id="work-docs" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BLOCO 3: Documentos Corporativos Aguardando Assinatura */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <FileSignature className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Documentos para Minha Assinatura</h2>
            </div>
            <span className="text-xs text-slate-500">Assinatura Eletrônica SEEK</span>
          </div>

          <div className="mt-4 space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={doc.type} />
                    <span className="text-[11px] text-slate-500">Prazo: {doc.deadline}</span>
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-slate-800">{doc.title}</h4>
                  <p className="text-[11px] text-slate-500">{doc.partyName}</p>
                </div>

                {doc.status === 'ASSINADO' ? (
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                    Assinado
                  </span>
                ) : (
                  <button
                    onClick={() => handleSignDocument(doc.id)}
                    className="flex items-center space-x-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span>Assinar</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BLOCO 4: Meus Chamados no Service Desk */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Headphones className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Meus Chamados / Atendimento</h2>
            </div>
            <span className="text-xs text-slate-500">SLA Monitorado</span>
          </div>

          <div className="mt-4 space-y-3">
            {MY_TICKETS.map(ticket => (
              <div
                key={ticket.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-700">{ticket.code}</span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                      {ticket.department}
                    </span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-slate-800">{ticket.title}</h4>
                  <span className="text-[11px] text-slate-500">Aberto em {ticket.createdAt}</span>
                </div>

                <div className="text-right">
                  {ticket.slaHoursRemaining > 0 ? (
                    <span className="text-xs font-bold text-amber-700">
                      {ticket.slaHoursRemaining}h restantes
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700">Finalizado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Parecer (Aprovar / Rejeitar) */}
      <Modal
        isOpen={decisionModal.isOpen}
        onClose={() => setDecisionModal({ isOpen: false, type: 'approve', requestId: '', requestTitle: '' })}
        title={decisionModal.type === 'approve' ? 'Aprovação de Alçada — SEEK' : 'Rejeição de Solicitação — SEEK'}
        subtitle={decisionModal.requestTitle}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Você está formalizando sua decisão como{' '}
            <strong className="text-slate-900">{currentUser.fullName} ({currentUser.roleTitle})</strong>.
            Esta operação será registrada de forma imutável na trilha de auditoria do SEEK.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Parecer / Justificativa {decisionModal.type === 'reject' ? '(Obrigatório)' : '(Opcional)'}
            </label>
            <textarea
              rows={3}
              value={decisionComment}
              onChange={e => setDecisionComment(e.target.value)}
              placeholder="Digite suas observações técnicas ou financeiras..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setDecisionModal({ isOpen: false, type: 'approve', requestId: '', requestTitle: '' })}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDecision}
              className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer ${
                decisionModal.type === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Confirmar {decisionModal.type === 'approve' ? 'Aprovação' : 'Rejeição'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
