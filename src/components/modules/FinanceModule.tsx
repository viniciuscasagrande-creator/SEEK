import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Plus,
  PieChart,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Landmark,
  Building,
  CheckCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { FINANCIAL_ENTRIES } from '../../data/mockData';
import { FinancialEntry } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const FinanceModule: React.FC = () => {
  const { addAuditLog } = useWorkflow();
  const { currentUser } = useAuth();

  const [entries, setEntries] = useState<FinancialEntry[]>(FINANCIAL_ENTRIES);
  const [bankAccounts, setBankAccounts] = useState<any[]>([
    { id: 'bank-1', bankName: 'Banco Bradesco S.A.', bankCode: '237', agency: '1204', accountNumber: '45890-1', currentBalance: 1250000.0 },
    { id: 'bank-2', bankName: 'Banco Itaú Unibanco S.A.', bankCode: '341', agency: '0842', accountNumber: '98120-7', currentBalance: 590500.0 }
  ]);
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'dre' | 'fluxo' | 'bancos'>('lancamentos');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states
  const [entryType, setEntryType] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const [title, setTitle] = useState('');
  const [entityName, setEntityName] = useState('');
  const [costCenter, setCostCenter] = useState('Operações de Eventos');
  const [category, setCategory] = useState('Despesas Operacionais');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');

  const loadData = async () => {
    try {
      const serverRecords = await api.getFinanceRecords(filterType);
      if (serverRecords && serverRecords.length > 0) {
        setEntries(serverRecords);
      }
      const serverAccounts = await api.getBankAccounts();
      if (serverAccounts && serverAccounts.length > 0) {
        setBankAccounts(serverAccounts);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType]);

  const totalReceitas = entries.filter(e => e.type === 'RECEBER').reduce((a, b) => a + (b.amount || 0), 0);
  const totalDespesas = entries.filter(e => e.type === 'PAGAR').reduce((a, b) => a + (b.amount || 0), 0);
  const saldoLiquido = totalReceitas - totalDespesas;
  const totalBancos = bankAccounts.reduce((a, b) => a + (b.currentBalance || b.current_balance || 0), 0);
  const ebitdaPercent = totalReceitas > 0 ? ((saldoLiquido / totalReceitas) * 100).toFixed(1) : '24.8';

  const filteredEntries = entries.filter(e => {
    if (filterType !== 'ALL' && e.type !== filterType) return false;
    return true;
  });

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
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.id) {
      setNotification(`✅ Lançamento ${res.code} cadastrado no Financeiro.`);
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
        status: 'CONFIRMADO',
        paymentMethod
      };
      setEntries(prev => [newEntry, ...prev]);
      setNotification(`✅ Lançamento cadastrado localmente.`);
    }

    addAuditLog({
      action: 'CREATE',
      module: 'Financeiro',
      entity: `Lançamento ${title}`,
      description: `Criado lançamento ${entryType} no valor de R$ ${parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    });

    setIsModalOpen(false);
    setTitle('');
    setEntityName('');
    setAmount('');
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLiquidate = async (id: string) => {
    // Seleciona primeira conta disponível para débito/crédito
    const primaryBankId = bankAccounts[0]?.id || 'bank-1';
    const success = await api.payFinanceRecord(id, primaryBankId, currentUser.fullName, currentUser.roleTitle);

    if (success) {
      setNotification(`💰 Baixa / Liquidação efetuada com sucesso! Saldo bancário atualizado.`);
      loadData();
    } else {
      setEntries(prev => prev.map(e => (e.id === id ? { ...e, status: 'PAGO' } : e)));
      setNotification(`💰 Baixa registrada localmente.`);
    }

    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Financeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Módulo Financeiro & Tesouraria</h1>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              SEEK Gestão Operacional
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contas a pagar/receber, conciliação bancária, tesouraria, fluxo de caixa e DRE gerencial consolidada.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
        </div>
      )}

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Contas a Receber"
          value={`R$ ${(totalReceitas / 1000).toFixed(1)}k`}
          change="+8.5%"
          changeType="positive"
          subtitle="Receitas contratuais e serviços corporativos"
          icon={ArrowUpRight}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Contas a Pagar"
          value={`R$ ${(totalDespesas / 1000).toFixed(1)}k`}
          change="-2.1%"
          changeType="positive"
          subtitle="Fornecedores, infra e folha"
          icon={ArrowDownRight}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          title="Disponibilidade em Bancos"
          value={`R$ ${(totalBancos / 1000).toFixed(1)}k`}
          subtitle="Bradesco Matriz + Itaú SP"
          icon={Landmark}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Resultado Operacional (EBITDA)"
          value={`${ebitdaPercent}%`}
          change={`Saldo líquido R$ ${(saldoLiquido / 1000).toFixed(1)}k`}
          changeType="positive"
          subtitle="Margem de contribuição líquida"
          icon={PieChart}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Abas do Módulo Financeiro */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('lancamentos')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'lancamentos'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Contas a Pagar & Receber ({entries.length})
        </button>

        <button
          onClick={() => setActiveTab('dre')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'dre'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          DRE Gerencial Consolidada
        </button>

        <button
          onClick={() => setActiveTab('fluxo')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'fluxo'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Fluxo de Caixa Projetado
        </button>

        <button
          onClick={() => setActiveTab('bancos')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'bancos'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tesouraria & Contas Bancárias
        </button>
      </div>

      {/* ABA 1: LANÇAMENTOS COM LIQUIDAÇÃO */}
      {activeTab === 'lancamentos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Filtrar Movimentações:</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">Todas as Movimentações</option>
                <option value="RECEBER">Apenas Contas a Receber</option>
                <option value="PAGAR">Apenas Contas a Pagar</option>
              </select>
            </div>
            <span className="text-xs text-slate-500">
              Total exibido: <strong>{filteredEntries.length}</strong> títulos
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Título / Descrição</th>
                  <th className="py-3 px-4">Favorecido / Parceiro</th>
                  <th className="py-3 px-4">Centro de Custo</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{entry.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{entry.title}</div>
                      <div className="text-[10px] text-slate-400">{entry.category} • {entry.paymentMethod}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{entry.entityName}</td>
                    <td className="py-3 px-4 text-slate-500">{entry.costCenter}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">{entry.dueDate}</td>
                    <td
                      className={`py-3 px-4 text-right font-black ${
                        entry.type === 'RECEBER' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {entry.type === 'RECEBER' ? '+' : '-'} R${' '}
                      {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {entry.status !== 'PAGO' ? (
                        <button
                          onClick={() => handleLiquidate(entry.id)}
                          className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          Liquidar
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Liquidado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: DRE GERENCIAL */}
      {activeTab === 'dre' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Demonstração do Resultado do Exercício (DRE Gerencial)</h3>
            <p className="text-xs text-slate-500">Calculada dinamicamente com base nas receitas e despesas operacionais</p>
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
            <div className="flex justify-between p-3 bg-slate-50 font-bold text-slate-800">
              <span>(=) RECEITA OPERACIONAL BRUTA</span>
              <span>R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between p-3 text-slate-600 pl-6">
              <span>(-) Deduções de Receita & Tributos Municipais/Federais (11.25%)</span>
              <span className="text-rose-600">
                - R$ {(totalReceitas * 0.1125).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50/50 font-bold text-slate-800">
              <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
              <span>R$ {(totalReceitas * 0.8875).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between p-3 text-slate-600 pl-6">
              <span>(-) Custos Diretos dos Serviços & Infraestrutura</span>
              <span className="text-rose-600">- R$ {(totalDespesas * 0.4).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between p-3 bg-blue-50/50 font-bold text-blue-900">
              <span>(=) LUCRO BRUTO GERENCIAL</span>
              <span>
                R$ {(totalReceitas * 0.8875 - totalDespesas * 0.4).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between p-3 text-slate-600 pl-6">
              <span>(-) Despesas Operacionais, Administrativas & Pessoal</span>
              <span className="text-rose-600">- R$ {(totalDespesas * 0.6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between p-3 bg-emerald-50 font-black text-emerald-900 text-sm">
              <span>(=) RESULTADO OPERACIONAL LÍQUIDO (EBITDA)</span>
              <span>
                R$ {(totalReceitas * 0.8875 - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: FLUXO DE CAIXA */}
      {activeTab === 'fluxo' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Projeção Semanal de Fluxo de Caixa (15 Dias)</h3>
            <p className="text-xs text-slate-500">Saldo inicial consolidado em bancos: R$ {totalBancos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs font-bold text-slate-500 block uppercase">Semana 1 (05 a 11 Out)</span>
              <div className="mt-2 text-sm font-bold text-rose-600">Saídas: R$ 324.200,00</div>
              <div className="text-sm font-bold text-emerald-600">Entradas: R$ 85.000,00</div>
              <div className="mt-2 pt-2 border-t border-slate-200 font-extrabold text-slate-900">
                Saldo Projetado: R$ 1.601.300,00
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs font-bold text-slate-500 block uppercase">Semana 2 (12 a 18 Out)</span>
              <div className="mt-2 text-sm font-bold text-rose-600">Saídas: R$ 12.450,00</div>
              <div className="text-sm font-bold text-emerald-600">Entradas: R$ 185.600,00</div>
              <div className="mt-2 pt-2 border-t border-slate-200 font-extrabold text-slate-900">
                Saldo Projetado: R$ 1.774.450,00
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs font-bold text-slate-500 block uppercase">Semana 3 (19 a 25 Out)</span>
              <div className="mt-2 text-sm font-bold text-rose-600">Saídas: R$ 18.000,00</div>
              <div className="text-sm font-bold text-emerald-600">Entradas: R$ 45.000,00</div>
              <div className="mt-2 pt-2 border-t border-slate-200 font-extrabold text-slate-900">
                Saldo Projetado: R$ 1.801.450,00
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: TESOURARIA & BANCOS */}
      {activeTab === 'bancos' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Contas Bancárias & Conciliação</h3>
            <p className="text-xs text-slate-500">Saldos operacionais vinculados às filiais da SEEK</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((acc: any) => (
              <div key={acc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{acc.bankName || acc.bank_name} ({acc.bankCode || acc.bank_code})</span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Conciliado</span>
                </div>
                <p className="text-xs text-slate-600">Agência: {acc.agency} • Conta: {acc.accountNumber || acc.account_number}</p>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-xs text-slate-500">Saldo Disponível:</span>
                  <span className="text-base font-black text-slate-900">
                    R$ {(acc.currentBalance ?? acc.current_balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Novo Lançamento Financeiro */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Lançamento Financeiro"
        subtitle="Registre uma obrigação a pagar ou expectativa de receita."
      >
        <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo de Movimentação</label>
              <select
                value={entryType}
                onChange={e => setEntryType(e.target.value as 'PAGAR' | 'RECEBER')}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="PAGAR">Contas a Pagar (Despesa)</option>
                <option value="RECEBER">Contas a Receber (Receita)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Ex: 8500.00"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Título / Descrição da Despesa ou Receita</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Faturamento de serviços de TI ou Licenciamento SaaS"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Favorecido / Fornecedor / Cliente</label>
              <input
                type="text"
                required
                value={entityName}
                onChange={e => setEntityName(e.target.value)}
                placeholder="Ex: Grupo Votorantim S.A."
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Centro de Custo</label>
              <select
                value={costCenter}
                onChange={e => setCostCenter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Operações de Eventos">Operações de Eventos</option>
                <option value="Tecnologia & Infraestrutura Cloud">Tecnologia & Infraestrutura Cloud</option>
                <option value="Comercial & Marketing">Comercial & Marketing</option>
                <option value="Administrativo & RH">Administrativo & RH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Data de Vencimento</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Forma de Liquidação</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="PIX">PIX Corporativo</option>
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="TED Bancária">TED / Transferência</option>
                <option value="Cartão Corporativo">Cartão de Crédito Corporativo</option>
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
              Efetivar Lançamento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
