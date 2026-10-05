import React, { useState } from 'react';
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
  Building
} from 'lucide-react';
import { FINANCIAL_ENTRIES } from '../../data/mockData';
import { FinancialEntry } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';

export const FinanceModule: React.FC = () => {
  const { addAuditLog } = useWorkflow();
  const { currentUser } = useAuth();

  const [entries, setEntries] = useState<FinancialEntry[]>(FINANCIAL_ENTRIES);
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'dre' | 'fluxo' | 'bancos'>('lancamentos');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [entryType, setEntryType] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const [title, setTitle] = useState('');
  const [entityName, setEntityName] = useState('');
  const [costCenter, setCostCenter] = useState('Operações de Eventos');
  const [category, setCategory] = useState('Despesas Operacionais');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');

  const totalReceitas = entries.filter(e => e.type === 'RECEBER').reduce((a, b) => a + b.amount, 0);
  const totalDespesas = entries.filter(e => e.type === 'PAGAR').reduce((a, b) => a + b.amount, 0);
  const saldoLiquido = totalReceitas - totalDespesas;

  const filteredEntries = entries.filter(e => {
    if (filterType !== 'ALL' && e.type !== filterType) return false;
    return true;
  });

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: FinancialEntry = {
      id: `fin-${Date.now()}`,
      code: `${entryType === 'RECEBER' ? 'CR' : 'CP'}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      type: entryType,
      title,
      entityName,
      costCenter,
      category,
      amount: parseFloat(amount) || 0,
      dueDate: dueDate || '2026-10-31',
      status: 'CONFIRMADO',
      paymentMethod
    };

    setEntries(prev => [newEntry, ...prev]);

    addAuditLog({
      action: 'CREATE',
      module: 'Financeiro',
      entity: `Lançamento ${newEntry.code}`,
      description: `Criado lançamento ${newEntry.type} no valor de R$ ${newEntry.amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2
      })} para ${newEntry.entityName}`
    });

    setIsModalOpen(false);
    setTitle('');
    setEntityName('');
    setAmount('');
  };

  const handleLiquidate = (id: string) => {
    setEntries(prev =>
      prev.map(e => {
        if (e.id === id) {
          addAuditLog({
            action: 'UPDATE',
            module: 'Financeiro',
            entity: `Lançamento ${e.code}`,
            description: `Baixa / liquidação financeira efetuada no valor de R$ ${e.amount.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}`
          });
          return { ...e, status: 'PAGO' };
        }
        return e;
      })
    );
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
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Contas a Receber"
          value={`R$ ${(totalReceitas / 1000).toFixed(1)}k`}
          change="+8.5%"
          changeType="positive"
          subtitle="Receitas de ingressos e taxas"
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
          value="R$ 1.840,5k"
          subtitle="Bradesco Matriz + Itaú Filiais"
          icon={Landmark}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Resultado Operacional (EBITDA)"
          value="24.8%"
          change="+1.5 p.p."
          changeType="positive"
          subtitle="Margem de contribuição saudável"
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
            <p className="text-xs text-slate-500">Saldo inicial em bancos: R$ 1.840.500,00</p>
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
            <p className="text-xs text-slate-500">Saldos operacionais vinculados às filiais da DiskIngressos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Banco Bradesco (237) — Conta Corrente Matriz</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Conciliado</span>
              </div>
              <p className="text-xs text-slate-600">Agência: 1204 • Conta: 45890-1 • Curitiba (PR)</p>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-xs text-slate-500">Saldo Disponível:</span>
                <span className="text-base font-black text-slate-900">R$ 1.250.000,00</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Banco Itaú (341) — Conta Operações SP</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Conciliado</span>
              </div>
              <p className="text-xs text-slate-600">Agência: 0842 • Conta: 98120-7 • São Paulo (SP)</p>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-xs text-slate-500">Saldo Disponível:</span>
                <span className="text-base font-black text-slate-900">R$ 590.500,00</span>
              </div>
            </div>
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
            <label className="block font-bold text-slate-700 mb-1">Título / Descrição do Lançamento</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Licenciamento de software antivírus corporativo"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Favorecido / Parceiro</label>
              <input
                type="text"
                required
                value={entityName}
                onChange={e => setEntityName(e.target.value)}
                placeholder="Ex: Microsoft Brasil / Arena Ticket"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Centro de Custo</label>
              <select
                value={costCenter}
                onChange={e => setCostCenter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option>Operações de Eventos</option>
                <option>Tecnologia da Informação</option>
                <option>Recursos Humanos Corporativo</option>
                <option>Comercial & Marketing</option>
                <option>Diretoria Executiva</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Método de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="PIX">PIX Corporativo</option>
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="TED">Transferência TED</option>
                <option value="Cartão Corporativo">Cartão Corporativo</option>
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
              Confirmar Lançamento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
