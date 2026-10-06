// SEEK Core — Serviço de Domínio Multiempresa, Multifilial e Estrutura Organizacional
import { companyRepository, CompanyEntity, BranchEntity, DepartmentEntity, CostCenterEntity, BusinessPartnerEntity } from '../repositories/company.repository.js';
import { TokenPayload } from '../middleware/auth.js';
import { maskDocumentNumber } from '../utils/security.js';

export interface TenantContext {
  effectiveCompanyId: string;
  effectiveBranchId?: string;
  scope: 'holding' | 'propria_empresa' | 'propria_filial' | 'todas_filiais';
  isHoldingUser: boolean;
  canAccessAllCompanies: boolean;
}

export class CompanyService {
  /**
   * Resolve o escopo de atuação do usuário no modelo Multiempresa / Multifilial do SEEK
   */
  resolveTenantScope(user?: TokenPayload, requestedCompanyId?: string, requestedBranchId?: string): TenantContext {
    if (!user) {
      return {
        effectiveCompanyId: requestedCompanyId || 'comp-1',
        effectiveBranchId: requestedBranchId,
        scope: 'propria_empresa',
        isHoldingUser: false,
        canAccessAllCompanies: false
      };
    }

    const isPrivileged = ['ADMIN_GERAL', 'DIRETORIA', 'AUDITORIA'].includes(user.roleLevel);
    const userCompany = companyRepository.findCompanyById(user.companyId || 'comp-1');
    const isHoldingUser = Boolean(userCompany && userCompany.is_holding === 1);

    // Se o usuário tem privilégio executivo ou pertence à Holding, ele pode navegar entre empresas
    if (isPrivileged || isHoldingUser) {
      return {
        effectiveCompanyId: requestedCompanyId || user.companyId || 'comp-1',
        effectiveBranchId: requestedBranchId || user.branchId,
        scope: isHoldingUser ? 'holding' : 'todas_filiais',
        isHoldingUser,
        canAccessAllCompanies: true
      };
    }

    // Papéis operacionais: restritos à própria empresa e filial de alocação
    return {
      effectiveCompanyId: user.companyId || 'comp-1',
      effectiveBranchId: user.branchId || requestedBranchId,
      scope: user.branchId ? 'propria_filial' : 'propria_empresa',
      isHoldingUser: false,
      canAccessAllCompanies: false
    };
  }

  /**
   * Valida se o usuário tem permissão para atuar na empresa requisitada
   */
  validateTenantAccess(user: TokenPayload, targetCompanyId: string): boolean {
    const isPrivileged = ['ADMIN_GERAL', 'DIRETORIA', 'AUDITORIA'].includes(user.roleLevel);
    if (isPrivileged) return true;

    const userCompany = companyRepository.findCompanyById(user.companyId);
    if (userCompany && userCompany.is_holding === 1) return true;

    return user.companyId === targetCompanyId;
  }

  /**
   * Retorna a árvore organizacional completa da empresa (filiais, departamentos e centros de custo)
   */
  getCompanyHierarchy(companyId: string) {
    const company = companyRepository.findCompanyById(companyId);
    if (!company) {
      throw new Error(`Empresa com id ${companyId} não encontrada.`);
    }

    const branches = companyRepository.listBranches(companyId);
    const departments = companyRepository.listDepartments(companyId);
    const costCenters = companyRepository.listCostCenters(companyId);

    return {
      company,
      branches,
      departments,
      costCenters
    };
  }

  /**
   * Valida teto orçamentário departamental
   */
  validateDepartmentBudget(companyId: string, departmentCode: string, requestedAmount: number): {
    approved: boolean;
    budgetLimit: number;
    departmentName: string;
    message?: string;
  } {
    const dept = companyRepository.findDepartmentByCode(departmentCode, companyId);
    if (!dept) {
      return { approved: true, budgetLimit: 0, departmentName: departmentCode };
    }

    if (dept.budget_limit > 0 && requestedAmount > dept.budget_limit) {
      return {
        approved: false,
        budgetLimit: dept.budget_limit,
        departmentName: dept.name,
        message: `O valor (R$ ${requestedAmount.toFixed(2)}) ultrapassa o teto orçamentário do departamento ${dept.name} (R$ ${dept.budget_limit.toFixed(2)}). Requer aprovação executiva.`
      };
    }

    return {
      approved: true,
      budgetLimit: dept.budget_limit,
      departmentName: dept.name
    };
  }

  /**
   * Lista parceiros de negócios com proteção LGPD de dados sensíveis (CPF/CNPJ)
   */
  getPartnersWithMasking(user?: TokenPayload, companyId?: string): { total: number; partners: any[] } {
    const canViewFullDoc = Boolean(user && ['ADMIN_GERAL', 'DIRETORIA', 'FINANCEIRO', 'COMPRAS', 'COMERCIAL'].includes(user.roleLevel));
    const rawPartners = companyRepository.listPartners(companyId);

    const partners = rawPartners.map(p => ({
      id: p.id,
      companyId: p.company_id,
      type: p.type,
      legalName: p.legal_name,
      tradeName: p.trade_name,
      documentNumber: canViewFullDoc ? p.document_number : maskDocumentNumber(p.document_number),
      documentNumberMasked: !canViewFullDoc,
      category: p.category,
      contactName: p.contact_name,
      email: p.email,
      city: p.city,
      state: p.state,
      rating: p.rating,
      slaPercent: p.sla_percent,
      active: Boolean(p.active)
    }));

    return { total: partners.length, partners };
  }
}

export const companyService = new CompanyService();
