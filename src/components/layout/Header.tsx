import React, { useState, useRef, useEffect } from 'react';
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
  onNavigateToApprovals: _onNavigateToApprovals,
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

  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const companyRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (companyRef.current && !companyRef.current.contains(target)) {
        setCompanyMenuOpen(false);
      }
      if (branchRef.current && !branchRef.current.contains(target)) {
        setBranchMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extrai iniciais do usuário para o avatar circular
  const userInitials = currentUser?.fullName
    ? currentUser.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('')
    : 'AD';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-2xs">
      {/* Lado Esquerdo: Logo SEEK V1 CORE + Subtítulo + Busca Global (Ctrl+K) */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Marca Oficial SEEK */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#0B1528] text-white shadow-xs shrink-0">
            <span className="text-xl font-extrabold tracking-wider text-white">S</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider text-slate-900 leading-none">
                SEEK
              </span>
              <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                V1 CORE
              </span>
            </div>
            <p className="text-[11px] font-normal text-slate-500 mt-0.5 leading-none">
              Gestão Corporativa Integrada
            </p>
          </div>
        </div>

        {/* Barra de Busca Global (Command Palette Trigger) */}
        <button
          onClick={onOpenCommandCenter}
          className="hidden lg:flex items-center space-x-2.5 rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs text-slate-400 hover:border-slate-300 hover:bg-white transition-all cursor-pointer w-64 xl:w-76 text-left shadow-2xs ml-2"
        >
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="flex-1 truncate text-slate-400">Buscar ou digitar comando...</span>
          <kbd className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Lado Direito: Empresa + Filial + Nova Ação + SEEK IA + Notificações + Perfil */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Seletor de Empresa (Multiempresa / Matriz) */}
        <div className="relative hidden md:block" ref={companyRef}>
          <button
            onClick={() => {
              setCompanyMenuOpen(prev => !prev);
              setBranchMenuOpen(false);
            }}
            className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="truncate max-w-[150px]">{activeCompany.tradeName || 'SEEK Corporativo Matriz'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          </button>

          {companyMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in duration-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                Empresa Ativa
              </span>
              <div className="space-y-1 mt-1">
                {companies.map(c => {
                  const isSelected = c.id === activeCompany.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveCompany(c);
                        setCompanyMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-800 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{c.tradeName}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Seletor de Filial (Multifilial) */}
        <div className="relative hidden xl:block" ref={branchRef}>
          <button
            onClick={() => {
              setBranchMenuOpen(prev => !prev);
              setCompanyMenuOpen(false);
            }}
            className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[150px]">{activeBranch.name || 'Curitiba (Sede / Matriz)'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          </button>

          {branchMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in duration-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                Filial / Unidade
              </span>
              <div className="space-y-1 mt-1">
                {branches.map(b => {
                  const isSelected = b.id === activeBranch.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setActiveBranch(b);
                        setBranchMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{b.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botão "+ Nova Ação" */}
        <button
          onClick={onOpenQuickAction}
          className="flex items-center space-x-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Nova Ação</span>
        </button>

        {/* Botão "SEEK IA" */}
        <button
          onClick={onToggleSeekAI}
          className="flex items-center space-x-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/80 hover:bg-indigo-100/70 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-2xs transition-colors cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span>SEEK IA</span>
        </button>

        {/* Notificações / Pendências */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title="Central de Notificações"
            className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <Bell className="h-5 w-5 text-slate-600" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-xs">
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

        {/* Perfil do Usuário Oficial com Avatar "AD" e Dropdown */}
        <div className="relative pl-2.5 border-l border-slate-200" ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen(prev => !prev)}
            className="flex items-center space-x-2 text-left cursor-pointer group p-1 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B1528] text-white text-xs font-extrabold shadow-xs shrink-0">
              {userInitials}
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate max-w-[140px]">
                {currentUser?.fullName || 'Administrador Geral'}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                {currentUser?.roleTitle || 'Administrador Geral (Diretoria)'}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-800 transition-colors shrink-0 ml-0.5" />
          </button>

          {/* Dropdown de Perfis RBAC e Sessão */}
          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in duration-100">
              <div className="border-b border-slate-100 pb-2 mb-2">
                <div className="text-xs font-bold text-slate-900">{currentUser?.fullName}</div>
                <div className="text-[11px] text-slate-500">{currentUser?.email}</div>
                <div className="mt-1 flex items-center space-x-1 text-[10px] font-bold text-blue-700">
                  <ShieldCheck className="h-3 w-3" />
                  <span>{currentUser?.roleTitle} ({currentUser?.roleLevel})</span>
                </div>
              </div>

              <div className="mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Alternar Perfil RBAC Oficial:
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {availableProfiles.map(p => {
                    const isSelected = p.id === currentUser.id;
                    return (
                      <button
                        key={p.id}
                        onClick={async () => {
                          await login(p.email, 'Seek@2026');
                          setProfileMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-800 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{p.roleTitle} ({p.roleLevel})</span>
                        {isSelected && <Check className="h-3 w-3 text-blue-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <span>Encerrar Sessão</span>
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
