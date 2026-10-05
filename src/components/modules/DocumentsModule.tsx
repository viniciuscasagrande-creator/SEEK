import React from 'react';
import { FolderLock, FileText, Upload, Lock, ShieldCheck, Download, Search } from 'lucide-react';
import { StatCard } from '../common/StatCard';

export const DocumentsModule: React.FC = () => {
  const folders = [
    { name: '01 - Políticas & Governança', filesCount: 14, access: 'Geral', iconColor: 'text-blue-600' },
    { name: '02 - Contratos Sociais & Atas', filesCount: 28, access: 'Diretoria / Jurídico', iconColor: 'text-amber-600' },
    { name: '03 - Contratos com Fornecedores', filesCount: 65, access: 'Compras / Financeiro', iconColor: 'text-emerald-600' },
    { name: '04 - Documentos de Colaboradores', filesCount: 180, access: 'RH / DP', iconColor: 'text-purple-600' },
    { name: '05 - Licenças & Certidões Fiscais', filesCount: 22, access: 'Contábil / Fiscal', iconColor: 'text-indigo-600' },
    { name: '06 - Manuais Operacionais de Bilheteria', filesCount: 34, access: 'Operações', iconColor: 'text-teal-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Documentos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Documentos Corporativos (GED)</h1>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              SEEK Gestão Eletrônica
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Repositório corporativo centralizado, controle de versões, permissões por cargo e assinatura digital integrada.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800">
            <Upload className="h-4 w-4" />
            <span>Upload de Documento</span>
          </button>
        </div>
      </div>

      {/* Grid de Pastas Corporativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map((folder, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <FolderLock className="h-5 w-5" />
              </div>
              <span className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                <Lock className="h-3 w-3 mr-1" />
                {folder.access}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900">{folder.name}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{folder.filesCount} arquivos corporativos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
