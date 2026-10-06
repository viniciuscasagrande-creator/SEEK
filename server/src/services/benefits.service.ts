import { db, logAudit } from '../db.js';
import { TokenPayload } from '../middleware/auth.js';

export interface BenefitBatchItem {
  providerId: string;
  providerName: string;
  cnpj: string;
  integrationType: string;
  livesCount: number;
  totalAmount: number;
  beneficiaries: Array<{
    employeeId: string;
    employeeName: string;
    benefitName: string;
    benefitType: string;
    calculatedAmount: number;
    daysCount: number;
    absencesDeducted: number;
  }>;
}

export interface BenefitCalculationResult {
  period: string;
  businessDays: number;
  totalCompanyCost: number;
  totalLives: number;
  orders: BenefitBatchItem[];
}

export class BenefitsService {
  /**
   * Garante provedores e planos padrão semeados
   */
  ensureSeedData(companyId: string = 'comp-1') {
    const countCheck = db.prepare('SELECT COUNT(*) as count FROM benefit_providers').get() as { count: number };
    if (countCheck.count > 0) return;

    const providers = [
      { id: 'prov-caju', trade_name: 'Caju Benefícios', legal_name: 'Caju Instituição de Pagamento S.A.', cnpj: '34.123.456/0001-90', type: 'API_REST' },
      { id: 'prov-sptrans', trade_name: 'SPTrans / URBS (VT)', legal_name: 'Consórcio de Transporte Urbano', cnpj: '55.987.654/0001-11', type: 'ARQUIVO_TXT' },
      { id: 'prov-unimed', trade_name: 'Unimed Saúde', legal_name: 'Unimed Cooperativa Médica', cnpj: '12.333.444/0001-55', type: 'API_REST' },
      { id: 'prov-ticket', trade_name: 'Ticket Alimentação', legal_name: 'Ticket Serviços S.A.', cnpj: '44.555.666/0001-22', type: 'API_REST' }
    ];

    const insertProv = db.prepare(`
      INSERT INTO benefit_providers (id, company_id, trade_name, legal_name, cnpj, integration_type, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ATIVO')
    `);

    for (const p of providers) {
      insertProv.run(p.id, companyId, p.trade_name, p.legal_name, p.cnpj, p.type);
    }

    const plans = [
      { id: 'plan-flex', provider_id: 'prov-caju', name: 'Cartão Flexível Corporativo', type: 'FLEXIVEL', deduction: 'ISENTO', daily: 0, monthly: 1000.0 },
      { id: 'plan-vt', provider_id: 'prov-sptrans', name: 'Vale Transporte Urbano', type: 'TRANSPORTE', deduction: 'CLT_VT_6%', daily: 18.0, monthly: 0 },
      { id: 'plan-saude', provider_id: 'prov-unimed', name: 'Plano de Saúde Executivo', type: 'SAUDE', deduction: 'PERCENTUAL_COPARTICIPACAO', daily: 0, monthly: 480.0 },
      { id: 'plan-vr', provider_id: 'prov-ticket', name: 'Vale Refeição & Alimentação', type: 'ALIMENTACAO', deduction: 'ISENTO', daily: 45.0, monthly: 0 }
    ];

    const insertPlan = db.prepare(`
      INSERT INTO benefit_plans (id, company_id, provider_id, name, type, deduction_rule, default_daily_value, default_monthly_value, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ATIVO')
    `);

    for (const pl of plans) {
      insertPlan.run(pl.id, companyId, pl.provider_id, pl.name, pl.type, pl.deduction, pl.daily, pl.monthly);
    }

    // Vincula colaboradores existentes
    const employees = db.prepare('SELECT id FROM employees WHERE active = 1 LIMIT 6').all() as any[];
    const insertEmpBenefit = db.prepare(`
      INSERT OR IGNORE INTO employee_benefits (id, company_id, employee_id, benefit_plan_id, daily_value, monthly_value, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ATIVO')
    `);

    let i = 1;
    for (const emp of employees) {
      // Todos recebem Cartão Flexível
      insertEmpBenefit.run(`eb-${i++}`, companyId, emp.id, 'plan-flex', 0, 1000.0);
      // Recebem VT
      insertEmpBenefit.run(`eb-${i++}`, companyId, emp.id, 'plan-vt', 18.0, 0);
      // Recebem Saúde
      insertEmpBenefit.run(`eb-${i++}`, companyId, emp.id, 'plan-saude', 0, 480.0);
      // Recebem VR
      insertEmpBenefit.run(`eb-${i++}`, companyId, emp.id, 'plan-vr', 45.0, 0);
    }
  }

  /**
   * Lista Fornecedores de Benefícios
   */
  listProviders(companyId: string = 'comp-1') {
    this.ensureSeedData(companyId);
    return db.prepare('SELECT * FROM benefit_providers WHERE company_id = ? ORDER BY trade_name ASC').all(companyId) as any[];
  }

  /**
   * Lista Catálogo de Planos de Benefícios
   */
  listPlans(companyId: string = 'comp-1') {
    this.ensureSeedData(companyId);
    return db.prepare(`
      SELECT bp.*, prov.trade_name as provider_name, prov.cnpj as provider_cnpj
      FROM benefit_plans bp
      JOIN benefit_providers prov ON prov.id = bp.provider_id
      WHERE bp.company_id = ?
      ORDER BY bp.name ASC
    `).all(companyId) as any[];
  }

  /**
   * Lista Vínculos de Colaboradores e Benefícios
   */
  listEmployeeBenefits(companyId: string = 'comp-1') {
    this.ensureSeedData(companyId);
    return db.prepare(`
      SELECT eb.*, e.full_name as employee_name, e.job_title, e.department,
             bp.name as plan_name, bp.type as plan_type, bp.deduction_rule,
             prov.trade_name as provider_name
      FROM employee_benefits eb
      JOIN employees e ON e.id = eb.employee_id
      JOIN benefit_plans bp ON bp.id = eb.benefit_plan_id
      JOIN benefit_providers prov ON prov.id = bp.provider_id
      WHERE eb.company_id = ? AND eb.status = 'ATIVO' AND e.active = 1
      ORDER BY e.full_name ASC
    `).all(companyId) as any[];
  }

  /**
   * Cálculo do Lote de Compra Mensal de Benefícios com abatimento inteligente de faltas
   */
  calculateBatch(period: string, businessDays: number = 21, companyId: string = 'comp-1'): BenefitCalculationResult {
    this.ensureSeedData(companyId);

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      const err: any = new Error('Período inválido. Formato esperado: YYYY-MM (ex: 2026-11).');
      err.statusCode = 400;
      throw err;
    }

    const bDays = businessDays > 0 ? businessDays : 21;

    // Busca todos os vínculos de colaboradores ativos
    const activeLinks = db.prepare(`
      SELECT eb.*, e.full_name as employee_name,
             bp.name as plan_name, bp.type as plan_type, bp.deduction_rule,
             prov.id as provider_id, prov.trade_name as provider_name, prov.cnpj as provider_cnpj,
             prov.integration_type
      FROM employee_benefits eb
      JOIN employees e ON e.id = eb.employee_id
      JOIN benefit_plans bp ON bp.id = eb.benefit_plan_id
      JOIN benefit_providers prov ON prov.id = bp.provider_id
      WHERE eb.company_id = ? AND eb.status = 'ATIVO' AND e.active = 1
      ORDER BY prov.trade_name ASC, e.full_name ASC
    `).all(companyId) as any[];

    const providerMap = new Map<string, BenefitBatchItem>();
    let totalCompanyCost = 0.0;
    const uniqueEmployees = new Set<string>();

    for (const link of activeLinks) {
      uniqueEmployees.add(link.employee_id);

      // Abatimento inteligente de faltas injustificadas registradas no ponto
      const absencesCount = (db.prepare(`
        SELECT COUNT(*) as count FROM time_records
        WHERE employee_id = ? AND date LIKE ? AND (clock_in IS NULL OR status = 'FALTA_INJUSTIFICADA')
      `).get(link.employee_id, `${period.substring(0, 7)}%`) as any)?.count || 0;

      const daysToPay = Math.max(0, bDays - absencesCount);

      let itemCost = 0.0;
      if (link.plan_type === 'TRANSPORTE' || link.plan_type === 'ALIMENTACAO' || link.daily_value > 0) {
        itemCost = Math.round(link.daily_value * daysToPay * 100) / 100;
      } else {
        itemCost = Math.round((link.monthly_value || 0.0) * 100) / 100;
      }

      totalCompanyCost += itemCost;

      if (!providerMap.has(link.provider_id)) {
        providerMap.set(link.provider_id, {
          providerId: link.provider_id,
          providerName: link.provider_name,
          cnpj: link.provider_cnpj,
          integrationType: link.integration_type,
          livesCount: 0,
          totalAmount: 0.0,
          beneficiaries: []
        });
      }

      const pGroup = providerMap.get(link.provider_id)!;
      pGroup.livesCount += 1;
      pGroup.totalAmount = Math.round((pGroup.totalAmount + itemCost) * 100) / 100;
      pGroup.beneficiaries.push({
        employeeId: link.employee_id,
        employeeName: link.employee_name,
        benefitName: link.plan_name,
        benefitType: link.plan_type,
        calculatedAmount: itemCost,
        daysCount: daysToPay,
        absencesDeducted: absencesCount
      });
    }

    return {
      period,
      businessDays: bDays,
      totalCompanyCost: Math.round(totalCompanyCost * 100) / 100,
      totalLives: uniqueEmployees.size,
      orders: Array.from(providerMap.values())
    };
  }

  /**
   * Aprovação do Lote de Compra e Integração Atômica com Contas a Pagar e Contabilidade
   */
  approveAndIntegrateBatch(
    period: string,
    businessDays: number = 21,
    companyId: string = 'comp-1',
    user?: TokenPayload,
    ipAddress: string = '127.0.0.1'
  ) {
    const calc = this.calculateBatch(period, businessDays, companyId);
    if (!calc.orders.length) {
      const err: any = new Error('Nenhum benefício ativo encontrado para gerar pedidos.');
      err.statusCode = 422;
      throw err;
    }

    const operator = user?.fullName || 'Gestor de Benefícios / RH';
    const operatorRole = user?.roleTitle || 'RH';
    const now = new Date().toISOString();
    const dueDate = `${period}-25`;

    const generatedTitles: string[] = [];
    const generatedOrderIds: string[] = [];
    let totalBatchAmount = 0.0;

    const tx = db.transaction(() => {
      for (const order of calc.orders) {
        totalBatchAmount += order.totalAmount;
        const orderId = `bpo-${order.providerId}-${period.replace('-', '')}`;
        generatedOrderIds.push(orderId);

        const finCode = `CP-BENEF-${order.providerId.replace('prov-', '').toUpperCase()}-${period.replace('-', '')}`;
        const finId = `fin-benef-${order.providerId}-${Date.now()}`;
        generatedTitles.push(finCode);

        // 1. Grava o pedido de compra do benefício
        db.prepare(`
          INSERT INTO benefit_purchase_orders (
            id, company_id, provider_id, period, business_days, lives_count,
            total_amount, status, financial_record_id, approved_by, approved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INTEGRADO_FINANCEIRO', ?, ?, ?)
          ON CONFLICT(company_id, provider_id, period) DO UPDATE SET
            business_days = excluded.business_days,
            lives_count = excluded.lives_count,
            total_amount = excluded.total_amount,
            status = 'INTEGRADO_FINANCEIRO',
            financial_record_id = excluded.financial_record_id,
            approved_by = excluded.approved_by,
            approved_at = excluded.approved_at
        `).run(
          orderId, companyId, order.providerId, period, calc.businessDays,
          order.livesCount, order.totalAmount, finId, operator, now
        );

        // 2. Cria o título a pagar no Financeiro (Contas a Pagar)
        db.prepare(`
          INSERT INTO financial_records (
            id, company_id, code, type, title, entity_name,
            cost_center, category, amount, due_date, status, payment_method,
            origin_type, origin_id
          ) VALUES (?, ?, ?, 'PAGAR', ?, ?, 'Recursos Humanos & DP', 'Benefícios a Colaboradores', ?, ?, 'APROVADO', 'BOLETO', 'BENEFICIOS', ?)
          ON CONFLICT(code) DO UPDATE SET
            amount = excluded.amount,
            status = 'APROVADO'
        `).run(
          finId, companyId, finCode,
          `Recarga Mensal de Benefícios (${order.providerName}) — ${period}`,
          order.providerName,
          order.totalAmount,
          dueDate,
          orderId
        );
      }

      // 3. Reflexo Contábil no Livro Diário em Partidas Dobradas
      const journalCode = `LAN-BENEF-${period.replace('-', '')}`;
      const journalId = `lan-benef-${Date.now()}`;
      const roundedTotal = Math.round(totalBatchAmount * 100) / 100;

      db.prepare(`
        INSERT INTO accounting_entries (
          id, code, date, period, description, debit_account_code, credit_account_code,
          amount, cost_center, origin_type, origin_id, created_by
        ) VALUES (?, ?, ?, ?, ?, '3.02.01.004', '2.01.03.005', ?, 'Recursos Humanos', 'BENEFICIOS', ?, ?)
        ON CONFLICT(code) DO UPDATE SET amount = excluded.amount
      `).run(
        journalId, journalCode, `${period}-25`, period,
        `Provisão de Benefícios a Colaboradores ${period} (D-Despesa Benefícios / C-Fornecedores a Pagar)`,
        roundedTotal, `batch-${period}`, operator
      );

      // 4. Trilha de Auditoria Imutável
      logAudit(
        operator,
        operatorRole,
        'APPROVE',
        'RH & Benefícios',
        `Lote de Benefícios ${period}`,
        `Aprovação e integração financeira do lote de benefícios ${period}: ${calc.orders.length} faturas totalizando ${totalBatchAmount.toFixed(2)} geradas no Contas a Pagar e Contabilidade.`,
        ipAddress
      );
    });

    tx();

    return {
      success: true,
      period,
      businessDays: calc.businessDays,
      totalAmount: Math.round(totalBatchAmount * 100) / 100,
      providersCount: calc.orders.length,
      financialRecords: generatedTitles,
      accountingEntry: `LAN-BENEF-${period.replace('-', '')}`
    };
  }
}

export const benefitsService = new BenefitsService();
