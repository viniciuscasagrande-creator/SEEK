import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Bell,
  Sparkles,
  Plus,
  ShieldCheck,
  Search,
  LogOut,
  Check,
  ExternalLink,
  ChevronDown,
  Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';

interface HeaderProps {
  onOpenQuickAction: () => void;
  onToggleSeekAI: () => void;
  onNavigateToApprovals: () => void;
  onOpenCommandCenter: () => void;
  onNavigate: (route: any) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickAction,
  onToggleSeekAI,
  onNavigateToApprovals,
  onOpenCommandCenter,
  onNavigate,
  onToggleMobileMenu
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
    availableProfiles,
    login,
    logout,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useAuth();

  const { pendingApprovalsCount } = useWorkflow();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-5 shadow-xs">
      {/* Esquerda: Identidade SEEK, Botão Mobile & Busca Global (Ctrl+K) */}
      <div className="flex items-center space-x-3 sm:space-x-6">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

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

        {/* Global Search Bar (Ctrl+K trigger) */}
        <button
          onClick={onOpenCommandCenter}
          className="hidden lg:flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-400 hover:border-blue-400 hover:bg-white hover:text-slate-600 transition-all cursor-pointer w-80 text-left"
        >
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="flex-1 truncate">Buscar ou digitar comando...</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.2 text-[10px] font-bold text-slate-500 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
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
          className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nova Ação</span>
        </button>

        {/* Botão SEEK IA */}
        <button
          onClick={onToggleSeekAI}
          className="flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs hover:from-indigo-100 hover:to-blue-100 transition-all cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
          <span>SEEK IA</span>
        </button>

        {/* Notificações / Pendências */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title="Central de Notificações"
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-84 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-800">Central de Notificações</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800">
                      {unreadNotificationsCount} nova(s)
                    </span>
                  )}
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Ler todas
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationAsRead(n.id);
                      if (n.linkRoute) onNavigate(n.linkRoute);
                      setNotificationsOpen(false);
                    }}
                    className={`p-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                      n.read
                        ? 'bg-slate-50 text-slate-600 hover:bg-slate-100/80'
                        : 'bg-blue-50/80 border border-blue-200 text-slate-900 hover:bg-blue-100/60 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{n.title}</span>
                      <span className="text-[9px] text-slate-400">{n.createdAt}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{n.message}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          n.type === 'APPROVAL'
                            ? 'bg-amber-100 text-amber-800'
                            : n.type === 'SLA_ALERT'
                            ? 'bg-rose-100 text-rose-800'
                            : n.type === 'CONTRACT'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {n.type === 'APPROVAL'
                          ? 'Alçada / Aprovação'
                          : n.type === 'SLA_ALERT'
                          ? 'Alerta SLA'
                          : n.type === 'CONTRACT'
                          ? 'Contratos'
                          : 'Sistema'}
                      </span>
                      {n.linkRoute && (
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center space-x-0.5">
                          <span>Acessar</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Nenhuma notificação no momento.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Seletor dos 13 Perfis Oficiais (Demonstrar RBAC dinâmico) */}
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
              aria-label="Alternar entre os 13 Perfis Oficiais"
              className="block text-[11px] font-medium text-slate-700 bg-transparent focus:outline-hidden cursor-pointer border-0 p-0 max-w-[140px] truncate"
              value={currentUser.id}
              onChange={async e => {
                const profile = availableProfiles.find(p => p.id === e.target.value);
                if (profile) {
                  await login(profile.email, 'Seek@2026');
                }
              }}
            >
              {availableProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.roleTitle} ({p.roleLevel})
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Encerrar Sessão */}
          <button
            onClick={logout}
            title="Encerrar Sessão"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
