// SEEK — Definições Centrais de Tipos (Core)

export type UserRoleLevel =
  | 'ADMIN_GLOBAL'        // Diretor Executivo / Administrador Global
  | 'DIRETORIA'           // C-Level (CEO, CFO, COO)
  | 'GESTOR_DEPARTAMENTO' // Gerentes e Coordenadores
  | 'OPERACIONAL'         // Analistas e Especialistas
  | 'CONSULTA';           // Auditores e Consulta

export interface Company {
  id: string;
  code: string;
  tradeName: string;
  legalName: string;
  documentNumber: string;
  isHolding: boolean;
}

export interface Branch {
  id: string;
  companyId: string;
  code: string;
  name: string;
  city: string;
  state: string;
  isHeadquarter: boolean;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  roleLevel: UserRoleLevel;
  roleTitle: string; // Ex: Diretor Presidente, Gerente Financeiro, Coordenador de RH
  department: string;
  avatarUrl?: string;
  companyId: string;
  branchId: string;
  approvalLimitAmount: number; // Limite monetário de alçada direta
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'EXPORT';
  module: string;
  entity: string;
  description: string;
  ipAddress?: string;
}
