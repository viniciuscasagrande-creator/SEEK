import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const workflowRouter = Router();

// Lista todas as solicitações de aprovação com seus respectivos passos
workflowRouter.get('/approvals', (_req: Request, res: Response) => {
  try {
    const approvalRows = db.prepare('SELECT * FROM approvals ORDER BY created_at DESC').all() as any[];

    const approvals = approvalRows.map(app => {
      const stepRows = db.prepare('SELECT * FROM approval_steps WHERE approval_id = ? ORDER BY step_number ASC').all(app.id) as any[];

      const steps = stepRows.map(s => ({
        stepNumber: s.step_number,
        label: s.label,
        requiredLevel: s.required_level,
        status: s.status,
        deciderName: s.decider_name,
        decisionDate: s.decision_date,
        comment: s.comment
      }));

      return {
        id: app.id,
        companyId: app.company_id,
        entityType: app.entity_type,
        title: app.title,
        description: app.description,
        department: app.department,
        requesterName: app.requester_name,
        requesterRole: app.requester_role || 'Colaborador',
        createdAt: app.created_at,
        amount: app.amount,
        status: app.status,
        currentStepIndex: Math.max(0, app.current_step - 1),
        priority: app.priority,
        steps
      };
    });

    const pendingCount = approvals.filter(a => a.status === 'PENDENTE').length;

    return res.json({
      total: approvals.length,
      pendingCount,
      approvals
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Decisão de aprovação ou rejeição com avanço de alçada e atualização em cascata
workflowRouter.post('/approvals/:id/decide', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, comment, deciderName, deciderRole } = req.body;

    const item = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as any;
    if (!item) {
      return res.status(404).json({ error: 'Solicitação de aprovação não encontrada.' });
    }

    const steps = db.prepare('SELECT * FROM approval_steps WHERE approval_id = ? ORDER BY step_number ASC').all(id) as any[];
    const currentStepIndex = Math.max(0, item.current_step - 1);
    const currentStep = steps[currentStepIndex];

    const decisionDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const decider = deciderName || 'Aprovador Autorizado';
    const justifiedComment = comment || (decision === 'approve' ? 'Parecer favorável conforme política corporativa de alçadas.' : 'Rejeitado por incompatibilidade orçamentária.');

    if (currentStep) {
      db.prepare(`
        UPDATE approval_steps
        SET status = ?, decider_name = ?, decision_date = ?, comment = ?
        WHERE id = ?
      `).run(
        decision === 'approve' ? 'APROVADO' : 'REJEITADO',
        decider,
        decisionDate,
        justifiedComment,
        currentStep.id
      );
    }

    let finalStatus = item.status;
    let nextStep = item.current_step;

    if (decision === 'reject') {
      finalStatus = 'REJEITADO';
      db.prepare('UPDATE approvals SET status = "REJEITADO" WHERE id = ?').run(id);
    } else {
      if (item.current_step >= item.total_steps) {
        finalStatus = 'APROVADO';
        db.prepare('UPDATE approvals SET status = "APROVADO" WHERE id = ?').run(id);

        // Atualização em cascata nas entidades originárias do SEEK Core
        if (item.entity_type === 'COMPRA') {
          // Atualiza status da ordem de compra
          db.prepare(`UPDATE purchase_orders SET status = 'APROVADO' WHERE title LIKE ? OR ? LIKE '%' || code || '%'`).run(`%${item.title}%`, item.title);
        } else if (item.entity_type === 'PAGAMENTO') {
          db.prepare(`UPDATE financial_records SET status = 'CONFIRMADO' WHERE ? LIKE '%' || code || '%'`).run(item.title);
        }
      } else {
        nextStep = item.current_step + 1;
        db.prepare('UPDATE approvals SET current_step = ? WHERE id = ?').run(nextStep, id);
      }
    }

    logAudit(
      decider,
      deciderRole || 'Alçada',
      decision === 'approve' ? 'APPROVE' : 'REJECT',
      'Central de Aprovações',
      `${item.entity_type}: ${item.title}`,
      `Decisão de ${decision.toUpperCase()} formalizada. Justificativa: "${justifiedComment}"`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      approvalId: id,
      finalStatus,
      currentStep: nextStep
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Criação de solicitação genérica de aprovação
workflowRouter.post('/approvals', (req: Request, res: Response) => {
  try {
    const { entityType, title, description, department, requesterName, requesterRole, amount, priority, steps } = req.body;

    if (!entityType || !title || !department) {
      return res.status(400).json({ error: 'Campos obrigatórios: entityType, title, department.' });
    }

    const id = `app-${Date.now()}`;
    const stepsArray = Array.isArray(steps) && steps.length > 0 ? steps : [
      { stepNumber: 1, label: 'Aprovação do Gestor Imediato', requiredLevel: 'GESTOR' }
    ];

    db.prepare(`
      INSERT INTO approvals (id, company_id, entity_type, title, description, department, requester_name, requester_role, amount, status, priority, current_step, total_steps)
      VALUES (?, 'comp-1', ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, 1, ?)
    `).run(
      id,
      entityType,
      title,
      description || '',
      department,
      requesterName || 'Colaborador',
      requesterRole || 'Colaborador',
      amount ? parseFloat(amount) : 0,
      priority || 'MEDIA',
      stepsArray.length
    );

    for (const s of stepsArray) {
      db.prepare(`
        INSERT INTO approval_steps (id, approval_id, step_number, label, required_level, status)
        VALUES (?, ?, ?, ?, ?, 'PENDENTE')
      `).run(`step-${Date.now()}-${Math.floor(Math.random() * 1000)}`, id, s.stepNumber, s.label, s.requiredLevel);
    }

    logAudit(
      requesterName || 'Sistema',
      requesterRole || 'Operador',
      'CREATE',
      'Central de Aprovações',
      `${entityType}: ${title}`,
      `Nova solicitação de alçada submetida no valor de R$ ${(amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({ success: true, id, title });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
