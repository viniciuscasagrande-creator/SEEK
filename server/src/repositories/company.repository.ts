// SEEK Core — Repositório de Empresas, Filiais, Departamentos, Centros de Custo e Parâmetros
import { db } from '../db.js';

export interface CompanyEntity {
  id: string;
  code: string;
  trade_name: string;
  legal_name: string;
  document_number: string;
  is_holding: number;
  active: number;
  created_at?: string;
}

export interface BranchEntity {
  id: string;
  company_id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  is_headquarter: number;
  active: number;
}

export interface DepartmentEntity {
  id: string;
  company_id: string;
  code: string;
  name: string;
  budget_limit: number;
  active: number;
}

export interface CostCenterEntity {
  id: string;
  company_id: string;
  code: string;
  name: string;
  active: number;
}

export interface CorporateParameterEntity {
  key: string;
  value: string;
  description: string;
}

export interface BusinessPartnerEntity {
  id: string;
  company_id: string;
  type: string;
  legal_name: string;
  trade_name?: string;
  document_number: string;
  category?: string;
  contact_name?: string;
  email?: string;
  city?: string;
  state?: string;
  rating?: number;
  sla_percent?: number;
  active: number;
}

export class CompanyRepository {
  // --- EMPRESAS ---
  findCompanyById(id: string): CompanyEntity | undefined {
    return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as CompanyEntity | undefined;
  }

  findCompanyByCode(code: string): CompanyEntity | undefined {
    return db.prepare('SELECT * FROM companies WHERE code = ?').get(code) as CompanyEntity | undefined;
  }

  listCompanies(activeOnly: boolean = true): CompanyEntity[] {
    const sql = activeOnly
      ? 'SELECT * FROM companies WHERE active = 1 ORDER BY is_holding DESC, trade_name ASC'
      : 'SELECT * FROM companies ORDER BY is_holding DESC, trade_name ASC';
    return db.prepare(sql).all() as CompanyEntity[];
  }

  createCompany(data: {
    id: string;
    code: string;
    trade_name: string;
    legal_name: string;
    document_number: string;
    is_holding?: number;
  }): void {
    db.prepare(`
      INSERT INTO companies (id, code, trade_name, legal_name, document_number, is_holding, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(data.id, data.code, data.trade_name, data.legal_name, data.document_number, data.is_holding || 0);
  }

  // --- FILIAIS ---
  findBranchById(id: string): BranchEntity | undefined {
    return db.prepare('SELECT * FROM branches WHERE id = ?').get(id) as BranchEntity | undefined;
  }

  listBranches(companyId?: string): BranchEntity[] {
    if (companyId) {
      return db.prepare('SELECT * FROM branches WHERE company_id = ? AND active = 1 ORDER BY is_headquarter DESC, name ASC').all(companyId) as BranchEntity[];
    }
    return db.prepare('SELECT * FROM branches WHERE active = 1 ORDER BY is_headquarter DESC, name ASC').all() as BranchEntity[];
  }

  createBranch(data: {
    id: string;
    company_id: string;
    code: string;
    name: string;
    city: string;
    state: string;
    is_headquarter?: number;
  }): void {
    db.prepare(`
      INSERT INTO branches (id, company_id, code, name, city, state, is_headquarter, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(data.id, data.company_id, data.code, data.name, data.city, data.state, data.is_headquarter || 0);
  }

  // --- DEPARTAMENTOS ---
  findDepartmentById(id: string): DepartmentEntity | undefined {
    return db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as DepartmentEntity | undefined;
  }

  findDepartmentByCode(code: string, companyId?: string): DepartmentEntity | undefined {
    if (companyId) {
      return db.prepare('SELECT * FROM departments WHERE code = ? AND company_id = ? AND active = 1').get(code, companyId) as DepartmentEntity | undefined;
    }
    return db.prepare('SELECT * FROM departments WHERE code = ? AND active = 1').get(code) as DepartmentEntity | undefined;
  }

  listDepartments(companyId?: string): DepartmentEntity[] {
    if (companyId) {
      return db.prepare('SELECT * FROM departments WHERE company_id = ? AND active = 1 ORDER BY name ASC').all(companyId) as DepartmentEntity[];
    }
    return db.prepare('SELECT * FROM departments WHERE active = 1 ORDER BY name ASC').all() as DepartmentEntity[];
  }

  // --- CENTROS DE CUSTO ---
  listCostCenters(companyId?: string): CostCenterEntity[] {
    if (companyId) {
      return db.prepare('SELECT * FROM cost_centers WHERE company_id = ? AND active = 1 ORDER BY code ASC').all(companyId) as CostCenterEntity[];
    }
    return db.prepare('SELECT * FROM cost_centers WHERE active = 1 ORDER BY code ASC').all() as CostCenterEntity[];
  }

  findCostCenterByCode(code: string): CostCenterEntity | undefined {
    return db.prepare('SELECT * FROM cost_centers WHERE code = ? AND active = 1').get(code) as CostCenterEntity | undefined;
  }

  // --- PARÂMETROS CORPORATIVOS ---
  getParameters(): CorporateParameterEntity[] {
    return db.prepare('SELECT * FROM corporate_parameters').all() as CorporateParameterEntity[];
  }

  getParameterByKey(key: string): CorporateParameterEntity | undefined {
    return db.prepare('SELECT * FROM corporate_parameters WHERE key = ?').get(key) as CorporateParameterEntity | undefined;
  }

  setParameter(key: string, value: string, description: string): void {
    db.prepare(`
      INSERT INTO corporate_parameters (key, value, description)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = excluded.description
    `).run(key, value, description);
  }

  // --- PARCEIROS DE NEGÓCIOS (CLIENTES / FORNECEDORES) ---
  listPartners(companyId?: string): BusinessPartnerEntity[] {
    if (companyId) {
      return db.prepare('SELECT * FROM business_partners WHERE company_id = ? AND active = 1 ORDER BY trade_name ASC').all(companyId) as BusinessPartnerEntity[];
    }
    return db.prepare('SELECT * FROM business_partners WHERE active = 1 ORDER BY trade_name ASC').all() as BusinessPartnerEntity[];
  }

  findPartnerById(id: string): BusinessPartnerEntity | undefined {
    return db.prepare('SELECT * FROM business_partners WHERE id = ?').get(id) as BusinessPartnerEntity | undefined;
  }
}

export const companyRepository = new CompanyRepository();
