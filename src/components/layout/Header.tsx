import React from 'react';
import {
  Building2,
  MapPin,
  UserCheck,
  Bell,
  Sparkles,
  Plus,
  ShieldCheck,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';

interface HeaderProps {
  onOpenQuickAction: () => void;
  onToggleSeekAI: () => void;
  onNavigateToApprovals: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickAction,
  onToggleSeekAI,
  onNavigateToApprovals
}) => {
  const {
    activeCompany,
    setActiveCompany,
    activeBranch,
    setActiveBranch,
    currentUser,
    setCurrentUser,
    companies,
    branches,
    availableProfiles
  } = useAuth();

  const { pendingApprovalsCount } = useWorkflow();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-5 shadow-xs">
      {/* Esquerda: Identidade SEEK & Busca Global */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 via-slate-900 to-blue-950 text-white shadow-md shadow-blue-950/20">
            <span className="text-xl font-black tracking-widest text-blue-400">S</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider text-slate-900">SEEK</span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                V1 Core
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-700">
              Gestão Corporativa Integrada
            </p>
          </div>
        </div>

        {/* Global Search Bar (Ctrl+K) */}
        <div className="hidden lg:flex items-center relative">
          <Search className="absolute left-3 h-4 w-4 text-slate-600" />
          <input
            type="text"
            placeholder="Buscar colaboradores, contratos, ordens, contas... (Ctrl+K)"
            className="w-80 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-600 focus:border-blue-600 focus:bg-white focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Centro / Direita: Multiempresa, Multifilial, Seletor de Perfil, Ações Rápidas & SEEK IA */}
      <div className="flex items-center space-x-3">
        {/* Seletor de Empresa */}
        <div className="hidden md:flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
          <Building2 className="h-4 w-4 text-blue-700" />
          <select
            aria-label="Selecionar Empresa"
            className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            value={activeCompany.id}
            onChange={e => {
              const comp = companies.find(c => c.id === e.target.value);
              if (comp) setActiveCompany(comp);
            }}
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.tradeName}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Filial */}
        <div className="hidden xl:flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <select
            aria-label="Selecionar Filial"
            className="bg-transparent font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            value={activeBranch.id}
            onChange={e => {
              const br = branches.find(b => b.id === e.target.value);
              if (br) setActiveBranch(br);
            }}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Ação Rápida */}
        <button
          onClick={onOpenQuickAction}
          className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nova Ação</span>
        </button>

        {/* Botão SEEK IA */}
        <button
          onClick={onToggleSeekAI}
          className="flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-linear-to-r from-indigo-50 to-blue-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs hover:from-indigo-100 hover:to-blue-100 transition-all cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
          <span>SEEK IA</span>
        </button>

        {/* Notificações / Pendências */}
        <button
          onClick={onNavigateToApprovals}
          title="Central de Aprovações Pendentes"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {pendingApprovalsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        {/* Seletor de Perfil Simulado (Demonstrar RBAC dinâmico) */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white shadow-xs">
            {currentUser.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <div className="flex items-center space-x-1">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser.fullName.split(' ')[0]} {currentUser.fullName.split(' ')[1]}
              </span>
              <ShieldCheck className="h-3 w-3 text-blue-600" />
            </div>
            <select
              aria-label="Alternar Perfil RBAC"
              className="block text-[11px] font-medium text-slate-700 bg-transparent focus:outline-hidden cursor-pointer border-0 p-0"
              value={currentUser.id}
              onChange={e => {
                const profile = availableProfiles.find(p => p.id === e.target.value);
                if (profile) setCurrentUser(profile);
              }}
            >
              {availableProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.roleTitle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
