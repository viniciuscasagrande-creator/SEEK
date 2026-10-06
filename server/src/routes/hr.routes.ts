import { Router, Request, Response } from 'express';
import { db, logAudit, createCorporateNotification } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { isPrivilegedRole, maskSalary } from '../utils/security.js';
import { payrollService } from '../services/payroll.service.js';
import { benefitsService } from '../services/benefits.service.js';

export const hrRouter = Router();

// Lista colaboradores com mascaramento de dados sensíveis (LGPD)
hrRouter.get('/employees', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const canViewSalary = Boolean(authReq.user && isPrivilegedRole(authReq.user.roleLevel, ['ADMIN_GERAL', 'DIRETORIA', 'RH']));

    const rows = db.prepare('SELECT * FROM employees WHERE active = 1 ORDER BY full_name ASC').all() as any[];
    const employees = rows.map(r => ({
      id: r.id,
      companyId: r.company_id,
      registrationNumber: r.registration_number,
      fullName: r.full_name,
      jobTitle: r.job_title,
      department: r.department,
      branch: r.branch,
      regime: r.regime,
      admissionDate: r.admission_date,
      salary: canViewSalary ? r.salary : 0,
      salaryDisplay: canViewSalary ? `R$ ${Number(r.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : maskSalary(r.salary),
      salaryMasked: !canViewSalary,
      vacationBalanceDays: r.vacation_balance_days,
      bankHoursBalance: r.bank_hours_balance,
      managerName: r.manager_name,
      active: Boolean(r.active)
    }));

    return res.json({ total: employees.length, employees });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admissão de novo colaborador
hrRouter.post('/employees', (req: Request, res: Response) => {
  try {
    const { fullName, jobTitle, department, branch, regime, admissionDate, salary, managerName, userName, userRole } = req.body;

    if (!fullName || !jobTitle || !department || !salary) {
      return res.status(400).json({ error: 'Campos obrigatórios: fullName, jobTitle, department, salary.' });
    }

    const id = `emp-${Date.now()}`;
    const registrationNumber = `MAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedSalary = parseFloat(salary);

    db.prepare(`
      INSERT INTO employees (id, company_id, registration_number, full_name, job_title, department, branch, regime, admission_date, salary, vacation_balance_days, bank_hours_balance, manager_name)
      VALUES (?, 'comp-1', ?, ?, ?, ?, ?, ?, ?, ?, 30, 0, ?)
    `).run(
      id,
      registrationNumber,
      fullName,
      jobTitle,
      department,
      branch || 'Curitiba (Matriz)',
      regime || 'CLT',
      admissionDate || new Date().toISOString().substring(0, 10),
      parsedSalary,
      managerName || 'Roberto Vianna Guimarães'
    );

    logAudit(
      userName || 'Recursos Humanos',
      userRole || 'RH',
      'CREATE',
      'RH & Departamento Pessoal',
      `Colaborador ${registrationNumber}`,
      `Admissão efetuada: ${fullName} como ${jobTitle} (${department})`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      employee: {
        id,
        registrationNumber,
        fullName,
        jobTitle,
        department,
        salary: parsedSalary
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Espelho de ponto
hrRouter.get('/time-records', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query;
    let query = 'SELECT * FROM time_records';
    const params: any[] = [];

    if (employeeId) {
      query += ' WHERE employee_id = ?';
      params.push(employeeId);
    }

    query += ' ORDER BY date DESC LIMIT 60';
    const rows = db.prepare(query).all(...params) as any[];

    return res.json({ total: rows.length, records: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Registro de Ponto (Batida)
hrRouter.post('/time-records/clock', (req: Request, res: Response) => {
  try {
    const { employeeId, type, time, userName, userRole } = req.body;
    const today = new Date().toISOString().substring(0, 10);
    const clockTime = time || new Date().toTimeString().substring(0, 5);

    let existing = db.prepare('SELECT * FROM time_records WHERE employee_id = ? AND date = ?').get(employeeId, today) as any;

    if (!existing) {
      const id = `ponto-${Date.now()}`;
      db.prepare(`
        INSERT INTO time_records (id, employee_id, date, clock_in)
        VALUES (?, ?, ?, ?)
      `).run(id, employeeId, today, clockTime);
      existing = { id, employee_id: employeeId, date: today, clock_in: clockTime };
    } else {
      if (!existing.clock_out_lunch) {
        db.prepare('UPDATE time_records SET clock_out_lunch = ? WHERE id = ?').run(clockTime, existing.id);
      } else if (!existing.clock_in_lunch) {
        db.prepare('UPDATE time_records SET clock_in_lunch = ? WHERE id = ?').run(clockTime, existing.id);
      } else {
        db.prepare('UPDATE time_records SET clock_out = ? WHERE id = ?').run(clockTime, existing.id);
      }
    }

    logAudit(
      userName || 'Colaborador',
      userRole || 'Colaborador',
      'CREATE',
      'RH & Ponto',
      `Registro de Ponto ${today}`,
      `Marcação de ponto registrada às ${clockTime} (${type || 'Entrada'})`,
      req.ip || '189.44.120.10'
    );

    return res.json({ success: true, clockTime, date: today });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Solicitação de Férias com Alçada Integrada
hrRouter.get('/vacations', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM vacation_requests ORDER BY created_at DESC').all() as any[];
    return res.json({ total: rows.length, vacations: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/vacations', (req: Request, res: Response) => {
  try {
    const { employeeId, employeeName, startDate, endDate, daysCount, userName, userRole } = req.body;

    if (!employeeId || !startDate || !endDate || !daysCount) {
      return res.status(400).json({ error: 'Campos obrigatórios: employeeId, startDate, endDate, daysCount.' });
    }

    const id = `vac-${Date.now()}`;
    const approvalId = `app-${Date.now()}`;
    const days = parseInt(daysCount);
    const empName = employeeName || userName || 'Colaborador';

    db.prepare(`
      INSERT INTO vacation_requests (id, employee_id, employee_name, start_date, end_date, days_count, status, approval_id)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDENTE', ?)
    `).run(id, employeeId, empName, startDate, endDate, days, approvalId);

    // Cria automaticamente alçada no motor de aprovações
    db.prepare(`
      INSERT INTO approvals (id, company_id, entity_type, title, description, department, requester_name, requester_role, status, priority, current_step, total_steps)
      VALUES (?, 'comp-1', 'FERIAS', ?, ?, 'Recursos Humanos', ?, 'Colaborador', 'PENDENTE', 'MEDIA', 1, 1)
    `).run(
      approvalId,
      `Solicitação de Férias (${days} dias) — ${empName}`,
      `Período de gozo: ${startDate} até ${endDate}. Abono e saldo aquisitivo validado pelo DP.`,
      empName
    );

    db.prepare(`
      INSERT INTO approval_steps (id, approval_id, step_number, label, required_level, status)
      VALUES (?, ?, 1, 'Aprovação do Gestor Departamental / RH', 'GESTOR', 'PENDENTE')
    `).run(`step-${Date.now()}`, approvalId);

    logAudit(
      empName,
      userRole || 'RH',
      'CREATE',
      'RH & Férias',
      `Férias ${empName}`,
      `Solicitados ${days} dias de férias de ${startDate} a ${endDate}`,
      req.ip || '189.44.120.10'
    );

    createCorporateNotification({
      title: 'Férias aguardando aprovação',
      message: `${empName} solicitou ${days} dias de férias (${startDate} a ${endDate}).`,
      type: 'HR',
      linkRoute: 'approvals'
    });

    return res.status(201).json({ success: true, id, approvalId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Organograma Corporativo Hierárquico
hrRouter.get('/organogram', (_req: Request, res: Response) => {
  try {
    const employees = db.prepare('SELECT id, registration_number, full_name, job_title, department, branch, manager_name FROM employees WHERE active = 1').all() as any[];

    const organogram = {
      level: 'Conselho & Holding',
      leader: 'Conselho de Administração',
      cLevel: employees.filter(e => e.job_title.includes('Diretor') || e.job_title.includes('Administrador Geral')),
      managers: employees.filter(e => e.job_title.includes('Gerente') || e.job_title.includes('Gestor') || e.job_title.includes('Líder')),
      specialists: employees.filter(e => !e.job_title.includes('Diretor') && !e.job_title.includes('Administrador Geral') && !e.job_title.includes('Gerente') && !e.job_title.includes('Gestor') && !e.job_title.includes('Líder'))
    };

    return res.json({ organogram });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// FOLHA DE PAGAMENTO (PAYROLL HCM & HOLERITES)
// ========================================================

// Listagem de folhas de pagamento
hrRouter.get('/payroll/runs', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.companyId || 'comp-1';
    const runs = payrollService.listRuns(companyId);
    return res.json({ total: runs.length, runs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Detalhes e holerites de uma folha
hrRouter.get('/payroll/runs/:id', (req: Request, res: Response) => {
  try {
    const run = payrollService.getRun(String(req.params.id));
    if (!run) return res.status(404).json({ error: 'Folha de pagamento não encontrada.' });
    return res.json(run);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Simulação de holerite em tempo real
hrRouter.post('/payroll/simulate', (req: Request, res: Response) => {
  try {
    const { employeeId, overtimeHours, dependentsCount } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'ID do colaborador obrigatório.' });
    const simulation = payrollService.simulatePayslip(employeeId, {
      overtimeHours: parseFloat(overtimeHours) || 0,
      dependentsCount: parseInt(dependentsCount) || 0
    });
    return res.json(simulation);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Processamento da folha em lote para o período
hrRouter.post('/payroll/process', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { period } = req.body;
    const companyId = authReq.companyId || 'comp-1';
    const result = payrollService.processPayrollRun(period, companyId, authReq.user, req.ip);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Aprovação e Integração Atômica da Folha com Financeiro e Contabilidade
hrRouter.post('/payroll/runs/:id/integrate', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = payrollService.integrateRunWithFinanceAndAccounting(String(req.params.id), authReq.user, req.ip);
    return res.json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// ========================================================
// ATS (RECRUTAMENTO & SELEÇÃO) & AVALIAÇÃO DE DESEMPENHO
// ========================================================

hrRouter.get('/jobs', (req: Request, res: Response) => {
  try {
    const jobs = db.prepare('SELECT * FROM job_postings ORDER BY created_at DESC').all() as any[];
    return res.json({ total: jobs.length, jobs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/jobs', (req: Request, res: Response) => {
  try {
    const { title, department, regime, salaryMin, salaryMax, openingsCount } = req.body;
    if (!title || !department) return res.status(400).json({ error: 'Título e Departamento obrigatórios.' });

    const id = `job-${Date.now()}`;
    const code = `VAG-${Math.floor(100 + Math.random() * 900)}`;

    db.prepare(`
      INSERT INTO job_postings (id, company_id, code, title, department, regime, salary_min, salary_max, openings_count, status)
      VALUES (?, 'comp-1', ?, ?, ?, ?, ?, ?, ?, 'ABERTA')
    `).run(id, code, title, department, regime || 'CLT', salaryMin || 0, salaryMax || 0, openingsCount || 1);

    return res.status(201).json({ success: true, id, code, title });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.get('/performance', (req: Request, res: Response) => {
  try {
    const reviews = db.prepare(`
      SELECT pr.*, e.full_name, e.job_title, e.department
      FROM performance_reviews pr
      JOIN employees e ON e.id = pr.employee_id
      ORDER BY pr.created_at DESC
    `).all() as any[];
    return res.json({ total: reviews.length, reviews });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// GESTÃO & COMPRA DE BENEFÍCIOS CORPORATIVOS
// ========================================================

hrRouter.get('/benefits/providers', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.companyId || 'comp-1';
    const providers = benefitsService.listProviders(companyId);
    return res.json({ total: providers.length, providers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.get('/benefits/plans', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.companyId || 'comp-1';
    const plans = benefitsService.listPlans(companyId);
    return res.json({ total: plans.length, plans });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.get('/benefits/employees', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.companyId || 'comp-1';
    const employeeBenefits = benefitsService.listEmployeeBenefits(companyId);
    return res.json({ total: employeeBenefits.length, employeeBenefits });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/calculate', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { period, businessDays } = req.body;
    const companyId = authReq.companyId || 'comp-1';
    const calculation = benefitsService.calculateBatch(period, parseInt(businessDays) || 21, companyId);
    return res.json(calculation);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/integrate', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { period, businessDays } = req.body;
    const companyId = authReq.companyId || 'comp-1';
    const result = benefitsService.approveAndIntegrateBatch(
      period,
      parseInt(businessDays) || 21,
      companyId,
      authReq.user,
      req.ip
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});

