import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { workflowService } from '../services/workflow.service.js';

export const workflowRouter = Router();

// Lista todas as solicitações de aprovação com seus respectivos passos
workflowRouter.get('/approvals', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const companyId = (req.query.companyId as string) || authReq.companyId;

    const result = workflowService.getApprovals({ companyId });
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Decisão de aprovação ou rejeição com avanço de alçada, SoD e atualização em cascata
workflowRouter.post('/approvals/:id/decide', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { decision, comment, deciderName, deciderRole } = req.body;
    const authReq = req as AuthenticatedRequest;

    const result = workflowService.decideApproval({
      id,
      decision,
      comment,
      deciderUser: authReq.user,
      fallbackDeciderName: deciderName,
      fallbackDeciderRole: deciderRole,
      ipAddress: req.ip || '127.0.0.1',
      correlationId: authReq.correlationId
    });

    return res.json(result);
  } catch (error: any) {
    const statusCode = error.statusCode || (error.message.includes('não encontrada') ? 404 : 500);
    return res.status(statusCode).json({ error: error.message });
  }
});

// Criação de solicitação genérica de aprovação
workflowRouter.post('/approvals', (req: Request, res: Response) => {
  try {
    const { entityType, title, description, department, requesterName, requesterRole, amount, priority, steps } = req.body;
    const authReq = req as AuthenticatedRequest;

    if (!entityType || !title || !department) {
      return res.status(400).json({ error: 'Campos obrigatórios: entityType, title, department.' });
    }

    const result = workflowService.createApproval({
      companyId: authReq.companyId,
      entityType,
      title,
      description,
      department,
      requesterName,
      requesterRole,
      amount,
      priority,
      steps
    }, authReq.user, req.ip || '189.44.120.10');

    return res.status(201).json({ success: true, id: result.id, title: result.title });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
