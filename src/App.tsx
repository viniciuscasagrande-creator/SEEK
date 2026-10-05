import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { QuickActionModal } from './components/common/QuickActionModal';
import { SeekAIAssistant } from './components/seek-ai/SeekAIAssistant';

// Modules
import { MyWorkstation } from './components/modules/MyWorkstation';
import { ExecutiveDashboard } from './components/modules/ExecutiveDashboard';
import { ApprovalsCenter } from './components/modules/ApprovalsCenter';
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

const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('my-workstation');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState<boolean>(false);
  const [isSeekAIOpen, setIsSeekAIOpen] = useState<boolean>(false);

  const renderActiveModule = () => {
    switch (activeView) {
      case 'my-workstation':
        return <MyWorkstation />;
      case 'executive-dashboard':
        return <ExecutiveDashboard />;
      case 'approvals':
      case 'alerts':
        return <ApprovalsCenter />;
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
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Expansível com todos os 14 módulos */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* Área Principal de Trabalho */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70">
          <div className="mx-auto max-w-7xl">
            {renderActiveModule()}
          </div>
        </main>
      </div>

      {/* Modal de Ação Rápida */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
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
