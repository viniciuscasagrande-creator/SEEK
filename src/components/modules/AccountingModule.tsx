import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  FileText,
  DollarSign,
  TrendingUp,
  Scale,
  RefreshCw,
  FolderTree,
  ListOrdered,
  Calendar,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ScrollSpyNav } from '../common/ScrollSpyNav';
import {
  ChartOfAccount,
  AccountingEntry,
  TrialBalanceReport,
  DreStatement,
  BalanceSheetStatement,
  AccountingPeriod
} from '../../types/accounting';

export interface AccountingModuleProps {
  initialTab?: 'dashboard' | 'coa' | 'journal' | 'trial-balance' | 'statements' | 'closing';
}

export const AccountingModule: React.FC<AccountingModuleProps> = ({ initialTab = 'dashboard' }) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'coa' | 'journal' | 'trial-balance' | 'statements' | 'closing'>(initialTab);
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Dados
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [dre, setDre] = useState<DreStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetStatement | null>(null);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);

  // Filtros
  const [coaSearch, setCoaSearch] = useState('');
  const [coaLevelFilter, setCoaLevelFilter] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-10');
  const [journalSearch, setJournalSearch] = useState('');

  // Modais
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    nature: 'DEVEDORA',
    level: 4,
    parent_code: '1.01.01'
  });

  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().substring(0, 10),
    description: '',
    debit_account_code: '1.01.01.001',
    credit_account_code: '3.01.01.001',
    amount: '',
    cost_center: 'Operações & Serviços Corporativos'
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [accRes, entRes, tbRes, statRes, perRes] = await Promise.all([
        api.getChartOfAccounts(),
        api.getJournalEntries(selectedPeriod, journalSearch),
        api.getTrialBalance(),
        api.getFinancialStatements(),
        api.getAccountingPeriods()
      ]);

      if (accRes) setAccounts(accRes);
      if (entRes) setEntries(entRes);
      if (tbRes && tbRes.trialBalance) setTrialBalance(tbRes.trialBalance);
      if (statRes) {
        if (statRes.dre) setDre(statRes.dre);
        if (statRes.balanceSheet) setBalanceSheet(statRes.balanceSheet);
      }
      if (perRes) setPeriods(perRes);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedPeriod]);

  // Handlers
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.code || !newAccount.name) return;

    const res = await api.createChartOfAccount({
      ...newAccount,
      type: 'ANALITICA',
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`✅ Conta contábil ${newAccount.code} criada com sucesso!`);
      setIsAddAccountModalOpen(false);
      setNewAccount({
        code: '',
        name: '',
        nature: 'DEVEDORA',
        level: 4,
        parent_code: '1.01.01'
      });
      loadAllData();
    } else {
      setNotification(`❌ Erro ao criar conta: ${res?.message || 'Tente novamente.'}`);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.amount || parseFloat(newEntry.amount) <= 0) return;

    const res = await api.createJournalEntry({
      ...newEntry,
      origin_type: 'MANUAL',
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`✅ ${res.message}`);
      setIsNewEntryModalOpen(false);
      setNewEntry({
        date: new Date().toISOString().substring(0, 10),
        description: '',
        debit_account_code: '1.01.01.001',
        credit_account_code: '3.01.01.001',
        amount: '',
        cost_center: 'Operações & Serviços Corporativos'
      });
      loadAllData();
    } else {
      setNotification(`❌ Erro no lançamento: ${res?.message || 'Verifique as contas informadas.'}`);
    }
  };

  const handleClosePeriod = async (period: string) => {
    if (!confirm(`Deseja alterar o status de fechamento da competência contábil ${period}?`)) return;

    const res = await api.closeAccountingPeriod(period, currentUser.fullName, currentUser.roleTitle);
    if (res && res.success) {
      setNotification(`✅ ${res.message}`);
      loadAllData();
    } else {
      setNotification(`❌ Erro: ${res?.message}`);
    }
  };

  // Filtragem de COA
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch =
      acc.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
      acc.name.toLowerCase().includes(coaSearch.toLowerCase());
    const matchesLevel = coaLevelFilter === 'ALL' || String(acc.level) === coaLevelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Topo / Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-700" />
            Contabilidade Avançada & Fechamento Contábil
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Plano de Contas Hierárquico • Motor de Partidas Dobradas • Livro Diário • Balancete • DRE & Balanço
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => setIsNewEntryModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Lançamento (Partidas Dobradas)</span>
          </button>
        </div>
      </div>

      {/* Notificação Temporária */}
      {notification && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-3 text-xs font-semibold text-blue-900 flex justify-between items-center shadow-xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-blue-500 hover:text-blue-800 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ScrollSpy: Navegador Seccional Contábil */}
      <ScrollSpyNav
        sections={[
          ...(activeTab === 'dashboard' ? [{ id: 'acc-workspace', label: 'Central Contábil', icon: BookOpen }] : []),
          { id: 'acc-tabs', label: 'Abas Contábeis', icon: Layers },
          { id: 'acc-content', label: 'Livros & Relatórios', icon: FileText }
        ]}
      />

      {activeTab === 'dashboard' && (
        <div id="acc-workspace" className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
            <h2 className="text-base font-black text-slate-900">Central de Trabalho Contábil</h2>
            <p className="mt-1 text-xs text-slate-600">Visualize lançamentos, competências e demonstrações que precisam de conferência antes do fechamento.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Contas contábeis', value: accounts.length, tab: 'coa' as const },
              { label: 'Lançamentos da competência', value: entries.length, tab: 'journal' as const },
              { label: 'Competências abertas', value: periods.filter(p => p.status !== 'FECHADO').length, tab: 'closing' as const },
              { label: 'Demonstrações disponíveis', value: (dre ? 1 : 0) + (balanceSheet ? 1 : 0), tab: 'statements' as const }
            ].map(item => (
              <button key={item.label} onClick={() => setActiveTab(item.tab)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs hover:border-blue-300">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{item.value}</div>
                <div className="mt-3 text-xs font-bold text-blue-700">Abrir →</div>
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-black text-slate-900">Pendências para fechamento</h3>
              <div className="mt-3 space-y-2">
                {periods.filter(p => p.status !== 'FECHADO').slice(0, 5).map(p => (
                  <button key={p.period} onClick={() => setActiveTab('closing')} className="flex w-full items-center justify-between rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50">
                    <span className="text-xs font-bold text-slate-800">Competência {p.period}</span>
                    <span className="text-[11px] font-bold text-amber-700">{p.status}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-black text-slate-900">Reflexos automáticos esperados</h3>
              <div className="mt-3 space-y-2 text-xs text-slate-700">
                <div className="rounded-lg bg-slate-50 p-3">Financeiro pago/conciliado → lançamento contábil rastreável</div>
                <div className="rounded-lg bg-slate-50 p-3">Compras recebidas → classificação e obrigação financeira</div>
                <div className="rounded-lg bg-slate-50 p-3">RH / folha → salários, encargos e centros de custo</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abas Superiores */}
      <div id="acc-tabs" className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Visão Geral & Pendências</span>
        </button>
        <button
          onClick={() => setActiveTab('coa')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'coa'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderTree className="h-4 w-4" />
          <span>Plano de Contas (COA)</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'journal'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListOrdered className="h-4 w-4" />
          <span>Livro Diário Contábil</span>
        </button>

        <button
          onClick={() => setActiveTab('trial-balance')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'trial-balance'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Balancete de Verificação</span>
        </button>

        <button
          onClick={() => setActiveTab('statements')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'statements'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>DRE & Balanço Patrimonial</span>
        </button>

        <button
          onClick={() => setActiveTab('closing')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'closing'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Fechamento de Competência</span>
        </button>
      </div>

      <div id="acc-content" className="space-y-4">
        {/* ========================================================
            ABA 1: PLANO DE CONTAS (COA)
        ======================================================== */}
        {activeTab === 'coa' && (
        <div className="space-y-4">
          {/* Barra de Filtro e Criação de Conta */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por código ou descrição da conta..."
                  value={coaSearch}
                  onChange={e => setCoaSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <select
                value={coaLevelFilter}
                onChange={e => setCoaLevelFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="ALL">Todos os Níveis</option>
                <option value="1">Nível 1 (Classe)</option>
                <option value="2">Nível 2 (Grupo)</option>
                <option value="3">Nível 3 (Subgrupo)</option>
                <option value="4">Nível 4 (Analítica)</option>
              </select>
            </div>

            <button
              onClick={() => setIsAddAccountModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Cadastrar Conta Analítica</span>
            </button>
          </div>

          {/* Tabela do Plano de Contas */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">Código Contábil</th>
                  <th className="py-3 px-4">Descrição da Conta</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Natureza</th>
                  <th className="py-3 px-4 text-right">Saldo Atual (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map(acc => {
                  const isSynt = acc.type === 'SINTETICA';
                  const indentPx = (acc.level - 1) * 16;

                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSynt ? 'bg-slate-50/50 font-bold text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-medium">{acc.code}</td>
                      <td className="py-2.5 px-4" style={{ paddingLeft: `${16 + indentPx}px` }}>
                        <span className="flex items-center gap-1.5">
                          {isSynt ? (
                            <Layers className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                          )}
                          {acc.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSynt ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            acc.nature === 'DEVEDORA' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {acc.nature}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 2: LIVRO DIÁRIO (PARTIDAS DOBRADAS)
      ======================================================== */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
              >
                <option value="2026-10">Competência: Outubro/2026</option>
                <option value="2026-09">Competência: Setembro/2026</option>
                <option value="2026-08">Competência: Agosto/2026</option>
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar histórico ou código..."
                  value={journalSearch}
                  onChange={e => setJournalSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <span className="text-xs font-medium text-slate-500">
              Total de Lançamentos: <strong>{entries.length}</strong>
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">Lançamento</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Histórico Contábil</th>
                  <th className="py-3 px-4">Conta Débito</th>
                  <th className="py-3 px-4">Conta Crédito</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{entry.code}</td>
                    <td className="py-3 px-4 text-slate-600">{entry.date}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{entry.description}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Resp: {entry.created_by} • CC: {entry.cost_center || 'Geral'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-amber-900 bg-amber-50/50">
                      D: {entry.debit_account_code}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-900 bg-emerald-50/50">
                      C: {entry.credit_account_code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {entry.origin_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 3: BALANCETE DE VERIFICAÇÃO
      ======================================================== */}
      {activeTab === 'trial-balance' && trialBalance && (
        <div className="space-y-4">
          {/* Card de Igualdade Patrimonial */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              trialBalance.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center space-x-3">
              {trialBalance.isBalanced ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              )}
              <div>
                <h4 className="font-bold text-sm">
                  {trialBalance.isBalanced
                    ? 'Balancete Equilibrado (Partidas Dobradas Válidas)'
                    : 'Atenção: Balancete Desbalanceado!'}
                </h4>
                <p className="text-xs opacity-90">
                  {trialBalance.isBalanced
                    ? 'A soma de todos os saldos a débito é exatamente igual à soma dos saldos a crédito.'
                    : `Diferença contábil apurada de R$ ${trialBalance.difference.toFixed(2)}.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Total Débitos</span>
                <span className="font-bold text-sm text-amber-800">
                  R$ {trialBalance.totalDebitos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Total Créditos</span>
                <span className="font-bold text-sm text-emerald-800">
                  R$ {trialBalance.totalCreditos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">Conta</th>
                  <th className="py-3 px-4">Nome da Conta Analítica</th>
                  <th className="py-3 px-4">Natureza</th>
                  <th className="py-3 px-4 text-right">Saldo Devedor (R$)</th>
                  <th className="py-3 px-4 text-right">Saldo Credor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalance.items.map(item => (
                  <tr key={item.code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium">{item.code}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.nature === 'DEVEDORA' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.nature}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-900">
                      {item.debitBalance > 0
                        ? `R$ ${item.debitBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-900">
                      {item.creditBalance > 0
                        ? `R$ ${item.creditBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 4: DRE & BALANÇO PATRIMONIAL
      ======================================================== */}
      {activeTab === 'statements' && dre && balanceSheet && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DRE Contábil Estruturado */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">DRE Contábil Gerencial</h3>
                <p className="text-[11px] text-slate-500">Demonstração do Resultado do Exercício</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Margem Líquida: {dre.margemLiquidaPercent}%
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 font-bold text-slate-800 border-b border-slate-100">
                <span>(+) RECEITA OPERACIONAL BRUTA</span>
                <span className="font-mono">R$ {dre.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>• Serviços de Gestão & Infraestrutura TI</span>
                <span className="font-mono">R$ {dre.receitaServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>• Licenciamento SaaS SEEK Enterprise</span>
                <span className="font-mono">R$ {dre.receitaSaas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1.5 text-rose-700 font-medium">
                <span>(-) Deduções da Receita Bruta (PIS, COFINS, ISS)</span>
                <span className="font-mono">- R$ {dre.deducoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-2 font-bold text-slate-900 bg-slate-50 px-2 rounded">
                <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
                <span className="font-mono">R$ {dre.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1.5 text-rose-700 font-medium">
                <span>(-) Custos dos Serviços Prestados (Datacenter & Suprimentos)</span>
                <span className="font-mono">- R$ {dre.custosTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-2 font-bold text-slate-900 bg-slate-50 px-2 rounded">
                <span>(=) LUCRO BRUTO (Margem: {dre.margemBrutaPercent}%)</span>
                <span className="font-mono">R$ {dre.lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1.5 text-rose-700 font-medium">
                <span>(-) Despesas Operacionais & Pessoal Corporativo</span>
                <span className="font-mono">- R$ {dre.despesasOperacionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-2 font-bold text-blue-900 bg-blue-50 px-2 rounded">
                <span>(=) EBITDA / LAIDA (Margem: {dre.margemEbitdaPercent}%)</span>
                <span className="font-mono">R$ {dre.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1.5 text-slate-600">
                <span>(-) Depreciação e Amortização Acumulada</span>
                <span className="font-mono">- R$ {dre.depreciacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1.5 text-emerald-700">
                <span>(+/-) Resultado Financeiro Líquido</span>
                <span className="font-mono">+ R$ {dre.resultadoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-2.5 font-bold text-white bg-slate-800 px-3 rounded-lg text-sm mt-3">
                <span>(=) LUCRO LÍQUIDO DO EXERCÍCIO</span>
                <span className="font-mono text-emerald-400">
                  R$ {dre.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Balanço Patrimonial */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Balanço Patrimonial</h3>
                <p className="text-[11px] text-slate-500">Posição Patrimonial Ativo vs Passivo + PL</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Ativo = Passivo + PL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Lado Esquerdo: Ativo */}
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-800 border-b pb-1">ATIVO</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Ativo Circulante</span>
                    <span className="font-mono">R$ {(balanceSheet.ativoCirculante / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-2">• Bancos e Aplicações</div>
                  <div className="text-[11px] text-slate-500 pl-2">• Clientes a Receber</div>
                  <div className="text-[11px] text-slate-500 pl-2">• Estoques Insumos</div>

                  <div className="flex justify-between font-semibold text-slate-700 pt-2 border-t">
                    <span>Ativo Não Circulante</span>
                    <span className="font-mono">R$ {(balanceSheet.ativoNaoCirculante / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-2">• Imobilizado TI & Redes</div>
                  <div className="text-[11px] text-slate-500 pl-2">• (-) Depreciação Acum.</div>
                </div>

                <div className="pt-3 border-t font-bold flex justify-between text-blue-900">
                  <span>TOTAL DO ATIVO</span>
                  <span className="font-mono">R$ {balanceSheet.ativoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Lado Direito: Passivo & PL */}
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-800 border-b pb-1">PASSIVO E PL</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Passivo Circulante</span>
                    <span className="font-mono">R$ {(balanceSheet.passivoCirculante / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-2">• Fornecedores a Pagar</div>
                  <div className="text-[11px] text-slate-500 pl-2">• Obrigações Folha/RH</div>
                  <div className="text-[11px] text-slate-500 pl-2">• Impostos a Recolher</div>

                  <div className="flex justify-between font-semibold text-slate-700 pt-2 border-t">
                    <span>Patrimônio Líquido</span>
                    <span className="font-mono">R$ {(balanceSheet.patrimonioLiquido / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-2">• Capital Social R$ 1.5M</div>
                  <div className="text-[11px] text-slate-500 pl-2">• Reservas de Lucro</div>
                </div>

                <div className="pt-3 border-t font-bold flex justify-between text-emerald-900">
                  <span>TOTAL PASSIVO + PL</span>
                  <span className="font-mono">R$ {balanceSheet.passivoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 5: FECHAMENTO CONTÁBIL DE COMPETÊNCIAS
      ======================================================== */}
      {activeTab === 'closing' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Competências Contábeis & Trava de Períodos</h3>
            <p className="text-xs text-slate-500 mb-4">
              O fechamento mensal consolida a Apuração de Resultado do Exercício (ARE) e impede lançamentos retroativos não autorizados.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {periods.map(per => {
                const isBlocked = per.status === 'BLOQUEADO';
                const isClosed = per.status === 'FECHADO';

                return (
                  <div
                    key={per.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between ${
                      isBlocked
                        ? 'border-purple-200 bg-purple-50/40'
                        : isClosed
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-blue-200 bg-blue-50/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          Competência {per.period}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBlocked
                              ? 'bg-purple-200 text-purple-900'
                              : isClosed
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-blue-200 text-blue-900'
                          }`}
                        >
                          {per.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 mb-4">
                        {per.closed_by && <div>Fechado por: <strong>{per.closed_by}</strong></div>}
                        {per.closed_at && <div>Data do Fechamento: {per.closed_at}</div>}
                        {per.net_result && per.net_result > 0 && (
                          <div>Resultado Apurado: R$ {per.net_result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleClosePeriod(per.period)}
                      disabled={isBlocked}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        isBlocked
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : isClosed
                          ? 'bg-purple-700 text-white hover:bg-purple-800'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          <span>Bloqueado por Auditoria</span>
                        </>
                      ) : isClosed ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          <span>Travar e Bloquear Período</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Concluir Fechamento Mensal</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ========================================================
          MODAL: CADASTRAR CONTA ANALÍTICA
      ======================================================== */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Nova Conta Contábil Analítica</h3>
            <p className="text-xs text-slate-500 mb-4">Cadastre a conta no Plano de Contas Oficial do SEEK.</p>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código Contábil *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 1.01.01.004"
                  value={newAccount.code}
                  onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 font-mono text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Conta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Banco Santander C/C"
                  value={newAccount.name}
                  onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Natureza</label>
                  <select
                    value={newAccount.nature}
                    onChange={e => setNewAccount({ ...newAccount, nature: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="DEVEDORA">Devedora (Ativo / Despesas)</option>
                    <option value="CREDORA">Credora (Passivo / Receitas)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Conta Pai (Subgrupo)</label>
                  <input
                    type="text"
                    value={newAccount.parent_code}
                    onChange={e => setNewAccount({ ...newAccount, parent_code: e.target.value })}
                    placeholder="1.01.01"
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono text-slate-800 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: NOVO LANÇAMENTO (PARTIDAS DOBRADAS)
      ======================================================== */}
      {isNewEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Novo Lançamento Contábil</h3>
            <p className="text-xs text-slate-500 mb-4">
              Motor de Partidas Dobradas (Débito e Crédito simultâneos no Livro Diário).
            </p>

            <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data do Fato Contábil *</label>
                  <input
                    type="date"
                    required
                    value={newEntry.date}
                    onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor do Lançamento (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={newEntry.amount}
                    onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Histórico / Descrição Contábil *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Liquidação de fatura de serviços de telecomunicações"
                  value={newEntry.description}
                  onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-amber-900">Conta DÉBITO *</label>
                  <select
                    value={newEntry.debit_account_code}
                    onChange={e => setNewEntry({ ...newEntry, debit_account_code: e.target.value })}
                    className="w-full rounded-lg border border-amber-300 bg-amber-50/50 p-2 font-mono text-slate-800 focus:border-amber-600 focus:outline-hidden"
                  >
                    {accounts.filter(a => a.type === 'ANALITICA').map(a => (
                      <option key={a.id} value={a.code}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-emerald-900">Conta CRÉDITO *</label>
                  <select
                    value={newEntry.credit_account_code}
                    onChange={e => setNewEntry({ ...newEntry, credit_account_code: e.target.value })}
                    className="w-full rounded-lg border border-emerald-300 bg-emerald-50/50 p-2 font-mono text-slate-800 focus:border-emerald-600 focus:outline-hidden"
                  >
                    {accounts.filter(a => a.type === 'ANALITICA').map(a => (
                      <option key={a.id} value={a.code}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Centro de Custo</label>
                <select
                  value={newEntry.cost_center}
                  onChange={e => setNewEntry({ ...newEntry, cost_center: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="Operações & Serviços Corporativos">Operações & Serviços Corporativos</option>
                  <option value="Tecnologia & Infraestrutura Cloud">Tecnologia & Infraestrutura Cloud</option>
                  <option value="Comercial & Novos Negócios B2B">Comercial & Novos Negócios B2B</option>
                  <option value="Administrativo & Recursos Humanos">Administrativo & Recursos Humanos</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewEntryModalOpen(false)}
                  className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
                >
                  Confirmar Partidas Dobradas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AccountingModule;
