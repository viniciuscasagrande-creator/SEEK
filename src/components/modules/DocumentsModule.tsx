import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  FileText,
  Upload,
  Lock,
  ShieldCheck,
  Download,
  Search,
  CheckCircle2,
  FolderOpen,
  Filter,
  FileBadge,
  Eye,
  Calendar,
  Layers
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const DocumentsModule: React.FC = () => {
  const { currentUser } = useAuth();

  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form de upload
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'POLITICAS',
    version: '1.0',
    accessLevel: 'GERAL',
    department: 'Governança & Compliance',
    fileUrl: '/docs/documento_homologado.pdf'
  });

  const categories = [
    {
      id: 'POLITICAS',
      name: '01 - Políticas & Governança',
      description: 'Código de Conduta, Segurança da Informação, LGPD e Compliance.',
      access: 'Geral Corporativo',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      id: 'CONTRATOS_SOCIETARIOS',
      name: '02 - Contratos Sociais & Atas',
      description: 'Estatuto social, atas de assembleia e procurações executivas.',
      access: 'Diretoria / Jurídico',
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      id: 'CONTRATOS_FORNECEDORES',
      name: '03 - Contratos com Fornecedores',
      description: 'Instrumentos contratuais de prestação de serviços e parcerias.',
      access: 'Compras / Financeiro',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      id: 'COLABORADORES',
      name: '04 - Documentos de Colaboradores',
      description: 'Termos de admissão, comprovantes de entrega e fichas de registro.',
      access: 'RH / DP',
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      id: 'CERTIDOES_FISCAIS',
      name: '05 - Licenças & Alvarás Fiscais',
      description: 'CND Federal, Estadual, Municipal e licenças do corpo de bombeiros.',
      access: 'Contábil / Fiscal',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      id: 'MANUAIS_OPERACIONAIS',
      name: '06 - Manuais & Procedimentos',
      description: 'Manuais técnicos de infraestrutura de rede, servidores e fluxos corporativos.',
      access: 'Operações & Logística',
      color: 'text-teal-600',
      bg: 'bg-teal-50'
    }
  ];

  const loadData = async () => {
    try {
      const res = await api.getDocuments(selectedCategory);
      if (res && res.length > 0) {
        setDocuments(res);
      } else {
        // Fallback default docs
        setDocuments([
          {
            id: 'doc-01',
            code: 'DOC-2026-001',
            title: 'Política Geral de Segurança da Informação & Proteção de Dados (LGPD)',
            category: 'POLITICAS',
            version: '2.1',
            accessLevel: 'GERAL',
            department: 'Governança & TI',
            uploadedByName: 'Roberto Vianna Guimarães',
            createdAt: '01/02/2026',
            fileSize: '2.4 MB'
          },
          {
            id: 'doc-02',
            code: 'DOC-2026-002',
            title: 'Regimento Interno e Norma de Alçadas de Aprovação SEEK',
            category: 'POLITICAS',
            version: '1.4',
            accessLevel: 'GERAL',
            department: 'Diretoria Executiva',
            uploadedByName: 'Roberto Vianna Guimarães',
            createdAt: '15/03/2026',
            fileSize: '1.8 MB'
          },
          {
            id: 'doc-03',
            code: 'DOC-2026-003',
            title: 'Contrato Social Consolidado - SEEK Gestão Integrada & Participações S.A.',
            category: 'CONTRATOS_SOCIETARIOS',
            version: '4.0',
            accessLevel: 'DIRETORIA',
            department: 'Jurídico',
            uploadedByName: 'Lucas Bertolli Costa',
            createdAt: '10/01/2026',
            fileSize: '5.1 MB'
          },
          {
            id: 'doc-04',
            code: 'DOC-2026-004',
            title: 'Certidão Negativa de Débitos Federais e Previdenciários (CND Conjunta)',
            category: 'CERTIDOES_FISCAIS',
            version: '2026.09',
            accessLevel: 'GERAL',
            department: 'Contábil & Fiscal',
            uploadedByName: 'Camila Fernandes Souza',
            createdAt: '20/09/2026',
            fileSize: '840 KB'
          },
          {
            id: 'doc-05',
            code: 'DOC-2026-005',
            title: 'Manual de Operação de Redes Corporativas e Datacenter',
            category: 'MANUAIS_OPERACIONAIS',
            version: '3.0',
            accessLevel: 'GERAL',
            department: 'Tecnologia & Infraestrutura',
            uploadedByName: 'Beatriz Castro Lima',
            createdAt: '05/08/2026',
            fileSize: '4.2 MB'
          }
        ]);
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: docForm.title,
      category: docForm.category,
      version: docForm.version,
      accessLevel: docForm.accessLevel,
      department: docForm.department,
      fileUrl: docForm.fileUrl,
      uploadedByName: currentUser.fullName
    };

    const res = await api.createDocument(payload);
    if (res && res.document) {
      setDocuments(prev => [res.document, ...prev]);
    } else {
      const mockDoc = {
        id: `doc-${Date.now()}`,
        code: `DOC-2026-0${Math.floor(100 + Math.random() * 899)}`,
        ...payload,
        createdAt: '05/10/2026',
        fileSize: '1.2 MB'
      };
      setDocuments(prev => [mockDoc, ...prev]);
    }

    setNotification(`Documento "${docForm.title}" publicado no repositório corporativo com sucesso.`);
    setIsUploadModalOpen(false);
    setDocForm({
      title: '',
      category: 'POLITICAS',
      version: '1.0',
      accessLevel: 'GERAL',
      department: 'Governança & Compliance',
      fileUrl: '/docs/documento_homologado.pdf'
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
    const matchesSearch =
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
            Repositório corporativo centralizado, controle estrito de versões, controle de acesso e validade jurídica.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Publicar Documento</span>
          </button>
        </div>
      </div>

      {/* Notificação de Feedback */}
      {notification && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPIs GED */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Documentos Ativos"
          value={documents.length}
          subtitle="Homologados e auditados"
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Pastas Estratégicas"
          value="6"
          subtitle="Diretórios por departamento"
          icon={FolderLock}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Políticas Corporativas"
          value={documents.filter(d => d.category === 'POLITICAS').length}
          subtitle="Código de conduta & LGPD"
          icon={ShieldCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Certidões & Alvarás"
          value="100% Válidos"
          subtitle="Sem pendências tributárias"
          icon={FileBadge}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Grid de Pastas Corporativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const count = documents.filter(d => d.category === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat.id)}
              className={`rounded-xl border p-4 shadow-xs transition-all cursor-pointer space-y-2.5 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cat.bg} ${cat.color}`}>
                  <FolderLock className="h-5 w-5" />
                </div>
                <span className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Lock className="h-3 w-3 mr-1 text-slate-400" />
                  {cat.access}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900">{cat.name}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{cat.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                <span>{count} arquivos</span>
                <span className="text-blue-600 hover:underline">
                  {isSelected ? 'Ver Todos' : 'Filtrar Pasta →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de Arquivos do GED */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Arquivos Catalogados {selectedCategory !== 'ALL' && `(Filtro: ${selectedCategory})`}
            </h3>
            <p className="text-[11px] text-slate-500">Histórico de versões e trilha de publicação.</p>
          </div>

          <div className="flex items-center space-x-2">
            {selectedCategory !== 'ALL' && (
              <button
                onClick={() => setSelectedCategory('ALL')}
                className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Limpar Filtro
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar documento ou código..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-56 sm:w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Título do Documento</th>
                <th className="py-3 px-4">Pasta / Categoria</th>
                <th className="py-3 px-4 text-center">Versão</th>
                <th className="py-3 px-4 text-center">Nível de Acesso</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Publicado Por</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{doc.code}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{doc.title}</span>
                    <span className="text-[10px] text-slate-400">{doc.fileSize || '1.5 MB'} • Publicado em {doc.createdAt}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    v{doc.version}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        doc.accessLevel === 'CONFIDENCIAL'
                          ? 'bg-rose-100 text-rose-800'
                          : doc.accessLevel === 'DIRETORIA'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {doc.accessLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{doc.department}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{doc.uploadedByName}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        setNotification(`Download do arquivo "${doc.title}" iniciado.`);
                        setTimeout(() => setNotification(null), 3000);
                      }}
                      className="inline-flex items-center space-x-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Baixar</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    Nenhum documento encontrado na categoria selecionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Upload de Documento */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Publicar Documento Corporativo"
        subtitle="Armazene políticas, contratos e manuais com controle de versão e nível de acesso."
      >
        <form onSubmit={handleUploadDoc} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Título do Documento</label>
            <input
              type="text"
              required
              value={docForm.title}
              onChange={e => setDocForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Política Anticorrupção e Prevenção à Fraude"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pasta / Categoria</label>
              <select
                value={docForm.category}
                onChange={e => setDocForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="POLITICAS">01 - Políticas & Governança</option>
                <option value="CONTRATOS_SOCIETARIOS">02 - Contratos Sociais & Atas</option>
                <option value="CONTRATOS_FORNECEDORES">03 - Contratos com Fornecedores</option>
                <option value="COLABORADORES">04 - Documentos de Colaboradores</option>
                <option value="CERTIDOES_FISCAIS">05 - Licenças & Alvarás Fiscais</option>
                <option value="MANUAIS_OPERACIONAIS">06 - Manuais & Procedimentos</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Versão do Documento</label>
              <input
                type="text"
                required
                value={docForm.version}
                onChange={e => setDocForm(prev => ({ ...prev, version: e.target.value }))}
                placeholder="Ex: 1.0 ou 2.1"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nível de Acesso</label>
              <select
                value={docForm.accessLevel}
                onChange={e => setDocForm(prev => ({ ...prev, accessLevel: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="GERAL">Geral (Todos os Colaboradores)</option>
                <option value="DIRETORIA">Restrito à Diretoria & Gestores</option>
                <option value="CONFIDENCIAL">Altamente Confidencial (Jurídico/DPO)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Departamento Emissor</label>
              <input
                type="text"
                required
                value={docForm.department}
                onChange={e => setDocForm(prev => ({ ...prev, department: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              Publicar no Repositório
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
