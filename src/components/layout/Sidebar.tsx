import React, { useState } from 'react';
import {
  LayoutDashboard,
  Home,
  CheckSquare,
  AlertTriangle,
  Users2,
  DollarSign,
  BookOpen,
  Receipt,
  ShoppingCart,
  Truck,
  Boxes,
  Landmark,
  UserCheck,
  Briefcase,
  KanbanSquare,
  Activity,
  FileText,
  Scale,
  Headphones,
  FolderLock,
  ShieldCheck,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronDown,
  Building,
  Layers,
  History,
  GitBranch,
  SlidersHorizontal,
  ChevronLeft,
  Calendar,
  Bell,
  Star,
  Zap
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAuth } from '../../context/AuthContext';

export type ActiveView =
  | 'my-workstation'
  | 'executive-dashboard'
  | 'approvals'
  | 'agenda'
  | 'notifications-view'
  | 'favorites-view'
  | 'crm'
  | 'finance'
  | 'accounting'
  | 'fiscal'
  | 'purchasing'
  | 'suppliers'
  | 'inventory'
  | 'assets'
  | 'hr'
  | 'payroll'
  | 'freelancers'
  | 'projects'
  | 'operations'
  | 'contracts'
  | 'legal'
  | 'service-desk'
  | 'documents'
  | 'governance'
  | 'reports'
  | 'admin-companies'
  | 'admin-departments'
  | 'admin-users'
  | 'admin-permissions'
  | 'admin-workflows'
  | 'admin-audit'
  | 'admin-settings';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  collapsed,
  setCollapsed
}) => {
  const { pendingApprovalsCount } = useWorkflow();
  const { hasPermission, currentUser, favorites, unreadNotificationsCount } = useAuth();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    inicio: true,
    relacionamento: true,
    gestao: true,
    estrategia: true,
    admin: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navItemClass = (viewId: ActiveView) =>
    `flex items-center w-full px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
      activeView === viewId
        ? 'bg-blue-700 text-white font-semibold shadow-xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Botão de Colapsar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
        title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Conteúdo com Scroll Suave */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* ================= 1. INÍCIO ================= */}
        <div>
          {!collapsed && (
            <button
              onClick={() => toggleSection('inicio')}
              className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 cursor-pointer"
            >
              <span>Início</span>
              {openSections.inicio ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          <div className="space-y-1">
            <button
              onClick={() => setActiveView('my-workstation')}
              className={navItemClass('my-workstation')}
              title="Meu Painel / Central de Trabalho"
            >
              <Home className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Meu Painel</span>}
            </button>

            {hasPermission('executive-dashboard') && (
              <button
                onClick={() => setActiveView('executive-dashboard')}
                className={navItemClass('executive-dashboard')}
                title="Painel Executivo C-Level"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Painel Executivo</span>}
              </button>
            )}

            <button
              onClick={() => setActiveView('approvals')}
              className={navItemClass('approvals')}
              title="Minhas Aprovações"
            >
              <CheckSquare className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>Minhas Aprovações</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </div>
              )}
            </button>

            <button
              onClick={() => setActiveView('agenda')}
              className={navItemClass('agenda')}
              title="Agenda Corporativa"
            >
              <Calendar className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Agenda</span>}
            </button>

            <button
              onClick={() => setActiveView('notifications-view')}
              className={navItemClass('notifications-view')}
              title="Notificações Corporativas"
            >
              <Bell className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>Notificações</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </div>
              )}
            </button>

            {favorites.length > 0 && (
              <button
                onClick={() => setActiveView('favorites-view')}
                className={navItemClass('favorites-view')}
                title="Favoritos"
              >
                <Star className="h-4 w-4 shrink-0 mr-2.5 text-amber-500" />
                {!collapsed && <span>Favoritos ({favorites.length})</span>}
              </button>
            )}
          </div>
        </div>

        {/* ================= 2. CRM & COMERCIAL ================= */}
        {hasPermission('crm') && (
          <div>
            {!collapsed && (
              <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Comercial
              </span>
            )}
            <div className="space-y-1">
              <button
                onClick={() => setActiveView('crm')}
                className={navItemClass('crm')}
                title="CRM & Comercial"
              >
                <Users2 className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>CRM & Comercial</span>}
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. SEEK GESTÃO (FINANÇAS, COMPRAS, RH, OPERAÇÕES) ================= */}
        <div>
          {!collapsed && (
            <button
              onClick={() => toggleSection('gestao')}
              className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 cursor-pointer"
            >
              <span>Gestão Operacional</span>
              {openSections.gestao ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          <div className="space-y-1">
            {hasPermission('finance') && (
              <button
                onClick={() => setActiveView('finance')}
                className={navItemClass('finance')}
                title="Financeiro"
              >
                <DollarSign className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Financeiro</span>}
              </button>
            )}

            {hasPermission('accounting') && (
              <button
                onClick={() => setActiveView('accounting')}
                className={navItemClass('accounting')}
                title="Contabilidade"
              >
                <BookOpen className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Contabilidade</span>}
              </button>
            )}

            {hasPermission('fiscal') && (
              <button
                onClick={() => setActiveView('fiscal')}
                className={navItemClass('fiscal')}
                title="Fiscal"
              >
                <Receipt className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Fiscal</span>}
              </button>
            )}

            {hasPermission('purchasing') && (
              <>
                <button
                  onClick={() => setActiveView('purchasing')}
                  className={navItemClass('purchasing')}
                  title="Compras"
                >
                  <ShoppingCart className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Compras</span>}
                </button>

                <button
                  onClick={() => setActiveView('suppliers')}
                  className={navItemClass('suppliers')}
                  title="Fornecedores"
                >
                  <Truck className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Fornecedores</span>}
                </button>
              </>
            )}

            {hasPermission('inventory') && (
              <>
                <button
                  onClick={() => setActiveView('inventory')}
                  className={navItemClass('inventory')}
                  title="Estoque"
                >
                  <Boxes className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Estoque</span>}
                </button>

                <button
                  onClick={() => setActiveView('assets')}
                  className={navItemClass('assets')}
                  title="Patrimônio"
                >
                  <Landmark className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Patrimônio</span>}
                </button>
              </>
            )}

            {hasPermission('hr') && (
              <>
                <button
                  onClick={() => setActiveView('hr')}
                  className={navItemClass('hr')}
                  title="RH"
                >
                  <UserCheck className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>RH</span>}
                </button>

                <button
                  onClick={() => setActiveView('payroll')}
                  className={navItemClass('payroll')}
                  title="Departamento Pessoal"
                >
                  <Briefcase className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Departamento Pessoal</span>}
                </button>

                <button
                  onClick={() => setActiveView('freelancers')}
                  className={navItemClass('freelancers')}
                  title="Central de Freelancers & Taxas"
                >
                  <Zap className="h-4 w-4 shrink-0 mr-2.5 text-amber-500" />
                  {!collapsed && (
                    <div className="flex flex-1 items-center justify-between">
                      <span>Freelance & Taxas</span>
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-800">
                        Central
                      </span>
                    </div>
                  )}
                </button>
              </>
            )}

            {hasPermission('projects') && (
              <>
                <button
                  onClick={() => setActiveView('projects')}
                  className={navItemClass('projects')}
                  title="Projetos"
                >
                  <KanbanSquare className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Projetos</span>}
                </button>

                <button
                  onClick={() => setActiveView('operations')}
                  className={navItemClass('operations')}
                  title="Operações"
                >
                  <Activity className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Operações</span>}
                </button>
              </>
            )}

            {hasPermission('contracts') && (
              <>
                <button
                  onClick={() => setActiveView('contracts')}
                  className={navItemClass('contracts')}
                  title="Contratos"
                >
                  <FileText className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Contratos</span>}
                </button>

                <button
                  onClick={() => setActiveView('legal')}
                  className={navItemClass('legal')}
                  title="Jurídico"
                >
                  <Scale className="h-4 w-4 shrink-0 mr-2.5" />
                  {!collapsed && <span>Jurídico</span>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ================= 4. RELACIONAMENTO & SERVIÇOS ================= */}
        <div>
          {!collapsed && (
            <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Atendimento
            </span>
          )}
          <div className="space-y-1">
            <button
              onClick={() => setActiveView('service-desk')}
              className={navItemClass('service-desk')}
              title="Atendimento / Service Desk"
            >
              <Headphones className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Atendimento</span>}
            </button>
          </div>
        </div>

        {/* ================= 5. ESTRATÉGIA, GOVERNANÇA & BI ================= */}
        <div>
          {!collapsed && (
            <button
              onClick={() => toggleSection('estrategia')}
              className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 cursor-pointer"
            >
              <span>Estratégia</span>
              {openSections.estrategia ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          <div className="space-y-1">
            <button
              onClick={() => setActiveView('documents')}
              className={navItemClass('documents')}
              title="Documentos Corporativos"
            >
              <FolderLock className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Documentos</span>}
            </button>

            {hasPermission('governance') && (
              <button
                onClick={() => setActiveView('governance')}
                className={navItemClass('governance')}
                title="Governança & Riscos"
              >
                <ShieldCheck className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Governança</span>}
              </button>
            )}

            {hasPermission('reports') && (
              <button
                onClick={() => setActiveView('reports')}
                className={navItemClass('reports')}
                title="BI & Relatórios"
              >
                <BarChart3 className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>BI & Relatórios</span>}
              </button>
            )}
          </div>
        </div>

        {/* ================= 6. ADMINISTRAÇÃO DO SEEK CORE ================= */}
        {hasPermission('admin') && (
          <div>
            {!collapsed && (
              <button
                onClick={() => toggleSection('admin')}
                className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 cursor-pointer"
              >
                <span>Administração</span>
                {openSections.admin ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}

            <div className="space-y-1">
              <button
                onClick={() => setActiveView('admin-companies')}
                className={navItemClass('admin-companies')}
                title="Empresas & Filiais"
              >
                <Building className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Empresas & Filiais</span>}
              </button>

              <button
                onClick={() => setActiveView('admin-departments')}
                className={navItemClass('admin-departments')}
                title="Departamentos & Custos"
              >
                <Layers className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Departamentos & Custos</span>}
              </button>

              <button
                onClick={() => setActiveView('admin-users')}
                className={navItemClass('admin-users')}
                title="Usuários & Perfis"
              >
                <Users2 className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Usuários & Perfis</span>}
              </button>

              <button
                onClick={() => setActiveView('admin-workflows')}
                className={navItemClass('admin-workflows')}
                title="Fluxos de Aprovação"
              >
                <GitBranch className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Fluxos de Aprovação</span>}
              </button>

              <button
                onClick={() => setActiveView('admin-audit')}
                className={navItemClass('admin-audit')}
                title="Trilha de Auditoria"
              >
                <History className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Trilha de Auditoria</span>}
              </button>

              <button
                onClick={() => setActiveView('admin-settings')}
                className={navItemClass('admin-settings')}
                title="Configurações Gerais"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Configurações</span>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé da Sidebar: Usuário Ativo e Perfil RBAC */}
      {!collapsed ? (
        <div className="border-t border-slate-200 p-3 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white shrink-0">
              {currentUser.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="block text-xs font-bold text-slate-800 truncate">
                {currentUser.fullName}
              </span>
              <span className="block text-[10px] font-semibold text-blue-700 truncate">
                {currentUser.roleTitle}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 py-3 flex justify-center">
          <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
            {currentUser.fullName.slice(0, 1)}
          </div>
        </div>
      )}
    </aside>
  );
};
