// SEEK Backend — Armazenamento Centralizado e Estruturas de Dados
// Modelo compatível com Prisma / PostgreSQL

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
  registrationNumber: string;
  roleLevel: string;
  roleTitle: string;
  department: string;
  companyId: string;
  branchId: string;
  approvalLimitAmount: number;
  accessibleModules: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  entity: string;
  description: string;
  ipAddress?: string;
}

export const companies: Company[] = [
  {
    id: 'comp-1',
    code: 'SEEK-CORP',
    tradeName: 'DiskIngressos Matriz',
    legalName: 'DiskIngressos Serviços de Bilheteria e Eventos S.A.',
    documentNumber: '08.123.456/0001-90',
    isHolding: true
  },
  {
    id: 'comp-2',
    code: 'SEEK-SP',
    tradeName: 'DiskIngressos SP',
    legalName: 'DiskIngressos Operações São Paulo Ltda.',
    documentNumber: '08.123.456/0002-71',
    isHolding: false
  },
  {
    id: 'comp-3',
    code: 'SEEK-RJ',
    tradeName: 'DiskIngressos Rio',
    legalName: 'DiskIngressos Entretenimento Rio de Janeiro Ltda.',
    documentNumber: '08.123.456/0003-52',
    isHolding: false
  }
];

export const branches: Branch[] = [
  { id: 'branch-1', companyId: 'comp-1', code: 'FIL-01', name: 'Curitiba (Sede / Matriz)', city: 'Curitiba', state: 'PR', isHeadquarter: true },
  { id: 'branch-2', companyId: 'comp-1', code: 'FIL-02', name: 'Curitiba (Centro de Distribuição & PDV)', city: 'Curitiba', state: 'PR', isHeadquarter: false },
  { id: 'branch-3', companyId: 'comp-2', code: 'FIL-03', name: 'São Paulo (Faria Lima / Operações)', city: 'São Paulo', state: 'SP', isHeadquarter: false },
  { id: 'branch-4', companyId: 'comp-3', code: 'FIL-04', name: 'Rio de Janeiro (Barra da Tijuca)', city: 'Rio de Janeiro', state: 'RJ', isHeadquarter: false }
];

export const users: UserProfile[] = [
  {
    id: 'user-admin',
    fullName: 'Carlos Drummond de Castro',
    email: 'admin.carlos@diskingressos.com.br',
    registrationNumber: 'MAT-0001',
    roleLevel: 'ADMIN_GERAL',
    roleTitle: 'Administrador Geral',
    department: 'Tecnologia & Governança',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 1000000,
    accessibleModules: ['*']
  },
  {
    id: 'user-diretoria',
    fullName: 'Roberto Vianna Guimarães',
    email: 'roberto.vianna@diskingressos.com.br',
    registrationNumber: 'MAT-0002',
    roleLevel: 'DIRETORIA',
    roleTitle: 'Diretor Presidente / C-Level',
    department: 'Diretoria Executiva',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 500000,
    accessibleModules: [
      'inicio', 'crm', 'finance', 'accounting', 'fiscal', 'purchasing', 'suppliers',
      'inventory', 'assets', 'hr', 'payroll', 'projects', 'operations', 'contracts',
      'legal', 'service-desk', 'documents', 'governance', 'reports', 'admin'
    ]
  },
  {
    id: 'user-gestor',
    fullName: 'Eduardo Martins Fontes',
    email: 'eduardo.martins@diskingressos.com.br',
    registrationNumber: 'MAT-0015',
    roleLevel: 'GESTOR',
    roleTitle: 'Gestor Departamental de Operações',
    department: 'Operações de Eventos',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 50000,
    accessibleModules: ['inicio', 'purchasing', 'suppliers', 'inventory', 'assets', 'projects', 'operations', 'service-desk', 'documents', 'reports']
  },
  {
    id: 'user-financeiro',
    fullName: 'Helena Silveira Ramos',
    email: 'helena.silveira@diskingressos.com.br',
    registrationNumber: 'MAT-0045',
    roleLevel: 'FINANCEIRO',
    roleTitle: 'Gerente Financeira & Tesouraria',
    department: 'Financeiro',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 75000,
    accessibleModules: ['inicio', 'finance', 'purchasing', 'contracts', 'service-desk', 'documents', 'reports']
  },
  {
    id: 'user-contabilidade',
    fullName: 'Marcelo Rezende Pinto',
    email: 'marcelo.rezende@diskingressos.com.br',
    registrationNumber: 'MAT-0062',
    roleLevel: 'CONTABILIDADE',
    roleTitle: 'Coordenador Contábil',
    department: 'Contabilidade',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 20000,
    accessibleModules: ['inicio', 'accounting', 'finance', 'fiscal', 'documents', 'reports']
  },
  {
    id: 'user-fiscal',
    fullName: 'Camila Zanin Ribeiro',
    email: 'camila.zanin@diskingressos.com.br',
    registrationNumber: 'MAT-0078',
    roleLevel: 'FISCAL',
    roleTitle: 'Especialista Fiscal & Tributário',
    department: 'Fiscal',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 15000,
    accessibleModules: ['inicio', 'fiscal', 'accounting', 'finance', 'documents']
  },
  {
    id: 'user-comercial',
    fullName: 'Lucas Bertolli Costa',
    email: 'lucas.bertolli@diskingressos.com.br',
    registrationNumber: 'MAT-0130',
    roleLevel: 'COMERCIAL',
    roleTitle: 'Líder Comercial & CRM',
    department: 'Comercial',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 25000,
    accessibleModules: ['inicio', 'crm', 'contracts', 'service-desk', 'documents', 'reports']
  },
  {
    id: 'user-rh',
    fullName: 'Rafael Medeiros Pires',
    email: 'rafael.medeiros@diskingressos.com.br',
    registrationNumber: 'MAT-0089',
    roleLevel: 'RH',
    roleTitle: 'Coordenador de RH & DP',
    department: 'Recursos Humanos',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 20000,
    accessibleModules: ['inicio', 'hr', 'payroll', 'service-desk', 'documents', 'reports']
  },
  {
    id: 'user-compras',
    fullName: 'Mariana Fontes Prado',
    email: 'mariana.fontes@diskingressos.com.br',
    registrationNumber: 'MAT-0112',
    roleLevel: 'COMPRAS',
    roleTitle: 'Gestora de Compras & Suprimentos',
    department: 'Compras',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 30000,
    accessibleModules: ['inicio', 'purchasing', 'suppliers', 'inventory', 'assets', 'contracts', 'service-desk', 'documents']
  },
  {
    id: 'user-juridico',
    fullName: 'Dr. Fernando Araripe',
    email: 'fernando.araripe@diskingressos.com.br',
    registrationNumber: 'MAT-0033',
    roleLevel: 'JURIDICO',
    roleTitle: 'Diretor Jurídico & Contratos',
    department: 'Jurídico',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 100000,
    accessibleModules: ['inicio', 'contracts', 'legal', 'governance', 'documents', 'service-desk', 'reports']
  },
  {
    id: 'user-ti',
    fullName: 'Gabriel Vasconcelos',
    email: 'gabriel.ti@diskingressos.com.br',
    registrationNumber: 'MAT-0094',
    roleLevel: 'TI',
    roleTitle: 'Tech Lead & Service Desk',
    department: 'Tecnologia da Informação',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 35000,
    accessibleModules: ['inicio', 'service-desk', 'inventory', 'assets', 'projects', 'documents', 'admin']
  },
  {
    id: 'user-auditoria',
    fullName: 'Patrícia Lins Dourado',
    email: 'patricia.lins@diskingressos.com.br',
    registrationNumber: 'MAT-0050',
    roleLevel: 'AUDITORIA',
    roleTitle: 'Auditora Chefe & Compliance',
    department: 'Governança & Riscos',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 0,
    accessibleModules: ['inicio', 'governance', 'reports', 'admin-audit', 'documents', 'contracts', 'finance']
  },
  {
    id: 'user-colaborador',
    fullName: 'Beatriz Castro Lima',
    email: 'beatriz.castro@diskingressos.com.br',
    registrationNumber: 'MAT-0164',
    roleLevel: 'COLABORADOR',
    roleTitle: 'Analista de Operações Pleno',
    department: 'Operações de Eventos',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 1500,
    accessibleModules: ['inicio', 'service-desk', 'documents']
  }
];

export const auditLogs: AuditLog[] = [
  {
    id: 'aud-01',
    timestamp: '2026-10-05 16:20:12',
    userName: 'Carlos Drummond de Castro',
    userRole: 'Administrador Geral',
    action: 'APPROVE',
    module: 'Financeiro',
    entity: 'Orçamento Q4',
    description: 'Aprovado teto orçamentário para expansão Filial SP no valor de R$ 450.000,00',
    ipAddress: '189.44.120.12'
  }
];

export const corporateParameters = [
  { key: 'APPROVAL_TIER_1_LIMIT', value: '15000', description: 'Teto monetário de alçada para Gestor Departamental' },
  { key: 'APPROVAL_TIER_2_LIMIT', value: '50000', description: 'Teto monetário de alçada para Gerência Financeira' },
  { key: 'MFA_REQUIRED_LEVELS', value: 'ADMIN_GERAL,DIRETORIA,FINANCEIRO', description: 'Papéis obrigatórios com autenticação em 2 fatores' },
  { key: 'AUDIT_RETENTION_DAYS', value: '1825', description: 'Prazo mínimo de retenção de logs de auditoria (5 anos)' }
];
