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
        return { group: 'Início', label: 'Meu Painel (Central de Trabalho)' };
      case 'executive-dashboard':
        return { group: 'Início', label: 'Painel Executivo' };
      case 'approvals':
        return { group: 'Início', label: 'Minhas Aprovações & Alçadas' };
      case 'agenda':
        return { group: 'Início', label: 'Agenda Corporativa' };
      case 'notifications-view':
        return { group: 'Início', label: 'Notificações Corporativas' };
      case 'favorites-view':
        return { group: 'Início', label: 'Módulos Favoritos' };
      case 'crm':
        return { group: 'Relacionamento', label: 'CRM & Comercial' };
      case 'finance':
        return { group: 'SEEK Gestão', label: 'Financeiro & Tesouraria' };
      case 'accounting':
        return { group: 'SEEK Gestão', label: 'Contabilidade & Livro Diário' };
      case 'fiscal':
        return { group: 'SEEK Gestão', label: 'Fiscal & Tributos' };
      case 'purchasing':
        return { group: 'SEEK Gestão', label: 'Compras & Suprimentos' };
      case 'suppliers':
        return { group: 'SEEK Gestão', label: 'Fornecedores Homologados' };
      case 'inventory':
        return { group: 'SEEK Gestão', label: 'Estoque & Materiais' };
      case 'assets':
        return { group: 'SEEK Gestão', label: 'Patrimônio & Ativos' };
      case 'hr':
        return { group: 'SEEK Gestão', label: 'RH & Colaboradores' };
      case 'payroll':
        return { group: 'SEEK Gestão', label: 'Departamento Pessoal' };
      case 'projects':
        return { group: 'SEEK Gestão', label: 'Projetos Estratégicos' };
      case 'operations':
        return { group: 'SEEK Gestão', label: 'Operações de Eventos' };
      case 'contracts':
        return { group: 'SEEK Gestão', label: 'Contratos Corporativos' };
      case 'legal':
        return { group: 'SEEK Gestão', label: 'Jurídico & Societário' };
      case 'service-desk':
        return { group: 'Atendimento', label: 'Service Desk Corporativo' };
      case 'documents':
        return { group: 'Estratégia', label: 'Documentos Corporativos (GED)' };
      case 'governance':
        return { group: 'Estratégia', label: 'Governança & Riscos LGPD' };
      case 'reports':
        return { group: 'Estratégia', label: 'BI & Relatórios Executivos' };
      default:
        return { group: 'Administração', label: 'Administração do SEEK Core' };
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
      case 'crm':
        return <CRMModule />;
      case 'finance':
      case 'accounting':
      case 'fiscal':
        return <FinanceModule />;
      case 'purchasing':
      case 'suppliers':
        return <PurchasingModule />;
      case 'inventory':
      case 'assets':
        return <InventoryModule />;
      case 'hr':
      case 'payroll':
        return <HRModule />;
      case 'projects':
      case 'operations':
        return <ProjectsModule />;
      case 'contracts':
      case 'legal':
        return <ContractsModule />;
      case 'service-desk':
        return <ServiceDeskModule />;
      case 'documents':
        return <DocumentsModule />;
      case 'governance':
        return <GovernanceModule />;
      case 'reports':
        return <ReportsModule />;
      case 'admin-companies':
      case 'admin-departments':
      case 'admin-users':
      case 'admin-permissions':
      case 'admin-workflows':
      case 'admin-audit':
      case 'admin-settings':
        return <AdminModule />;
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
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Expansível com todos os módulos e RBAC dinâmico */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
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
