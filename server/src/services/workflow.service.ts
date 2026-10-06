// SEEK Core — Serviço de Domínio de Workflow, Alçadas, Aprovações e Segregação de Funções (SoD)
import { db } from '../db.js';
import { workflowRepository, ApprovalEntity, ApprovalStepEntity } from '../repositories/workflow.repository.js';
import { checkSeparationOfDuties } from '../utils/security.js';
import { TokenPayload } from '../middleware/auth.js';

export interface WorkflowDecisionResult {
  success: boolean;
  approvalId: string;
  finalStatus: string;
  currentStep: number;
}

export class WorkflowService {
  /**
   * Lista solicitações de aprovação com steps detalhados e filtro de tenant
   */
  getApprovals(filters: { companyId?: string; status?: string; department?: string } = {}) {
    const rawApprovals = workflowRepository.listApprovals(filters);

    const approvals = rawApprovals.map(app => {
      const stepRows = workflowRepository.listApprovalSteps(app.id);
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

    return {
      total: approvals.length,
      pendingCount,
      approvals
    };
  }

  /**
   * Cria nova solicitação de workflow com alçadas e steps
   */
  createApproval(data: {
    companyId?: string;
    entityType: string;
    title: string;
    description?: string;
    department: string;
    requesterName: string;
    requesterRole?: string;
    amount?: number;
    priority?: string;
    steps?: { stepNumber: number; label: string; requiredLevel: string }[];
  }, user?: TokenPayload, ipAddress: string = '127.0.0.1'): { id: string; title: string } {
    const id = `app-${Date.now()}`;
    const stepsArray = Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : [
      { stepNumber: 1, label: 'Aprovação do Gestor Imediato', requiredLevel: 'GESTOR' }
    ];

    const entity: ApprovalEntity = {
      id,
      company_id: data.companyId || user?.companyId || 'comp-1',
      entity_type: data.entityType,
      title: data.title,
      description: data.description || '',
      department: data.department,
      requester_name: data.requesterName || user?.fullName || 'Colaborador',
      requester_role: data.requesterRole || user?.roleTitle || 'Colaborador',
      amount: data.amount ? parseFloat(data.amount as any) : 0,
      status: 'PENDENTE',
      priority: data.priority || 'MEDIA',
      current_step: 1,
      total_steps: stepsArray.length
    };

    workflowRepository.createApproval(entity);

    for (const s of stepsArray) {
      workflowRepository.createApprovalStep({
        id: `step-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        approval_id: id,
        step_number: s.stepNumber,
        label: s.label,
        required_level: s.requiredLevel,
        status: 'PENDENTE'
      });
    }

    workflowRepository.logAudit({
      userName: entity.requester_name,
      userRole: entity.requester_role || 'Operador',
      action: 'CREATE',
      module: 'Central de Aprovações',
      entity: `${data.entityType}: ${data.title}`,
      description: `Nova solicitação de alçada submetida no valor de R$ ${(entity.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ipAddress
    });

    return { id, title: data.title };
  }

  /**
   * Deliberação de alçada (Aprovar/Rejeitar) com verificação estrita de SoD e ABAC
   */
  decideApproval(params: {
    id: string;
    decision: 'approve' | 'reject';
    comment?: string;
    deciderUser?: TokenPayload;
    fallbackDeciderName?: string;
    fallbackDeciderRole?: string;
    ipAddress?: string;
    correlationId?: string;
  }): WorkflowDecisionResult {
    const { id, decision, comment, deciderUser, fallbackDeciderName, fallbackDeciderRole, ipAddress = '127.0.0.1', correlationId } = params;

    const item = workflowRepository.findApprovalById(id);
    if (!item) {
      throw new Error('Solicitação de aprovação não encontrada.');
    }

    // 1. SoD — Segregação de Funções: O solicitante não pode aprovar a própria solicitação
    if (decision === 'approve' && deciderUser) {
      const sodCheck = checkSeparationOfDuties(item.requester_name, deciderUser);
      if (sodCheck.isViolated) {
        workflowRepository.logAudit({
          userName: deciderUser.fullName,
          userRole: deciderUser.roleTitle,
          action: 'VIOLACAO_SOD',
          module: 'Workflow & Aprovações',
          entity: `Solicitação ${item.title}`,
          description: `Tentativa de autoaprovação bloqueada pela política de Segregação de Funções (SoD)`,
          ipAddress,
          correlationId
        });
        const err: any = new Error(`Violação de Segregação de Funções (SoD): o colaborador ${deciderUser.fullName} não pode aprovar sua própria solicitação. É requerida a deliberação de um aprovador independente.`);
        err.statusCode = 403;
        throw err;
      }
    }

    // 2. ABAC — Verificação Criptográfica de Alçada
    if (decision === 'approve' && deciderUser) {
      const isExecutive = deciderUser.roleLevel === 'ADMIN_GERAL' || deciderUser.roleLevel === 'DIRETORIA';
      if (!isExecutive && item.amount > deciderUser.approvalLimitAmount) {
        const err: any = new Error(`Alçada insuficiente: o valor da solicitação (R$ ${Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede sua alçada autorizada (R$ ${Number(deciderUser.approvalLimitAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Requer aprovação de alçada superior.`);
        err.statusCode = 403;
        throw err;
      }
    }

    const steps = workflowRepository.listApprovalSteps(id);
    const currentStepIndex = Math.max(0, item.current_step - 1);
    const currentStep = steps[currentStepIndex];

    const decisionDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const deciderName = deciderUser?.fullName || fallbackDeciderName || 'Aprovador Autorizado';
    const deciderRole = deciderUser?.roleTitle || fallbackDeciderRole || 'Alçada';
    const justifiedComment = comment || (decision === 'approve' ? 'Parecer favorável conforme política corporativa de alçadas.' : 'Rejeitado por incompatibilidade orçamentária.');

    if (currentStep) {
      workflowRepository.updateApprovalStep(currentStep.id, {
        status: decision === 'approve' ? 'APROVADO' : 'REJEITADO',
        decider_name: deciderName,
        decision_date: decisionDate,
        comment: justifiedComment
      });
    }

    let finalStatus = item.status;
    let nextStep = item.current_step;

    if (decision === 'reject') {
      finalStatus = 'REJEITADO';
      workflowRepository.updateApproval(id, { status: 'REJEITADO' });
    } else {
      if (item.current_step >= item.total_steps) {
        finalStatus = 'APROVADO';
        workflowRepository.updateApproval(id, { status: 'APROVADO' });

        // Atualização em cascata nas entidades originárias do SEEK Core
        if (item.entity_type === 'COMPRA') {
          db.prepare(`UPDATE purchase_orders SET status = 'APROVADO' WHERE title LIKE ? OR ? LIKE '%' || code || '%'`).run(`%${item.title}%`, item.title);
        } else if (item.entity_type === 'PAGAMENTO') {
          db.prepare(`UPDATE financial_records SET status = 'CONFIRMADO' WHERE ? LIKE '%' || code || '%'`).run(item.title);
        }
      } else {
        nextStep = item.current_step + 1;
        workflowRepository.updateApproval(id, { current_step: nextStep });
      }
    }

    workflowRepository.logAudit({
      userName: deciderName,
      userRole: deciderRole,
      action: decision === 'approve' ? 'APPROVE' : 'REJECT',
      module: 'Central de Aprovações',
      entity: `${item.entity_type}: ${item.title}`,
      description: `Decisão de ${decision.toUpperCase()} formalizada. Justificativa: "${justifiedComment}"`,
      ipAddress,
      correlationId
    });

    return {
      success: true,
      approvalId: id,
      finalStatus,
      currentStep: nextStep
    };
  }
}

export const workflowService = new WorkflowService();
