import React, { useState } from 'react';
import {
  Building,
  ShieldCheck,
  GitBranch,
  History,
  Users2,
  SlidersHorizontal,
  Plus,
  Search,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { DEMO_PROFILES, COMPANIES } from '../../data/mockData';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { UserRoleLevel } from '../../types/core';

export const AdminModule: React.FC = () => {
  const { companies, branches, availableProfiles } = useAuth();
  const { auditLogs, addAuditLog } = useWorkflow();

  const [activeTab, setActiveTab] = useState<'empresas' | 'rbac' | 'alcadas' | 'auditoria'>('rbac');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Form states for new user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRoleLevel>('COLABORADOR');
  const [newUserDept, setNewUserDept] = useState('Operações');
  const [newUserLimit, setNewUserLimit] = useState('5000');

  const [userList, setUserList] = useState(availableProfiles);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const createdUser = {
      id: `user-${Date.now()}`,
      fullName: newUserName,
      email: newUserEmail,
      registrationNumber: `MAT-0${Math.floor(200 + Math.random() * 800)}`,
      roleLevel: newUserRole,
      roleTitle: newUserRole.replace(/_/g, ' '),
      department: newUserDept,
      companyId: 'comp-1',
      branchId: 'branch-1',
      approvalLimitAmount: parseFloat(newUserLimit) || 0,
      accessibleModules: ['inicio', 'service-desk', 'documents']
    };

    setUserList(prev => [createdUser, ...prev]);

    addAuditLog({
      action: 'CREATE',
      module: 'Administração',
      entity: `Usuário ${createdUser.fullName}`,
      description: `Novo usuário cadastrado com perfil ${createdUser.roleLevel} e alçada de R$ ${createdUser.approvalLimitAmount}`
    });

    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
  };

  const filteredLogs = auditLogs.filter(
    l =>
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Administração */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Administração Mestre do SEEK</h1>
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
              SEEK Core Operacional
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão Multiempresa, cadastro de colaboradores/usuários, matriz dinâmica dos 13 perfis RBAC e regras de alçada.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Usuário / Acesso</span>
          </button>
        </div>
      </div>

      {/* KPIs da Administração */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Empresas & Holdings"
          value={companies.length}
          subtitle="4 Filiais ativas no Core"
          icon={Building}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Perfis Oficiais RBAC"
          value="13"
          subtitle="Segregação de funções estrita"
          icon={ShieldCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Usuários Ativos"
          value={userList.length}
          subtitle="Com credenciais no Core"
          icon={Users2}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Trilha de Auditoria (Logs)"
          value={auditLogs.length}
          subtitle="100% de rastreabilidade imutável"
          icon={History}
          iconColor="text-slate-700"
          iconBg="bg-slate-100"
        />
      </div>

      {/* Abas Administrativas */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'rbac'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Usuários & Os 13 Perfis RBAC ({userList.length})
        </button>

        <button
          onClick={() => setActiveTab('alcadas')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'alcadas'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Regras de Alçadas & Workflows
        </button>

        <button
          onClick={() => setActiveTab('empresas')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'empresas'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Estrutura Multiempresa & Filiais
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'auditoria'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Trilha Universal de Auditoria ({auditLogs.length})
        </button>
      </div>

      {/* ABA 1: RBAC & USUÁRIOS */}
      {activeTab === 'rbac' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Usuários & Matriz de Perfis (RBAC Dinâmico)</h3>
              <p className="text-xs text-slate-500">
                13 perfis oficiais com restrição automática de telas, alçadas financeiras e ações de auditoria.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Colaborador / Nome</th>
                  <th className="py-3 px-4">E-mail Corporativo</th>
                  <th className="py-3 px-4">Cargo / Função</th>
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-4 text-center">Perfil Oficial</th>
                  <th className="py-3 px-4 text-right">Alçada Direta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.fullName}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{p.email}</td>
                    <td className="py-3 px-4 text-slate-700">{p.roleTitle}</td>
                    <td className="py-3 px-4 text-slate-600">{p.department}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                        {p.roleLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      R$ {p.approvalLimitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: MOTOR DE ALÇADAS */}
      {activeTab === 'alcadas' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Parâmetros do Motor Central de Alçadas</h3>
            <p className="text-xs text-slate-500">
              Regras transversais que regem Compras, Despesas, Contratos, Férias e Descontos Comerciais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-xs text-slate-800">Alçada Nível 1 — Gestor Departamental</span>
              <p className="text-[11px] text-slate-600">
                Aprovações de até <strong>R$ 15.000,00</strong> para compras operacionais e rotinas do setor.
              </p>
              <div className="text-[10px] text-slate-500 font-semibold">Exige: GESTOR</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-xs text-slate-800">Alçada Nível 2 — Gerência Financeira</span>
              <p className="text-[11px] text-slate-600">
                Validações de <strong>R$ 15.000,01 a R$ 50.000,00</strong> e todas as antecipações orçamentárias.
              </p>
              <div className="text-[10px] text-slate-500 font-semibold">Exige: FINANCEIRO</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-xs text-slate-800">Alçada Nível 3 — Diretoria Executiva / CEO</span>
              <p className="text-[11px] text-slate-600">
                Valores acima de <strong>R$ 50.000,00</strong>, minutas contratuais e exceções de margem comercial.
              </p>
              <div className="text-[10px] text-slate-500 font-semibold">Exige: DIRETORIA / ADMIN_GERAL</div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: EMPRESAS & FILIAIS */}
      {activeTab === 'empresas' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Empresas Cadastradas no SEEK Core</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {companies.map(comp => (
                <div key={comp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700">{comp.code}</span>
                    {comp.isHolding && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        Holding Matriz
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{comp.tradeName}</h4>
                  <p className="text-[11px] text-slate-500">{comp.legalName}</p>
                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                    CNPJ: <strong>{comp.documentNumber}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Filiais & Unidades Operacionais</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Código Filial</th>
                    <th className="py-2.5 px-4">Nome da Unidade</th>
                    <th className="py-2.5 px-4">Cidade / UF</th>
                    <th className="py-2.5 px-4 text-center">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.map(br => (
                    <tr key={br.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{br.code}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{br.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{br.city} / {br.state}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            br.isHeadquarter ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {br.isHeadquarter ? 'Sede Matriz' : 'Filial Operacional'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: TRILHA UNIVERSAL DE AUDITORIA */}
      {activeTab === 'auditoria' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trilha Universal de Auditoria (Audit Trail)</h3>
              <p className="text-xs text-slate-500">
                Log imutável de todas as ações corporativas, aprovações de alçada, modificações e acessos.
              </p>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por usuário ou ação..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Data / Hora</th>
                  <th className="py-2.5 px-4">Usuário Responsável</th>
                  <th className="py-2.5 px-4 text-center">Operação</th>
                  <th className="py-2.5 px-4">Módulo / Entidade</th>
                  <th className="py-2.5 px-4">Descrição da Ação</th>
                  <th className="py-2.5 px-4 text-right">IP Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-500">{log.timestamp}</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                      {log.userName}
                      <span className="block text-[10px] text-slate-400 font-normal">{log.userRole}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      <StatusBadge status={log.action} />
                    </td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-700">
                      {log.module}
                      <span className="block text-[10px] text-slate-400 font-normal">{log.entity}</span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-600 max-w-xs truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{log.ipAddress || '189.44.120.10'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cadastro de Novo Usuário RBAC */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Cadastrar Novo Usuário no SEEK Core"
        subtitle="Vincule um novo colaborador ao sistema de permissões dinâmicas."
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              placeholder="Ex: Amanda Ferreira dos Santos"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">E-mail Corporativo</label>
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={e => setNewUserEmail(e.target.value)}
              placeholder="amanda.ferreira@seek.local"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Perfil Oficial RBAC</label>
              <select
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value as UserRoleLevel)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="ADMIN_GERAL">Administrador Geral</option>
                <option value="DIRETORIA">Diretoria</option>
                <option value="GESTOR">Gestor</option>
                <option value="FINANCEIRO">Financeiro</option>
                <option value="CONTABILIDADE">Contabilidade</option>
                <option value="FISCAL">Fiscal</option>
                <option value="COMERCIAL">Comercial</option>
                <option value="RH">RH</option>
                <option value="COMPRAS">Compras</option>
                <option value="JURIDICO">Jurídico</option>
                <option value="TI">TI</option>
                <option value="AUDITORIA">Auditoria</option>
                <option value="COLABORADOR">Colaborador</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Teto de Alçada Direta (R$)</label>
              <input
                type="number"
                step="100"
                value={newUserLimit}
                onChange={e => setNewUserLimit(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Departamento</label>
            <input
              type="text"
              required
              value={newUserDept}
              onChange={e => setNewUserDept(e.target.value)}
              placeholder="Ex: Operações & Logística"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800"
            >
              Salvar Usuário no Core
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
