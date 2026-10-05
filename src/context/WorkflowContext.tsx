import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApprovalItem, ApprovalStatus } from '../types/workflow';
import { AuditLogEntry } from '../types/core';
import { INITIAL_APPROVALS, INITIAL_AUDIT_LOGS } from '../data/mockData';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

interface WorkflowContextType {
  approvals: ApprovalItem[];
  pendingApprovalsCount: number;
  auditLogs: AuditLogEntry[];
  approveRequest: (requestId: string, comment: string) => Promise<void>;
  rejectRequest: (requestId: string, comment: string) => Promise<void>;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userName' | 'userRole'>) => void;
  createApprovalRequest: (request: Partial<ApprovalItem>) => Promise<void>;
  refreshApprovals: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  const refreshApprovals = async () => {
    try {
      const serverApprovals = await api.getApprovals();
      if (serverApprovals && serverApprovals.length > 0) {
        setApprovals(serverApprovals);
      }
      const serverLogs = await api.getAuditLogs();
      if (serverLogs && serverLogs.length > 0) {
        setAuditLogs(serverLogs);
      }
    } catch {
      // mantém estado atual
    }
  };

  useEffect(() => {
    refreshApprovals();
  }, []);

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userName' | 'userRole'>) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newLog: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: formattedDate,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle,
      ipAddress: '189.44.120.50 (Sessão Ativa)',
      ...entry
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  const approveRequest = async (requestId: string, comment: string) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Atualização otimista no frontend
    setApprovals(prev =>
      prev.map(item => {
        if (item.id !== requestId) return item;

        const updatedSteps = [...item.steps];
        const currentStep = updatedSteps[item.currentStepIndex];
        if (currentStep) {
          currentStep.status = 'APROVADO';
          currentStep.deciderName = currentUser.fullName;
          currentStep.decisionDate = formattedDate;
          currentStep.comment = comment || 'Aprovado conforme política de alçadas SEEK';
        }

        const nextStepIndex = item.currentStepIndex + 1;
        const isFinalStep = nextStepIndex >= updatedSteps.length;
        const newOverallStatus: ApprovalStatus = isFinalStep ? 'APROVADO' : 'PENDENTE';

        return {
          ...item,
          currentStepIndex: isFinalStep ? item.currentStepIndex : nextStepIndex,
          status: newOverallStatus,
          steps: updatedSteps
        };
      })
    );

    // Persistência no Backend SQLite
    try {
      await api.decideApproval(requestId, 'approve', comment, currentUser.fullName, currentUser.roleTitle);
      await refreshApprovals();
    } catch {
      // mantido pelo otimista
    }

    const approvedItem = approvals.find(a => a.id === requestId);
    addAuditLog({
      action: 'APPROVE',
      module: 'Central de Aprovações',
      entity: `${approvedItem?.entityType || 'Workflows'}: ${approvedItem?.title}`,
      description: `Aprovado por ${currentUser.fullName} (${currentUser.roleTitle}). Comentário: "${comment || 'Sem observações'}"`
    });
  };

  const rejectRequest = async (requestId: string, comment: string) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setApprovals(prev =>
      prev.map(item => {
        if (item.id !== requestId) return item;

        const updatedSteps = [...item.steps];
        const currentStep = updatedSteps[item.currentStepIndex];
        if (currentStep) {
          currentStep.status = 'REJEITADO';
          currentStep.deciderName = currentUser.fullName;
          currentStep.decisionDate = formattedDate;
          currentStep.comment = comment || 'Rejeitado na alçada de revisão.';
        }

        return {
          ...item,
          status: 'REJEITADO',
          steps: updatedSteps
        };
      })
    );

    try {
      await api.decideApproval(requestId, 'reject', comment, currentUser.fullName, currentUser.roleTitle);
      await refreshApprovals();
    } catch {
      // mantido pelo otimista
    }

    const targetItem = approvals.find(a => a.id === requestId);
    addAuditLog({
      action: 'REJECT',
      module: 'Central de Aprovações',
      entity: `${targetItem?.entityType || 'Workflows'}: ${targetItem?.title}`,
      description: `Rejeitado por ${currentUser.fullName} (${currentUser.roleTitle}). Motivo: "${comment || 'Não justificado'}"`
    });
  };

  const createApprovalRequest = async (request: Partial<ApprovalItem>) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newApproval: ApprovalItem = {
      id: `app-${Date.now()}`,
      companyId: request.companyId || 'comp-1',
      entityType: request.entityType || 'COMPRA',
      title: request.title || 'Nova Solicitação Corporativa',
      description: request.description || '',
      department: currentUser.department,
      requesterName: currentUser.fullName,
      requesterRole: currentUser.roleTitle,
      createdAt: formattedDate,
      amount: request.amount,
      status: 'PENDENTE',
      currentStepIndex: 0,
      priority: request.priority || 'MEDIA',
      steps: [
        {
          stepNumber: 1,
          label: 'Aprovação do Gestor Imediato',
          requiredLevel: 'GESTOR',
          status: 'PENDENTE'
        },
        ...(request.amount && request.amount > 15000
          ? [
              {
                stepNumber: 2,
                label: 'Alçada Diretoria Executiva (> R$ 15.000)',
                requiredLevel: 'DIRETORIA' as const,
                status: 'PENDENTE' as const
              }
            ]
          : [])
      ]
    };

    setApprovals(prev => [newApproval, ...prev]);

    try {
      await api.createApproval({
        entityType: newApproval.entityType,
        title: newApproval.title,
        description: newApproval.description,
        department: newApproval.department,
        requesterName: newApproval.requesterName,
        requesterRole: newApproval.requesterRole,
        amount: newApproval.amount,
        priority: newApproval.priority,
        steps: newApproval.steps
      });
      await refreshApprovals();
    } catch {
      // mantido pelo otimista
    }

    addAuditLog({
      action: 'CREATE',
      module: 'Central de Aprovações',
      entity: `${newApproval.entityType}: ${newApproval.title}`,
      description: `Criada nova solicitação no valor de R$ ${(newApproval.amount || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2
      })}`
    });
  };

  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDENTE').length;

  return (
    <WorkflowContext.Provider
      value={{
        approvals,
        pendingApprovalsCount,
        auditLogs,
        approveRequest,
        rejectRequest,
        addAuditLog,
        createApprovalRequest,
        refreshApprovals
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow deve ser utilizado dentro de um WorkflowProvider');
  }
  return context;
};
