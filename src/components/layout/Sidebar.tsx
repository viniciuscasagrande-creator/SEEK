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
  ChevronLeft
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';

export type ActiveView =
  | 'my-workstation'
  | 'executive-dashboard'
  | 'approvals'
  | 'alerts'
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
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-50 hover:text-slate-800"
        title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Conteúdo com Scroll Suave */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* ================= INÍCIO ================= */}
        <div>
          {!collapsed && (
            <button
              onClick={() => toggleSection('inicio')}
              className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
            >
              <span>Início</span>
              {openSections.inicio ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          <div className="space-y-1">
            <button
              onClick={() => setActiveView('my-workstation')}
              className={navItemClass('my-workstation')}
              title="Meu Dashboard (Central de Trabalho)"
            >
              <Home className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Meu Dashboard</span>}
            </button>

            <button
              onClick={() => setActiveView('executive-dashboard')}
              className={navItemClass('executive-dashboard')}
              title="Dashboard Executivo"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Dashboard Executivo</span>}
            </button>

            <button
              onClick={() => setActiveView('approvals')}
              className={navItemClass('approvals')}
              title="Central de Aprovações"
            >
              <CheckSquare className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>Aprovações</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </div>
              )}
            </button>

            <button
              onClick={() => setActiveView('alerts')}
              className={navItemClass('alerts')}
              title="Central de Alertas"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Central de Alertas</span>}
            </button>
          </div>
        </div>

        {/* ================= SEEK RELACIONAMENTO ================= */}
        <div>
          {!collapsed && (
            <button
              onClick={() => toggleSection('relacionamento')}
              className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
            >
              <span>Relacionamento</span>
              {openSections.relacionamento ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
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

            <button
              onClick={() => setActiveView('service-desk')}
              className={navItemClass('service-desk')}
              title="Atendimento Interno / Service Desk"
            >
              <Headphones className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Atendimento Interno</span>}
            </button>
          </div>
        </div>

        {/* ================= SEEK GESTÃO ================= */}
        <div>
          {!collapsed && (
            <button
              onClick={() => toggleSection('gestao')}
              className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
            >
              <span>SEEK Gestão</span>
              {openSections.gestao ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          <div className="space-y-1">
            <button
              onClick={() => setActiveView('finance')}
              className={navItemClass('finance')}
              title="Financeiro"
            >
              <DollarSign className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Financeiro</span>}
            </button>

            <button
              onClick={() => setActiveView('accounting')}
              className={navItemClass('accounting')}
              title="Contabilidade"
            >
              <BookOpen className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Contabilidade</span>}
            </button>

            <button
              onClick={() => setActiveView('fiscal')}
              className={navItemClass('fiscal')}
              title="Fiscal & Impostos"
            >
              <Receipt className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Fiscal</span>}
            </button>

            <button
              onClick={() => setActiveView('purchasing')}
              className={navItemClass('purchasing')}
              title="Compras & Suprimentos"
            >
              <ShoppingCart className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Compras</span>}
            </button>

            <button
              onClick={() => setActiveView('suppliers')}
              className={navItemClass('suppliers')}
              title="Fornecedores Homologados"
            >
              <Truck className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Fornecedores</span>}
            </button>

            <button
              onClick={() => setActiveView('inventory')}
              className={navItemClass('inventory')}
              title="Estoque & Materiais"
            >
              <Boxes className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Estoque</span>}
            </button>

            <button
              onClick={() => setActiveView('assets')}
              className={navItemClass('assets')}
              title="Patrimônio & Ativos"
            >
              <Landmark className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Patrimônio</span>}
            </button>

            <button
              onClick={() => setActiveView('hr')}
              className={navItemClass('hr')}
              title="RH & Colaboradores"
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
              onClick={() => setActiveView('projects')}
              className={navItemClass('projects')}
              title="Projetos & Tarefas"
            >
              <KanbanSquare className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Projetos</span>}
            </button>

            <button
              onClick={() => setActiveView('operations')}
              className={navItemClass('operations')}
              title="Operações & Eventos"
            >
              <Activity className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Operações</span>}
            </button>

            <button
              onClick={() => setActiveView('contracts')}
              className={navItemClass('contracts')}
              title="Contratos Corporativos"
            >
              <FileText className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Contratos</span>}
            </button>

            <button
              onClick={() => setActiveView('legal')}
              className={navItemClass('legal')}
              title="Jurídico & Processos"
            >
              <Scale className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Jurídico</span>}
            </button>
          </div>
        </div>

        {/* ================= ESTRATÉGIA & CONTROLE ================= */}
        <div>
          {!collapsed && (
            <button
              onClick={() => toggleSection('estrategia')}
              className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
            >
              <span>Estratégia & Controle</span>
              {openSections.estrategia ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          <div className="space-y-1">
            <button
              onClick={() => setActiveView('documents')}
              className={navItemClass('documents')}
              title="Documentos Corporativos (GED)"
            >
              <FolderLock className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Documentos</span>}
            </button>

            <button
              onClick={() => setActiveView('governance')}
              className={navItemClass('governance')}
              title="Governança, Riscos & Compliance"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Governança & Riscos</span>}
            </button>

            <button
              onClick={() => setActiveView('reports')}
              className={navItemClass('reports')}
              title="BI & Relatórios Executivos"
            >
              <BarChart3 className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>BI & Relatórios</span>}
            </button>
          </div>
        </div>

        {/* ================= ADMINISTRAÇÃO DO SEEK ================= */}
        <div>
          {!collapsed && (
            <button
              onClick={() => toggleSection('admin')}
              className="flex w-full items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
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
              title="Departamentos & Centros de Custo"
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
              title="Motor de Alçadas & Aprovações"
            >
              <GitBranch className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Fluxos de Aprovação</span>}
            </button>

            <button
              onClick={() => setActiveView('admin-audit')}
              className={navItemClass('admin-audit')}
              title="Trilha Universal de Auditoria"
            >
              <History className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Trilha de Auditoria</span>}
            </button>

            <button
              onClick={() => setActiveView('admin-settings')}
              className={navItemClass('admin-settings')}
              title="Configurações Gerais & Parâmetros"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0 mr-2.5" />
              {!collapsed && <span>Configurações</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé da Sidebar: Indicador de Versão & Conexão */}
      {!collapsed ? (
        <div className="border-t border-slate-200 p-3 bg-slate-50">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>SEEK v1.0.0-PRO</span>
            <span className="flex items-center text-emerald-600 font-semibold">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 py-3 flex justify-center">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Sistema Online" />
        </div>
      )}
    </aside>
  );
};
