import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  DollarSign,
  Target,
  Calendar,
  User,
  Search,
  Award,
  ArrowRight,
  ArrowLeft,
  Send,
  FileCheck2,
  CheckCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { CRM_OPPORTUNITIES } from '../../data/mockData';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const CRMModule: React.FC = () => {
  const { createApprovalRequest, refreshApprovals } = useWorkflow();
  const { currentUser, activeCompany } = useAuth();

  const [deals, setDeals] = useState<any[]>(CRM_OPPORTUNITIES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalModalDeal, setApprovalModalDeal] = useState<any | null>(null);
  const [discountPercent, setDiscountPercent] = useState('5.0');
  const [discountJustification, setDiscountJustification] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Form states
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState('LEAD');
  const [expectedCloseDate, setExpectedCloseDate] = useState('2026-11-30');

  // Os 8 estágios oficiais do pipeline configurável:
  // Lead → Qualificação → Oportunidade → Proposta → Negociação → Aprovação → Contrato → Cliente
  const stages = [
    { key: 'LEAD', label: '1. Lead', color: 'border-slate-300' },
    { key: 'QUALIFICACAO', label: '2. Qualificação', color: 'border-blue-300' },
    { key: 'OPORTUNIDADE', label: '3. Oportunidade', color: 'border-indigo-300' },
    { key: 'PROPOSTA', label: '4. Proposta', color: 'border-amber-400' },
    { key: 'NEGOCIACAO', label: '5. Negociação', color: 'border-purple-400' },
    { key: 'APROVACAO', label: '6. Aprovação', color: 'border-rose-400' },
    { key: 'CONTRATO', label: '7. Contrato', color: 'border-teal-400' },
    { key: 'CLIENTE', label: '8. Cliente Ganho', color: 'border-emerald-500' }
  ];

  const loadDeals = async () => {
    try {
      const serverDeals = await api.getCrmDeals();
      if (serverDeals && serverDeals.length > 0) {
        setDeals(serverDeals);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const totalPipeline = deals.reduce((acc, d) => acc + (d.value || 0), 0);
  const totalWeighted = deals.reduce((acc, d) => acc + (d.value || 0) * ((d.probability || 20) / 100), 0);
  const totalGanhos = deals.filter(d => d.stage === 'CLIENTE').reduce((acc, d) => acc + (d.value || 0), 0);
  const winRate = totalPipeline > 0 ? ((totalGanhos / totalPipeline) * 100).toFixed(1) : '18.5';

  const moveStage = async (dealId: string, direction: 'next' | 'prev') => {
    const currentDeal = deals.find(d => d.id === dealId);
    if (!currentDeal) return;

    const currentIdx = stages.findIndex(s => s.key === currentDeal.stage);
    const nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;

    if (nextIdx >= 0 && nextIdx < stages.length) {
      const newStage = stages[nextIdx].key;
      const newProb = newStage === 'CLIENTE' ? 100 : newStage === 'CONTRATO' ? 90 : (nextIdx + 1) * 12;

      // Otimista
      setDeals(prev =>
        prev.map(d => (d.id === dealId ? { ...d, stage: newStage, probability: newProb } : d))
      );

      // Backend
      const res = await api.updateCrmStage(dealId, newStage, currentUser.fullName, newStage === 'CLIENTE');
      if (res && res.createdContract) {
        setNotification(
          `🎉 Negócio fechado com sucesso! Gerado Contrato ${res.createdContract.contractNumber} e Fatura ${res.createdFinance?.code} no SEEK Core.`
        );
        setTimeout(() => setNotification(null), 8000);
      }
      loadDeals();
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseFloat(value) || 0;

    const res = await api.createCrmDeal({
      clientName,
      title,
      value: parsedValue,
      stage,
      ownerName: currentUser.fullName,
      expectedCloseDate,
      userRole: currentUser.roleTitle
    });

    if (res && res.id) {
      setNotification(`✅ Oportunidade com ${clientName} cadastrada no pipeline.`);
      loadDeals();
    } else {
      const newDeal = {
        id: `crm-${Date.now()}`,
        clientName,
        title,
        value: parsedValue,
        stage,
        probability: stage === 'CLIENTE' ? 100 : 25,
        ownerName: currentUser.fullName,
        expectedCloseDate
      };
      setDeals(prev => [newDeal, ...prev]);
      setNotification(`✅ Oportunidade cadastrada.`);
    }

    setIsModalOpen(false);
    setClientName('');
    setTitle('');
    setValue('');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSendToApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalDeal) return;

    createApprovalRequest({
      companyId: activeCompany.id,
      entityType: 'DESCONTO_COMERCIAL',
      title: `Exceção Comercial (${discountPercent}% Desconto) — ${approvalModalDeal.clientName}`,
      amount: approvalModalDeal.value,
      description: `Negociação: ${approvalModalDeal.title}. Justificativa: ${discountJustification}`,
      priority: 'ALTA'
    });

    // Move deal to APROVACAO stage
    setDeals(prev =>
      prev.map(d => (d.id === approvalModalDeal.id ? { ...d, stage: 'APROVACAO', probability: 85 } : d))
    );

    api.updateCrmStage(approvalModalDeal.id, 'APROVACAO', currentUser.fullName);

    setApprovalModalDeal(null);
    setDiscountJustification('');
    setNotification(`⚡ Alçada de desconto enviada para a Diretoria Comercial!`);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleConvertToContract = async (deal: any) => {
    const res = await api.updateCrmStage(deal.id, 'CLIENTE', currentUser.fullName, true);
    if (res && res.createdContract) {
      setNotification(
        `🎉 Contrato ${res.createdContract.contractNumber} e Contas a Receber ${res.createdFinance?.code} gerados a partir de ${deal.clientName}!`
      );
    } else {
      setDeals(prev =>
        prev.map(d => (d.id === deal.id ? { ...d, stage: 'CLIENTE', probability: 100 } : d))
      );
      setNotification(`🎉 Conta ${deal.clientName} convertida em Cliente e Contrato.`);
    }
    loadDeals();
    setTimeout(() => setNotification(null), 8000);
  };

  const filteredDeals = deals.filter(
    d =>
      d.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">CRM & Pipeline Comercial</h1>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
              SEEK Gestão Corporativa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pipeline corporativo de 8 estágios integrado diretamente à emissão de contratos, faturamento recorrente e aprovações de desconto.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Oportunidade</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
        </div>
      )}

      {/* KPIs do CRM */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pipeline Total Ativo"
          value={`R$ ${(totalPipeline / 1000).toFixed(1)}k`}
          subtitle="Valor nas 8 etapas do funil"
          icon={Target}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Pipeline Ponderado"
          value={`R$ ${(totalWeighted / 1000).toFixed(1)}k`}
          change={`${deals.length} contas no pipeline`}
          changeType="positive"
          subtitle="Ajustado pela probabilidade"
          icon={TrendingUp}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Contratos Ganhos (Mês)"
          value={`R$ ${(totalGanhos / 1000).toFixed(1)}k`}
          subtitle="Contas convertidas em clientes"
          icon={Award}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Taxa de Conversão (Win Rate)"
          value={`${winRate}%`}
          change={`Ticket médio R$ ${deals.length ? (totalPipeline / deals.length / 1000).toFixed(0) : 0}k`}
          changeType="neutral"
          subtitle="Eficiência do time comercial"
          icon={Percent}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Barra de Busca de Oportunidades */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, arena ou evento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
          />
        </div>
        <span className="text-[11px] text-slate-500 font-semibold">
          Pipeline: <em>Lead → Qualificação → Oportunidade → Proposta → Negociação → Aprovação → Contrato → Cliente</em>
        </span>
      </div>

      {/* Funil Kanban Comercial nos 8 Estágios Oficiais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 overflow-x-auto pb-4">
        {stages.map(stageObj => {
          const stageDeals = filteredDeals.filter(d => d.stage === stageObj.key);
          const stageTotal = stageDeals.reduce((acc, d) => acc + (d.value || 0), 0);

          return (
            <div key={stageObj.key} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 flex flex-col min-h-[480px] min-w-[155px]">
              {/* Header da Coluna */}
              <div className={`border-t-2 ${stageObj.color} pt-2 mb-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-800 truncate" title={stageObj.label}>
                    {stageObj.label}
                  </span>
                  <span className="rounded-full bg-white px-1.5 py-0.2 text-[9px] font-bold text-slate-600 border border-slate-200">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-slate-500 block mt-0.5">
                  R$ {(stageTotal / 1000).toFixed(0)}k
                </span>
              </div>

              {/* Cards da Coluna */}
              <div className="space-y-2 flex-1">
                {stageDeals.map(deal => (
                  <div
                    key={deal.id}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs hover:shadow-xs transition-all space-y-2"
                  >
                    <div>
                      <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider block truncate">
                        {deal.clientName}
                      </span>
                      <h4 className="text-[11px] font-bold text-slate-900 leading-tight mt-0.5 line-clamp-2">
                        {deal.title}
                      </h4>
                    </div>

                    <div className="pt-1 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-[11px] font-black text-slate-900">
                        R$ {(deal.value / 1000).toFixed(0)}k
                      </span>
                      <span className="text-[9px] font-bold text-indigo-600">{deal.probability}%</span>
                    </div>

                    {/* Botão de Solicitar Alçada se em Negociação */}
                    {deal.stage === 'NEGOCIACAO' && (
                      <button
                        onClick={() => setApprovalModalDeal(deal)}
                        className="flex items-center justify-center space-x-1 w-full rounded bg-rose-50 border border-rose-200 py-1 text-[9px] font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <Send className="h-2.5 w-2.5" />
                        <span>Pedir Alçada Desconto</span>
                      </button>
                    )}

                    {/* Botão Converter em Contrato se em Contrato ou Cliente */}
                    {deal.stage === 'CONTRATO' && (
                      <button
                        onClick={() => handleConvertToContract(deal)}
                        className="flex items-center justify-center space-x-1 w-full rounded bg-emerald-50 border border-emerald-300 py-1 text-[9px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                      >
                        <FileCheck2 className="h-2.5 w-2.5" />
                        <span>Fechar & Gerar Contrato</span>
                      </button>
                    )}

                    {deal.stage === 'CLIENTE' && (
                      <div className="rounded bg-emerald-50 border border-emerald-200 p-1 text-[9px] text-center text-emerald-800 font-bold flex items-center justify-center space-x-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        <span>Cliente Faturando</span>
                      </div>
                    )}

                    {/* Ações de Avanço/Recuo de Estágio */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <button
                        onClick={() => moveStage(deal.id, 'prev')}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Recuar estágio"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveStage(deal.id, 'next')}
                        className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 font-bold cursor-pointer"
                        title="Avançar estágio"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar Nova Oportunidade */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Oportunidade Comercial"
        subtitle="Adicione uma nova conta ou projeto ao pipeline comercial do SEEK."
      >
        <form onSubmit={handleCreateDeal} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nome do Cliente / Organização</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Ex: Arena Fonte Nova / Festival Primavera"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Título da Negociação</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Contrato Anual de Gestão ERP & Cloud Corporativo"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor Estimado (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Ex: 350000.00"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Estágio Inicial</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                {stages.map(s => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Data Estimada de Fechamento</label>
            <input
              type="date"
              value={expectedCloseDate}
              onChange={e => setExpectedCloseDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
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
              Registrar no Pipeline
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Submissão de Alçada Comercial */}
      {approvalModalDeal && (
        <Modal
          isOpen={!!approvalModalDeal}
          onClose={() => setApprovalModalDeal(null)}
          title="Submeter Desconto à Alçada de Aprovação"
          subtitle={`Oportunidade: ${approvalModalDeal.clientName} (R$ ${approvalModalDeal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}
        >
          <form onSubmit={handleSendToApproval} className="space-y-4 text-xs">
            <p className="text-slate-600">
              Descontos comerciais e comissões diferenciadas são validados automaticamente pelo Motor de Alçadas da Diretoria Comercial e Executiva.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Percentual de Desconto Solicitado (%)</label>
              <input
                type="number"
                step="0.1"
                required
                value={discountPercent}
                onChange={e => setDiscountPercent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Justificativa Estratégica da Negociação</label>
              <textarea
                rows={3}
                required
                value={discountJustification}
                onChange={e => setDiscountJustification(e.target.value)}
                placeholder="Ex: Exclusividade por 3 edições, patrocínio cruzado ou volume elevado garantido..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovalModalDeal(null)}
                className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white shadow-xs hover:bg-rose-700"
              >
                Submeter ao Motor de Alçadas
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
