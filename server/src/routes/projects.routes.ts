import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const projectsRouter = Router();

// Lista Projetos Estratégicos
projectsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM projects ORDER BY deadline ASC').all() as any[];
    const projects = rows.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      department: r.department,
      leaderName: r.leader_name,
      progress: r.progress,
      budget: r.budget,
      spent: r.spent,
      deadline: r.deadline,
      status: r.status
    }));

    return res.json({ total: projects.length, projects });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro de Projeto
projectsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, department, leaderName, budget, deadline, userName, userRole } = req.body;

    if (!name || !department || !budget) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, department, budget.' });
    }

    const id = `prj-${Date.now()}`;
    const code = `PRJ-2026-0${Math.floor(10 + Math.random() * 89)}`;
    const parsedBudget = parseFloat(budget);

    db.prepare(`
      INSERT INTO projects (id, code, name, department, leader_name, progress, budget, spent, deadline, status)
      VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, 'EM_ANDAMENTO')
    `).run(
      id,
      code,
      name,
      department,
      leaderName || userName || 'Gestor de Projetos',
      parsedBudget,
      deadline || '2026-12-31'
    );

    logAudit(
      userName || 'Gestor de Projetos',
      userRole || 'Operações',
      'CREATE',
      'Projetos & Operações',
      `Projeto ${code}`,
      `Novo projeto estratégico: "${name}" com budget de R$ ${parsedBudget.toFixed(2)}`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      project: { id, code, name, department, budget: parsedBudget }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Lista Tarefas de Projetos
projectsRouter.get('/tasks', (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    let query = 'SELECT * FROM project_tasks';
    const params: any[] = [];

    if (projectId) {
      query += ' WHERE project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY due_date ASC';
    const rows = db.prepare(query).all(...params) as any[];

    const tasks = rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      title: r.title,
      assigneeName: r.assignee_name,
      dueDate: r.due_date,
      priority: r.priority,
      status: r.status,
      hoursEstimated: r.hours_estimated,
      hoursSpent: r.hours_spent
    }));

    return res.json({ total: tasks.length, tasks });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Atualização de Status da Tarefa (Kanban Drag / Move)
projectsRouter.patch('/tasks/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, userName, userRole } = req.body;

    const task = db.prepare('SELECT * FROM project_tasks WHERE id = ?').get(id) as any;
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }

    db.prepare('UPDATE project_tasks SET status = ? WHERE id = ?').run(status, id);

    logAudit(
      userName || 'Operador',
      userRole || 'Operações',
      'UPDATE',
      'Projetos & Operações',
      `Tarefa #${id}`,
      `Status da tarefa "${task.title}" atualizado para ${status}`,
      req.ip || '189.44.120.10'
    );

    return res.json({ success: true, taskId: id, newStatus: status });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro de Nova Tarefa
projectsRouter.post('/tasks', (req: Request, res: Response) => {
  try {
    const { projectId, title, assigneeName, dueDate, priority, hoursEstimated, userName, userRole } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, projectId.' });
    }

    const id = `tsk-${Date.now()}`;
    const hours = parseFloat(hoursEstimated) || 8.0;

    db.prepare(`
      INSERT INTO project_tasks (id, project_id, title, assignee_name, due_date, priority, status, hours_estimated, hours_spent)
      VALUES (?, ?, ?, ?, ?, ?, 'A_FAZER', ?, 0)
    `).run(
      id,
      projectId,
      title,
      assigneeName || 'Colaborador Ativo',
      dueDate || '2026-11-15',
      priority || 'MEDIA',
      hours
    );

    logAudit(
      userName || 'Líder do Projeto',
      userRole || 'Operações',
      'CREATE',
      'Projetos & Operações',
      `Tarefa ${id}`,
      `Criada tarefa "${title}" com estimativa de ${hours}h`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      task: { id, projectId, title, status: 'A_FAZER' }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
