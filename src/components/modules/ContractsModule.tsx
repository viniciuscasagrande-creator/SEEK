import React, { useState } from 'react';
import { FileText, Plus, AlertTriangle, CheckCircle, Scale, ShieldCheck } from 'lucide-react';
import { CONTRACTS_RECORDS } from '../../data/mockData';
import { ContractRecord } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';

export const ContractsModule: React.FC = () => {
  const [contracts] = useState<ContractRecord[]>(CONTRACTS_RECORDS);

  const totalMonthlyBilling = contracts.reduce((acc, c) => acc + c.monthlyValue, 0);

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
            Gestão de vigência, alertas preventivos de renovação, reajustes por índices (IPCA/IGP-M) e procurações societárias.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800">
            <Plus className="h-4 w-4" />
            <span>Cadastrar Contrato</span>
          </button>
        </div>
      </div>

      {/* KPIs de Contratos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Faturamento Mensal Contratual"
          value={`R$ ${(totalMonthlyBilling / 1000).toFixed(1)}k/mês`}
          subtitle="Receita recorrente garantida"
          icon={FileText}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Alertas de Vencimento"
          value="1"
          subtitle="Janela < 30 dias (Allianz Parque)"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
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
          title="Índice de Reajuste Médio"
          value="+4.2% (IPCA)"
          subtitle="Aplicável no ciclo 2026/2027"
          icon={Scale}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.contractNumber}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{c.partyName}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {c.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    R$ {c.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{c.startDate}</td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{c.endDate}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-bold ${
                        c.daysRemaining <= 30
                          ? 'text-rose-600'
                          : c.daysRemaining <= 90
                          ? 'text-amber-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {c.daysRemaining} dias
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-600">{c.readjustmentIndex}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
