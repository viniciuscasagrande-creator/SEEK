import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const serviceDeskRouter = Router();

// Lista Chamados do Service Desk
serviceDeskRouter.get('/tickets', (req: Request, res: Response) => {
  try {
    const { department, status } = req.query;
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params: any[] = [];

    if (department && department !== 'ALL') {
      query += ' AND department = ?';
      params.push(department);
    }
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params) as any[];

    const tickets = rows.map(r => ({
      id: r.id,
      code: r.code,
      title: r.title,
      department: r.department,
      status: r.status,
      priority: r.priority,
      slaHoursRemaining: r.sla_hours_remaining,
      requesterName: r.requester_name,
      assignedTo: r.assigned_to,
      createdAt: r.created_at
    }));

    return res.json({ total: tickets.length, tickets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Abertura de Chamado
serviceDeskRouter.post('/tickets', (req: Request, res: Response) => {
  try {
    const { title, department, priority, requesterName, userName, userRole } = req.body;

    if (!title || !department) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, department.' });
    }

    const id = `tkt-${Date.now()}`;
    const code = `CH-2026-0${Math.floor(886 + Math.random() * 99)}`;
    const prio = priority || 'MEDIA';
    const sla = prio === 'CRITICA' ? 4 : prio === 'ALTA' ? 8 : prio === 'MEDIA' ? 24 : 48;
    const reqName = requesterName || userName || 'Colaborador';

    db.prepare(`
      INSERT INTO tickets (id, code, title, department, status, priority, sla_hours_remaining, requester_name)
      VALUES (?, ?, ?, ?, 'ABERTO', ?, ?, ?)
    `).run(id, code, title, department, prio, sla, reqName);

    logAudit(
      reqName,
      userRole || 'Colaborador',
      'CREATE',
      'Service Desk',
      `Chamado ${code}`,
      `Aberto chamado para ${department}: "${title}" (Prioridade: ${prio}, SLA: ${sla}h)`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      ticket: { id, code, title, department, priority: prio, slaHoursRemaining: sla }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Atualização de Status do Chamado
serviceDeskRouter.patch('/tickets/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, userName, userRole } = req.body;

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado.' });
    }

    const assigned = assignedTo || userName || ticket.assigned_to;
    db.prepare('UPDATE tickets SET status = ?, assigned_to = ? WHERE id = ?').run(status, assigned, id);

    logAudit(
      userName || 'Atendente',
      userRole || 'Atendimento',
      'UPDATE',
      'Service Desk',
      `Chamado ${ticket.code}`,
      `Status do chamado alterado de ${ticket.status} para ${status}`,
      req.ip || '189.44.120.10'
    );

    return res.json({ success: true, ticketId: id, status, assignedTo: assigned });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
