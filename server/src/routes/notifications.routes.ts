import { Router, Response } from 'express';
import { db, createCorporateNotification, logAudit } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const notificationsRouter = Router();

// Lista notificações do usuário + comunicados corporativos gerais
notificationsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-all';
    const rows = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = 'user-all' OR user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC LIMIT 100
    `).all(userId) as any[];
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

notificationsRouter.patch('/:id/read', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'user-all';
    db.prepare(`UPDATE notifications SET read = 1 WHERE id = ? AND (user_id = 'user-all' OR user_id = ? OR user_id IS NULL)`).run(id, userId);
    return res.json({ success: true, id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

notificationsRouter.post('/read-all', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'user-all';
    db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = 'user-all' OR user_id = ? OR user_id IS NULL`).run(userId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Envio manual/controlado de notificação corporativa
notificationsRouter.post('/broadcast', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, message, type, linkRoute, targetUserId } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Campos obrigatórios: title, message.' });

    const id = createCorporateNotification({
      title,
      message,
      type: type || 'SYSTEM',
      linkRoute: linkRoute || 'my-workstation',
      userId: targetUserId || 'user-all'
    });

    logAudit(
      req.user?.fullName || 'Sistema',
      req.user?.roleTitle || 'Administração',
      'CREATE',
      'Notificações',
      `Notificação ${id}`,
      `Disparo de alerta corporativo: "${title}"`,
      req.ip || '127.0.0.1',
      req.correlationId
    );

    return res.status(201).json({ success: true, id, title });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
