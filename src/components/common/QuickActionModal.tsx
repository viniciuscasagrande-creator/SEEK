import React, { useState } from 'react';
import { Modal } from './Modal';
import { ShoppingCart, DollarSign, Users2, Headphones, Sparkles, CheckCircle2 } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';
import { WorkflowEntityType } from '../../types/workflow';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({ isOpen, onClose }) => {
  const { createApprovalRequest } = useWorkflow();
  const { currentUser, activeCompany } = useAuth();

  const [activeTab, setActiveTab] = useState<'compra' | 'financeiro' | 'crm' | 'chamado'>('compra');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let entityType: WorkflowEntityType = 'COMPRA';
    if (activeTab === 'financeiro') entityType = 'PAGAMENTO';

    const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;

    createApprovalRequest({
      companyId: activeCompany.id,
      entityType,
      title: title || 'Nova solicitação via Ação Rápida',
      amount: numAmount,
      description: `${description} ${supplier ? `| Fornecedor: ${supplier}` : ''}`.trim(),
      priority: numAmount > 20000 ? 'ALTA' : 'MEDIA'
    });

    setSuccessMessage('Solicitação registrada com sucesso e encaminhada para as alçadas de aprovação!');
    setTimeout(() => {
      setSuccessMessage(null);
      setTitle('');
      setAmount('');
      setDescription('');
      setSupplier('');
      onClose();
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ação Rápida Corporativa — SEEK"
      subtitle="Crie solicitações, despesas ou oportunidades integradas instantaneamente."
    >
      {successMessage ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">{successMessage}</h4>
          <p className="text-xs text-slate-500">O registro foi gravado na trilha de auditoria e notificado aos aprovadores.</p>
        </div>
      ) : (
        <div>
          {/* Tabs */}
          <div className="grid grid-cols-4 gap-2 mb-6 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('compra')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'compra'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Compra</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('financeiro')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'financeiro'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Despesa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crm')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'crm'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users2 className="h-3.5 w-3.5" />
              <span>CRM Lead</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chamado')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'chamado'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>Chamado</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {activeTab === 'compra'
                  ? 'Descrição do Item / Serviço a Comprar'
                  : activeTab === 'financeiro'
                  ? 'Título do Pagamento / Reembolso'
                  : activeTab === 'crm'
                  ? 'Nome do Cliente Corporativo / Oportunidade'
                  : 'Assunto do Chamado Interno'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Aquisição de 10 estações de trabalho Dell OptiPlex"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeTab === 'chamado' ? 'Departamento de Destino' : 'Valor Estimado (R$)'}
                </label>
                {activeTab === 'chamado' ? (
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option>TI & Infraestrutura</option>
                    <option>Recursos Humanos & DP</option>
                    <option>Financeiro & Contábil</option>
                    <option>Jurídico Corporativo</option>
                    <option>Administrativo</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Ex: 4500.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeTab === 'compra'
                    ? 'Fornecedor Cotado / Homologado'
                    : activeTab === 'financeiro'
                    ? 'Favorecido / Centro de Custo'
                    : activeTab === 'crm'
                    ? 'Probabilidade de Fechamento (%)'
                    : 'Prioridade / Urgência'}
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="Ex: Gráfica Segurança / TI Operações"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Justificativa Operacional & Detalhes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Insira detalhes pertinentes para análise da alçada de aprovação..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-3 text-[11px] text-blue-900 flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Regra de Alçada Automática:</span> Como solicitante ({currentUser.fullName}),
                valores acima de R$ 15.000,00 exigem automaticamente parecer da Gerência Financeira e chancela da Diretoria Executiva.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
              >
                Confirmar e Submeter ao SEEK
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};
