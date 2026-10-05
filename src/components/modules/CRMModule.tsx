import React, { useState } from 'react';
import { Users2, Plus, DollarSign, Target, Calendar, User, Search, Award } from 'lucide-react';
import { CRM_OPPORTUNITIES } from '../../data/mockData';
import { CrmOpportunity } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';

export const CRMModule: React.FC = () => {
  const [deals, setDeals] = useState<CrmOpportunity[]>(CRM_OPPORTUNITIES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<CrmOpportunity['stage']>('PROSPECCAO');

  const stages: { key: CrmOpportunity['stage']; label: string; color: string }[] = [
    { key: 'PROSPECCAO', label: 'Prospecção', color: 'border-slate-300' },
    { key: 'QUALIFICACAO', label: 'Qualificação', color: 'border-blue-400' },
    { key: 'PROPOSTA', label: 'Proposta Comercial', color: 'border-amber-400' },
    { key: 'NEGOCIACAO', label: 'Negociação / Alçada', color: 'border-purple-400' },
    { key: 'GANHO', label: 'Fechado & Ganho', color: 'border-emerald-500' }
  ];

  const totalPipeline = deals.reduce((acc, d) => acc + d.value, 0);
  const totalGanhos = deals.filter(d => d.stage === 'GANHO').reduce((acc, d) => acc + d.value, 0);

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const newDeal: CrmOpportunity = {
      id: `crm-${Date.now()}`,
      clientName,
      title,
      value: parseFloat(value) || 0,
      stage,
      probability: stage === 'GANHO' ? 100 : stage === 'NEGOCIACAO' ? 80 : 30,
      ownerName: 'Lucas Bertolli Costa',
      expectedCloseDate: '2026-11-30'
    };
    setDeals(prev => [...prev, newDeal]);
    setIsModalOpen(false);
    setClientName('');
    setTitle('');
    setValue('');
  };

  const filteredDeals = deals.filter(
    d =>
      d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">CRM & Comercial</h1>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
              SEEK Relacionamento
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de oportunidades comerciais, contas corporativas, propostas e previsão de vendas integrada ao faturamento.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Oportunidade</span>
          </button>
        </div>
      </div>

      {/* KPIs do CRM */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pipeline Total Ativo"
          value={`R$ ${(totalPipeline / 1000).toFixed(1)}k`}
          subtitle="Valor ponderado em negociação"
          icon={Target}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Receita Ganha (Mês)"
          value={`R$ ${(totalGanhos / 1000).toFixed(1)}k`}
          subtitle="Contratos fechados"
          icon={Award}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Oportunidades Ativas"
          value={deals.length}
          subtitle="Arenas, festivais e teatros"
          icon={Users2}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Ticket Médio"
          value={`R$ ${deals.length ? (totalPipeline / deals.length / 1000).toFixed(1) : 0}k`}
          subtitle="Por oportunidade corporativa"
          icon={DollarSign}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Barra de Busca de Oportunidades */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente ou evento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
          />
        </div>
        <span className="text-xs text-slate-500">Pipeline Comercial SEEK V1</span>
      </div>

      {/* Funil Kanban Comercial Interativo */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map(stageObj => {
          const stageDeals = filteredDeals.filter(d => d.stage === stageObj.key);
          const stageTotal = stageDeals.reduce((acc, d) => acc + d.value, 0);

          return (
            <div key={stageObj.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col min-h-[420px]">
              {/* Header da Coluna */}
              <div className={`border-t-2 ${stageObj.color} pt-2 mb-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{stageObj.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 block mt-0.5">
                  R$ {(stageTotal / 1000).toFixed(1)}k
                </span>
              </div>

              {/* Cards da Coluna */}
              <div className="space-y-2.5 flex-1">
                {stageDeals.map(deal => (
                  <div
                    key={deal.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:shadow-xs transition-all space-y-2"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                        {deal.clientName}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight mt-0.5">{deal.title}</h4>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                      <span className="text-xs font-black text-slate-900">
                        R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600">{deal.probability}% prob.</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {deal.ownerName.split(' ')[0]}
                      </span>
                      <span>{deal.expectedCloseDate}</span>
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
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Título da Negociação</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Operação de Bilheteria & Controle de Acesso 2027"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
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
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Estágio Inicial</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as CrmOpportunity['stage'])}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="PROSPECCAO">Prospecção</option>
                <option value="QUALIFICACAO">Qualificação</option>
                <option value="PROPOSTA">Proposta Comercial</option>
                <option value="NEGOCIACAO">Negociação</option>
                <option value="GANHO">Fechado & Ganho</option>
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
              Registrar no Pipeline
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
