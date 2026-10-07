import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle,
  Scale,
  ShieldCheck,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Check,
  ArrowRight
} from 'lucide-react';
import { CONTRACTS_RECORDS } from '../../data/mockData';
import { ContractRecord, ContractObligation } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const ContractsModule: React.FC = () => {
  const { currentUser } = useAuth();
  const [contracts, setContracts] = useState<ContractRecord[]>(CONTRACTS_RECORDS);
  const [obligations, setObligations] = useState<ContractObligation[]>([]);
  const [activeTab, setActiveTab] = useState<'contracts' | 'obligations'>('contracts');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modais
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [newContract, setNewContract] = useState({
    partyName: '',
    type: 'FORNECEDOR',
    monthlyValue: '',
    startDate: '2026-11-01',
    endDate: '2027-11-01',
    readjustmentIndex: 'IPCA',
    costCenter: 'Administrativo & Operações',
    paymentDay: '10',
    recurrence: 'MENSAL',
    financialEnabled: true
  });

  const [reajusteModal, setReajusteModal] = useState<{
    isOpen: boolean;
    contract: any | null;
    rate: string;
    indexName: string;
  }>({
    isOpen: false,
    contract: null,
    rate: '4.2',
    indexName: 'IPCA'
  });

  const [notification, setNotification] = useState<string | null>(null);

  const loadContracts = async () => {
    try {
      const data = await api.getContracts(filterType, filterStatus);
      if (data && data.contracts && data.contracts.length > 0) {
        setContracts(data.contracts);
      }
      const obData = await api.getContractObligations();
      if (obData && obData.obligations) {
        setObligations(obData.obligations);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadContracts();
  }, [filterType, filterStatus]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.partyName || !newContract.monthlyValue) return;

    const res = await api.createContract({
      partyName: newContract.partyName,
      type: newContract.type,
      monthlyValue: parseFloat(newContract.monthlyValue),
      startDate: newContract.startDate,
      endDate: newContract.endDate,
      readjustmentIndex: newContract.readjustmentIndex,
      costCenter: newContract.costCenter,
      paymentDay: parseInt(newContract.paymentDay),
      recurrence: newContract.recurrence,
      financialEnabled: newContract.financialEnabled,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`✅ Contrato ${res.contract.contractNumber} com ${newContract.partyName} registrado com sucesso!`);
      setIsNewContractOpen(false);
      setNewContract({
        partyName: '',
        type: 'FORNECEDOR',
        monthlyValue: '',
        startDate: '2026-11-01',
        endDate: '2027-11-01',
        readjustmentIndex: 'IPCA',
        costCenter: 'Administrativo & Operações',
        paymentDay: '10',
        recurrence: 'MENSAL',
        financialEnabled: true
      });
      loadContracts();
    } else {
      const fallbackContract: ContractRecord = {
        id: `ct-${Date.now()}`,
        contractNumber: `CT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        partyName: newContract.partyName,
        type: newContract.type as any,
        monthlyValue: parseFloat(newContract.monthlyValue),
        startDate: newContract.startDate,
        endDate: newContract.endDate,
        daysRemaining: 365,
        readjustmentIndex: newContract.readjustmentIndex as any,
        status: 'VIGENTE',
        costCenter: newContract.costCenter,
        paymentDay: parseInt(newContract.paymentDay),
        recurrence: newContract.recurrence as any,
        financialEnabled: newContract.financialEnabled
      };
      setContracts(prev => [fallbackContract, ...prev]);
      setIsNewContractOpen(false);
      setNotification(`✅ Contrato ${fallbackContract.contractNumber} registrado localmente.`);
    }

    setTimeout(() => setNotification(null), 5000);
  };

  const handleGenerateObligation = async (contract: ContractRecord) => {
    const res = await api.generateContractObligation(contract.id, {
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });
    if (res?.success) {
      setNotification(`💳 Obrigação ${res.financialRecord?.code || ''} enviada ao Financeiro para ${contract.partyName}.`);
      loadContracts();
    } else {
      setNotification(`⚠️ ${res?.error || 'Não foi possível gerar a obrigação financeira.'}`);
    }
    setTimeout(() => setNotification(null), 6000);
  };

  const handleBatchGenerateDue = async () => {
    const res = await api.generateDueContractObligations(new Date().toISOString().slice(0, 10), currentUser.fullName);
    if (res && res.success) {
      const count = res.generated?.length || 0;
      setNotification(`⚡ Processamento em lote concluído: ${count} obrigação(ões) enviada(s) ao Contas a Pagar.`);
      loadContracts();
    } else {
      setNotification('⚠️ Não foi possível processar o lote de contratos vencíveis.');
    }
    setTimeout(() => setNotification(null), 6000);
  };

  const handleApplyReadjustment = async () => {
    if (!reajusteModal.contract) return;

    const res = await api.readjustContract(
      reajusteModal.contract.id,
      parseFloat(reajusteModal.rate),
      reajusteModal.indexName,
      currentUser.fullName
    );

    if (res && res.success) {
      setNotification(
        `📈 Reajuste de ${reajusteModal.rate}% (${reajusteModal.indexName}) aplicado com sucesso no contrato ${res.contractNumber}! Novo valor: R$ ${res.newMonthlyValue?.toLocaleString(
          'pt-BR',
          { minimumFractionDigits: 2 }
        )}/mês.`
      );
      setReajusteModal({ isOpen: false, contract: null, rate: '4.2', indexName: 'IPCA' });
      loadContracts();
    } else {
      const rate = parseFloat(reajusteModal.rate);
      setContracts(prev =>
        prev.map(c =>
          c.id === reajusteModal.contract.id
            ? { ...c, monthlyValue: c.monthlyValue * (1 + rate / 100), readjustmentIndex: reajusteModal.indexName as any }
            : c
        )
      );
      setReajusteModal({ isOpen: false, contract: null, rate: '4.2', indexName: 'IPCA' });
      setNotification(`📈 Reajuste aplicado no contrato.`);
    }

    setTimeout(() => setNotification(null), 6000);
  };

  const handleRenewContract = async (contract: any) => {
    const res = await api.renewContract(contract.id, 12, currentUser.fullName);
    if (res && res.success) {
      setNotification(`🔄 Contrato ${res.contractNumber} renovado por mais 12 meses até ${res.newEndDate}!`);
      loadContracts();
    } else {
      setContracts(prev =>
        prev.map(c =>
          c.id === contract.id
            ? { ...c, daysRemaining: c.daysRemaining + 365, status: 'VIGENTE' }
            : c
        )
      );
      setNotification(`🔄 Contrato renovado por 12 meses.`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const totalMonthlyBilling = contracts.reduce((acc, c) => acc + c.monthlyValue, 0);
  const expiringWithin30Days = contracts.filter(c => c.daysRemaining <= 30 && c.status !== 'RESCINDIDO');

  return (
    <div className="space-y-6">
      {/* Top Banner Contratos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Contratos & Jurídico Corporativo</h1>
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
              SEEK Governança
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão integrada de vigência, régua de alertas de renovação (30/60/90 dias), aplicação auditada de índices (IPCA/IGP-M) e minutas.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={handleBatchGenerateDue}
            className="flex items-center space-x-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
            title="Gera obrigações a pagar para todos os contratos vigentes com vencimento pendente"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Gerar Lote Vencíveis</span>
          </button>
          <button
            onClick={() => setIsNewContractOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Contrato</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
        </div>
      )}

      {/* Alerta Preventivo de Renovação Crítica */}
      {expiringWithin30Days.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm">
                Atenção Jurídica: {expiringWithin30Days.length} contrato(s) com vencimento nos próximos 30 dias!
              </span>
              <span className="text-slate-600">
                {expiringWithin30Days.map(c => `${c.contractNumber} (${c.partyName})`).join(', ')} — Necessário acionar renovação ou distrato formal.
              </span>
            </div>
          </div>

          <button
            onClick={() => handleRenewContract(expiringWithin30Days[0])}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shrink-0 transition-colors shadow-2xs"
          >
            Renovar {expiringWithin30Days[0].contractNumber} (12 Meses)
          </button>
        </div>
      )}

      {/* KPIs de Contratos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Faturamento Mensal Contratual"
          value={`R$ ${(totalMonthlyBilling / 1000).toFixed(1)}k/mês`}
          change={`R$ ${(totalMonthlyBilling * 12 / 1000000).toFixed(2)}M/ano`}
          changeType="positive"
          subtitle="Receita recorrente contratada"
          icon={FileText}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Alertas de Vencimento"
          value={expiringWithin30Days.length}
          subtitle="Janela crítica < 30 dias"
          icon={AlertTriangle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          title="Contratos Vigentes"
          value={contracts.length}
          subtitle="Clientes & Fornecedores homologados"
          icon={CheckCircle}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Obrigações Financeiras"
          value={obligations.length}
          subtitle="Parcelas integradas ao Contas a Pagar"
          icon={Scale}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`pb-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'contracts'
              ? 'border-blue-600 dark:border-[#00f5ff] text-blue-600 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          Contratos Cadastrados ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('obligations')}
          className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'obligations'
              ? 'border-blue-600 dark:border-[#00f5ff] text-blue-600 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          <span>Obrigações Financeiras Geradas</span>
          <span className="rounded-full bg-blue-100 dark:bg-cyan-950/80 text-blue-800 dark:text-cyan-300 dark:border dark:border-cyan-500/40 px-2 py-0.5 text-[10px] font-bold">
            {obligations.length}
          </span>
        </button>
      </div>

      {activeTab === 'contracts' ? (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold text-slate-700">Filtrar por Tipo:</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="CLIENTE">Clientes</option>
                <option value="FORNECEDOR">Fornecedores</option>
                <option value="PRESTADOR">Prestadores de Serviço</option>
                <option value="LOCACAO">Locação</option>
              </select>

              <span className="font-bold text-slate-700 ml-2">Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="ALL">Todos os Status</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCENDO">Vencendo (&lt;30 dias)</option>
                <option value="RENOVADO">Renovado</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Exibindo <strong>{contracts.length}</strong> contratos ativos
            </span>
          </div>

          {/* Tabela de Contratos */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nº Contrato</th>
                    <th className="py-3 px-4">Parte Envolvida / Razão Social</th>
                    <th className="py-3 px-4 text-center">Tipo</th>
                    <th className="py-3 px-4 text-right">Valor Mensal (R$)</th>
                    <th className="py-3 px-4">Início</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4 text-center">Dias Restantes</th>
                    <th className="py-3 px-4 text-center">Índice</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Financeiro</th>
                    <th className="py-3 px-4 text-center">Ações Jurídicas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contracts.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{c.contractNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{c.partyName}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        R$ {c.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{c.startDate}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{c.endDate}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-black ${
                            c.daysRemaining <= 30
                              ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'
                              : c.daysRemaining <= 90
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {c.daysRemaining} dias
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-600">{c.readjustmentIndex}</td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {c.financialEnabled && c.type !== 'CLIENTE' ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleGenerateObligation(c)}
                              className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                              title="Gera obrigação a pagar para a competência do próximo vencimento"
                            >
                              Gerar parcela
                            </button>
                            <span className="text-[10px] text-slate-500 font-mono">Próx.: {c.nextDueDate || '—'}</span>
                            {(c.pendingObligations || 0) > 0 && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                {c.pendingObligations} pendente(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sem recorrência</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() =>
                              setReajusteModal({
                                isOpen: true,
                                contract: c,
                                rate: '4.2',
                                indexName: c.readjustmentIndex || 'IPCA'
                              })
                            }
                            className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                            title="Aplicar Reajuste por Índice"
                          >
                            Reajustar
                          </button>

                          <button
                            onClick={() => handleRenewContract(c)}
                            className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Renovar Contrato por 12 Meses"
                          >
                            Renovar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Aba de Obrigações Financeiras Geradas */
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Obrigações Recorrentes Integradas ao Financeiro</h2>
              <p className="text-[11px] text-slate-500">Histórico de parcelas de contratos de despesa enviadas diretamente ao Contas a Pagar.</p>
            </div>
            <button
              onClick={handleBatchGenerateDue}
              className="flex items-center space-x-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Processar Lote Vencíveis</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Contrato</th>
                  <th className="py-3 px-4">Fornecedor / Parte</th>
                  <th className="py-3 px-4 text-center">Competência</th>
                  <th className="py-3 px-4 text-center">Vencimento</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                  <th className="py-3 px-4 text-center">Título Financeiro</th>
                  <th className="py-3 px-4 text-center">Status Obrigação</th>
                  <th className="py-3 px-4 text-center">Status Pagamento</th>
                  <th className="py-3 px-4">Data Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {obligations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Nenhuma obrigação contratual gerada ainda. Use a ação "Gerar parcela" em contratos habilitados.
                    </td>
                  </tr>
                ) : (
                  obligations.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{o.contract_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{o.party_name}</td>
                      <td className="py-3 px-4 text-center font-mono">{o.competence}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{o.due_date}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        R$ {Number(o.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                        {o.financial_code || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            o.status === 'PAGO' || o.status === 'PAGA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            o.financial_status === 'PAGO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {o.financial_status || 'ABERTO'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {o.paid_at ? o.paid_at.slice(0, 10) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Novo Contrato */}
      <Modal
        isOpen={isNewContractOpen}
        onClose={() => setIsNewContractOpen(false)}
        title="Cadastrar Novo Contrato Corporativo"
        subtitle="Registro com validação jurídica, vigência e índice de reajuste"
      >
        <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Parte Envolvida / Razão Social *</label>
            <input
              type="text"
              required
              value={newContract.partyName}
              onChange={e => setNewContract({ ...newContract, partyName: e.target.value })}
              placeholder="Ex: Grupo Votorantim S.A."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo de Contrato</label>
              <select
                value={newContract.type}
                onChange={e => setNewContract({ ...newContract, type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="CLIENTE">Cliente (Receita Recorrente)</option>
                <option value="FORNECEDOR">Fornecedor (Despesa Fixa)</option>
                <option value="PRESTADOR">Prestador de Serviços</option>
                <option value="LOCACAO">Locação de Imóvel / Infraestrutura</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor Mensal (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newContract.monthlyValue}
                onChange={e => setNewContract({ ...newContract, monthlyValue: e.target.value })}
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="block font-bold text-slate-800">Integração Financeira Recorrente</span>
                <span className="text-[10px] text-slate-500">Fornecedor, prestador e locação podem gerar Contas a Pagar automaticamente.</span>
              </div>
              <label className="flex items-center gap-2 font-bold text-blue-800">
                <input
                  type="checkbox"
                  checked={newContract.financialEnabled}
                  onChange={e => setNewContract({ ...newContract, financialEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Habilitar
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Centro de Custo</label>
                <input
                  value={newContract.costCenter}
                  onChange={e => setNewContract({ ...newContract, costCenter: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dia de Pagamento (1-28)</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={newContract.paymentDay}
                  onChange={e => setNewContract({ ...newContract, paymentDay: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recorrência</label>
                <select
                  value={newContract.recurrence}
                  onChange={e => setNewContract({ ...newContract, recurrence: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="MENSAL">Mensal</option>
                  <option value="TRIMESTRAL">Trimestral</option>
                  <option value="ANUAL">Anual</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Data Início</label>
              <input
                type="date"
                value={newContract.startDate}
                onChange={e => setNewContract({ ...newContract, startDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Data Fim / Vencimento</label>
              <input
                type="date"
                value={newContract.endDate}
                onChange={e => setNewContract({ ...newContract, endDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Índice de Reajuste</label>
              <select
                value={newContract.readjustmentIndex}
                onChange={e => setNewContract({ ...newContract, readjustmentIndex: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="IPCA">IPCA (IBGE)</option>
                <option value="IGP-M">IGP-M (FGV)</option>
                <option value="INPC">INPC</option>
                <option value="FIXO">Valor Fixo (Sem Reajuste)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewContractOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 shadow-xs"
            >
              Registrar Contrato
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Simulador & Aplicação de Reajuste */}
      {reajusteModal.isOpen && reajusteModal.contract && (
        <Modal
          isOpen={reajusteModal.isOpen}
          onClose={() => setReajusteModal({ isOpen: false, contract: null, rate: '4.2', indexName: 'IPCA' })}
          title={`Simulação de Reajuste — ${reajusteModal.contract.contractNumber}`}
          subtitle={reajusteModal.contract.partyName}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">Valor Mensal Vigente:</span>
                <span className="text-sm font-bold text-slate-900">
                  R$ {reajusteModal.contract.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Índice Contratual:</span>
                <span className="text-sm font-bold text-slate-900">{reajusteModal.contract.readjustmentIndex}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Taxa de Reajuste (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={reajusteModal.rate}
                  onChange={e => setReajusteModal({ ...reajusteModal, rate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Índice Aplicado</label>
                <select
                  value={reajusteModal.indexName}
                  onChange={e => setReajusteModal({ ...reajusteModal, indexName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="IPCA">IPCA (Acumulado 12M: 4.2%)</option>
                  <option value="IGP-M">IGP-M (Acumulado 12M: 3.8%)</option>
                  <option value="INPC">INPC (Acumulado 12M: 4.0%)</option>
                  <option value="LIVRE_NEGOCIACAO">Livre Negociação</option>
                </select>
              </div>
            </div>

            {/* Cálculo em tempo real */}
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Novo Valor Mensal Projetado</span>
              <span className="text-base font-black text-emerald-950 block">
                R${' '}
                {(
                  reajusteModal.contract.monthlyValue *
                  (1 + (parseFloat(reajusteModal.rate) || 0) / 100)
                ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                /mês
              </span>
              <span className="text-[10px] text-emerald-700">
                Acréscimo de R${' '}
                {(
                  reajusteModal.contract.monthlyValue *
                  ((parseFloat(reajusteModal.rate) || 0) / 100)
                ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                mensais.
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReajusteModal({ isOpen: false, contract: null, rate: '4.2', indexName: 'IPCA' })}
                className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyReadjustment}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 shadow-xs"
              >
                Efetivar Reajuste Contratual
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
