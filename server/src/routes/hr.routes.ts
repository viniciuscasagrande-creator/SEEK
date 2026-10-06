import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { isPrivilegedRole, maskSalary } from '../utils/security.js';

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
