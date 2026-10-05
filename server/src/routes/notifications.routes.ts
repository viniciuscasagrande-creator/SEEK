import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const notificationsRouter = Router();

// Lista Notificações
notificationsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all() as any[];
    const unreadCount = rows.filter(n => !n.read).length;

    const notifications = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      type: r.type,
      linkRoute: r.link_route,
      read: Boolean(r.read),
      createdAt: r.created_at
    }));

    return res.json({ total: notifications.length, unreadCount, notifications });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Marca como Lida
notificationsRouter.patch('/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
    return res.json({ success: true, id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Marca Todas como Lidas
notificationsRouter.post('/read-all', (_req: Request, res: Response) => {
  try {
    db.prepare('UPDATE notifications SET read = 1').run();
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Envio de Notificação Corporativa
notificationsRouter.post('/broadcast', (req: Request, res: Response) => {
  try {
    const { title, message, type, linkRoute, userName, userRole } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, message.' });
    }

    const id = `notif-${Date.now()}`;
    const notifType = type || 'INFO';

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_route, read)
      VALUES (?, 'user-all', ?, ?, ?, ?, 0)
    `).run(id, title, message, notifType, linkRoute || 'inicio');

    logAudit(
      userName || 'Sistema',
      userRole || 'Administração',
      'CREATE',
      'Notificações',
      `Notificação ${id}`,
      `Disparo de alerta corporativo: "${title}"`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({ success: true, id, title });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
