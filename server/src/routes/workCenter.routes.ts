import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const workCenterRouter = Router();

type WorkItem = {
  id: string;
  kind: string;
  module: string;
  title: string;
  description: string;
  route: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  status: string;
  dueDate?: string | null;
  amount?: number | null;
};

const canUse = (req: AuthenticatedRequest, moduleKey: string) => {
  const user = req.user;
  if (!user) return false;
  return user.roleLevel === 'ADMIN_GERAL' || user.accessibleModules.includes('*') || user.accessibleModules.includes(moduleKey);
};

workCenterRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const queue: WorkItem[] = [];
    const user = req.user!;
    const companyId = req.companyId || user.companyId || 'comp-1';

    // Aprovações: respeita a etapa atual e o perfil do usuário sempre que possível.
    const approvals = db.prepare(`
      SELECT a.*, s.required_level
      FROM approvals a
      LEFT JOIN approval_steps s ON s.approval_id = a.id AND s.step_number = a.current_step
      WHERE a.status = 'PENDENTE' AND (a.company_id = ? OR a.company_id IS NULL)
      ORDER BY CASE a.priority WHEN 'URGENTE' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'MEDIA' THEN 3 ELSE 4 END, a.created_at ASC
      LIMIT 12
    `).all(companyId) as any[];

    for (const a of approvals) {
      const allowed = user.roleLevel === 'ADMIN_GERAL' || user.roleLevel === 'DIRETORIA' || !a.required_level || a.required_level === user.roleLevel || (a.required_level === 'GESTOR' && user.roleLevel === 'GESTOR');
      if (!allowed) continue;
      queue.push({
        id: `approval-${a.id}`,
        kind: 'APROVACAO',
        module: a.entity_type === 'COMPRA' ? 'Compras' : a.entity_type === 'FERIAS' ? 'RH' : 'Governança',
        title: a.title,
        description: a.description || `Solicitação de ${a.requester_name} aguardando parecer.`,
        route: 'approvals',
        priority: a.priority === 'URGENTE' ? 'CRITICA' : a.priority === 'ALTA' ? 'ALTA' : 'MEDIA',
        status: 'AGUARDANDO_PARECER',
        amount: a.amount ?? null
      });
    }

    if (canUse(req, 'finance')) {
      const rows = db.prepare(`
        SELECT id, code, title, entity_name, amount, due_date, status
        FROM financial_records
        WHERE company_id = ? AND type='PAGAR' AND status != 'PAGO'
        ORDER BY due_date ASC
        LIMIT 12
      `).all(companyId) as any[];
      const today = new Date().toISOString().substring(0, 10);
      for (const r of rows) {
        queue.push({
          id: `finance-${r.id}`,
          kind: 'VENCIMENTO',
          module: 'Financeiro',
          title: `${r.code} — ${r.title}`,
          description: `${r.entity_name} • vencimento ${r.due_date}`,
          route: 'finance-payables',
          priority: r.due_date < today ? 'CRITICA' : r.due_date === today ? 'ALTA' : 'MEDIA',
          status: r.due_date < today ? 'VENCIDO' : 'A_PAGAR',
          dueDate: r.due_date,
          amount: r.amount
        });
      }
    }

    if (canUse(req, 'fiscal')) {
      const rows = db.prepare(`
        SELECT id, code, tax_type, period, tax_amount, due_date, status
        FROM tax_obligations
        WHERE status NOT IN ('PAGO')
        ORDER BY due_date ASC LIMIT 8
      `).all() as any[];
      for (const r of rows) queue.push({
        id: `tax-${r.id}`,
        kind: 'IMPOSTO', module: 'Fiscal', title: `${r.code} — ${r.tax_type}`,
        description: `Competência ${r.period} • obrigação fiscal pendente`, route: 'fiscal-calendar',
        priority: r.status === 'ATRASADO' ? 'CRITICA' : 'ALTA', status: r.status,
        dueDate: r.due_date, amount: r.tax_amount
      });
    }

    if (canUse(req, 'purchasing')) {
      const rows = db.prepare(`SELECT id, code, title, supplier_name, total_amount, status, required_date FROM purchase_orders WHERE status NOT IN ('PAGO','RECEBIDO','CANCELADO') ORDER BY created_at DESC LIMIT 8`).all() as any[];
      for (const r of rows) queue.push({
        id: `purchase-${r.id}`, kind: 'COMPRA', module: 'Compras', title: `${r.code} — ${r.title}`,
        description: `${r.supplier_name} • ${r.status.replaceAll('_',' ')}`, route: 'purchasing-orders',
        priority: r.status === 'PENDENTE_APROVACAO' ? 'ALTA' : 'MEDIA', status: r.status,
        dueDate: r.required_date, amount: r.total_amount
      });
    }

    if (canUse(req, 'hr')) {
      const rows = db.prepare(`SELECT id, employee_name, start_date, end_date, days_count, status FROM vacation_requests WHERE status='PENDENTE' ORDER BY start_date ASC LIMIT 8`).all() as any[];
      for (const r of rows) queue.push({
        id: `hr-${r.id}`, kind: 'RH', module: 'RH', title: `Férias — ${r.employee_name}`,
        description: `${r.days_count} dias • ${r.start_date} a ${r.end_date}`, route: 'hr',
        priority: 'MEDIA', status: r.status, dueDate: r.start_date
      });
    }

    if (canUse(req, 'contracts')) {
      const rows = db.prepare(`SELECT id, contract_number, party_name, days_remaining, end_date FROM contracts WHERE status != 'RESCINDIDO' AND days_remaining <= 45 ORDER BY days_remaining ASC LIMIT 8`).all() as any[];
      for (const r of rows) queue.push({
        id: `contract-${r.id}`, kind: 'CONTRATO', module: 'Contratos', title: `${r.contract_number} — ${r.party_name}`,
        description: `Contrato vence em ${r.days_remaining} dia(s).`, route: 'contracts',
        priority: r.days_remaining <= 15 ? 'ALTA' : 'MEDIA', status: 'VENCIMENTO_PROXIMO', dueDate: r.end_date
      });
    }

    const priorityWeight: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
    queue.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || String(a.dueDate || '').localeCompare(String(b.dueDate || '')));

    const unread = db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE read = 0 AND (user_id='user-all' OR user_id=?)`).get(user.id) as { count: number };
    const today = new Date().toISOString().substring(0, 10);
    const overdue = queue.filter(i => i.status === 'VENCIDO' || (i.dueDate && i.dueDate < today && !['PAGO','CONCLUIDO'].includes(i.status))).length;

    return res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        pendingActions: queue.length,
        critical: queue.filter(i => i.priority === 'CRITICA').length,
        approvals: queue.filter(i => i.kind === 'APROVACAO').length,
        overdue,
        unreadNotifications: unread.count
      },
      queue: queue.slice(0, 30)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
