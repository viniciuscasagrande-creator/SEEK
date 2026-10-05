import React from 'react';
import { BarChart3, FileSpreadsheet, Download, Filter, Calendar } from 'lucide-react';
import { StatCard } from '../common/StatCard';

export const ReportsModule: React.FC = () => {
  const reportsList = [
    { title: 'DRE Consolidada por Centro de Custo', category: 'Financeiro', format: 'Excel / PDF', lastRun: 'Hoje, 09:30' },
    { title: 'Relatório de Saving e SLA de Fornecedores', category: 'Compras', format: 'Excel', lastRun: 'Ontem, 18:00' },
    { title: 'Previsão de Faturamento & Funil Comercial', category: 'CRM', format: 'PDF Executivo', lastRun: '04/10/2026' },
    { title: 'Fechamento de Ponto, Horas Extras e Encargos', category: 'RH / DP', format: 'Excel', lastRun: '03/10/2026' },
    { title: 'Mapa de Vencimento de Contratos Corporativos', category: 'Jurídico', format: 'PDF', lastRun: '02/10/2026' },
    { title: 'Log Consolidado de Auditoria e Aprovações', category: 'Compliance', format: 'CSV Seguro', lastRun: 'Hoje, 14:00' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner BI & Relatórios */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">BI & Relatórios Executivos</h1>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              SEEK Inteligência de Dados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Geração de relatórios analíticos, comparativos históricos, exportação para Excel/PDF e dashboards departamentais.
          </p>
        </div>
      </div>

      {/* Grid de Relatórios Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportsList.map((rep, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {rep.category}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Formato: {rep.format}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">{rep.title}</h4>
              <span className="text-[10px] text-slate-400 block mt-1">Última emissão: {rep.lastRun}</span>
            </div>

            <button className="flex items-center justify-center space-x-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-all">
              <Download className="h-3.5 w-3.5" />
              <span>Gerar & Baixar Relatório</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
