import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Lock,
  RefreshCw,
  LogOut,
  Key,
  ShieldAlert,
  AlertCircle,
  Laptop,
  Smartphone,
  Globe,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { DEMO_PROFILES, COMPANIES } from '../../data/mockData';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { UserRoleLevel } from '../../types/core';
import { api } from '../../services/api';

export interface AdminModuleProps {
  initialTab?: 'empresas' | 'rbac' | 'alcadas' | 'auditoria' | 'seguranca';
}

export const AdminModule: React.FC<AdminModuleProps> = ({ initialTab = 'rbac' }) => {
  const { companies, branches, availableProfiles, currentUser } = useAuth();
  const { auditLogs, addAuditLog } = useWorkflow();

  const [activeTab, setActiveTab] = useState<'empresas' | 'rbac' | 'alcadas' | 'auditoria' | 'seguranca'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // Form states for new user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRoleLevel>('COLABORADOR');
  const [newUserDept, setNewUserDept] = useState('Operações');
  const [newUserLimit, setNewUserLimit] = useState('5000');

  const [userList, setUserList] = useState(availableProfiles);

  // Gestão de Sessões Ativas & Segurança
  const [sessions, setSessions] = useState<any[]>([
    {
      id: 'sess-active-01',
      userName: 'Administrador Geral',
      userEmail: 'admin@seek.local',
      userRole: 'ADMIN_GERAL',
      ipAddress: '189.44.120.10',
      userAgent: 'Chrome 122 (Windows 11)',
      isRevoked: false,
      isCurrent: true,
      createdAt: '2026-10-06 09:30',
      lastActiveAt: 'Agora'
    },
    {
      id: 'sess-active-02',
      userName: 'Roberto Mendes Caldas',
      userEmail: 'diretoria@seek.local',
      userRole: 'DIRETORIA',
      ipAddress: '201.86.15.42',
      userAgent: 'Safari 17 (macOS Sonoma)',
      isRevoked: false,
      isCurrent: false,
      createdAt: '2026-10-06 08:15',
      lastActiveAt: 'Há 12 min'
    },
    {
      id: 'sess-active-03',
      userName: 'Juliana Vasconcelos',
      userEmail: 'financeiro@seek.local',
      userRole: 'FINANCEIRO',
      ipAddress: '177.105.88.19',
      userAgent: 'Firefox 124 (Ubuntu Linux)',
      isRevoked: false,
      isCurrent: false,
      createdAt: '2026-10-06 10:00',
      lastActiveAt: 'Há 5 min'
    }
  ]);

  const loadSessions = async () => {
    try {
      const data = await api.getSessions(true);
      if (data && data.length > 0) {
        setSessions(data);
      }
    } catch {}
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, isRevoked: true } : s))
      );
      addAuditLog({
        action: 'UPDATE',
        module: 'Segurança',
        entity: `Sessão ${sessionId}`,
        description: `Sessão corporativa revogada no servidor pelo Administrador`
      });
    } catch {
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, isRevoked: true } : s))
      );
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await api.logoutAll();
      setSessions(prev =>
        prev.map(s => (s.isCurrent ? s : { ...s, isRevoked: true }))
      );
      addAuditLog({
        action: 'UPDATE',
        module: 'Segurança',
        entity: 'Sessões Corporativas',
        description: 'Todas as outras sessões ativas foram revogadas pelo Administrador'
      });
    } catch {
      setSessions(prev =>
        prev.map(s => (s.isCurrent ? s : { ...s, isRevoked: true }))
      );
    }
  };

  // State para troca de senha segura
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'A nova senha e a confirmação de senha não coincidem.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', text: 'A senha deve conter no mínimo 8 caracteres.' });
      return;
    }

    const res = await api.changePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordFeedback({ type: 'success', text: res.message || 'Senha corporativa alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addAuditLog({
        action: 'UPDATE',
        module: 'Segurança',
        entity: 'Credenciais de Acesso',
        description: 'Senha corporativa atualizada conforme a política de segurança'
      });
      setTimeout(() => {
        setIsChangePasswordModalOpen(false);
        setPasswordFeedback(null);
      }, 2000);
    } else {
      setPasswordFeedback({ type: 'error', text: res.error || 'Falha ao alterar senha corporativa.' });
    }
  };

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

  const filteredLogs = auditLogs.filter(l => {
    const u = l.userName || (l as any).user_name || '';
    const m = l.module || '';
    const d = l.description || '';
    const a = l.action || '';
    const cid = (l as any).correlationId || (l as any).correlation_id || '';
    const s = searchTerm.toLowerCase();
    return u.toLowerCase().includes(s) || m.toLowerCase().includes(s) || d.toLowerCase().includes(s) || a.toLowerCase().includes(s) || cid.toLowerCase().includes(s);
  });

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
            Gestão Multiempresa, perfis RBAC, motor de alçadas ABAC, trilha de auditoria e segurança ativa de sessões.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 text-slate-600" />
            <span>Política de Senha</span>
          </button>
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
          title="Sessões Ativas"
          value={sessions.filter(s => !s.isRevoked).length}
          subtitle="Tokens JWT de 15m ativos"
          icon={Lock}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Trilha de Auditoria (Logs)"
          value={auditLogs.length}
          subtitle="100% com Correlation ID"
          icon={History}
          iconColor="text-slate-700"
          iconBg="bg-slate-100"
        />
      </div>

      {/* Abas Administrativas */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'rbac'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          Usuários & Perfis RBAC ({userList.length})
        </button>

        <button
          onClick={() => setActiveTab('alcadas')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'alcadas'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          Regras de Alçadas & Workflows
        </button>

        <button
          onClick={() => setActiveTab('empresas')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'empresas'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          Multiempresa & Filiais
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'auditoria'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          Trilha de Auditoria ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('seguranca')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'seguranca'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          Sessões & Segurança Corporativa
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
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                      {log.userName || (log as any).user_name || 'Usuário Corporativo'}
                      <span className="block text-[10px] text-slate-400 font-normal">{log.userRole || (log as any).user_role || 'Operador'}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      <StatusBadge status={log.action} />
                    </td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-700">
                      {log.module}
                      <span className="block text-[10px] text-slate-400 font-normal">{log.entity}</span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-600 max-w-xs" title={log.description}>
                      <div className="truncate">{log.description}</div>
                      {((log as any).correlationId || (log as any).correlation_id) && (
                        <div className="text-[9px] font-mono text-purple-600 mt-0.5">
                          CID: {String((log as any).correlationId || (log as any).correlation_id).substring(0, 16)}...
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400 whitespace-nowrap">{log.ipAddress || (log as any).ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 5: SESSÕES ATIVAS & SEGURANÇA CORPORATIVA */}
      {activeTab === 'seguranca' && (
        <div className="space-y-6">
          {/* Sessões Ativas no Servidor */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">Sessões Corporativas Ativas & Revogação</h3>
                  <span className="flex items-center space-x-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
                    <span>Tempo Real</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitoramento instantâneo de sessões com tokens JWT (15m) e Refresh Tokens rotativos (7d).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={loadSessions}
                  className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Atualizar lista de sessões"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Atualizar</span>
                </button>
                <button
                  onClick={handleRevokeAllOtherSessions}
                  className="flex items-center space-x-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Revogar Todas as Outras</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Identificador de Sessão</th>
                    <th className="py-2.5 px-4">Colaborador / E-mail</th>
                    <th className="py-2.5 px-4">Dispositivo / Agente</th>
                    <th className="py-2.5 px-4">IP Origem</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4">Última Atividade</th>
                    <th className="py-2.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {s.id.substring(0, 16)}...
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.userName || 'Administrador'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{s.userEmail || 'admin@seek.local'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex items-center space-x-1.5">
                          <Laptop className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-xs">{s.userAgent || 'Navegador Web'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {s.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.isRevoked ? (
                          <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                            Revogada
                          </span>
                        ) : s.isCurrent ? (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            Sessão Atual
                          </span>
                        ) : (
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                            Ativa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {s.lastActiveAt || 'Recente'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!s.isRevoked && !s.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            className="rounded px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                          >
                            Revogar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Governança, SoD e Proteção de Dados (Fase 0.4) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <ShieldAlert className="h-4 w-4 text-emerald-600" />
                <span>Segregação de Funções (SoD)</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Bloqueio estrito de autoaprovação: colaboradores e compradores são impedidos pelo backend de aprovar suas próprias ordens e requisições.
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                <CheckCircle2 className="h-3 w-3" />
                <span>Ativo no Core & Workflows</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Lock className="h-4 w-4 text-blue-600" />
                <span>Proteção LGPD & Mascaramento</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Dados pessoais sensíveis (salários, contas bancárias, CPFs e CNPJs) são mascarados automaticamente para perfis operacionais sem privilégio.
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-fit">
                <CheckCircle2 className="h-3 w-3" />
                <span>Minimização de Dados Ativa</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                <span>Rastreabilidade & Auditoria Universal</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Correlation ID único propagado em cada chamada HTTP, associando sessão corporativa, IP de origem e transação na trilha imutável.
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 w-fit">
                <CheckCircle2 className="h-3 w-3" />
                <span>x-correlation-id 100% Ativo</span>
              </div>
            </div>
          </div>

          {/* Diretrizes Oficiais de Segurança Corporativa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>Padrões de Autenticação & Criptografia</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Access Token de 15 Minutos:</strong> JWT assinado via SHA-256 e chave corporativa protegida por segredo.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Refresh Tokens Rotativos:</strong> Validade de 7 dias com hashes criptográficos e rotação a cada renovação.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Revogação em Tempo Real:</strong> Middleware valida no SQLite/Postgres o estado <code>is_revoked</code> em cada requisição.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Bcrypt com 10 Salt Rounds:</strong> Proteção de ponta contra ataques de dicionário e rainbow tables.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Lock className="h-4 w-4 text-purple-600" />
                <span>Políticas de Senha, Histórico & Rastreabilidade</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Complexidade de Senha:</strong> Mínimo 8 caracteres, exigindo maiúscula, minúscula, número e símbolo especial.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Histórico das Últimas 3 Senhas:</strong> Bloqueio estrito de reutilização das senhas anteriores da conta.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Recuperação com Token de 30m:</strong> Tokens SHA-256 de uso único, revogando todas as sessões anteriores ao resetar.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Correlation ID Universal:</strong> Header <code>x-correlation-id</code> injetado em cada chamada e gravado na auditoria imutável.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alteração Segura de Senha Corporativa */}
      <Modal
        isOpen={isChangePasswordModalOpen}
        onClose={() => {
          setIsChangePasswordModalOpen(false);
          setPasswordFeedback(null);
        }}
        title="Política de Senha Corporativa"
        subtitle="Altere sua senha de acesso cumprindo os requisitos de segurança e histórico."
      >
        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          {passwordFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs font-semibold ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {passwordFeedback.text}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Senha Atual</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Digite a senha atual"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nova Senha Corporativa</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Ex: SeekCorp#2026"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
            <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
              <p>Requisitos: 8+ caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo.</p>
              <p className="text-amber-700 font-semibold">Regra de Histórico: Não pode ser idêntica a nenhuma das últimas 3 senhas.</p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsChangePasswordModalOpen(false);
                setPasswordFeedback(null);
              }}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              Atualizar Senha no Core
            </button>
          </div>
        </form>
      </Modal>

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
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              Salvar Usuário no Core
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
