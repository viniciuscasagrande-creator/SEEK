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
  const adjustments = db.prepare(`
    SELECT employee_id, benefit_type, adjustment_type, amount, reason
    FROM benefit_adjustments
    WHERE period = ?
  `).all(period) as any[];

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

    const rowAdjustments = adjustments.filter(a => a.employee_id === r.employee_id && a.benefit_type === r.benefit_type);
    const adjustmentAmount = rowAdjustments.reduce((sum, a) => sum + (String(a.adjustment_type).toUpperCase() === 'DESCONTO' ? -Math.abs(Number(a.amount || 0)) : Math.abs(Number(a.amount || 0))), 0);
    const finalCompany = Math.max(0, company + adjustmentAmount);
    const adjustmentText = rowAdjustments.length ? `; ajustes ${adjustmentAmount >= 0 ? '+' : ''}R$ ${adjustmentAmount.toFixed(2)}` : '';

    return {
      ...r,
      business_days: totalBusinessDays,
      eligible_days: eligibleDays,
      admission_days_deducted: admissionDeduct,
      vacation_days_deducted: vacationDeduct,
      leave_days_deducted: leaveDeduct,
      calculated_monthly_value: Number(gross.toFixed(2)),
      calculated_employee_discount: Number(discount.toFixed(2)),
      calculated_company_cost: Number(finalCompany.toFixed(2)),
      base_company_cost: Number(company.toFixed(2)),
      adjustment_amount: Number(adjustmentAmount.toFixed(2)),
      final_company_cost: Number(finalCompany.toFixed(2)),
      calculation_detail: `${eligibleDays}/${totalBusinessDays} dias úteis elegíveis; admissão -${admissionDeduct}; férias -${vacationDeduct}; afastamentos -${leaveDeduct}${adjustmentText}`
    };
  });
}

function rebuildBenefitConference(period: string) {
  const rows = calculateBenefitRows(period) as any[];
  const activeProviders = db.prepare(`SELECT name, benefit_type FROM benefit_providers WHERE active = 1`).all() as any[];
  const providerKeys = new Set(activeProviders.map(p => `${String(p.benefit_type).toUpperCase()}::${String(p.name).trim().toLowerCase()}`));
  const upsert = db.prepare(`
    INSERT INTO benefit_conferences (id, period, employee_id, benefit_type, status, issue_level, issue_code, issue_message, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(period, employee_id, benefit_type) DO UPDATE SET
      issue_level = excluded.issue_level,
      issue_code = excluded.issue_code,
      issue_message = excluded.issue_message,
      updated_at = CURRENT_TIMESTAMP,
      status = CASE WHEN benefit_conferences.status = 'CONFERIDO' AND excluded.issue_level = 'OK' THEN 'CONFERIDO' ELSE 'PENDENTE' END
  `);

  const tx = db.transaction(() => {
    for (const r of rows) {
      let level = 'OK', code: string | null = null, message: string | null = null;
      const provider = String(r.provider_name || '').trim();
      if (!provider) {
        level = 'CRITICO';
        code = 'SEM_OPERADORA';
        message = 'Benefício sem operadora/fornecedor definido.';
      } else if (!providerKeys.has(`${String(r.benefit_type).toUpperCase()}::${provider.toLowerCase()}`)) {
        level = 'CRITICO';
        code = 'OPERADORA_NAO_CADASTRADA';
        message = 'Operadora não cadastrada ou inativa para este benefício.';
      } else if (Number(r.calculated_company_cost || 0) <= 0 && Number(r.eligible_days || 0) > 0) {
        level = 'CRITICO';
        code = 'VALOR_INVALIDO';
        message = 'Valor final da empresa está zerado ou inválido.';
      } else if (Number(r.eligible_days || 0) <= 0) {
        level = 'ATENCAO';
        code = 'SEM_DIAS_ELEGIVEIS';
        message = 'Colaborador sem dias úteis elegíveis nesta competência.';
      }
      upsert.run(
        `bc-${period}-${r.employee_id}-${r.benefit_type}`,
        period,
        r.employee_id,
        r.benefit_type,
        level === 'CRITICO' ? 'PENDENTE' : 'PENDENTE',
        level,
        code,
        message
      );
    }
  });
  tx();
  return rows;
}

hrRouter.get('/benefits/conference', (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || '');
    if (!/^\d{4}-\d{2}$/.test(period)) return res.status(400).json({ error: 'Competência inválida.' });
    const rows = rebuildBenefitConference(period);
    const conferences = db.prepare(`
      SELECT c.*, e.full_name employee_name, e.registration_number, e.department
      FROM benefit_conferences c
      JOIN employees e ON e.id = c.employee_id
      WHERE c.period = ?
      ORDER BY CASE c.issue_level WHEN 'CRITICO' THEN 0 WHEN 'ATENCAO' THEN 1 ELSE 2 END, e.full_name, c.benefit_type
    `).all(period) as any[];
    const byKey = new Map(conferences.map(c => [`${c.employee_id}::${c.benefit_type}`, c]));
    const items = rows.map((r: any) => ({ ...r, conference: byKey.get(`${r.employee_id}::${r.benefit_type}`) }));
    const summary = {
      total: conferences.length,
      conferidos: conferences.filter(c => c.status === 'CONFERIDO').length,
      pendentes: conferences.filter(c => c.status === 'PENDENTE').length,
      criticos: conferences.filter(c => c.issue_level === 'CRITICO').length,
      atencoes: conferences.filter(c => c.issue_level === 'ATENCAO').length
    };
    return res.json({ period, summary, items });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/conference/review', (req: Request, res: Response) => {
  try {
    const { period, employeeId, benefitType, status, notes, userName, userRole } = req.body;
    if (!/^\d{4}-\d{2}$/.test(String(period || '')) || !employeeId || !BENEFIT_TYPES.includes(benefitType) || !['CONFERIDO', 'PENDENTE'].includes(status)) {
      return res.status(400).json({ error: 'Dados de conferência inválidos.' });
    }
    rebuildBenefitConference(period);
    const row = db.prepare(`SELECT * FROM benefit_conferences WHERE period = ? AND employee_id = ? AND benefit_type = ?`).get(period, employeeId, benefitType) as any;
    if (!row) return res.status(404).json({ error: 'Item de conferência não encontrado.' });
    if (status === 'CONFERIDO' && row.issue_level === 'CRITICO') {
      return res.status(422).json({ error: 'Corrija a divergência crítica antes de marcar como conferido.' });
    }
    db.prepare(`UPDATE benefit_conferences SET status = ?, notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, notes || null, userName || 'RH', row.id);
    logAudit(userName || 'Recursos Humanos', userRole || 'RH', 'REVIEW', 'RH & Benefícios', `Conferência ${period}`, `${benefitType} de ${employeeId}: ${status}.`, req.ip || '127.0.0.1');
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/conference/:period/confirm-clear', (req: Request, res: Response) => {
  try {
    const period = String(req.params.period || '');
    rebuildBenefitConference(period);
    const result = db.prepare(`
      UPDATE benefit_conferences
      SET status = 'CONFERIDO', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE period = ? AND issue_level <> 'CRITICO'
    `).run(req.body.userName || 'RH', period);
    return res.json({ success: true, updated: result.changes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

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

hrRouter.get('/benefits/providers', (_req: Request, res: Response) => {
  try {
    const providers = db.prepare(`SELECT * FROM benefit_providers ORDER BY benefit_type, name`).all();
    return res.json({ providers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/providers', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, document, benefitType, contactName, contactEmail, contactPhone, paymentMethod, billingDay, userName, userRole } = req.body;
    if (!name || !BENEFIT_TYPES.includes(benefitType)) {
      return res.status(400).json({ error: 'Nome e tipo de benefício válidos são obrigatórios.' });
    }
    const id = `bprov-${Date.now()}`;
    const operator = authReq.user?.fullName || userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || userRole || 'RH';

    db.prepare(`
      INSERT INTO benefit_providers (id, name, document, benefit_type, contact_name, contact_email, contact_phone, payment_method, billing_day, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, name, document || null, benefitType, contactName || null, contactEmail || null, contactPhone || null, paymentMethod || null, billingDay ? Number(billingDay) : null);

    logAudit(operator, role, 'CREATE', 'RH & Benefícios', `Operadora ${name}`, `Operadora cadastrada para ${benefitType}.`, req.ip || '127.0.0.1', authReq.correlationId);
    return res.status(201).json({ success: true, id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.put('/benefits/providers/:id', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, document, contactName, contactEmail, contactPhone, paymentMethod, billingDay, active, userName, userRole } = req.body;
    const current = db.prepare(`SELECT * FROM benefit_providers WHERE id = ?`).get(req.params.id) as any;
    if (!current) return res.status(404).json({ error: 'Operadora não encontrada.' });

    const operator = authReq.user?.fullName || userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || userRole || 'RH';

    db.prepare(`
      UPDATE benefit_providers
      SET name = ?, document = ?, contact_name = ?, contact_email = ?, contact_phone = ?, payment_method = ?, billing_day = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || current.name,
      document ?? current.document,
      contactName ?? current.contact_name,
      contactEmail ?? current.contact_email,
      contactPhone ?? current.contact_phone,
      paymentMethod ?? current.payment_method,
      billingDay === undefined ? current.billing_day : Number(billingDay),
      active === false ? 0 : 1,
      req.params.id
    );

    logAudit(operator, role, 'UPDATE', 'RH & Benefícios', `Operadora ${name || current.name}`, 'Cadastro da operadora atualizado.', req.ip || '127.0.0.1', authReq.correlationId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.get('/benefits/adjustments', (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || '');
    const rows = period
      ? db.prepare(`SELECT a.*, e.full_name employee_name FROM benefit_adjustments a JOIN employees e ON e.id = a.employee_id WHERE a.period = ? ORDER BY a.created_at DESC`).all(period)
      : db.prepare(`SELECT a.*, e.full_name employee_name FROM benefit_adjustments a JOIN employees e ON e.id = a.employee_id ORDER BY a.created_at DESC LIMIT 200`).all();
    return res.json({ adjustments: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/adjustments', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { period, employeeId, benefitType, adjustmentType, amount, reason, userName, userRole } = req.body;
    if (!/^\d{4}-\d{2}$/.test(String(period || '')) || !employeeId || !BENEFIT_TYPES.includes(benefitType) || !['CREDITO', 'DESCONTO'].includes(String(adjustmentType || '').toUpperCase()) || !(Number(amount) > 0) || !reason) {
      return res.status(400).json({ error: 'Competência, colaborador, benefício, tipo, valor e motivo são obrigatórios.' });
    }
    const id = `badj-${Date.now()}`;
    const operator = authReq.user?.fullName || userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || userRole || 'RH';

    db.prepare(`
      INSERT INTO benefit_adjustments (id, period, employee_id, benefit_type, adjustment_type, amount, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, period, employeeId, benefitType, String(adjustmentType).toUpperCase(), Math.abs(Number(amount)), reason, operator);

    logAudit(operator, role, 'CREATE', 'RH & Benefícios', `Ajuste ${period}`, `${benefitType} ${adjustmentType} R$ ${Number(amount).toFixed(2)}. ${reason}`, req.ip || '127.0.0.1', authReq.correlationId);
    return res.status(201).json({ success: true, id });
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

    const rows = rebuildBenefitConference(period);
    if (!rows.length) return res.status(422).json({ error: 'Nenhum benefício ativo configurado.' });

    const critical = (db.prepare(`SELECT COUNT(*) count FROM benefit_conferences WHERE period = ? AND issue_level = 'CRITICO'`).get(period) as any)?.count || 0;
    const pending = (db.prepare(`SELECT COUNT(*) count FROM benefit_conferences WHERE period = ? AND status <> 'CONFERIDO'`).get(period) as any)?.count || 0;
    if (critical > 0) return res.status(422).json({ error: `Existem ${critical} divergência(s) crítica(s). Corrija antes de fechar.` });
    if (pending > 0) return res.status(422).json({ error: `Existem ${pending} item(ns) ainda não conferidos.` });

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
        VALUES (?, ?, ?, ?, 'AGUARDANDO_APROVACAO', ?, ?, ?, ?, ?, ?, ?)
      `).run(id, companyId, period, dueDate, new Set(rows.map(r => r.employee_id)).size, sums.VT, sums.VA, sums.VR, sums.COMBUSTIVEL, total, operator);

      const ins = db.prepare(`
        INSERT INTO benefit_order_items (
          id, order_id, employee_id, employee_name, department, benefit_type, provider_name,
          company_cost, employee_discount, total_value, business_days, eligible_days,
          admission_days_deducted, vacation_days_deducted, leave_days_deducted,
          calculation_mode, calculation_detail, adjustment_amount, final_company_cost
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          Number((r.base_company_cost ?? r.calculated_company_cost) || 0),
          Number(r.calculated_employee_discount || 0),
          Number(r.calculated_monthly_value || 0),
          r.business_days,
          r.eligible_days,
          r.admission_days_deducted,
          r.vacation_days_deducted,
          r.leave_days_deducted,
          r.calculation_mode,
          r.calculation_detail,
          Number(r.adjustment_amount || 0),
          Number(r.calculated_company_cost || 0)
        );
      });

      db.prepare(`UPDATE benefit_conferences SET status = 'CONFERIDO', reviewed_by = COALESCE(reviewed_by, ?), reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP) WHERE period = ?`).run(operator, period);

      // Cria pedidos de compra agrupados por benefício e operadora
      const grouped = new Map<string, { provider: string; type: string; employees: Set<string>; total: number }>();
      rows.forEach((r: any) => {
        const provider = String(r.provider_name || 'Operadora não definida').trim() || 'Operadora não definida';
        const key = `${r.benefit_type}::${provider}`;
        const g = grouped.get(key) || { provider, type: r.benefit_type, employees: new Set<string>(), total: 0 };
        g.employees.add(r.employee_id);
        g.total += Number(r.calculated_company_cost || 0);
        grouped.set(key, g);
      });

      let ix = 0;
      for (const g of grouped.values()) {
        db.prepare(`
          INSERT INTO benefit_purchase_batches (id, order_id, provider_name, benefit_type, employee_count, total_amount, status)
          VALUES (?, ?, ?, ?, ?, ?, 'AGUARDANDO_COMPRA')
        `).run(`bp-${Date.now()}-${ix++}`, id, g.provider, g.type, g.employees.size, Number(g.total.toFixed(2)));
      }
    });
    tx();

    logAudit(operator, role, 'CLOSE', 'RH & Benefícios', `Benefícios ${period}`, `Fechamento de ${rows.length} vínculos, total empresa R$ ${Number(total).toFixed(2)}.`, req.ip || '127.0.0.1', authReq.correlationId);
    return res.status(201).json({ success: true, id, totalAmount: total });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/orders/:id/approve', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const order = db.prepare(`SELECT * FROM benefit_orders WHERE id = ?`).get(req.params.id) as any;
    if (!order) return res.status(404).json({ error: 'Fechamento não encontrado.' });
    if (!['AGUARDANDO_APROVACAO', 'FECHADO'].includes(order.status)) {
      return res.status(409).json({ error: 'Este fechamento não está aguardando aprovação.' });
    }
    const critical = (db.prepare(`SELECT COUNT(*) count FROM benefit_conferences WHERE period = ? AND issue_level = 'CRITICO'`).get(order.period) as any)?.count || 0;
    const pending = (db.prepare(`SELECT COUNT(*) count FROM benefit_conferences WHERE period = ? AND status <> 'CONFERIDO'`).get(order.period) as any)?.count || 0;
    if (critical || pending) {
      return res.status(422).json({ error: 'Existem pendências de conferência. O fechamento não pode ser aprovado.' });
    }
    const operator = authReq.user?.fullName || req.body.userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || req.body.userRole || 'RH';

    db.prepare(`
      UPDATE benefit_orders
      SET status = 'APROVADO', approved_by = ?, approved_at = CURRENT_TIMESTAMP, locked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(operator, order.id);

    logAudit(operator, role, 'APPROVE', 'RH & Benefícios', `Benefícios ${order.period}`, 'Fechamento conferido, aprovado e bloqueado para compra.', req.ip || '127.0.0.1', authReq.correlationId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.get('/benefits/purchases', (req: Request, res: Response) => {
  try {
    const orderId = String(req.query.orderId || '');
    const rows = orderId
      ? db.prepare(`SELECT p.*, o.period, o.due_date FROM benefit_purchase_batches p JOIN benefit_orders o ON o.id = p.order_id WHERE p.order_id = ? ORDER BY p.benefit_type, p.provider_name`).all(orderId)
      : db.prepare(`SELECT p.*, o.period, o.due_date FROM benefit_purchase_batches p JOIN benefit_orders o ON o.id = p.order_id ORDER BY o.period DESC, p.benefit_type, p.provider_name`).all();
    return res.json({ purchases: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/purchases/:id/send-finance', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const batch = db.prepare(`SELECT p.*, o.period, o.due_date FROM benefit_purchase_batches p JOIN benefit_orders o ON o.id = p.order_id WHERE p.id = ?`).get(req.params.id) as any;
    if (!batch) return res.status(404).json({ error: 'Pedido de compra não encontrado.' });
    if (batch.financial_record_id) return res.status(409).json({ error: 'Este pedido já foi enviado ao Financeiro.' });
    if (batch.provider_name === 'Operadora não definida') return res.status(422).json({ error: 'Defina a operadora/fornecedor nos colaboradores antes de enviar este pedido.' });

    const parentOrder = db.prepare(`SELECT status FROM benefit_orders WHERE id = ?`).get(batch.order_id) as any;
    if (!parentOrder || !['APROVADO', 'EM_COMPRA', 'FECHADO'].includes(parentOrder.status)) {
      return res.status(422).json({ error: 'A competência precisa estar aprovada pelo RH antes do envio ao Financeiro.' });
    }

    const operator = authReq.user?.fullName || req.body.userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || req.body.userRole || 'RH';
    const label = batch.benefit_type === 'COMBUSTIVEL' ? 'Auxílio Combustível' : batch.benefit_type;

    const record = financeService.createRecord({
      type: 'PAGAR',
      title: `${label} ${batch.period} — ${batch.provider_name}`,
      entityName: batch.provider_name,
      costCenter: 'Administrativo & Recursos Humanos',
      category: 'Benefícios de Colaboradores',
      amount: batch.total_amount,
      dueDate: batch.due_date,
      originType: 'BENEFICIO_COMPRA',
      originId: batch.id,
      userName: operator,
      userRole: role
    }, authReq.user, req.ip || '127.0.0.1');

    db.prepare(`UPDATE benefit_purchase_batches SET status = 'ENVIADO_FINANCEIRO', financial_record_id = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`).run(record.id, batch.id);
    db.prepare(`UPDATE benefit_orders SET status = 'EM_COMPRA' WHERE id = ? AND status IN ('APROVADO', 'FECHADO')`).run(batch.order_id);

    createCorporateNotification({
      title: 'Compra de benefício enviada ao Financeiro',
      message: `${label} · ${batch.provider_name} · ${batch.employee_count} colaborador(es) · R$ ${Number(batch.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      type: 'HR',
      linkRoute: 'finance-payables'
    });
    return res.json({ success: true, financialRecord: record });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.get('/benefits/purchases/:id/operator-file', (req: Request, res: Response) => {
  try {
    const batch = db.prepare(`SELECT p.*, o.period FROM benefit_purchase_batches p JOIN benefit_orders o ON o.id = p.order_id WHERE p.id = ?`).get(req.params.id) as any;
    if (!batch) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const items = db.prepare(`
      SELECT i.employee_id, i.employee_name, i.department, i.benefit_type, i.provider_name, i.final_company_cost, i.eligible_days, i.business_days
      FROM benefit_order_items i
      WHERE i.order_id = ? AND i.benefit_type = ? AND COALESCE(NULLIF(TRIM(i.provider_name), ''), 'Operadora não definida') = ?
      ORDER BY i.employee_name
    `).all(batch.order_id, batch.benefit_type, batch.provider_name) as any[];

    const header = ['Matrícula/ID', 'Colaborador', 'Departamento', 'Benefício', 'Operadora', 'Dias elegíveis', 'Dias úteis', 'Valor'];
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      header.map(escape).join(';'),
      ...items.map(i => [
        i.employee_id,
        i.employee_name,
        i.department,
        i.benefit_type,
        i.provider_name,
        i.eligible_days,
        i.business_days,
        Number(i.final_company_cost || 0).toFixed(2).replace('.', ',')
      ].map(escape).join(';'))
    ].join('\n');

    const fileName = `beneficios_${batch.period}_${batch.benefit_type}_${String(batch.provider_name).replace(/[^a-zA-Z0-9]+/g, '_')}.csv`;
    db.prepare(`
      INSERT INTO benefit_operator_files (id, batch_id, file_type, file_name, row_count, total_amount, generated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`bof-${Date.now()}`, batch.id, 'ENVIO', fileName, items.length, batch.total_amount, String(req.query.userName || 'RH'));

    db.prepare(`UPDATE benefit_purchase_batches SET operator_file_name = ?, operator_sent_at = CURRENT_TIMESTAMP WHERE id = ?`).run(fileName, batch.id);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send('\ufeff' + csv);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/purchases/:id/operator-return', (req: Request, res: Response) => {
  try {
    const batch = db.prepare(`SELECT * FROM benefit_purchase_batches WHERE id = ?`).get(req.params.id) as any;
    if (!batch) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'Informe os valores processados pela operadora.' });

    const update = db.prepare(`
      UPDATE benefit_order_items
      SET operator_processed_amount = ?, divergence_amount = ?, divergence_reason = ?, credit_status = CASE WHEN ABS(?) < 0.01 THEN 'AGUARDANDO_CREDITO' ELSE 'DIVERGENCIA' END
      WHERE order_id = ? AND employee_id = ? AND benefit_type = ?
    `);

    let divergences = 0;
    const tx = db.transaction(() => {
      for (const it of items) {
        const row = db.prepare(`SELECT * FROM benefit_order_items WHERE order_id = ? AND employee_id = ? AND benefit_type = ?`).get(batch.order_id, it.employeeId, batch.benefit_type) as any;
        if (!row) continue;
        const processed = Number(it.processedAmount || 0);
        const diff = Number((processed - Number(row.final_company_cost || 0)).toFixed(2));
        if (Math.abs(diff) >= 0.01) divergences++;
        update.run(
          processed,
          diff,
          Math.abs(diff) >= 0.01 ? (it.reason || 'Valor retornado pela operadora difere do solicitado.') : null,
          diff,
          batch.order_id,
          it.employeeId,
          batch.benefit_type
        );
      }
    });
    tx();

    db.prepare(`UPDATE benefit_purchase_batches SET status = ?, operator_returned_at = CURRENT_TIMESTAMP WHERE id = ?`).run(divergences ? 'DIVERGENCIA' : 'PROCESSADO_OPERADORA', batch.id);
    return res.json({ success: true, divergences });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

hrRouter.post('/benefits/purchases/:id/confirm-credit', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const batch = db.prepare(`SELECT * FROM benefit_purchase_batches WHERE id = ?`).get(req.params.id) as any;
    if (!batch) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const divergences = (db.prepare(`SELECT COUNT(*) count FROM benefit_order_items WHERE order_id = ? AND benefit_type = ? AND credit_status = 'DIVERGENCIA'`).get(batch.order_id, batch.benefit_type) as any)?.count || 0;
    if (divergences > 0) return res.status(422).json({ error: 'Existem divergências no retorno da operadora. Resolva antes de confirmar o crédito.' });

    const operator = authReq.user?.fullName || req.body.userName || 'Recursos Humanos';
    const role = authReq.user?.roleTitle || req.body.userRole || 'RH';

    db.prepare(`
      UPDATE benefit_order_items
      SET credit_status = 'CREDITADO', credit_confirmed_at = CURRENT_TIMESTAMP
      WHERE order_id = ? AND benefit_type = ? AND COALESCE(provider_name, '') = ?
    `).run(batch.order_id, batch.benefit_type, batch.provider_name);

    db.prepare(`UPDATE benefit_purchase_batches SET status = 'CREDITADO', credit_confirmed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(batch.id);

    const pending = (db.prepare(`SELECT COUNT(*) count FROM benefit_purchase_batches WHERE order_id = ? AND status <> 'CREDITADO'`).get(batch.order_id) as any)?.count || 0;
    if (pending === 0) db.prepare(`UPDATE benefit_orders SET status = 'CONCLUIDO' WHERE id = ?`).run(batch.order_id);

    logAudit(operator, role, 'CONFIRM', 'RH & Benefícios', `Crédito ${batch.benefit_type}`, 'Crédito dos benefícios confirmado pelo RH.', req.ip || '127.0.0.1', authReq.correlationId);
    return res.json({ success: true });
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

    const batches = (db.prepare(`SELECT COUNT(*) count FROM benefit_purchase_batches WHERE order_id = ?`).get(order.id) as any)?.count || 0;
    if (batches > 0) {
      return res.status(409).json({ error: 'Este fechamento possui pedidos de compra por operadora. Envie os pedidos individualmente ao Financeiro.' });
    }

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

