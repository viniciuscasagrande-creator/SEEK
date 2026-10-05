// SEEK — Motor Central de Workflows & Alçadas de Aprovação

import { UserRoleLevel } from './core';

export type WorkflowEntityType =
  | 'COMPRA'
  | 'PAGAMENTO'
  | 'CONTRATO'
  | 'FERIAS'
  | 'REEMBOLSO'
  | 'DESCONTO_COMERCIAL';

export type ApprovalStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CANCELADO';

export interface ApprovalStep {
  stepNumber: number;
  label: string; // Ex: "Aprovação do Gestor Imediato", "Alçada de Diretoria"
  requiredLevel: UserRoleLevel;
  status: ApprovalStatus;
  deciderName?: string;
  decisionDate?: string;
  comment?: string;
}

export interface ApprovalItem {
  id: string;
  companyId: string;
  entityType: WorkflowEntityType;
  title: string;
  description: string;
  department: string;
  requesterName: string;
  requesterRole: string;
  createdAt: string;
  amount?: number;
  status: ApprovalStatus;
  currentStepIndex: number;
  steps: ApprovalStep[];
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
}
