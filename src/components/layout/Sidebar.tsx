import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Home,
  CheckSquare,
  Users2,
  DollarSign,
  BookOpen,
  Receipt,
  ShoppingCart,
  Boxes,
  UserCheck,
  Briefcase,
  KanbanSquare,
  FileText,
  Headphones,
  ShieldCheck,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Calendar,
  Bell,
  Star,
  Zap,
  X,
  Building,
  Layers,
  History,
  GitBranch,
  SlidersHorizontal,
  Landmark,
  Scale,
  FolderLock
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
  | 'crm-pipeline'
  | 'crm-companies'
  | 'crm-proposals'
  | 'finance'
  | 'finance-payables'
  | 'finance-receivables'
  | 'finance-treasury'
  | 'finance-reconciliation'
  | 'finance-dre'
  | 'finance-closing'
  | 'finance-settings'
  | 'accounting'
  | 'accounting-journal'
  | 'accounting-trial'
  | 'accounting-statements'
  | 'accounting-closing'
  | 'fiscal'
  | 'fiscal-calc'
  | 'fiscal-calendar'
  | 'fiscal-invoices'
  | 'purchasing'
  | 'purchasing-comparison'
  | 'purchasing-orders'
  | 'suppliers'
  | 'inventory'
  | 'assets'
  | 'hr'
  | 'payroll'
  | 'benefits'
  | 'freelancers'
  | 'projects'
  | 'projects-timeline'
  | 'operations'
  | 'contracts'
  | 'legal'
  | 'service-desk'
  | 'service-desk-kb'
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
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

interface SubMenuItem {
  label: string;
  view: ActiveView;
  badge?: string | number;
  badgeColor?: string;
}

interface AccordionModuleDef {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey: string;
  defaultView: ActiveView;
  items: SubMenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  collapsed,
  setCollapsed,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const { pendingApprovalsCount } = useWorkflow();
  const { hasPermission, currentUser, favorites, unreadNotificationsCount } = useAuth();

  // Helper para determinar qual módulo é dono de cada view
  const getModuleForView = (view: ActiveView): string | null => {
    if (['finance', 'finance-payables', 'finance-receivables', 'finance-treasury', 'finance-reconciliation', 'finance-dre', 'finance-closing', 'finance-settings'].includes(view)) return 'finance';
    if (['accounting', 'accounting-journal', 'accounting-trial', 'accounting-statements', 'accounting-closing'].includes(view)) return 'accounting';
    if (['fiscal', 'fiscal-calc', 'fiscal-calendar', 'fiscal-invoices'].includes(view)) return 'fiscal';
    if (['purchasing', 'purchasing-comparison', 'purchasing-orders', 'suppliers'].includes(view)) return 'purchasing';
    if (['inventory', 'assets'].includes(view)) return 'inventory';
    if (['hr', 'payroll', 'benefits', 'freelancers'].includes(view)) return 'hr';
    if (['contracts', 'legal'].includes(view)) return 'contracts';
    if (['crm', 'crm-pipeline', 'crm-companies', 'crm-proposals'].includes(view)) return 'crm';
    if (['service-desk', 'service-desk-kb'].includes(view)) return 'service-desk';
    if (['projects', 'projects-timeline', 'operations'].includes(view)) return 'projects';
    if (['governance', 'documents'].includes(view)) return 'governance';
    if (['reports'].includes(view)) return 'reports';
    if (['admin-companies', 'admin-departments', 'admin-users', 'admin-permissions', 'admin-workflows', 'admin-audit', 'admin-settings'].includes(view)) return 'admin';
    return null;
  };

  // Estado do accordion: apenas UM módulo com submenu aberto por vez
  const [activeAccordion, setActiveAccordion] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('seek_accordion_module');
      if (saved) return saved;
    } catch (_) {}
    return getModuleForView(activeView) || 'finance';
  });

  // Hover temporário para modo colapsado
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  // Sincroniza o accordion quando a rota externa muda (busca Ctrl+K, favoritos, etc)
  useEffect(() => {
    const parentModule = getModuleForView(activeView);
    if (parentModule) {
      setActiveAccordion(parentModule);
      try {
        localStorage.setItem('seek_accordion_module', parentModule);
      } catch (_) {}
    }
  }, [activeView]);

  // Alternância accordion: abrir um fecha o anterior
  const handleToggleModule = (moduleKey: string, defaultView?: ActiveView) => {
    if (activeAccordion === moduleKey) {
      setActiveAccordion(null);
      try {
        localStorage.removeItem('seek_accordion_module');
      } catch (_) {}
    } else {
      setActiveAccordion(moduleKey);
      try {
        localStorage.setItem('seek_accordion_module', moduleKey);
      } catch (_) {}
      if (defaultView && activeView !== defaultView && getModuleForView(activeView) !== moduleKey) {
        setActiveView(defaultView);
      }
    }
  };

  const handleSubItemClick = (view: ActiveView) => {
    setActiveView(view);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  // ================= DEFINIÇÃO DOS MÓDULOS DE GESTÃO =================
  const gestaoModules: AccordionModuleDef[] = [
    {
      key: 'finance',
      title: 'Financeiro',
      icon: DollarSign,
      permissionKey: 'finance',
      defaultView: 'finance',
      items: [
        { label: 'Visão Geral & Dashboard', view: 'finance' },
        { label: 'Contas a Pagar', view: 'finance-payables' },
        { label: 'Contas a Receber', view: 'finance-receivables' },
        { label: 'Tesouraria & Bancos', view: 'finance-treasury' },
        { label: 'Conciliação OFX', view: 'finance-reconciliation' },
        { label: 'Fluxo de Caixa & DRE', view: 'finance-dre' },
        { label: 'Fechamento Mensal', view: 'finance-closing' },
        { label: 'Configurações Financeiras', view: 'finance-settings' }
      ]
    },
    {
      key: 'accounting',
      title: 'Contabilidade',
      icon: BookOpen,
      permissionKey: 'accounting',
      defaultView: 'accounting',
      items: [
        { label: 'Plano de Contas', view: 'accounting' },
        { label: 'Livro Diário', view: 'accounting-journal' },
        { label: 'Balancete de Verificação', view: 'accounting-trial' },
        { label: 'Demonstrações (DRE / BP)', view: 'accounting-statements' },
        { label: 'Encerramento de Exercício', view: 'accounting-closing' }
      ]
    },
    {
      key: 'fiscal',
      title: 'Fiscal',
      icon: Receipt,
      permissionKey: 'fiscal',
      defaultView: 'fiscal',
      items: [
        { label: 'Apuração de Tributos', view: 'fiscal' },
        { label: 'Simulador de Retenções', view: 'fiscal-calc' },
        { label: 'Calendário Fiscal', view: 'fiscal-calendar' },
        { label: 'Notas Fiscais (NFS-e)', view: 'fiscal-invoices' }
      ]
    },
    {
      key: 'purchasing',
      title: 'Compras',
      icon: ShoppingCart,
      permissionKey: 'purchasing',
      defaultView: 'purchasing',
      items: [
        { label: 'Requisições de Compra', view: 'purchasing' },
        { label: 'Mapa Comparativo', view: 'purchasing-comparison' },
        { label: 'Pedidos de Compra', view: 'purchasing-orders' },
        { label: 'Fornecedores Homologados', view: 'suppliers' }
      ]
    },
    {
      key: 'inventory',
      title: 'Estoque',
      icon: Boxes,
      permissionKey: 'inventory',
      defaultView: 'inventory',
      items: [
        { label: 'Almoxarifado & Estoque', view: 'inventory' },
        { label: 'Patrimônio & Ativos', view: 'assets' }
      ]
    },
    {
      key: 'hr',
      title: 'Recursos Humanos',
      icon: UserCheck,
      permissionKey: 'hr',
      defaultView: 'hr',
      items: [
        { label: 'Colaboradores CLT', view: 'hr' },
        { label: 'Folha & Ponto', view: 'payroll' },
        { label: 'Gestão de Benefícios', view: 'benefits' },
        {
          label: 'Freelance / Taxas',
          view: 'freelancers',
          badge: 'Central',
          badgeColor: 'bg-amber-100 text-amber-800'
        }
      ]
    },
    {
      key: 'contracts',
      title: 'Contratos',
      icon: FileText,
      permissionKey: 'contracts',
      defaultView: 'contracts',
      items: [
        { label: 'Gestão de Contratos', view: 'contracts' },
        { label: 'Jurídico & Societário', view: 'legal' }
      ]
    }
  ];

  // ================= DEFINIÇÃO DOS MÓDULOS DE RELACIONAMENTO =================
  const relacionamentoModules: AccordionModuleDef[] = [
    {
      key: 'crm',
      title: 'CRM & Comercial',
      icon: Users2,
      permissionKey: 'crm',
      defaultView: 'crm',
      items: [
        { label: 'Pipeline & Funil', view: 'crm' },
        { label: 'Empresas & Contatos', view: 'crm-companies' },
        { label: 'Propostas Comerciais', view: 'crm-proposals' }
      ]
    },
    {
      key: 'service-desk',
      title: 'Service Desk',
      icon: Headphones,
      permissionKey: 'service-desk',
      defaultView: 'service-desk',
      items: [
        { label: 'Chamados & SLA', view: 'service-desk' },
        { label: 'Base de Conhecimento (POPs)', view: 'service-desk-kb' }
      ]
    }
  ];

  // ================= DEFINIÇÃO DOS MÓDULOS DE ESTRATÉGIA =================
  const estrategiaModules: AccordionModuleDef[] = [
    {
      key: 'projects',
      title: 'Projetos',
      icon: KanbanSquare,
      permissionKey: 'projects',
      defaultView: 'projects',
      items: [
        { label: 'Portfólio & Projetos', view: 'projects' },
        { label: 'Cronograma & Kanban', view: 'projects-timeline' },
        { label: 'Operações Corporativas', view: 'operations' }
      ]
    },
    {
      key: 'governance',
      title: 'Governança & Riscos',
      icon: ShieldCheck,
      permissionKey: 'governance',
      defaultView: 'governance',
      items: [
        { label: 'Matriz de Riscos & GRC', view: 'governance' },
        { label: 'Documentos Corporativos (GED)', view: 'documents' }
      ]
    },
    {
      key: 'reports',
      title: 'BI & Relatórios',
      icon: BarChart3,
      permissionKey: 'reports',
      defaultView: 'reports',
      items: [
        { label: 'Cockpit Executivo & Relatórios', view: 'reports' }
      ]
    }
  ];

  // ================= DEFINIÇÃO DOS MÓDULOS DE ADMINISTRAÇÃO =================
  const adminModules: AccordionModuleDef[] = [
    {
      key: 'admin',
      title: 'Administração Core',
      icon: Settings,
      permissionKey: 'admin',
      defaultView: 'admin-companies',
      items: [
        { label: 'Multiempresa & Filiais', view: 'admin-companies' },
        { label: 'Departamentos & Custos', view: 'admin-departments' },
        { label: 'Usuários & Perfis (RBAC)', view: 'admin-users' },
        { label: 'Alçadas & Fluxos', view: 'admin-workflows' },
        { label: 'Trilha de Auditoria Imutável', view: 'admin-audit' },
        { label: 'Configurações Gerais', view: 'admin-settings' }
      ]
    }
  ];

  // Renderizador genérico de um módulo com submenu retrátil no modo accordion
  const renderAccordionModule = (moduleDef: AccordionModuleDef) => {
    if (!hasPermission(moduleDef.permissionKey)) return null;

    const isExpanded = activeAccordion === moduleDef.key;
    const isParentActive = getModuleForView(activeView) === moduleDef.key;
    const IconComponent = moduleDef.icon;

    return (
      <div key={moduleDef.key} className="mb-1">
        {/* Cabeçalho do Módulo / Botão de Accordion */}
        <button
          onClick={() => handleToggleModule(moduleDef.key, moduleDef.defaultView)}
          onMouseEnter={() => collapsed && setHoveredModule(moduleDef.key)}
          onMouseLeave={() => collapsed && setHoveredModule(null)}
          title={collapsed ? moduleDef.title : undefined}
          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
            isParentActive
              ? 'bg-blue-50/80 text-blue-900 border border-blue-200/80 shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <IconComponent
              className={`h-4 w-4 shrink-0 transition-colors ${
                isParentActive ? 'text-blue-700' : 'text-slate-500'
              }`}
            />
            {!collapsed && (
              <span className="truncate">{moduleDef.title}</span>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center ml-1">
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </div>
          )}
        </button>

        {/* Submenu Retrátil (Expansão no Accordion) */}
        {!collapsed && isExpanded && (
          <div className="ml-4 mt-1 border-l-2 border-slate-200 pl-2 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {moduleDef.items.map(subItem => {
              const isSubActive = activeView === subItem.view;
              return (
                <button
                  key={subItem.view}
                  onClick={() => handleSubItemClick(subItem.view)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] transition-colors cursor-pointer text-left ${
                    isSubActive
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                  }`}
                >
                  <span className="truncate">{subItem.label}</span>
                  {subItem.badge && (
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                        isSubActive ? 'bg-white/20 text-white' : subItem.badgeColor || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {subItem.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Flyout flutuante quando a sidebar está recolhida para ícones */}
        {collapsed && hoveredModule === moduleDef.key && (
          <div
            onMouseEnter={() => setHoveredModule(moduleDef.key)}
            onMouseLeave={() => setHoveredModule(null)}
            className="absolute left-18 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5"
          >
            <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
              <span className="text-xs font-bold text-slate-800">{moduleDef.title}</span>
            </div>
            <div className="space-y-0.5">
              {moduleDef.items.map(subItem => (
                <button
                  key={subItem.view}
                  onClick={() => {
                    handleSubItemClick(subItem.view);
                    setHoveredModule(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-left cursor-pointer ${
                    activeView === subItem.view
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{subItem.label}</span>
                  {subItem.badge && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                      {subItem.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const navItemClass = (viewId: ActiveView) =>
    `flex items-center w-full px-2.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
      activeView === viewId
        ? 'bg-blue-600 text-white font-bold shadow-xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      {/* Botão de Colapsar no Desktop */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex absolute -right-3 top-5 z-20 h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
        title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Conteúdo com Scroll Suave */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* ================= 1. INÍCIO (FIXO) ================= */}
        <div>
          {!collapsed ? (
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Início
            </div>
          ) : (
            <div className="h-2" />
          )}

          <div className="space-y-0.5">
            <button
              onClick={() => handleSubItemClick('my-workstation')}
              className={navItemClass('my-workstation')}
              title="Meu Painel / Central de Trabalho"
            >
              <Home className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Meu Painel</span>}
            </button>

            {hasPermission('executive-dashboard') && (
              <button
                onClick={() => handleSubItemClick('executive-dashboard')}
                className={navItemClass('executive-dashboard')}
                title="Painel Executivo C-Level"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 mr-2.5" />
                {!collapsed && <span>Painel Executivo</span>}
              </button>
            )}

            <button
              onClick={() => handleSubItemClick('approvals')}
              className={navItemClass('approvals')}
              title="Minhas Aprovações & Alçadas"
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
              onClick={() => handleSubItemClick('agenda')}
              className={navItemClass('agenda')}
              title="Agenda Corporativa"
            >
              <Calendar className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Agenda</span>}
            </button>

            <button
              onClick={() => handleSubItemClick('notifications-view')}
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
                onClick={() => handleSubItemClick('favorites-view')}
                className={navItemClass('favorites-view')}
                title="Módulos Favoritos"
              >
                <Star className="h-4 w-4 shrink-0 mr-2.5 text-amber-500 fill-amber-400" />
                {!collapsed && <span>Favoritos ({favorites.length})</span>}
              </button>
            )}
          </div>
        </div>

        {/* ================= 2. GESTÃO (FIXO COM ACCORDION) ================= */}
        <div>
          {!collapsed ? (
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Gestão
            </div>
          ) : (
            <div className="my-1 border-t border-slate-100" />
          )}
          <div className="space-y-0.5">
            {gestaoModules.map(renderAccordionModule)}
          </div>
        </div>

        {/* ================= 3. RELACIONAMENTO (FIXO COM ACCORDION) ================= */}
        <div>
          {!collapsed ? (
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Relacionamento
            </div>
          ) : (
            <div className="my-1 border-t border-slate-100" />
          )}
          <div className="space-y-0.5">
            {relacionamentoModules.map(renderAccordionModule)}
          </div>
        </div>

        {/* ================= 4. ESTRATÉGIA (FIXO COM ACCORDION) ================= */}
        <div>
          {!collapsed ? (
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Estratégia
            </div>
          ) : (
            <div className="my-1 border-t border-slate-100" />
          )}
          <div className="space-y-0.5">
            {estrategiaModules.map(renderAccordionModule)}
          </div>
        </div>

        {/* ================= 5. ADMINISTRAÇÃO (FIXO COM ACCORDION) ================= */}
        {hasPermission('admin') && (
          <div>
            {!collapsed ? (
              <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Administração
              </div>
            ) : (
              <div className="my-1 border-t border-slate-100" />
            )}
            <div className="space-y-0.5">
              {adminModules.map(renderAccordionModule)}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé da Sidebar: Usuário Ativo e Perfil RBAC */}
      {!collapsed ? (
        <div className="border-t border-slate-200 p-3 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 to-blue-950 text-[11px] font-extrabold text-white shadow-xs shrink-0">
              {currentUser.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="block text-xs font-bold text-slate-900 truncate">
                {currentUser.fullName}
              </span>
              <span className="block text-[10px] font-semibold text-blue-700 truncate">
                {currentUser.roleTitle}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 py-3 flex justify-center bg-slate-50/70">
          <div
            title={`${currentUser.fullName} - ${currentUser.roleTitle}`}
            className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center text-[11px] font-extrabold text-white shadow-xs cursor-pointer"
          >
            {currentUser.fullName.slice(0, 1)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={`relative hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          collapsed ? 'w-18' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Drawer Lateral Mobile com Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop semi-transparente */}
          <div
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Lateral */}
          <div className="relative flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Topo do Drawer com Identidade e Botão Fechar */}
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-900 to-slate-900 text-white font-black">
                  S
                </div>
                <div>
                  <span className="font-black text-slate-900 text-sm">SEEK Core</span>
                  <span className="block text-[10px] text-slate-500 font-medium">ERP Corporativo</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                title="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Menu */}
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
