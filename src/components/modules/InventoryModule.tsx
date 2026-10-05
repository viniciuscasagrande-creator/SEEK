import React from 'react';
import { Boxes, Landmark, QrCode, ShieldCheck, Tag } from 'lucide-react';
import { ASSETS_RECORDS } from '../../data/mockData';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';

export const InventoryModule: React.FC = () => {
  const totalAssetValue = ASSETS_RECORDS.reduce((acc, a) => acc + a.currentBookValue, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Estoque & Patrimônio */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Estoque & Patrimônio Corporativo</h1>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              SEEK Gestão
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de materiais de eventos, ativos de TI, equipamentos de bilheteria e termos de custódia por colaborador.
          </p>
        </div>
      </div>

      {/* KPIs Patrimônio */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Valor Patrimonial Líquido"
          value={`R$ ${(totalAssetValue / 1000).toFixed(1)}k`}
          subtitle="Valor contábil após depreciação"
          icon={Landmark}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Ativos com Termo Assinado"
          value="100%"
          subtitle="Vinculados aos colaboradores"
          icon={ShieldCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Catracas & Leitores Móveis"
          value="45 un"
          subtitle="Disponíveis para operações"
          icon={Tag}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Bobinas & Pulseiras em Estoque"
          value="85.000"
          subtitle="Itens nos almoxarifados"
          icon={Boxes}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Tabela de Ativos Patrimoniais */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Ativos Imobilizados Homologados</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Plaqueta Patrimonial</th>
                <th className="py-3 px-4">Descrição do Ativo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Localização Física</th>
                <th className="py-3 px-4">Responsável Custodiante</th>
                <th className="py-3 px-4 text-right">Valor Contábil Atual</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ASSETS_RECORDS.map(ast => (
                <tr key={ast.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{ast.tagNumber}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{ast.description}</td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {ast.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{ast.location}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{ast.responsibleName}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    R$ {ast.currentBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={ast.status} />
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
