import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Filter,
  Check,
  X,
  AlertCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { WorkflowEntityType, ApprovalItem } from '../../types/workflow';

export const ApprovalsCenter: React.FC = () => {
  const { approvals, approveRequest, rejectRequest } = useWorkflow();
  const { currentUser } = useAuth();

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDENTE');

  const [detailModal, setDetailModal] = useState<ApprovalItem | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject';
    requestId: string;
    itemTitle: string;
  }>({
    isOpen: false,
    type: 'approve',
    requestId: '',
    itemTitle: ''
  });
  const [comment, setComment] = useState('');

  const filteredApprovals = approvals.filter(item => {
    if (selectedType !== 'ALL' && item.entityType !== selectedType) return false;
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
    return true;
  });

  const handleDecision = () => {
    if (decisionModal.type === 'approve') {
      approveRequest(decisionModal.requestId, comment);
    } else {
      rejectRequest(decisionModal.requestId, comment);
    }
    setDecisionModal({ isOpen: false, type: 'approve', requestId: '', itemTitle: '' });
    setDetailModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner do Motor de Workflows */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Central de Aprovações & Workflows</h1>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              Motor Central SEEK
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão corporativa unificada de alçadas para compras, pagamentos, contratos, férias e exceções comerciais.
          </p>
        </div>

        {/* Informações da Alçada Atual */}
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            Sua Alçada Direta:{' '}
            <strong className="text-emerald-700">
              R$ {currentUser.approvalLimitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </div>

      {/* Filtros por Tipo e Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Filtrar por:</span>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="COMPRA">Compras</option>
            <option value="PAGAMENTO">Pagamentos</option>
            <option value="CONTRATO">Contratos</option>
            <option value="FERIAS">Férias</option>
            <option value="DESCONTO_COMERCIAL">Descontos Comerciais</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="APROVADO">Aprovados</option>
            <option value="REJEITADO">Rejeitados</option>
          </select>
        </div>

        <span className="text-xs text-slate-500">
          Exibindo <strong>{filteredApprovals.length}</strong> de {approvals.length} solicitações
        </span>
      </div>

      {/* Lista de Solicitações de Alçada */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            Nenhuma solicitação encontrada com os filtros selecionados.
          </div>
        ) : (
          filteredApprovals.map(item => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.entityType} />
                    <StatusBadge status={item.status} />
                    <span className="text-xs font-semibold text-slate-500">
                      {item.department} • Criado em {item.createdAt}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                      Prioridade: {item.priority}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                  </div>

                  <div className="text-xs text-slate-500">
                    Solicitante: <strong className="text-slate-800">{item.requesterName}</strong> ({item.requesterRole})
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end justify-between space-y-3 shrink-0">
                  {item.amount && (
                    <div className="text-left lg:text-right">
                      <span className="block text-[11px] text-slate-400 font-semibold uppercase">Valor Comprometido</span>
                      <span className="text-lg font-black text-slate-900">
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {item.status === 'PENDENTE' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setDecisionModal({
                            isOpen: true,
                            type: 'reject',
                            requestId: item.id,
                            itemTitle: item.title
                          })
                        }
                        className="flex items-center space-x-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Rejeitar</span>
                      </button>

                      <button
                        onClick={() =>
                          setDecisionModal({
                            isOpen: true,
                            type: 'approve',
                            requestId: item.id,
                            itemTitle: item.title
                          })
                        }
                        className="flex items-center space-x-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Aprovar Alçada</span>
                      </button>

                      <button
                        onClick={() => setDetailModal(item)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Detalhes
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Linha do Tempo de Alçadas de Aprovação (Workflow Steps) */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Trilha de Alçadas do Processo:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {item.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs ${
                        step.status === 'APROVADO'
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : step.status === 'REJEITADO'
                          ? 'border-rose-200 bg-rose-50/50'
                          : idx === item.currentStepIndex
                          ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-300'
                          : 'border-slate-200 bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[11px] text-slate-700">Etapa {step.stepNumber}</span>
                        <StatusBadge status={step.status} />
                      </div>
                      <p className="mt-1 font-semibold text-slate-900">{step.label}</p>
                      {step.deciderName && (
                        <p className="mt-1 text-[10px] text-slate-600">
                          Decidido por: <strong>{step.deciderName}</strong> em {step.decisionDate}
                        </p>
                      )}
                      {step.comment && (
                        <p className="mt-0.5 text-[10px] italic text-slate-500">"{step.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Decisão (Aprovar / Rejeitar) */}
      <Modal
        isOpen={decisionModal.isOpen}
        onClose={() => setDecisionModal({ isOpen: false, type: 'approve', requestId: '', itemTitle: '' })}
        title={decisionModal.type === 'approve' ? 'Aprovação de Alçada — SEEK' : 'Rejeição de Solicitação — SEEK'}
        subtitle={decisionModal.itemTitle}
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
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Digite suas observações técnicas ou financeiras..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setDecisionModal({ isOpen: false, type: 'approve', requestId: '', itemTitle: '' })}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleDecision}
              className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs ${
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

      {/* Modal de Detalhes da Solicitação */}
      {detailModal && (
        <Modal
          isOpen={!!detailModal}
          onClose={() => setDetailModal(null)}
          title={`Detalhes da Solicitação #${detailModal.id}`}
          subtitle={detailModal.title}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-slate-400 block font-semibold">Tipo:</span>
                <span className="font-bold text-slate-800">{detailModal.entityType}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Departamento:</span>
                <span className="font-bold text-slate-800">{detailModal.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Solicitante:</span>
                <span className="font-bold text-slate-800">{detailModal.requesterName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Data de Criação:</span>
                <span className="font-bold text-slate-800">{detailModal.createdAt}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block font-semibold mb-1">Descrição Completa:</span>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {detailModal.description}
              </p>
            </div>

            {detailModal.amount && (
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                <span className="font-bold text-blue-900">Valor Total Submetido:</span>
                <span className="text-base font-black text-blue-950">
                  R$ {detailModal.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
