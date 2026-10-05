// SEEK — Definições Centrais de Tipos (Core)

export type UserRoleLevel =
  | 'ADMIN_GERAL'   // 1. Administrador Geral (acesso irrestrito e parâmetros do sistema)
  | 'DIRETORIA'     // 2. Diretoria (visão executiva, holding e alçadas C-level)
  | 'GESTOR'        // 3. Gestor Departamental (aprovação de equipe e orçamento)
  | 'FINANCEIRO'    // 4. Financeiro (contas a pagar/receber, tesouraria, caixa)
  | 'CONTABILIDADE' // 5. Contabilidade (lançamentos, balancetes, DRE contábil)
  | 'FISCAL'        // 6. Fiscal (impostos, retenções, documentos fiscais)
  | 'COMERCIAL'     // 7. Comercial (CRM, propostas, funil de vendas, metas)
  | 'RH'            // 8. RH (admissões, organograma, cargos, avaliações)
  | 'COMPRAS'       // 9. Compras (cotações, pedidos, fornecedores)
  | 'JURIDICO'      // 10. Jurídico (contratos, processos, procurações)
  | 'TI'            // 11. TI (infraestrutura, acessos, Service Desk)
  | 'AUDITORIA'     // 12. Auditoria & Compliance (inspeção de logs e conformidade)
  | 'COLABORADOR';  // 13. Colaborador (Central de Trabalho, tarefas, chamados, ponto)

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
  registrationNumber?: string;
  roleLevel: UserRoleLevel;
  roleTitle: string; // Ex: Administrador Geral, Diretor Presidente, Gerente Financeiro, etc.
  department: string;
  avatarUrl?: string;
  companyId: string;
  branchId: string;
  approvalLimitAmount: number; // Limite monetário de alçada direta
  accessibleModules: string[]; // Módulos autorizados pelo RBAC dinâmico
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'EXPORT';
  module: string;
  entity: string;
  description: string;
  ipAddress?: string;
}

export interface CorporateNotification {
  id: string;
  title: string;
  message: string;
  type: 'APPROVAL' | 'SLA_ALERT' | 'CONTRACT' | 'SYSTEM';
  linkRoute?: string;
  read: boolean;
  createdAt: string;
}

export interface CorporateParameter {
  id: string;
  companyId: string;
  parameterKey: string;
  parameterValue: string;
  description?: string;
}

export interface UserFavorite {
  id: string;
  moduleCode: string;
  title: string;
  route: string;
}
