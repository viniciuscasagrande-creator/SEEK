import { db, logAudit } from '../db.js';
import { TokenPayload } from '../middleware/auth.js';

export interface TaxCalculationResult {
  baseSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  dsrAmount: number;
  grossSalary: number;
  inssDeduction: number;
  irrfDeduction: number;
  vtDeduction: number;
  totalDeductions: number;
  netSalary: number;
  fgtsAmount: number;
}

export class PayrollService {
  /**
   * Cálculo Trabalhista Oficial CLT (Tabela Progressiva INSS + Tabela IRRF + FGTS)
   */
  calculateTaxes(
    baseSalary: number,
    overtimeHours: number = 0,
    dependentsCount: number = 0,
    transportVoucher: boolean = true
  ): TaxCalculationResult {
    const hourlyRate = baseSalary / 220.0;
    const overtimeAmount = Math.round(hourlyRate * 1.5 * overtimeHours * 100) / 100;
    // DSR sobre horas extras (aproximadamente 1/6 a 1/5 dos dias úteis)
    const dsrAmount = overtimeHours > 0 ? Math.round((overtimeAmount / 25.0) * 5.0 * 100) / 100 : 0.0;
    const grossSalary = Math.round((baseSalary + overtimeAmount + dsrAmount) * 100) / 100;

    // 1. Tabela Progressiva do INSS (conforme legislação vigente)
    let inssDeduction = 0.0;
    if (grossSalary <= 1412.0) {
      inssDeduction = grossSalary * 0.075;
    } else if (grossSalary <= 2666.68) {
      inssDeduction = (grossSalary * 0.09) - 21.18;
    } else if (grossSalary <= 4000.03) {
      inssDeduction = (grossSalary * 0.12) - 101.18;
    } else if (grossSalary <= 7786.02) {
      inssDeduction = (grossSalary * 0.14) - 181.18;
    } else {
      inssDeduction = 908.86; // Teto máximo do INSS
    }
    inssDeduction = Math.round(Math.max(0, inssDeduction) * 100) / 100;

    // 2. Tabela Progressiva do IRRF (Dedução oficial por dependente = R$ 189,59)
    const dependentDeduction = dependentsCount * 189.59;
    const irrfBase = Math.max(0, grossSalary - inssDeduction - dependentDeduction);

    let irrfDeduction = 0.0;
    if (irrfBase <= 2259.20) {
      irrfDeduction = 0.0;
    } else if (irrfBase <= 2826.65) {
      irrfDeduction = (irrfBase * 0.075) - 169.44;
    } else if (irrfBase <= 3751.05) {
      irrfDeduction = (irrfBase * 0.15) - 381.44;
    } else if (irrfBase <= 4664.68) {
      irrfDeduction = (irrfBase * 0.225) - 662.77;
    } else {
      irrfDeduction = (irrfBase * 0.275) - 896.00;
    }
    irrfDeduction = Math.round(Math.max(0, irrfDeduction) * 100) / 100;

    // 3. Vale Transporte (máximo de 6% do salário base)
    const vtDeduction = transportVoucher ? Math.round(Math.min(baseSalary * 0.06, 250.0) * 100) / 100 : 0.0;

    // 4. FGTS (8% a cargo exclusivo da empresa / encargo patronal)
    const fgtsAmount = Math.round(grossSalary * 0.08 * 100) / 100;

    // 5. Salário Líquido
    const totalDeductions = Math.round((inssDeduction + irrfDeduction + vtDeduction) * 100) / 100;
    const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

    return {
      baseSalary,
      overtimeHours,
      overtimeAmount,
      dsrAmount,
      grossSalary,
      inssDeduction,
      irrfDeduction,
      vtDeduction,
      totalDeductions,
      netSalary,
      fgtsAmount
    };
  }

  /**
   * Simulação em tempo real para um colaborador
   */
  simulatePayslip(employeeId: string, options: { overtimeHours?: number; dependentsCount?: number } = {}) {
    const emp: any = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!emp) {
      const err: any = new Error('Colaborador não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const calc = this.calculateTaxes(
      emp.salary,
      options.overtimeHours || 0,
      options.dependentsCount || 0,
      true
    );

    return {
      employee: {
        id: emp.id,
        fullName: emp.full_name,
        registrationNumber: emp.registration_number,
        jobTitle: emp.job_title,
        department: emp.department
      },
      calculation: calc
    };
  }

  /**
   * Lista histórico de folhas processadas
   */
  listRuns(companyId: string = 'comp-1') {
    return db.prepare('SELECT * FROM payroll_runs WHERE company_id = ? ORDER BY period DESC').all(companyId) as any[];
  }

  /**
   * Obtém detalhes de uma folha com seus holerites
   */
  getRun(runId: string) {
    const run: any = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(runId);
    if (!run) return null;
    const payslips = db.prepare('SELECT * FROM payslips WHERE payroll_run_id = ? ORDER BY employee_name ASC').all(runId);
    return { ...run, payslips };
  }

  /**
   * Processa a folha de pagamento em lote para todos os colaboradores ativos
   */
  processPayrollRun(period: string, companyId: string = 'comp-1', user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      const err: any = new Error('Período inválido. Formato esperado: YYYY-MM (ex: 2026-10).');
      err.statusCode = 400;
      throw err;
    }

    const existing: any = db.prepare('SELECT * FROM payroll_runs WHERE company_id = ? AND period = ?').get(companyId, period);
    if (existing && existing.status === 'APROVADO') {
      const err: any = new Error(`A folha da competência ${period} já está aprovada e integrada.`);
      err.statusCode = 409;
      throw err;
    }

    const employees = db.prepare('SELECT * FROM employees WHERE active = 1 AND company_id = ?').all(companyId) as any[];
    if (!employees.length) {
      const err: any = new Error('Nenhum colaborador ativo encontrado para processar a folha.');
      err.statusCode = 422;
      throw err;
    }

    const runId = existing ? existing.id : `prun-${Date.now()}`;
    const operator = user?.fullName || 'Gestor de RH';
    const now = new Date().toISOString();

    let totalGross = 0;
    let totalInss = 0;
    let totalIrrf = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalFgts = 0;

    const payslipsData: any[] = [];

    for (const emp of employees) {
      // Coleta horas extras dos registros de ponto do período
      const timeRecords = db.prepare(`
        SELECT balance_minutes FROM time_records
        WHERE employee_id = ? AND date LIKE ?
      `).all(emp.id, `${period}%`) as any[];

      const totalBalanceMinutes = timeRecords.reduce((acc, r) => acc + (r.balance_minutes || 0), 0);
      const overtimeHours = totalBalanceMinutes > 0 ? Math.round((totalBalanceMinutes / 60.0) * 10) / 10 : 0;

      const calc = this.calculateTaxes(emp.salary, overtimeHours, 0, true);

      totalGross += calc.grossSalary;
      totalInss += calc.inssDeduction;
      totalIrrf += calc.irrfDeduction;
      totalDeductions += calc.totalDeductions;
      totalNet += calc.netSalary;
      totalFgts += calc.fgtsAmount;

      payslipsData.push({
        id: `slip-${emp.id}-${period}`,
        payroll_run_id: runId,
        company_id: companyId,
        employee_id: emp.id,
        employee_name: emp.full_name,
        job_title: emp.job_title,
        department: emp.department,
        period,
        base_salary: calc.baseSalary,
        overtime_hours: calc.overtimeHours,
        overtime_amount: calc.overtimeAmount,
        dsr_amount: calc.dsrAmount,
        gross_salary: calc.grossSalary,
        inss_deduction: calc.inssDeduction,
        irrf_deduction: calc.irrfDeduction,
        vt_deduction: calc.vtDeduction,
        total_deductions: calc.totalDeductions,
        net_salary: calc.netSalary,
        fgts_amount: calc.fgtsAmount
      });
    }

    const tx = db.transaction(() => {
      if (existing) {
        db.prepare('DELETE FROM payslips WHERE payroll_run_id = ?').run(runId);
        db.prepare(`
          UPDATE payroll_runs
          SET status = 'PROCESSADO', total_gross = ?, total_inss = ?, total_irrf = ?,
              total_deductions = ?, total_net = ?, total_fgts = ?, total_employees = ?,
              processed_at = ?, processed_by = ?
          WHERE id = ?
        `).run(totalGross, totalInss, totalIrrf, totalDeductions, totalNet, totalFgts, employees.length, now, operator, runId);
      } else {
        db.prepare(`
          INSERT INTO payroll_runs (
            id, company_id, period, status, total_gross, total_inss, total_irrf,
            total_deductions, total_net, total_fgts, total_employees, processed_at, processed_by
          ) VALUES (?, ?, ?, 'PROCESSADO', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(runId, companyId, period, totalGross, totalInss, totalIrrf, totalDeductions, totalNet, totalFgts, employees.length, now, operator);
      }

      const insertSlip = db.prepare(`
        INSERT INTO payslips (
          id, payroll_run_id, company_id, employee_id, employee_name, job_title, department, period,
          base_salary, overtime_hours, overtime_amount, dsr_amount, gross_salary, inss_deduction,
          irrf_deduction, vt_deduction, other_deductions, total_deductions, net_salary, fgts_amount, status
        ) VALUES (
          @id, @payroll_run_id, @company_id, @employee_id, @employee_name, @job_title, @department, @period,
          @base_salary, @overtime_hours, @overtime_amount, @dsr_amount, @gross_salary, @inss_deduction,
          @irrf_deduction, @vt_deduction, 0.0, @total_deductions, @net_salary, @fgts_amount, 'CALCULADO'
        )
      `);

      for (const slip of payslipsData) {
        insertSlip.run(slip);
      }

      logAudit(
        operator,
        user?.roleTitle || 'RH',
        'CREATE',
        'RH & Folha de Pagamento',
        `Folha ${period}`,
        `Folha processada para ${employees.length} colaboradores: Bruto R$ ${totalGross.toFixed(2)}, Líquido R$ ${totalNet.toFixed(2)}, Encargos FGTS R$ ${totalFgts.toFixed(2)}`,
        ipAddress
      );
    });

    tx();

    return {
      runId,
      period,
      totalEmployees: employees.length,
      totalGross,
      totalInss,
      totalIrrf,
      totalDeductions,
      totalNet,
      totalFgts,
      payslipsCount: payslipsData.length
    };
  }

  /**
   * Integração Atômica com Financeiro (Contas a Pagar) e Contabilidade (Partidas Dobradas)
   */
  integrateRunWithFinanceAndAccounting(runId: string, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    const run: any = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(runId);
    if (!run) {
      const err: any = new Error('Folha de pagamento não encontrada.');
      err.statusCode = 404;
      throw err;
    }
    if (run.status === 'APROVADO') {
      const err: any = new Error('Esta folha já foi aprovada e integrada.');
      err.statusCode = 409;
      throw err;
    }

    const operator = user?.fullName || 'Controlador Geral / RH';
    const operatorRole = user?.roleTitle || 'Controladoria';
    const now = new Date().toISOString();
    const period = run.period;
    const dueDateSalary = `${period}-05`;
    const dueDateFgts = `${period}-07`;
    const dueDateInss = `${period}-20`;

    const finSalaryId = `fin-folha-sal-${Date.now()}`;
    const finSalaryCode = `CP-FOLHA-${period.replace('-', '')}`;
    const finFgtsId = `fin-folha-fgts-${Date.now()}`;
    const finFgtsCode = `CP-FGTS-${period.replace('-', '')}`;
    const finInssId = `fin-folha-inss-${Date.now()}`;
    const finInssCode = `CP-INSS-${period.replace('-', '')}`;

    const journalCode = `LAN-FOLHA-${period.replace('-', '')}`;
    const journalId = `lan-folha-${Date.now()}`;

    const tx = db.transaction(() => {
      // 1. Gera título do Líquido de Salários
      db.prepare(`
        INSERT INTO financial_records (
          id, company_id, code, type, title, entity_name,
          cost_center, category, amount, due_date, status, payment_method,
          origin_type, origin_id
        ) VALUES (?, ?, ?, 'PAGAR', ?, 'Folha Consolidada de Salários',
          'Recursos Humanos & DP', 'Folha de Pagamento', ?, ?, 'APROVADO', 'TED', 'FOLHA_PAGAMENTO', ?)
      `).run(
        finSalaryId, run.company_id, finSalaryCode,
        `Salários Líquidos da Competência ${period}`,
        run.total_net, dueDateSalary, run.id
      );

      // 2. Gera título da Guia FGTS
      db.prepare(`
        INSERT INTO financial_records (
          id, company_id, code, type, title, entity_name,
          cost_center, category, amount, due_date, status, payment_method,
          origin_type, origin_id
        ) VALUES (?, ?, ?, 'PAGAR', ?, 'Caixa Econômica Federal (FGTS)',
          'Recursos Humanos & DP', 'Encargos Trabalhistas', ?, ?, 'APROVADO', 'BOLETO', 'FOLHA_PAGAMENTO', ?)
      `).run(
        finFgtsId, run.company_id, finFgtsCode,
        `Guia GRF/FGTS Competência ${period}`,
        run.total_fgts, dueDateFgts, run.id
      );

      // 3. Gera título da Guia DARF Previdenciário (INSS)
      db.prepare(`
        INSERT INTO financial_records (
          id, company_id, code, type, title, entity_name,
          cost_center, category, amount, due_date, status, payment_method,
          origin_type, origin_id
        ) VALUES (?, ?, ?, 'PAGAR', ?, 'Receita Federal do Brasil (INSS/DARF)',
          'Recursos Humanos & DP', 'Encargos Trabalhistas', ?, ?, 'APROVADO', 'BOLETO', 'FOLHA_PAGAMENTO', ?)
      `).run(
        finInssId, run.company_id, finInssCode,
        `DARF Previdenciário INSS Competência ${period}`,
        run.total_inss, dueDateInss, run.id
      );

      // 4. Gera Lançamento Contábil no Livro Diário em Partidas Dobradas
      const totalDebit = Math.round((run.total_gross + run.total_fgts) * 100) / 100;
      const totalCredit = Math.round((run.total_net + run.total_inss + run.total_irrf + run.total_fgts + (run.total_deductions - run.total_inss - run.total_irrf)) * 100) / 100;

      db.prepare(`
        INSERT INTO accounting_entries (
          id, code, date, period, description, debit_account_code, credit_account_code,
          amount, cost_center, origin_type, origin_id, created_by
        ) VALUES (?, ?, ?, ?, ?, '3.02.01.001', '2.01.03.001', ?, 'Recursos Humanos', 'FOLHA_PAGAMENTO', ?, ?)
      `).run(
        journalId, journalCode, `${period}-28`, period,
        `Provisão de Folha e Encargos ${period} (D-Despesa Pessoal / C-Obrigações Trabalhistas)`,
        totalDebit, run.id, operator
      );

      // 5. Atualiza o status da folha para APROVADO
      db.prepare(`
        UPDATE payroll_runs
        SET status = 'APROVADO', approved_at = ?, approved_by = ?,
            financial_record_id = ?, accounting_entry_id = ?
        WHERE id = ?
      `).run(now, operator, finSalaryId, journalCode, runId);

      // 6. Registra na Trilha de Auditoria Imutável
      logAudit(
        operator,
        operatorRole,
        'APPROVE',
        'RH & Folha de Pagamento',
        `Folha ${period}`,
        `Folha ${period} aprovada com geração automática de títulos (${finSalaryCode}, ${finFgtsCode}, ${finInssCode}) e lançamento contábil ${journalCode}.`,
        ipAddress
      );
    });

    tx();

    return {
      success: true,
      payrollRunId: runId,
      period,
      status: 'APROVADO',
      financialRecords: [finSalaryCode, finFgtsCode, finInssCode],
      accountingEntry: journalCode
    };
  }
}

export const payrollService = new PayrollService();
