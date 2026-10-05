import { Router, Request, Response } from 'express';
import { auditLogs } from '../db.js';

export const workflowRouter = Router();

export let approvals = [
  {
    id: 'app-01',
    companyId: 'comp-1',
    entityType: 'COMPRA',
    title: 'Aquisição de 15 Leitores Biométricos e Catracas Portáteis',
    description: 'Equipamentos para operação em grandes festivais com leitor QR code e NFC homologados.',
    department: 'Operações de Eventos',
    requesterName: 'Beatriz Castro Lima',
    requesterRole: 'Analista de Operações Pleno',
    createdAt: '2026-10-04 14:30',
    amount: 18450.00,
    status: 'PENDENTE',
    currentStepIndex: 1,
    priority: 'ALTA',
    steps: [
      {
        stepNumber: 1,
        label: 'Aprovação do Gestor do Departamento (Compras)',
        requiredLevel: 'GESTOR',
        status: 'APROVADO',
        deciderName: 'Mariana Fontes Prado',
        decisionDate: '2026-10-04 16:10',
        comment: 'Cotação validada com 3 fornecedores. Menor preço homologado.'
      },
      {
        stepNumber: 2,
        label: 'Alçada Financeira & Orçamento',
        requiredLevel: 'FINANCEIRO',
        status: 'PENDENTE'
      },
      {
        stepNumber: 3,
        label: 'Alçada de Diretoria Executiva (> R$ 15.000)',
        requiredLevel: 'DIRETORIA',
        status: 'PENDENTE'
      }
    ]
  },
  {
    id: 'app-02',
    companyId: 'comp-1',
    entityType: 'CONTRATO',
    title: 'Renovação Contrato Master de Infraestrutura Cloud AWS',
    description: 'Acordo corporativo anual com reserva de instâncias para suportar picos de vendas simultâneas.',
    department: 'Tecnologia da Informação',
    requesterName: 'Eduardo Martins (TI)',
    requesterRole: 'Tech Lead Infraestrutura',
    createdAt: '2026-10-03 11:20',
    amount: 142000.00,
    status: 'PENDENTE',
    currentStepIndex: 1,
    priority: 'CRITICA',
    steps: [
      {
        stepNumber: 1,
        label: 'Validação Técnica e Jurídica',
        requiredLevel: 'JURIDICO',
        status: 'APROVADO',
        deciderName: 'Dr. Fernando Araripe (Jurídico)',
        decisionDate: '2026-10-03 17:45',
        comment: 'Minuta analisada e cláusula de SLA de 99.99% inclusa.'
      },
      {
        stepNumber: 2,
        label: 'Alçada Diretoria Executiva (> R$ 50.000)',
        requiredLevel: 'DIRETORIA',
        status: 'PENDENTE'
      }
    ]
  }
];

workflowRouter.get('/approvals', (_req: Request, res: Response) => {
  const pendingCount = approvals.filter(a => a.status === 'PENDENTE').length;
  return res.json({ total: approvals.length, pendingCount, approvals });
});

workflowRouter.post('/approvals/:id/decide', (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision, comment, deciderName, deciderRole } = req.body;

  const item = approvals.find(a => a.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Solicitação de aprovação não encontrada.' });
  }

  const currentStep = item.steps[item.currentStepIndex];
  if (currentStep) {
    currentStep.status = decision === 'approve' ? 'APROVADO' : 'REJEITADO';
    currentStep.deciderName = deciderName || 'Aprovador Autorizado';
    currentStep.decisionDate = new Date().toISOString();
    currentStep.comment = comment || (decision === 'approve' ? 'Parecer favorável conforme política de alçadas.' : 'Rejeitado.');
  }

  if (decision === 'reject') {
    item.status = 'REJEITADO';
  } else {
    const nextIndex = item.currentStepIndex + 1;
    if (nextIndex >= item.steps.length) {
      item.status = 'APROVADO';
    } else {
      item.currentStepIndex = nextIndex;
      item.status = 'PENDENTE';
    }
  }

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userName: deciderName || 'Aprovador',
    userRole: deciderRole || 'Alçada',
    action: decision === 'approve' ? 'APPROVE' : 'REJECT',
    module: 'Central de Aprovações',
    entity: `${item.entityType}: ${item.title}`,
    description: `Decisão de ${decision.toUpperCase()} registrada. Justificativa: "${comment || 'Sem observações'}"`,
    ipAddress: req.ip || '189.44.120.10'
  });

  return res.json({ success: true, item });
});
