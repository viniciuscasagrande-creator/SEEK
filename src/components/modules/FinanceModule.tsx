import React, { useState } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Filter, Plus, PieChart, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { FINANCIAL_ENTRIES } from '../../data/mockData';
import { FinancialEntry } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';

export const FinanceModule: React.FC = () => {
  const [entries, setEntries] = useState<FinancialEntry[]>(FINANCIAL_ENTRIES);
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'dre' | 'fluxo'>('lancamentos');
  const [filterType, setFilterType] = useState<string>('ALL');

  const totalReceitas = entries.filter(e => e.type === 'RECEBER').reduce((a, b) => a + b.amount, 0);
  const totalDespesas = entries.filter(e => e.type === 'PAGAR').reduce((a, b) => a + b.amount, 0);
  const saldoProjetado = totalReceitas - totalDespesas;

  const filteredEntries = entries.filter(e => {
    if (filterType !== 'ALL' && e.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Financeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Módulo Financeiro & Controladoria</h1>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              SEEK Gestão
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contas a pagar/receber, conciliação bancária, centros de custo, fluxo de caixa e DRE gerencial consolidada.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contas a Receber"
          value={`R$ ${(totalReceitas / 1000).toFixed(1)}k`}
          change="+8.5%"
          changeType="positive"
          subtitle="Receitas de ingressos e taxas"
          icon={ArrowUpRight}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Total Contas a Pagar"
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
          subtitle="Saldo consolidado Bradesco/Itaú"
          icon={DollarSign}
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
          Contas a Pagar & Receber
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
      </div>

      {activeTab === 'lancamentos' && (
        <div className="space-y-4">
          {/* Filtros da Tabela */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Tipo de Registro:</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">Todas as Movimentações</option>
                <option value="RECEBER">Contas a Receber</option>
                <option value="PAGAR">Contas a Pagar</option>
              </select>
            </div>
            <span className="text-xs text-slate-500">
              Exibindo <strong>{filteredEntries.length}</strong> registros
            </span>
          </div>

          {/* Tabela de Lançamentos */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Título / Descrição</th>
                  <th className="py-3 px-4">Entidade / Favorecido</th>
                  <th className="py-3 px-4">Centro de Custo</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{entry.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{entry.title}</div>
                      <div className="text-[10px] text-slate-400">{entry.category}</div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'dre' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Demonstração do Resultado do Exercício (DRE Gerencial)</h3>
            <p className="text-xs text-slate-500">Competência consolidada DiskIngressos Matriz e Filiais — Outubro/2026</p>
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
            <div className="flex justify-between p-3 bg-slate-50 font-bold text-slate-800">
              <span>(=) RECEITA OPERACIONAL BRUTA</span>
              <span>R$ 230.600,00</span>
            </div>
            <div className="flex justify-between p-3 text-slate-600 pl-6">
              <span>(-) Deduções de Receita & ISS/PIS/COFINS (11.25%)</span>
              <span className="text-rose-600">- R$ 25.942,50</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50/50 font-bold text-slate-800">
              <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
              <span>R$ 204.657,50</span>
            </div>
            <div className="flex justify-between p-3 text-slate-600 pl-6">
              <span>(-) Custos dos Serviços Prestados (Infra Cloud, Insumos)</span>
              <span className="text-rose-600">- R$ 47.250,00</span>
            </div>
            <div className="flex justify-between p-3 bg-blue-50/50 font-bold text-blue-900">
              <span>(=) LUCRO BRUTO GERENCIAL</span>
              <span>R$ 157.407,50 (76.9%)</span>
            </div>
            <div className="flex justify-between p-3 text-slate-600 pl-6">
              <span>(-) Despesas Operacionais Administrativas & Pessoal</span>
              <span className="text-rose-600">- R$ 106.600,00</span>
            </div>
            <div className="flex justify-between p-3 bg-emerald-50 font-black text-emerald-900 text-sm">
              <span>(=) RESULTADO OPERACIONAL LÍQUIDO (EBITDA)</span>
              <span>R$ 50.807,50 (24.8%)</span>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};
