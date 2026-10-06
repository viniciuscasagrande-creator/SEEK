import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { QuickActionModal } from './components/common/QuickActionModal';
import { CommandCenterModal } from './components/common/CommandCenterModal';
import { SeekAIAssistant } from './components/seek-ai/SeekAIAssistant';
import { LoginScreen } from './components/modules/LoginScreen';

// Modules
import { MyWorkstation } from './components/modules/MyWorkstation';
import { ExecutiveDashboard } from './components/modules/ExecutiveDashboard';
import { ApprovalsCenter } from './components/modules/ApprovalsCenter';
import { AgendaModule } from './components/modules/AgendaModule';
import { CRMModule } from './components/modules/CRMModule';
import { FinanceModule } from './components/modules/FinanceModule';
import { AccountingModule } from './components/modules/AccountingModule';
import { FiscalModule } from './components/modules/FiscalModule';
import { PurchasingModule } from './components/modules/PurchasingModule';
import { HRModule } from './components/modules/HRModule';
import { ContractsModule } from './components/modules/ContractsModule';
import { ServiceDeskModule } from './components/modules/ServiceDeskModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { ProjectsModule } from './components/modules/ProjectsModule';
import { DocumentsModule } from './components/modules/DocumentsModule';
import { GovernanceModule } from './components/modules/GovernanceModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { AdminModule } from './components/modules/AdminModule';

import { ChevronRight, Home, Star } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, favorites, toggleFavorite, isFavorite } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>('my-workstation');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState<boolean>(false);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState<boolean>(false);
  const [isSeekAIOpen, setIsSeekAIOpen] = useState<boolean>(false);

  // Global key listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandCenterOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const getViewBreadcrumb = (view: ActiveView): { group: string; label: string } => {
    switch (view) {
      case 'my-workstation':
        return { group: 'Início', label: 'Meu Painel' };
      case 'executive-dashboard':
        return { group: 'Início', label: 'Painel Executivo C-Level' };
      case 'approvals':
        return { group: 'Início', label: 'Minhas Aprovações & Alçadas' };
      case 'agenda':
        return { group: 'Início', label: 'Agenda Corporativa' };
      case 'notifications-view':
        return { group: 'Início', label: 'Notificações Corporativas' };
      case 'favorites-view':
        return { group: 'Início', label: 'Módulos Favoritos' };

      // GESTÃO - Financeiro
      case 'finance':
        return { group: 'Gestão > Financeiro', label: 'Visão Geral & Dashboard' };
      case 'finance-payables':
        return { group: 'Gestão > Financeiro', label: 'Contas a Pagar' };
      case 'finance-receivables':
        return { group: 'Gestão > Financeiro', label: 'Contas a Receber' };
      case 'finance-treasury':
        return { group: 'Gestão > Financeiro', label: 'Tesouraria & Bancos' };
      case 'finance-reconciliation':
        return { group: 'Gestão > Financeiro', label: 'Conciliação Bancária OFX' };
      case 'finance-dre':
        return { group: 'Gestão > Financeiro', label: 'Fluxo de Caixa & DRE Gerencial' };
      case 'finance-closing':
        return { group: 'Gestão > Financeiro', label: 'Fechamento & Trava Contábil' };

      // GESTÃO - Contabilidade
      case 'accounting':
        return { group: 'Gestão > Contabilidade', label: 'Plano de Contas' };
      case 'accounting-journal':
        return { group: 'Gestão > Contabilidade', label: 'Livro Diário' };
      case 'accounting-trial':
        return { group: 'Gestão > Contabilidade', label: 'Balancete de Verificação' };
      case 'accounting-statements':
        return { group: 'Gestão > Contabilidade', label: 'Demonstrações (DRE / BP)' };
      case 'accounting-closing':
        return { group: 'Gestão > Contabilidade', label: 'Encerramento de Exercício' };

      // GESTÃO - Fiscal
      case 'fiscal':
        return { group: 'Gestão > Fiscal', label: 'Apuração de Tributos' };
      case 'fiscal-calc':
        return { group: 'Gestão > Fiscal', label: 'Simulador de Retenções' };
      case 'fiscal-calendar':
        return { group: 'Gestão > Fiscal', label: 'Calendário Fiscal' };
      case 'fiscal-invoices':
        return { group: 'Gestão > Fiscal', label: 'Notas Fiscais (NFS-e)' };

      // GESTÃO - Compras
      case 'purchasing':
        return { group: 'Gestão > Compras', label: 'Requisições de Compra' };
      case 'purchasing-comparison':
        return { group: 'Gestão > Compras', label: 'Mapa Comparativo' };
      case 'purchasing-orders':
        return { group: 'Gestão > Compras', label: 'Pedidos de Compra' };
      case 'suppliers':
        return { group: 'Gestão > Compras', label: 'Fornecedores Homologados' };

      // GESTÃO - Estoque
      case 'inventory':
        return { group: 'Gestão > Estoque', label: 'Almoxarifado & Estoque' };
      case 'assets':
        return { group: 'Gestão > Estoque', label: 'Patrimônio & Ativos' };

      // GESTÃO - RH
      case 'hr':
        return { group: 'Gestão > Recursos Humanos', label: 'Colaboradores CLT' };
      case 'payroll':
        return { group: 'Gestão > Recursos Humanos', label: 'Folha & Ponto' };
      case 'freelancers':
        return { group: 'Gestão > Recursos Humanos', label: 'Freelancers & Central de Taxas' };

      // GESTÃO - Contratos
      case 'contracts':
        return { group: 'Gestão > Contratos', label: 'Gestão de Contratos' };
      case 'legal':
        return { group: 'Gestão > Contratos', label: 'Jurídico & Societário' };

      // RELACIONAMENTO
      case 'crm':
      case 'crm-pipeline':
        return { group: 'Relacionamento > CRM', label: 'Pipeline & Funil Comercial' };
      case 'crm-companies':
        return { group: 'Relacionamento > CRM', label: 'Empresas & Contatos' };
      case 'crm-proposals':
        return { group: 'Relacionamento > CRM', label: 'Propostas Comerciais' };
      case 'service-desk':
        return { group: 'Relacionamento > Service Desk', label: 'Chamados & SLA' };
      case 'service-desk-kb':
        return { group: 'Relacionamento > Service Desk', label: 'Base de Conhecimento (POPs)' };

      // ESTRATÉGIA
      case 'projects':
        return { group: 'Estratégia > Projetos', label: 'Portfólio & Projetos' };
      case 'projects-timeline':
        return { group: 'Estratégia > Projetos', label: 'Cronograma & Kanban' };
      case 'operations':
        return { group: 'Estratégia > Projetos', label: 'Operações Corporativas' };
      case 'governance':
        return { group: 'Estratégia > Governança', label: 'Matriz de Riscos & GRC' };
      case 'documents':
        return { group: 'Estratégia > Governança', label: 'Documentos Corporativos (GED)' };
      case 'reports':
        return { group: 'Estratégia > BI', label: 'BI & Relatórios Executivos' };

      // ADMINISTRAÇÃO
      case 'admin-companies':
        return { group: 'Administração', label: 'Multiempresa & Filiais' };
      case 'admin-departments':
        return { group: 'Administração', label: 'Departamentos & Custos' };
      case 'admin-users':
      case 'admin-permissions':
        return { group: 'Administração', label: 'Usuários & Perfis (RBAC)' };
      case 'admin-workflows':
        return { group: 'Administração', label: 'Alçadas & Fluxos de Aprovação' };
      case 'admin-audit':
        return { group: 'Administração', label: 'Trilha de Auditoria Imutável' };
      case 'admin-settings':
        return { group: 'Administração', label: 'Configurações Gerais' };
      default:
        return { group: 'SEEK Core', label: 'Central de Trabalho' };
    }
  };

  const currentBreadcrumb = getViewBreadcrumb(activeView);

  const renderActiveModule = () => {
    switch (activeView) {
      case 'my-workstation':
        return <MyWorkstation />;
      case 'executive-dashboard':
        return <ExecutiveDashboard />;
      case 'approvals':
        return <ApprovalsCenter />;
      case 'agenda':
        return <AgendaModule />;
      case 'notifications-view':
      case 'favorites-view':
        return <MyWorkstation />;

      // CRM
      case 'crm':
      case 'crm-pipeline':
      case 'crm-companies':
      case 'crm-proposals':
        return <CRMModule />;

      // Financeiro com sub-abas sincronizadas
      case 'finance':
        return <FinanceModule initialTab="lancamentos" initialType="ALL" />;
      case 'finance-payables':
        return <FinanceModule initialTab="lancamentos" initialType="PAGAR" />;
      case 'finance-receivables':
        return <FinanceModule initialTab="lancamentos" initialType="RECEBER" />;
      case 'finance-treasury':
      case 'finance-reconciliation':
        return <FinanceModule initialTab="bancos" />;
      case 'finance-dre':
        return <FinanceModule initialTab="dre" />;
      case 'finance-closing':
        return <FinanceModule initialTab="fechamento" />;

      // Contabilidade com sub-abas sincronizadas
      case 'accounting':
        return <AccountingModule initialTab="coa" />;
      case 'accounting-journal':
        return <AccountingModule initialTab="journal" />;
      case 'accounting-trial':
        return <AccountingModule initialTab="trial-balance" />;
      case 'accounting-statements':
        return <AccountingModule initialTab="statements" />;
      case 'accounting-closing':
        return <AccountingModule initialTab="closing" />;

      // Fiscal com sub-abas sincronizadas
      case 'fiscal':
        return <FiscalModule initialTab="taxes" />;
      case 'fiscal-calc':
        return <FiscalModule initialTab="calculator" />;
      case 'fiscal-calendar':
        return <FiscalModule initialTab="calendar" />;
      case 'fiscal-invoices':
        return <FiscalModule initialTab="invoices" />;

      // Compras com sub-abas sincronizadas
      case 'purchasing':
        return <PurchasingModule initialTab="requisitions" />;
      case 'purchasing-comparison':
        return <PurchasingModule initialTab="comparison" />;
      case 'purchasing-orders':
        return <PurchasingModule initialTab="orders" />;
      case 'suppliers':
        return <PurchasingModule initialTab="suppliers" />;

      // Estoque & Ativos
      case 'inventory':
        return <InventoryModule initialTab="stock" />;
      case 'assets':
        return <InventoryModule initialTab="assets" />;

      // RH & Freelance / Taxas
      case 'hr':
        return <HRModule initialTab="employees" />;
      case 'payroll':
        return <HRModule initialTab="ponto" />;
      case 'freelancers':
        return <HRModule initialTab="freelancers" />;

      // Projetos
      case 'projects':
        return <ProjectsModule initialTab="projects" />;
      case 'projects-timeline':
        return <ProjectsModule initialTab="kanban" />;
      case 'operations':
        return <ProjectsModule initialTab="projects" />;

      // Contratos & Jurídico
      case 'contracts':
      case 'legal':
        return <ContractsModule />;

      // Atendimento
      case 'service-desk':
      case 'service-desk-kb':
        return <ServiceDeskModule />;

      // Estratégia
      case 'documents':
        return <DocumentsModule />;
      case 'governance':
        return <GovernanceModule />;
      case 'reports':
        return <ReportsModule />;

      // Administração
      case 'admin-companies':
      case 'admin-departments':
        return <AdminModule initialTab="empresas" />;
      case 'admin-users':
      case 'admin-permissions':
        return <AdminModule initialTab="rbac" />;
      case 'admin-workflows':
        return <AdminModule initialTab="alcadas" />;
      case 'admin-audit':
      case 'admin-settings':
        return <AdminModule initialTab="auditoria" />;

      default:
        return <MyWorkstation />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Header Corporativo */}
      <Header
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
        onToggleSeekAI={() => setIsSeekAIOpen(!isSeekAIOpen)}
        onNavigateToApprovals={() => setActiveView('approvals')}
        onOpenCommandCenter={() => setIsCommandCenterOpen(true)}
        onNavigate={(route: ActiveView) => setActiveView(route)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Hierárquica em Accordion com Gaveta Mobile */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />

        {/* Área Principal de Trabalho */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70">
          <div className="mx-auto max-w-7xl space-y-4">
            {/* Breadcrumb Navegável com botão de Favorito */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setActiveView('my-workstation')}
                  className="flex items-center hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5 mr-1" />
                  <span>SEEK</span>
                </button>
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <span className="font-medium text-slate-500">{currentBreadcrumb.group}</span>
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <span className="font-bold text-slate-900">{currentBreadcrumb.label}</span>
              </div>

              {/* Botão de Favoritar Tela */}
              <button
                onClick={() =>
                  toggleFavorite(activeView, currentBreadcrumb.label, activeView)
                }
                title={isFavorite(activeView) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className="flex items-center space-x-1 rounded-md px-2 py-1 hover:bg-slate-200 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    isFavorite(activeView) ? 'fill-amber-400 text-amber-500' : ''
                  }`}
                />
                <span className="text-[11px] font-medium hidden sm:inline">
                  {isFavorite(activeView) ? 'Favorito' : 'Favoritar'}
                </span>
              </button>
            </div>

            {/* Módulo Ativo */}
            {renderActiveModule()}
          </div>
        </main>
      </div>

      {/* Modal de Ação Rápida */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
      />

      {/* Command Center (Ctrl+K) */}
      <CommandCenterModal
        isOpen={isCommandCenterOpen}
        onClose={() => setIsCommandCenterOpen(false)}
        onNavigate={(view: ActiveView) => setActiveView(view)}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
        onOpenSeekAI={() => setIsSeekAIOpen(true)}
      />

      {/* Assistente Integrado SEEK IA */}
      <SeekAIAssistant
        isOpen={isSeekAIOpen}
        onClose={() => setIsSeekAIOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WorkflowProvider>
        <MainLayout />
      </WorkflowProvider>
    </AuthProvider>
  );
}
