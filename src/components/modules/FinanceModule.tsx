import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  PieChart,
  Landmark,
  CheckCircle,
  TrendingUp,
  Percent,
  Lock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search
} from 'lucide-react';
import { FINANCIAL_ENTRIES } from '../../data/mockData';
import { FinancialEntry } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FinanceEvidencePanel } from './FinanceEvidencePanel';

export interface FinanceModuleProps {
  initialTab?: 'lancamentos' | 'bancos' | 'orcamento' | 'dre' | 'fechamento';
  initialType?: 'ALL' | 'PAGAR' | 'RECEBER';
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({
  initialTab = 'lancamentos',
  initialType = 'ALL'
}) => {
  const { addAuditLog } = useWorkflow();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'lancamentos' | 'bancos' | 'orcamento' | 'dre' | 'fechamento'>(initialTab);
  const [entries, setEntries] = useState<FinancialEntry[]>(FINANCIAL_ENTRIES);
  const [bankAccounts, setBankAccounts] = useState<any[]>([
    { id: 'bank-1', bank_name: 'Banco Bradesco S.A.', bank_code: '237', agency: '1204', account_number: '45890-1', current_balance: 1250000.0, transaction_count: 4, pending_reconcile_count: 1 },
    { id: 'bank-2', bank_name: 'Banco Itaú Unibanco S.A.', bank_code: '341', agency: '0842', account_number: '98120-7', current_balance: 590500.0, transaction_count: 2, pending_reconcile_count: 1 }
  ]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('bank-1');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<any>({ totalPlanned: 2420000, totalCommitted: 287000, totalRealized: 1445000, totalRemaining: 688000, globalConsumedPercent: 71.6 });
  const [dreData, setDreData] = useState<any>(null);
  const [closings, setClosings] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>(initialType);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialType) {
      setFilterType(initialType);
    }
  }, [initialType]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterOrigin, setFilterOrigin] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isLiquidationOpen, setIsLiquidationOpen] = useState(false);
  const [selectedEntryForPay, setSelectedEntryForPay] = useState<any>(null);
  const [payBankId, setPayBankId] = useState<string>('bank-1');
  const [payMethod, setPayMethod] = useState<string>('PIX');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().substring(0, 10));

  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [reconcilePeriod, setReconcilePeriod] = useState<string>('2026-10');
  const [statementBalanceInput, setStatementBalanceInput] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState<string>('');

  const [isLockPeriodOpen, setIsLockPeriodOpen] = useState(false);
  const [lockPeriod, setLockPeriod] = useState<string>('2026-10');
  const [lockChecklist, setLockChecklist] = useState({
    extratos_conciliados: true,
    contas_pagar_baixadas: true,
    tributos_apurados: true,
    folha_fechada: true,
    balancete_verificado: true
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Form states
  const [entryType, setEntryType] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const [title, setTitle] = useState('');
  const [entityName, setEntityName] = useState('');
  const [costCenter, setCostCenter] = useState('Operações & Serviços Corporativos');
  const [category, setCategory] = useState('Despesas Operacionais');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [originType, setOriginType] = useState('AVULSO');
  const [paymentMethod, setPaymentMethod] = useState('PIX');

  const loadData = async () => {
    try {
      const records = await api.getFinanceRecords(filterType, filterStatus, filterOrigin, searchTerm);
      if (records && records.length > 0) {
        setEntries(records);
      }
      const accounts = await api.getBankAccounts();
      if (accounts && accounts.length > 0) {
        setBankAccounts(accounts);
      }
      const summary = await api.getFinanceSummary();
      if (summary) setSummaryStats(summary);

      const bData = await api.getBudgets();
      if (bData && bData.budgets) {
        setBudgets(bData.budgets);
        setBudgetSummary(bData.summary);
      }

      const dre = await api.getDre();
      if (dre) setDreData(dre);

      const cls = await api.getFinancialClosings();
      if (cls && cls.length > 0) setClosings(cls);
    } catch {
      // fallback
    }
  };

  const loadBankTransactions = async (bankId: string) => {
    try {
      const txs = await api.getBankTransactions(bankId);
      if (txs) setTransactions(txs);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType, filterStatus, filterOrigin, searchTerm]);

  useEffect(() => {
    if (selectedBankId) {
      loadBankTransactions(selectedBankId);
    }
  }, [selectedBankId]);

  const totalReceitas = summaryStats?.totalReceitas || entries.filter(e => e.type === 'RECEBER').reduce((a, b) => a + (b.amount || 0), 0);
  const totalDespesas = summaryStats?.totalDespesas || entries.filter(e => e.type === 'PAGAR').reduce((a, b) => a + (b.amount || 0), 0);
  const totalPagarPendente = summaryStats?.totalPagarPendente || entries.filter(e => e.type === 'PAGAR' && e.status !== 'PAGO').reduce((a, b) => a + (b.amount || 0), 0);
  const totalReceberPendente = summaryStats?.totalReceberPendente || entries.filter(e => e.type === 'RECEBER' && e.status !== 'PAGO').reduce((a, b) => a + (b.amount || 0), 0);
  const totalBancos = summaryStats?.disponibilidadeBancaria || bankAccounts.reduce((a, b) => a + (b.current_balance || b.currentBalance || 0), 0);
  const ebitdaPercent = summaryStats?.ebitdaProjetadoPercent || (totalReceitas > 0 ? (((totalReceitas - totalDespesas) / totalReceitas) * 100).toFixed(1) : '24.8');

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;

    const res = await api.createFinanceRecord({
      type: entryType,
      title,
      entityName: entityName || 'Entidade Corporativa',
      costCenter,
      category,
      amount: parsedAmount,
      dueDate: dueDate || '2026-10-31',
      paymentMethod,
      originType,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.id) {
      setNotification(`✅ Lançamento ${res.code} cadastrado no Financeiro com sucesso.`);
      loadData();
    } else {
      const newEntry: FinancialEntry = {
        id: `fin-${Date.now()}`,
        code: `${entryType === 'RECEBER' ? 'CR' : 'CP'}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        type: entryType,
        title,
        entityName,
        costCenter,
        category,
        amount: parsedAmount,
        dueDate: dueDate || '2026-10-31',
        status: 'PREVISTO',
        paymentMethod
      };
      setEntries(prev => [newEntry, ...prev]);
      setNotification(`✅ Lançamento cadastrado localmente.`);
    }

    addAuditLog({
      action: 'CREATE',
      module: 'Financeiro',
      entity: `Lançamento ${title}`,
      description: `Criado lançamento ${entryType} (${originType}) no valor de R$ ${parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    });

    setIsNewEntryOpen(false);
    setTitle('');
    setEntityName('');
    setAmount('');
    setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenLiquidation = (entry: any) => {
    setSelectedEntryForPay(entry);
    setPayBankId(bankAccounts[0]?.id || 'bank-1');
    setPayMethod(entry.paymentMethod || 'PIX');
    setPayDate(new Date().toISOString().substring(0, 10));
    setIsLiquidationOpen(true);
  };

  const handleConfirmLiquidation = async () => {
    if (!selectedEntryForPay) return;

    const success = await api.payFinanceRecord(
      selectedEntryForPay.id,
      payBankId,
      payMethod,
      currentUser.fullName,
      currentUser.roleTitle,
      payDate
    );

    if (success) {
      setNotification(`💰 Baixa / Liquidação efetuada com sucesso! Movimentação registrada na conta bancária.`);
      loadData();
      if (selectedBankId) loadBankTransactions(selectedBankId);
    } else {
      setEntries(prev => prev.map(e => (e.id === selectedEntryForPay.id ? { ...e, status: 'PAGO' } : e)));
      setNotification(`💰 Baixa registrada localmente.`);
    }

    setIsLiquidationOpen(false);
    setSelectedEntryForPay(null);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleReconcileTransaction = async (txId: string, currentStatus: boolean) => {
    const success = await api.toggleTransactionReconcile(txId, !currentStatus);
    if (success) {
      setTransactions(prev => prev.map(t => (t.id === txId ? { ...t, reconciled: !currentStatus ? 1 : 0 } : t)));
      setNotification(`🔄 Status de conciliação da transação atualizado.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSaveReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementBalanceInput) return;

    const res = await api.createBankReconciliation({
      accountId: selectedBankId,
      period: reconcilePeriod,
      statementBalance: parseFloat(statementBalanceInput),
      notes: reconcileNotes,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`🏛️ Conciliação bancária registrada! Status: ${res.reconciliation.status} (Diferença: R$ ${res.reconciliation.difference.toFixed(2)})`);
      setIsReconciliationOpen(false);
      setStatementBalanceInput('');
      setReconcileNotes('');
      loadData();
      loadBankTransactions(selectedBankId);
    }
    setTimeout(() => setNotification(null), 6000);
  };

  const handleLockPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.lockFinancialPeriod({
      period: lockPeriod,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle,
      checklist: lockChecklist,
      notes: `Fechamento formal da competência ${lockPeriod} efetuado com trava operacional e contábil.`
    });

    if (res && res.success) {
      setNotification(`🔒 Competência ${lockPeriod} bloqueada com sucesso! Trava de período ativada.`);
      setIsLockPeriodOpen(false);
      loadData();
    }
    setTimeout(() => setNotification(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Financeiro Enterprise */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Financeiro, Tesouraria & Controladoria</h1>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              SEEK Enterprise ERP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão unificada: Contas a Pagar/Receber, Tesouraria & Bancos, Conciliação, Orçamento Empresarial e Fechamento Mensal.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsLockPeriodOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            <span>Fechamento Mensal</span>
          </button>
          <button
            onClick={() => setIsNewEntryOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Título Financeiro</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* KPIs Financeiros Enterprise */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Disponibilidade em Bancos"
          value={`R$ ${totalBancos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change={`${bankAccounts.length} Contas Ativas`}
          changeType="positive"
          subtitle="Bradesco & Itaú Conciliados"
          icon={Landmark}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Contas a Pagar Pendentes"
          value={`R$ ${totalPagarPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change="POs + Taxas + Impostos"
          changeType="neutral"
          subtitle="Obrigações integradas"
          icon={ArrowDownRight}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          title="Contas a Receber"
          value={`R$ ${totalReceberPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change="Contratos + SaaS SEEK"
          changeType="positive"
          subtitle="Faturamento corporativo"
          icon={ArrowUpRight}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Consumo Orçamentário Global"
          value={`${budgetSummary.globalConsumedPercent || '71.6'}%`}
          change="Orçado × Comprometido × Realizado"
          changeType="neutral"
          subtitle="Matriz de Controladoria"
          icon={Percent}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Abas do Módulo Financeiro Enterprise */}
      <div className="flex border-b border-slate-200 space-x-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('lancamentos')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'lancamentos' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Contas a Pagar & Receber ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bancos')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'bancos' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="h-4 w-4" />
          <span>Tesouraria & Conciliação Bancária</span>
        </button>

        <button
          onClick={() => setActiveTab('orcamento')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'orcamento' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="h-4 w-4" />
          <span>Orçamento & Controladoria (Budgeting)</span>
        </button>

        <button
          onClick={() => setActiveTab('dre')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'dre' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>DRE Gerencial Consolidado</span>
        </button>

        <button
          onClick={() => setActiveTab('fechamento')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'fechamento' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Fechamento Mensal / Period Lock</span>
        </button>
      </div>

      {/* TAB 1: CONTAS A PAGAR & RECEBER */}
      {activeTab === 'lancamentos' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hub Central de Obrigações e Direitos</h3>
              <p className="text-xs text-slate-500">
                Alimentado automaticamente por Compras (PO), RH (Taxas Freelancers), Fiscal (Tributos) e Contratos.
              </p>
            </div>

            {/* Filtros de Tipo, Origem e Status */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar título, credor..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">Tipo: Todos</option>
                <option value="PAGAR">Contas a Pagar</option>
                <option value="RECEBER">Contas a Receber</option>
              </select>

              <select
                value={filterOrigin}
                onChange={e => setFilterOrigin(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">Origem: Todas</option>
                <option value="PO">Compras (PO)</option>
                <option value="TAXA">Taxas Freelancers (RH)</option>
                <option value="FISCAL">Fiscal / Tributos</option>
                <option value="CONTRATO">Contratos</option>
                <option value="AVULSO">Avulso / Manual</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">Status: Todos</option>
                <option value="PREVISTO">Previsto</option>
                <option value="CONFIRMADO">Confirmado</option>
                <option value="PAGO">Pago / Liquidado</option>
              </select>
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3">Título / Descrição</th>
                  <th className="py-2.5 px-3">Entidade / Credor</th>
                  <th className="py-2.5 px-3">Centro de Custo</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Valor (R$)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map(entry => {
                  const isExpense = entry.type === 'PAGAR';
                  const isPaid = entry.status === 'PAGO';

                  const originBadge = (entry as any).originType === 'PO' ? { text: 'Compras (PO)', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
                    : (entry as any).originType === 'TAXA' ? { text: 'Taxa RH', bg: 'bg-purple-50 text-purple-700 border-purple-200' }
                    : (entry as any).originType === 'FISCAL' ? { text: 'Fiscal', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
                    : (entry as any).originType === 'CONTRATO' ? { text: 'Contrato', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
                    : { text: 'Avulso', bg: 'bg-slate-50 text-slate-600 border-slate-200' };

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{entry.code}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${originBadge.bg}`}>
                          {originBadge.text}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{entry.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">{entry.entityName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{entry.costCenter}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{entry.dueDate}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : '+'} R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!isPaid ? (
                          <button
                            onClick={() => handleOpenLiquidation(entry)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                          >
                            Dar Baixa
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            Liquidado {entry.paymentDate ? `(${entry.paymentDate})` : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TESOURARIA & CONCILIAÇÃO BANCÁRIA */}
      {activeTab === 'bancos' && (
        <div className="space-y-6">
          {/* Contas Correntes Cadastradas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map(b => (
              <div
                key={b.id}
                onClick={() => setSelectedBankId(b.id)}
                className={`rounded-xl border p-5 transition-all cursor-pointer ${
                  selectedBankId === b.id
                    ? 'border-emerald-600 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-black">
                      {b.bank_code || b.bankCode}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{b.bank_name || b.bankName}</h4>
                      <p className="text-xs text-slate-500 font-mono">Ag: {b.agency} | CC: {b.account_number || b.accountNumber}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Ativa
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Saldo Disponível em Conta</span>
                    <p className="text-lg font-black text-slate-900 font-mono">
                      R$ {(b.current_balance || b.currentBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBankId(b.id);
                      setIsReconciliationOpen(true);
                    }}
                    className="flex items-center space-x-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Conciliar Extrato</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Extrato e Movimentações da Conta Selecionada */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Extrato de Movimentações & Conciliação</h3>
                <p className="text-xs text-slate-500">
                  Transações bancárias sincronizadas em tempo real. Marque para conciliação matemática com o extrato OFX.
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Conta Ativa: <strong className="text-slate-900">{bankAccounts.find(b => b.id === selectedBankId)?.bank_name || 'Bradesco'}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3">Descrição da Movimentação</th>
                    <th className="py-2 px-3">Ref / Origem</th>
                    <th className="py-2 px-3 text-right">Valor (R$)</th>
                    <th className="py-2 px-3 text-center">Conciliação</th>
                    <th className="py-2 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(t => {
                    const isCredit = t.type === 'CREDITO';
                    const isReconciled = t.reconciled === 1 || t.reconciled === true;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600">{t.transaction_date}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            isCredit ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{t.description}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{t.reference_id || t.reference_type}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isCredit ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isReconciled ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="h-3 w-3" />
                              <span>Conciliado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleReconcileTransaction(t.id, isReconciled)}
                            className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer border ${
                              isReconciled
                                ? 'border-slate-200 text-slate-500 hover:bg-slate-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {isReconciled ? 'Desmarcar' : 'Conciliar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Nenhuma movimentação registrada para esta conta bancária.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORÇAMENTO & CONTROLADORIA (BUDGETING) */}
      {activeTab === 'orcamento' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Orçamento Aprovado Anual</span>
              <p className="text-lg font-black text-slate-900 font-mono mt-1">
                R$ {budgetSummary.totalPlanned?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-700">Comprometido (POs em Aberto)</span>
              <p className="text-lg font-black text-amber-900 font-mono mt-1">
                R$ {budgetSummary.totalCommitted?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-blue-700">Realizado (Títulos Faturados/Pagos)</span>
              <p className="text-lg font-black text-blue-900 font-mono mt-1">
                R$ {budgetSummary.totalRealized?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Saldo Orçamentário Remanescente</span>
              <p className="text-lg font-black text-emerald-900 font-mono mt-1">
                R$ {budgetSummary.totalRemaining?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Matriz de Execução Orçamentária por Centro de Custo</h3>
                <p className="text-xs text-slate-500">Trava preventiva contra estouro de verba pré-aprovação de pedidos de compras.</p>
              </div>
            </div>

            <div className="space-y-4">
              {budgets.map(b => (
                <div key={b.id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900">{b.costCenter}</span>
                      <p className="text-[11px] text-slate-500">{b.category} • Exercício {b.fiscalYear}</p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-mono">
                      <span>Orçado: <strong>R$ {b.plannedAmount.toLocaleString('pt-BR')}</strong></span>
                      <span>Comprometido: <strong className="text-amber-600">R$ {b.committedAmount.toLocaleString('pt-BR')}</strong></span>
                      <span>Realizado: <strong className="text-blue-600">R$ {b.realizedAmount.toLocaleString('pt-BR')}</strong></span>
                      <span className="font-bold text-emerald-700">Saldo: R$ {b.remainingAmount.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Barra de Progresso do Orçamento */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>Consumo: {b.consumedPercent}%</span>
                      <span>Teto Alerta: {b.alertThresholdPercent}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-blue-600 h-full"
                        style={{ width: `${Math.min(100, (b.realizedAmount / b.plannedAmount) * 100)}%` }}
                        title="Realizado"
                      />
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${Math.min(100 - (b.realizedAmount / b.plannedAmount) * 100, (b.committedAmount / b.plannedAmount) * 100)}%` }}
                        title="Comprometido"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DRE GERENCIAL CONSOLIDADO */}
      {activeTab === 'dre' && (
        <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Demonstração do Resultado do Exercício Gerencial (DRE)</h3>
              <p className="text-xs text-slate-500">Apuração das margens corporativas, custos diretos e EBITDA gerencial.</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
              Competência Ativa: Outubro/2026
            </span>
          </div>

          {/* Linhas da DRE */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100 font-bold text-slate-900">
              <span>(+) RECEITA BRUTA OPERACIONAL (Contratos + Licenciamento SaaS)</span>
              <span className="font-mono text-emerald-700">R$ {(dreData?.dre?.receitaBruta ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600 pl-4">
              <span>(-) Deduções de Impostos s/ Faturamento (ISS, PIS, COFINS apurados)</span>
              <span className="font-mono text-rose-600">- R$ {(dreData?.dre?.impostosSobreVenda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-lg font-bold text-slate-900">
              <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
              <span className="font-mono text-emerald-700">R$ {(dreData?.dre?.receitaLiquida ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600 pl-4">
              <span>(-) Custos Diretos Operacionais (Datacenter Equinix, Insumos Almoxarifado, Taxas Freelancers)</span>
              <span className="font-mono text-rose-600">- R$ {(dreData?.dre?.custosDiretos ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 bg-blue-50/50 px-3 rounded-lg font-bold text-blue-900">
              <span>(=) MARGEM BRUTA DE CONTRIBUIÇÃO ({dreData?.dre?.margemBrutaPercent || 86.5}%)</span>
              <span className="font-mono">R$ {(dreData?.dre?.margemBruta ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600 pl-4">
              <span>(-) Despesas Gerais Administrativas & Pessoal (Folha, Benefícios, Facilities)</span>
              <span className="font-mono text-rose-600">- R$ {(dreData?.dre?.despesasAdministrativas ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-3 bg-emerald-50 px-4 rounded-xl font-black text-sm text-emerald-950 border border-emerald-200">
              <span>(=) EBITDA GERENCIAL SEEK (Margem: {dreData?.dre?.margemEbitdaPercent || 24.8}%)</span>
              <span className="font-mono text-emerald-700">R$ {(dreData?.dre?.ebitda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        <FinanceEvidencePanel />
        </div>
      )}

      {/* TAB 5: FECHAMENTO MENSAL / PERIOD LOCK */}
      {activeTab === 'fechamento' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Governança & Fechamento de Competências</h3>
              <p className="text-xs text-slate-500">Trava operacional formal (Period Lock) para impedir lançamentos extemporâneos.</p>
            </div>
            <button
              onClick={() => setIsLockPeriodOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg bg-purple-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-2xs cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              <span>Executar Fechamento de Mês</span>
            </button>
          </div>

          <div className="space-y-3">
            {closings.map(c => (
              <div key={c.id} className="rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900">Competência {c.period}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.status === 'BLOQUEADO' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {c.status === 'BLOQUEADO' ? 'Fechada & Bloqueada' : 'Em Aberto'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{c.notes}</p>
                  {c.closed_by && (
                    <span className="text-[10px] text-slate-400">Responsável: {c.closed_by} • {c.closed_at}</span>
                  )}
                </div>

                {/* Checklist Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                  <span className={`px-2 py-0.5 rounded-md ${c.checklist?.extratos_conciliados ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    ✓ Extratos Bancários
                  </span>
                  <span className={`px-2 py-0.5 rounded-md ${c.checklist?.contas_pagar_baixadas ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    ✓ Contas a Pagar
                  </span>
                  <span className={`px-2 py-0.5 rounded-md ${c.checklist?.tributos_apurados ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    ✓ Apuração Fiscal
                  </span>
                  <span className={`px-2 py-0.5 rounded-md ${c.checklist?.balancete_verificado ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    ✓ Balancete Contábil
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NOVO TÍTULO FINANCEIRO */}
      <Modal isOpen={isNewEntryOpen} onClose={() => setIsNewEntryOpen(false)} title="Cadastrar Título Financeiro">
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Lançamento</label>
              <select
                value={entryType}
                onChange={e => setEntryType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
              >
                <option value="PAGAR">Contas a Pagar (Débito)</option>
                <option value="RECEBER">Contas a Receber (Crédito)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Origem do Título</label>
              <select
                value={originType}
                onChange={e => setOriginType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
              >
                <option value="AVULSO">Avulso / Despesa Direta</option>
                <option value="CONTRATO">Contrato de Clientes/Fornecedores</option>
                <option value="FISCAL">Obrigação Fiscal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título / Descrição</label>
            <input
              type="text"
              required
              placeholder="Ex: Fornecimento de Licenças Nuvem AWS"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Entidade / Razão Social</label>
              <input
                type="text"
                required
                placeholder="Ex: Amazon Web Services Brasil Ltda."
                value={entityName}
                onChange={e => setEntityName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valor do Título (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Centro de Custo</label>
              <select
                value={costCenter}
                onChange={e => setCostCenter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
              >
                <option value="Operações & Serviços Corporativos">Operações & Serviços Corporativos</option>
                <option value="Tecnologia & Infraestrutura Cloud">Tecnologia & Infraestrutura Cloud</option>
                <option value="Comercial & Novos Negócios B2B">Comercial & Novos Negócios B2B</option>
                <option value="Administrativo & Recursos Humanos">Administrativo & Recursos Humanos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data de Vencimento</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewEntryOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
            >
              Gravar Título
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: BAIXA / LIQUIDAÇÃO */}
      <Modal isOpen={isLiquidationOpen} onClose={() => setIsLiquidationOpen(false)} title="Liquidar / Dar Baixa no Título">
        {selectedEntryForPay && (
          <div className="space-y-4 text-xs">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
              <div className="flex justify-between font-mono font-bold text-slate-700">
                <span>{selectedEntryForPay.code}</span>
                <span className={selectedEntryForPay.type === 'PAGAR' ? 'text-rose-600' : 'text-emerald-600'}>
                  R$ {selectedEntryForPay.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="font-medium text-slate-900">{selectedEntryForPay.title}</p>
              <p className="text-slate-500">Favorecido: {selectedEntryForPay.entityName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Conta Bancária de Saída/Entrada</label>
                <select
                  value={payBankId}
                  onChange={e => setPayBankId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name || b.bankName} (R$ {(b.current_balance || b.currentBalance || 0).toLocaleString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meio de Liquidação</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
                >
                  <option value="PIX">PIX Corporativo</option>
                  <option value="TED">TED Bancária</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Débito em Conta">Débito Automático</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data da Baixa Efetiva</label>
              <input
                type="date"
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 font-mono"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLiquidationOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLiquidation}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
              >
                Confirmar Liquidação
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: CONCILIAÇÃO BANCÁRIA */}
      <Modal isOpen={isReconciliationOpen} onClose={() => setIsReconciliationOpen(false)} title="Conciliação Bancária de Extrato">
        <form onSubmit={handleSaveReconciliation} className="space-y-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Conta Selecionada</span>
            <p className="text-sm font-bold text-slate-900">
              {bankAccounts.find(b => b.id === selectedBankId)?.bank_name || 'Bradesco'}
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Saldo no Sistema: <strong>R$ {(bankAccounts.find(b => b.id === selectedBankId)?.current_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Período de Apuração</label>
              <input
                type="text"
                required
                value={reconcilePeriod}
                onChange={e => setReconcilePeriod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                placeholder="2026-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Saldo Final do Extrato Bancário (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={statementBalanceInput}
                onChange={e => setStatementBalanceInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                placeholder="Ex: 1250000.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Parecer de Auditoria / Observações</label>
            <textarea
              rows={2}
              value={reconcileNotes}
              onChange={e => setReconcileNotes(e.target.value)}
              placeholder="Ex: Todas as entradas e saídas do período conferidas com o extrato bancário oficial."
              className="w-full rounded-lg border border-slate-200 p-2 text-xs"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsReconciliationOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
            >
              Gravar Conciliação
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: FECHAMENTO DE COMPETÊNCIA / PERIOD LOCK */}
      <Modal isOpen={isLockPeriodOpen} onClose={() => setIsLockPeriodOpen(false)} title="Fechamento Mensal & Trava de Competência">
        <form onSubmit={handleLockPeriod} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Competência a Bloquear</label>
            <input
              type="text"
              required
              value={lockPeriod}
              onChange={e => setLockPeriod(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
              placeholder="2026-10"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Checklist de Conformidade Contábil / Fiscal</label>
            <div className="space-y-1.5 rounded-lg border border-slate-200 p-3 bg-slate-50">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockChecklist.extratos_conciliados}
                  onChange={e => setLockChecklist({ ...lockChecklist, extratos_conciliados: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Extratos bancários 100% conciliados sem divergências</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockChecklist.contas_pagar_baixadas}
                  onChange={e => setLockChecklist({ ...lockChecklist, contas_pagar_baixadas: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Contas a Pagar e Taxas Freelancers do mês liquidadas</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockChecklist.tributos_apurados}
                  onChange={e => setLockChecklist({ ...lockChecklist, tributos_apurados: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Apuração fiscal dos tributos (ISS, PIS, COFINS, IR) encerrada</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockChecklist.balancete_verificado}
                  onChange={e => setLockChecklist({ ...lockChecklist, balancete_verificado: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Balancete de verificação em equilíbrio (Débitos = Créditos)</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 flex items-start space-x-2 text-amber-900 text-[11px]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <span>
              Ao bloquear a competência, novas inclusões de lançamentos ou alterações extemporâneas serão rejeitadas pelo SEEK Core.
            </span>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLockPeriodOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 cursor-pointer"
            >
              Confirmar Period Lock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
