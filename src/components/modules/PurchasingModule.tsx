import React, { useState } from 'react';
import { ShoppingCart, Plus, CheckCircle, Truck, TrendingDown, Clock, ShieldCheck } from 'lucide-react';
import { PURCHASING_REQUISITIONS } from '../../data/mockData';
import { PurchaseRequisition } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';

export const PurchasingModule: React.FC = () => {
  const { createApprovalRequest } = useWorkflow();
  const { activeCompany } = useAuth();
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>(PURCHASING_REQUISITIONS);

  return (
    <div className="space-y-6">
      {/* Top Banner Compras */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Compras & Suprimentos</h1>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              SEEK Gestão
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Solicitações de compra, cotações com múltiplos fornecedores, ordens de compra e integração direta com o motor de alçadas.
          </p>
        </div>
      </div>

      {/* KPIs de Compras */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saving Acumulado (Q4)"
          value="R$ 42,1k"
          change="+18.4%"
          changeType="positive"
          subtitle="Economia obtida em cotações"
          icon={TrendingDown}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Ordens em Aprovação"
          value={requisitions.filter(r => r.status === 'PENDENTE_APROVACAO').length}
          subtitle="Tramitando nas alçadas SEEK"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Fornecedores Homologados"
          value="48"
          subtitle="Com SLA e certidões ativas"
          icon={Truck}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Pontualidade de Entrega"
          value="96.4%"
          change="+2.1 p.p."
          changeType="positive"
          subtitle="Cumprimento de prazos contratados"
          icon={ShieldCheck}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Tabela de Ordens e Solicitações de Compra */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Solicitações & Pedidos de Compra</h3>
          <span className="text-xs text-slate-500">Fluxo Integrado com Contas a Pagar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Descrição da Compra</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Fornecedor Vencedor</th>
                <th className="py-3 px-4">Data Necessidade</th>
                <th className="py-3 px-4 text-right">Valor Total (R$)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requisitions.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.code}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900">{item.title}</span>
                    <span className="block text-[10px] text-slate-400">Solicitante: {item.requesterName}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{item.department}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{item.supplierQuoted}</td>
                  <td className="py-3 px-4 text-slate-600">{item.requiredDate}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={item.status} />
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
