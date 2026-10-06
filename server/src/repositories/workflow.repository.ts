// SEEK Core — Repositório de Workflow, Alçadas, Aprovações e Auditoria Corporativa
import { db } from '../db.js';

export interface ApprovalEntity {
  id: string;
  company_id?: string;
  entity_type: string; // 'COMPRA' | 'PAGAMENTO' | 'CONTRATO' | 'FERIAS' | 'DESCONTO_COMERCIAL'
  title: string;
  description?: string;
  department: string;
  requester_name: string;
  requester_role?: string;
  amount: number;
  status: string; // 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  priority: string; // 'BAIXA' | 'MEDIA' | 'ALTA'
  current_step: number;
  total_steps: number;
  created_at?: string;
}

export interface ApprovalStepEntity {
  id: string;
  approval_id: string;
  step_number: number;
  label: string;
  required_level: string;
  decider_name?: string;
  decision_date?: string;
  status: string; // 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  comment?: string;
}

export interface AuditLogEntity {
  id: string;
  timestamp?: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  entity: string;
  description: string;
  ip_address?: string;
  correlation_id?: string;
}

export class WorkflowRepository {
  // --- APROVAÇÕES ---
  listApprovals(filters: { companyId?: string; status?: string; department?: string } = {}): ApprovalEntity[] {
    let sql = 'SELECT * FROM approvals WHERE 1=1';
    const params: any[] = [];

    if (filters.companyId) {
      sql += ' AND (company_id = ? OR company_id IS NULL)';
      params.push(filters.companyId);
    }
    if (filters.status && filters.status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.department && filters.department !== 'ALL') {
      sql += ' AND department = ?';
      params.push(filters.department);
    }

    sql += ' ORDER BY created_at DESC';
    return db.prepare(sql).all(...params) as ApprovalEntity[];
  }

  findApprovalById(id: string): ApprovalEntity | undefined {
    return db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as ApprovalEntity | undefined;
  }

  createApproval(data: ApprovalEntity): void {
    db.prepare(`
      INSERT INTO approvals (id, company_id, entity_type, title, description, department, requester_name, requester_role, amount, status, priority, current_step, total_steps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.company_id || 'comp-1',
      data.entity_type,
      data.title,
      data.description || '',
      data.department,
      data.requester_name,
      data.requester_role || 'Colaborador',
      data.amount || 0,
      data.status || 'PENDENTE',
      data.priority || 'MEDIA',
      data.current_step || 1,
      data.total_steps || 1
    );
  }

  updateApproval(id: string, data: { status?: string; current_step?: number }): void {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.current_step !== undefined) { fields.push('current_step = ?'); values.push(data.current_step); }
    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE approvals SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  // --- PASSOS DE APROVAÇÃO ---
  listApprovalSteps(approvalId: string): ApprovalStepEntity[] {
    return db.prepare('SELECT * FROM approval_steps WHERE approval_id = ? ORDER BY step_number ASC').all(approvalId) as ApprovalStepEntity[];
  }

  createApprovalStep(data: ApprovalStepEntity): void {
    db.prepare(`
      INSERT INTO approval_steps (id, approval_id, step_number, label, required_level, decider_name, decision_date, status, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.approval_id,
      data.step_number,
      data.label,
      data.required_level,
      data.decider_name || null,
      data.decision_date || null,
      data.status || 'PENDENTE',
      data.comment || null
    );
  }

  updateApprovalStep(id: string, data: { status: string; decider_name: string; decision_date: string; comment?: string }): void {
    db.prepare(`
      UPDATE approval_steps
      SET status = ?, decider_name = ?, decision_date = ?, comment = ?
      WHERE id = ?
    `).run(data.status, data.decider_name, data.decision_date, data.comment || null, id);
  }

  // --- AUDITORIA CORPORATIVA ---
  logAudit(data: {
    userName: string;
    userRole: string;
    action: string;
    module: string;
    entity: string;
    description: string;
    ipAddress?: string;
    correlationId?: string;
  }): void {
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, module, entity, description, ip_address, correlation_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        timestamp,
        data.userName,
        data.userRole,
        data.action,
        data.module,
        data.entity,
        data.description,
        data.ipAddress || '127.0.0.1',
        data.correlationId || null
      );
    } catch (err) {
      console.error('[WorkflowRepository] Erro ao gravar log de auditoria:', err);
    }
  }

  listAuditLogs(limit: number = 200): AuditLogEntity[] {
    return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit) as AuditLogEntity[];
  }
}

export const workflowRepository = new WorkflowRepository();
