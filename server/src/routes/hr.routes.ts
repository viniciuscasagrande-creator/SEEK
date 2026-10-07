import { Router, Request, Response } from 'express';
import { db, logAudit, createCorporateNotification } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { isPrivilegedRole, maskSalary } from '../utils/security.js';
import { payrollService } from '../services/payroll.service.js';
import { benefitsService } from '../services/benefits.service.js';
import { financeService } from '../services/finance.service.js';

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
// Folha & Obrigações Financeiras — RH é a origem; Financeiro executa o pagamento.
hrRouter.get('/payroll', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = (req.query.companyId as string) || authReq.user?.companyId || 'comp-1';
    const rows = db.prepare(`SELECT * FROM payroll_runs WHERE company_id = ? ORDER BY period DESC, created_at DESC`).all(companyId) as any[];
    const runs = rows.map(r => ({
      id: r.id, companyId: r.company_id, period: r.period, dueDate: r.due_date, status: r.status,
      employeeCount: r.employee_count ?? r.total_employees ?? 0,
      grossAmount: r.gross_amount ?? r.total_gross ?? 0,
      adjustmentsAmount: r.adjustments_amount ?? 0,
      deductionsAmount: r.deductions_amount ?? r.total_deductions ?? 0,
      netAmount: r.net_amount ?? r.total_net ?? 0,
      financialRecordId: r.financial_record_id,
      closedBy: r.closed_by ?? r.approved_by,
      closedAt: r.closed_at ?? r.approved_at,
      createdAt: r.created_at
    }));
    return res.json({ total: runs.length, runs });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

hrRouter.post('/payroll/preview', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = authReq.user?.companyId || 'comp-1';
    const employees = db.prepare(`SELECT id, full_name, department, salary FROM employees WHERE active=1 AND company_id=? ORDER BY full_name`).all(companyId) as any[];
    const items = employees.map(e => ({ employeeId: e.id, employeeName: e.full_name, department: e.department, baseSalary: Number(e.salary), adjustments: 0, deductions: 0, netAmount: Number(e.salary) }));
    const grossAmount = items.reduce((a, i) => a + i.baseSalary, 0);
    return res.json({ companyId, employeeCount: items.length, grossAmount, adjustmentsAmount: 0, deductionsAmount: 0, netAmount: grossAmount, items });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

hrRouter.post('/payroll/close', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { period, dueDate, adjustments = [], deductions = [] } = req.body;
    if (!/^\d{4}-\d{2}$/.test(period || '') || !dueDate) return res.status(400).json({ error: 'Campos obrigatórios: period (AAAA-MM) e dueDate.' });
    const companyId = authReq.user?.companyId || 'comp-1';
    const existing = db.prepare(`SELECT * FROM payroll_runs WHERE company_id=? AND period=?`).get(companyId, period) as any;
    if (existing) return res.status(409).json({ error: 'A folha desta competência já foi criada.', run: existing });
    const employees = db.prepare(`SELECT id, full_name, department, salary FROM employees WHERE active=1 AND company_id=? ORDER BY full_name`).all(companyId) as any[];
    if (!employees.length) return res.status(422).json({ error: 'Não existem colaboradores ativos para fechamento.' });
    const adjustmentMap = new Map((adjustments || []).map((x: any) => [x.employeeId, Number(x.amount) || 0]));
    const deductionMap = new Map((deductions || []).map((x: any) => [x.employeeId, Number(x.amount) || 0]));
    const runId = `payroll-${period.replace('-', '')}-${Date.now()}`;
    const operator = authReq.user?.fullName || req.body.userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || req.body.userRole || 'RH';
    let gross = 0, add = 0, ded = 0, net = 0;
    let financial: any;
    const closeTx = db.transaction(() => {
      for (const e of employees) {
        const base = Number(e.salary) || 0, a = Number(adjustmentMap.get(e.id) || 0), d = Number(deductionMap.get(e.id) || 0), n = Math.max(0, base + a - d);
        gross += base; add += a; ded += d; net += n;
        db.prepare(`INSERT INTO payroll_items (id,payroll_run_id,employee_id,employee_name,department,base_salary,adjustments,deductions,net_amount) VALUES(?,?,?,?,?,?,?,?,?)`)
          .run(`payitem-${runId}-${e.id}`, runId, e.id, e.full_name, e.department, base, a, d, n);
      }
      db.prepare(`INSERT INTO payroll_runs (id,company_id,period,due_date,status,employee_count,gross_amount,adjustments_amount,deductions_amount,net_amount,closed_by,closed_at) VALUES(?,?,?,?, 'FECHADO',?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
        .run(runId, companyId, period, dueDate, employees.length, gross, add, ded, net, operator);
      financial = financeService.createRecord({
        type: 'PAGAR', title: `Folha salarial ${period}`, entityName: 'Funcionários — lote de folha', costCenter: 'Administrativo & Recursos Humanos',
        category: 'Folha de Pagamento', amount: net, dueDate, paymentMethod: 'PIX', originType: 'FOLHA', originId: runId, companyId,
        userName: operator, userRole: role
      }, authReq.user, req.ip || '127.0.0.1');
      db.prepare(`UPDATE payroll_runs SET financial_record_id=?, status='ENVIADO_FINANCEIRO' WHERE id=?`).run(financial.id, runId);
    });
    closeTx();
    logAudit(operator, role, 'CLOSE', 'RH & Folha', `Folha ${period}`, `Folha fechada com ${employees.length} colaboradores e obrigação financeira ${financial.code} no valor de R$ ${net.toFixed(2)}.`, req.ip || '127.0.0.1', authReq.correlationId);
    createCorporateNotification({ title: 'Folha enviada ao Financeiro', message: `Folha ${period}: ${employees.length} colaboradores, total líquido R$ ${net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`, type: 'HR', linkRoute: 'finance-payables' });
    return res.status(201).json({ success: true, runId, employeeCount: employees.length, grossAmount: gross, adjustmentsAmount: add, deductionsAmount: ded, netAmount: net, financialRecord: financial });
  } catch (error: any) { return res.status(error.statusCode || 500).json({ error: error.message }); }
});

hrRouter.get('/payroll/:id', (req: Request, res: Response) => {
  try {
    const run = db.prepare(`SELECT * FROM payroll_runs WHERE id=?`).get(req.params.id) as any;
    if (!run) return res.status(404).json({ error: 'Folha não encontrada.' });
    const items = db.prepare(`SELECT * FROM payroll_items WHERE payroll_run_id=? ORDER BY employee_name`).all(req.params.id) as any[];
    return res.json({ run, items });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// Após a aprovação das férias, RH informa o valor efetivamente apurado e gera a obrigação financeira.
hrRouter.post('/vacations/:id/generate-financial', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const vacation = db.prepare(`SELECT v.*, e.department, e.company_id FROM vacation_requests v JOIN employees e ON e.id=v.employee_id WHERE v.id=?`).get(req.params.id) as any;
    if (!vacation) return res.status(404).json({ error: 'Solicitação de férias não encontrada.' });
    if (vacation.status !== 'APROVADO') return res.status(409).json({ error: 'A obrigação financeira só pode ser gerada após aprovação das férias.' });
    if (vacation.financial_record_id) return res.status(409).json({ error: 'Esta solicitação já possui obrigação financeira.', financialRecordId: vacation.financial_record_id });
    const amount = Number(req.body.amount);
    const dueDate = req.body.dueDate;
    if (!(amount > 0) || !dueDate) return res.status(400).json({ error: 'Informe o valor apurado pelo RH e a data limite de pagamento.' });
    const operator = authReq.user?.fullName || req.body.userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || req.body.userRole || 'RH';
    const financial = financeService.createRecord({
      type: 'PAGAR', title: `Férias — ${vacation.employee_name}`, entityName: vacation.employee_name,
      costCenter: vacation.department || 'Administrativo & Recursos Humanos', category: 'Férias', amount, dueDate, paymentMethod: 'PIX',
      originType: 'FERIAS', originId: vacation.id, companyId: vacation.company_id || 'comp-1', userName: operator, userRole: role
    }, authReq.user, req.ip || '127.0.0.1');
    db.prepare(`UPDATE vacation_requests SET status='ENVIADO_FINANCEIRO', gross_amount=?, payment_due_date=?, financial_record_id=? WHERE id=?`).run(amount, dueDate, financial.id, vacation.id);
    logAudit(operator, role, 'CREATE', 'RH & Férias', `Férias ${vacation.employee_name}`, `Obrigação ${financial.code} gerada a partir das férias aprovadas.`, req.ip || '127.0.0.1', authReq.correlationId);
    createCorporateNotification({ title: 'Férias enviadas ao Financeiro', message: `${vacation.employee_name}: obrigação de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, vencimento ${dueDate}.`, type: 'HR', linkRoute: 'finance-payables' });
    return res.status(201).json({ success: true, financialRecord: financial });
  } catch (error: any) { return res.status(error.statusCode || 500).json({ error: error.message }); }
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
// GESTÃO & COMPRA DE BENEFÍCIOS CORPORATIVOS (VT, VA, VR, COMBUSTÍVEL — FASE 2)
// ========================================================
const BENEFIT_TYPES = ['VT', 'VA', 'VR', 'COMBUSTIVEL'];

const toDate = (value: string) => new Date(`${value}T12:00:00`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const periodBounds = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  return { start: new Date(y, m - 1, 1, 12), end: new Date(y, m, 0, 12) };
};
const businessDatesBetween = (start: Date, end: Date) => {
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(ymd(d));
  }
  return out;
};

function calculateBenefitRows(period: string) {
  const { start, end } = periodBounds(period);
  const allBusinessDates = businessDatesBetween(start, end);
  const totalBusinessDays = allBusinessDates.length;
  const benefits = db.prepare(`
    SELECT e.id as employee_id, e.full_name, e.department, e.admission_date, b.*
    FROM employees e
    JOIN employee_benefits b ON b.employee_id = e.id
    WHERE e.active = 1 AND b.enabled = 1
    ORDER BY e.full_name, b.benefit_type
  `).all() as any[];
  const vacations = db.prepare(`
    SELECT employee_id, start_date, end_date
    FROM vacation_requests
    WHERE status IN ('APROVADO', 'ENVIADO_FINANCEIRO', 'PAGO')
      AND end_date >= ? AND start_date <= ?
  `).all(ymd(start), ymd(end)) as any[];
  const absences = db.prepare(`
    SELECT employee_id, start_date, end_date, reason
    FROM benefit_absences
    WHERE end_date >= ? AND start_date <= ?
  `).all(ymd(start), ymd(end)) as any[];

  return benefits.map((r: any) => {
    const admission = toDate(r.admission_date);
    const prorateAdmission = Number(r.prorate_admission ?? 1) === 1;
    const deductVacation = Number(r.deduct_vacation ?? 1) === 1;
    const deductLeave = Number(r.deduct_leave ?? 1) === 1;

    const admissionBlocked = new Set<string>();
    if (prorateAdmission && admission > end) {
      allBusinessDates.forEach(d => admissionBlocked.add(d));
    } else if (prorateAdmission && admission > start && admission <= end) {
      allBusinessDates.filter(d => toDate(d) < admission).forEach(d => admissionBlocked.add(d));
    }

    const vacationBlocked = new Set<string>();
    if (deductVacation) {
      vacations
        .filter(v => v.employee_id === r.employee_id)
        .forEach(v =>
          businessDatesBetween(
            toDate(v.start_date) > start ? toDate(v.start_date) : start,
            toDate(v.end_date) < end ? toDate(v.end_date) : end
          ).forEach(d => vacationBlocked.add(d))
        );
    }

    const leaveBlocked = new Set<string>();
    if (deductLeave) {
      absences
        .filter(a => a.employee_id === r.employee_id)
        .forEach(a =>
          businessDatesBetween(
            toDate(a.start_date) > start ? toDate(a.start_date) : start,
            toDate(a.end_date) < end ? toDate(a.end_date) : end
          ).forEach(d => leaveBlocked.add(d))
        );
    }

    // Sobreposição de férias, afastamento e admissão não desconta duas vezes o mesmo dia:
    const eligibleDates = allBusinessDates.filter(
      d => !admissionBlocked.has(d) && !vacationBlocked.has(d) && !leaveBlocked.has(d)
    );
    const eligibleDays = eligibleDates.length;
    const admissionDeduct = admissionBlocked.size;
    const vacationDeduct = vacationBlocked.size;
    const leaveDeduct = leaveBlocked.size;

    const mode = String(r.calculation_mode || 'MENSAL').toUpperCase();
    const configuredDaily = Number(r.daily_value || r.unit_value || 0);
    const ratio = totalBusinessDays ? eligibleDays / totalBusinessDays : 0;
    let gross = Number(r.monthly_value || 0);
    let discount = Number(r.employee_discount || 0);
    let company = Number(r.company_cost || 0);

    if (mode === 'DIAS_UTEIS') {
      const daily = configuredDaily > 0 ? configuredDaily : (totalBusinessDays ? Number(r.monthly_value || 0) / totalBusinessDays : 0);
      gross = daily * eligibleDays;
      discount = Number(r.employee_discount || 0) * ratio;
      company = Math.max(0, gross - discount);
    } else if (eligibleDays !== totalBusinessDays) {
      gross = Number(r.monthly_value || 0) * ratio;
      discount = Number(r.employee_discount || 0) * ratio;
      company = Math.max(0, gross - discount);
    }

    return {
      ...r,
      business_days: totalBusinessDays,
      eligible_days: eligibleDays,
      admission_days_deducted: admissionDeduct,
      vacation_days_deducted: vacationDeduct,
      leave_days_deducted: leaveDeduct,
      calculated_monthly_value: Number(gross.toFixed(2)),
      calculated_employee_discount: Number(discount.toFixed(2)),
      calculated_company_cost: Number(company.toFixed(2)),
      calculation_detail: `${eligibleDays}/${totalBusinessDays} dias úteis elegíveis; admissão -${admissionDeduct}; férias -${vacationDeduct}; afastamentos -${leaveDeduct}`
    };
  });
}

hrRouter.get('/benefits', (_req: Request, res: Response) => {
  try {
    const employees = db.prepare(`SELECT id, registration_number, full_name, department, job_title, active FROM employees WHERE active = 1 ORDER BY full_name`).all() as any[];
    const benefits = db.prepare(`SELECT * FROM employee_benefits ORDER BY employee_id, benefit_type`).all() as any[];
    const byEmployee = new Map<string, any[]>();
    benefits.forEach(b => {
      const list = byEmployee.get(b.employee_id) || [];
      list.push(b);
      byEmployee.set(b.employee_id, list);
    });
    return res.json({
      employees: employees.map(e => ({
        id: e.id,
        registrationNumber: e.registration_number,
        fullName: e.full_name,
        department: e.department,
        jobTitle: e.job_title,
        benefits: (byEmployee.get(e.id) || []).map(b => ({
          id: b.id,
          type: b.benefit_type,
          enabled: Boolean(b.enabled),
          providerName: b.provider_name,
          calculationMode: b.calculation_mode,
          unitValue: b.unit_value,
          dailyValue: Number(b.daily_value || b.unit_value || 0),
          quantity: b.quantity,
          monthlyValue: b.monthly_value,
          employeeDiscount: b.employee_discount,
          companyCost: b.company_cost,
          validFrom: b.valid_from,
          validTo: b.valid_to,
          notes: b.notes,
          prorateAdmission: Boolean(b.prorate_admission ?? 1),
          deductVacation: Boolean(b.deduct_vacation ?? 1),
          deductLeave: Boolean(b.deduct_leave ?? 1)
        }))
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.put('/benefits/employees/:employeeId', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const employeeId = req.params.employeeId;
    const { benefits = [], userName, userRole } = req.body;
    const emp = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(employeeId) as any;
    if (!emp) return res.status(404).json({ error: 'Colaborador não encontrado.' });

    const tx = db.transaction(() => {
      for (const b of benefits) {
        if (!BENEFIT_TYPES.includes(b.type)) continue;
        const monthly = Number(b.monthlyValue ?? (Number(b.unitValue || 0) * Number(b.quantity || 1)));
        const discount = Number(b.employeeDiscount || 0);
        const company = Math.max(0, Number(b.companyCost ?? (monthly - discount)));
        const daily = Number(b.dailyValue || b.unitValue || 0);

        db.prepare(`
          INSERT INTO employee_benefits (
            id, employee_id, benefit_type, enabled, provider_name, calculation_mode,
            unit_value, quantity, monthly_value, employee_discount, company_cost,
            valid_from, valid_to, notes, prorate_admission, deduct_vacation, deduct_leave, daily_value, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(employee_id, benefit_type) DO UPDATE SET
            enabled = excluded.enabled,
            provider_name = excluded.provider_name,
            calculation_mode = excluded.calculation_mode,
            unit_value = excluded.unit_value,
            quantity = excluded.quantity,
            monthly_value = excluded.monthly_value,
            employee_discount = excluded.employee_discount,
            company_cost = excluded.company_cost,
            valid_from = excluded.valid_from,
            valid_to = excluded.valid_to,
            notes = excluded.notes,
            prorate_admission = excluded.prorate_admission,
            deduct_vacation = excluded.deduct_vacation,
            deduct_leave = excluded.deduct_leave,
            daily_value = excluded.daily_value,
            updated_at = CURRENT_TIMESTAMP
        `).run(
          `ben-${employeeId}-${b.type}`,
          employeeId,
          b.type,
          b.enabled === false ? 0 : 1,
          b.providerName || null,
          b.calculationMode || 'MENSAL',
          daily,
          Number(b.quantity || 1),
          monthly,
          discount,
          company,
          b.validFrom || null,
          b.validTo || null,
          b.notes || null,
          b.prorateAdmission === false ? 0 : 1,
          b.deductVacation === false ? 0 : 1,
          b.deductLeave === false ? 0 : 1,
          daily
        );
      }
    });
    tx();

    const operator = authReq.user?.fullName || userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || userRole || 'RH';
    logAudit(operator, role, 'UPDATE', 'RH & Benefícios', `Benefícios ${emp.full_name}`, 'Configuração de VT, VA, VR e/ou Auxílio Combustível atualizada com regras de proporcionalidade.', req.ip || '127.0.0.1', authReq.correlationId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.get('/benefits/orders', (_req: Request, res: Response) => {
  try {
    const orders = db.prepare(`SELECT * FROM benefit_orders ORDER BY period DESC, created_at DESC`).all();
    return res.json({ orders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/orders/preview', (req: Request, res: Response) => {
  try {
    const period = String(req.body.period || '');
    if (!/^\d{4}-\d{2}$/.test(period)) return res.status(400).json({ error: 'Competência inválida.' });

    const rows = calculateBenefitRows(period);
    const sums: any = { VT: 0, VA: 0, VR: 0, COMBUSTIVEL: 0 };
    rows.forEach(r => {
      sums[r.benefit_type] = (sums[r.benefit_type] || 0) + Number(r.calculated_company_cost || 0);
    });

    return res.json({
      period,
      businessDays: rows[0]?.business_days || 0,
      employeeCount: new Set(rows.map(r => r.employee_id)).size,
      items: rows,
      totals: sums,
      totalAmount: Object.values(sums).reduce((a: any, b: any) => a + Number(b), 0)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/orders', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { period, dueDate, userName, userRole } = req.body;
    if (!period || !dueDate) return res.status(400).json({ error: 'Competência e vencimento são obrigatórios.' });

    const companyId = authReq.user?.companyId || 'comp-1';
    const exists = db.prepare(`SELECT id FROM benefit_orders WHERE company_id = ? AND period = ?`).get(companyId, period) as any;
    if (exists) return res.status(409).json({ error: 'Já existe fechamento de benefícios para esta competência.' });

    const rows = calculateBenefitRows(period);
    if (!rows.length) return res.status(422).json({ error: 'Nenhum benefício ativo configurado.' });

    const sums: any = { VT: 0, VA: 0, VR: 0, COMBUSTIVEL: 0 };
    rows.forEach(r => {
      sums[r.benefit_type] = (sums[r.benefit_type] || 0) + Number(r.calculated_company_cost || 0);
    });
    const total = Object.values(sums).reduce((a: any, b: any) => a + Number(b), 0);
    const id = `bord-${Date.now()}`;
    const operator = authReq.user?.fullName || userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || userRole || 'RH';

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO benefit_orders (id, company_id, period, due_date, status, employee_count, vt_total, va_total, vr_total, fuel_total, total_amount, created_by)
        VALUES (?, ?, ?, ?, 'FECHADO', ?, ?, ?, ?, ?, ?, ?)
      `).run(id, companyId, period, dueDate, new Set(rows.map(r => r.employee_id)).size, sums.VT, sums.VA, sums.VR, sums.COMBUSTIVEL, total, operator);

      const ins = db.prepare(`
        INSERT INTO benefit_order_items (
          id, order_id, employee_id, employee_name, department, benefit_type, provider_name,
          company_cost, employee_discount, total_value, business_days, eligible_days,
          admission_days_deducted, vacation_days_deducted, leave_days_deducted,
          calculation_mode, calculation_detail
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      rows.forEach((r, i) => {
        ins.run(
          `boi-${Date.now()}-${i}`,
          id,
          r.employee_id,
          r.full_name,
          r.department,
          r.benefit_type,
          r.provider_name,
          Number(r.calculated_company_cost || 0),
          Number(r.calculated_employee_discount || 0),
          Number(r.calculated_monthly_value || 0),
          r.business_days,
          r.eligible_days,
          r.admission_days_deducted,
          r.vacation_days_deducted,
          r.leave_days_deducted,
          r.calculation_mode,
          r.calculation_detail
        );
      });
    });
    tx();

    logAudit(operator, role, 'CLOSE', 'RH & Benefícios', `Benefícios ${period}`, `Fechamento de ${rows.length} vínculos com proporcionalidade, total empresa R$ ${Number(total).toFixed(2)}.`, req.ip || '127.0.0.1', authReq.correlationId);
    return res.status(201).json({ success: true, id, totalAmount: total });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.get('/benefits/absences', (_req: Request, res: Response) => {
  try {
    const absences = db.prepare(`
      SELECT a.*, e.full_name as employee_name
      FROM benefit_absences a
      JOIN employees e ON e.id = a.employee_id
      ORDER BY a.start_date DESC
    `).all();
    return res.json({ absences });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/absences', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { employeeId, startDate, endDate, reason, notes, userName, userRole } = req.body;
    if (!employeeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Colaborador, início, fim e motivo são obrigatórios.' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ error: 'Data inicial não pode ser posterior à data final.' });
    }
    const emp = db.prepare(`SELECT full_name FROM employees WHERE id = ?`).get(employeeId) as any;
    if (!emp) return res.status(404).json({ error: 'Colaborador não encontrado.' });

    const id = `babs-${Date.now()}`;
    const operator = authReq.user?.fullName || userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || userRole || 'RH';

    db.prepare(`
      INSERT INTO benefit_absences (id, employee_id, start_date, end_date, reason, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, employeeId, startDate, endDate, reason, notes || null, operator);

    logAudit(operator, role, 'CREATE', 'RH & Benefícios', `Afastamento ${emp.full_name}`, `${reason}: ${startDate} a ${endDate}.`, req.ip || '127.0.0.1', authReq.correlationId);
    return res.status(201).json({ success: true, id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/orders/:id/send-finance', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const order = db.prepare(`SELECT * FROM benefit_orders WHERE id = ?`).get(req.params.id) as any;
    if (!order) return res.status(404).json({ error: 'Fechamento não encontrado.' });
    if (order.financial_record_id) return res.status(409).json({ error: 'Este fechamento já foi enviado ao Financeiro.' });

    const operator = authReq.user?.fullName || req.body.userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || req.body.userRole || 'RH';

    const record = financeService.createRecord({
      type: 'PAGAR',
      title: `Benefícios colaboradores ${order.period}`,
      entityName: 'Operadoras de Benefícios — lote mensal',
      costCenter: 'Administrativo & Recursos Humanos',
      category: 'Benefícios de Colaboradores',
      amount: order.total_amount,
      dueDate: order.due_date,
      originType: 'BENEFICIOS',
      originId: order.id,
      userName: operator,
      userRole: role
    }, authReq.user, req.ip || '127.0.0.1');

    db.prepare(`UPDATE benefit_orders SET status = 'ENVIADO_FINANCEIRO', financial_record_id = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`).run(record.id, order.id);
    createCorporateNotification({
      title: 'Benefícios enviados ao Financeiro',
      message: `Competência ${order.period}, total R$ ${Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      type: 'HR',
      linkRoute: 'finance-payables'
    });
    return res.json({ success: true, financialRecord: record });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoints complementares para compatibilidade retroativa
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

