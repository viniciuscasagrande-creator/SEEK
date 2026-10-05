import { Router, Request, Response } from 'express';
import { auditLogs } from '../db.js';

export const crmRouter = Router();

export let crmDeals = [
  {
    id: 'crm-1',
    clientName: 'Allianz Parque Eventos',
    title: 'Gestão Exclusiva de Bilheteria Turnê Stadium 2027',
    value: 650000.00,
    stage: 'NEGOCIACAO',
    probability: 80,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-10-28'
  },
  {
    id: 'crm-2',
    clientName: 'Festival Lollapalooza Brasil (Lote Especial)',
    title: 'Operação de Controle de Acesso e PDVs Físicos',
    value: 380000.00,
    stage: 'PROPOSTA',
    probability: 60,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-11-05'
  },
  {
    id: 'crm-3',
    clientName: 'Teatro Bradesco SP',
    title: 'Renovação Trienal Sistema SEEK Bilheteria',
    value: 240000.00,
    stage: 'CLIENTE',
    probability: 100,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-10-01'
  },
  {
    id: 'crm-4',
    clientName: 'Maracanã Tour & Museu do Futebol',
    title: 'Venda de Ingressos Online com Catracas Faciais',
    value: 410000.00,
    stage: 'QUALIFICACAO',
    probability: 40,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-11-20'
  },
  {
    id: 'crm-5',
    clientName: 'Arena do Grêmio',
    title: 'Sistema de Acessos e Sócios Torcedores',
    value: 520000.00,
    stage: 'LEAD',
    probability: 25,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-12-15'
  }
];

crmRouter.get('/deals', (_req: Request, res: Response) => {
  const totalValue = crmDeals.reduce((a, b) => a + b.value, 0);
  return res.json({ total: crmDeals.length, totalValue, deals: crmDeals });
});

crmRouter.post('/deals', (req: Request, res: Response) => {
  const { clientName, title, value, stage, ownerName, expectedCloseDate } = req.body;

  if (!clientName || !title || !value) {
    return res.status(400).json({ error: 'Campos obrigatórios: clientName, title, value.' });
  }

  const newDeal = {
    id: `crm-${Date.now()}`,
    clientName,
    title,
    value: parseFloat(value),
    stage: stage || 'LEAD',
    probability: stage === 'CLIENTE' ? 100 : stage === 'CONTRATO' ? 90 : stage === 'NEGOCIACAO' ? 80 : 30,
    ownerName: ownerName || 'Lucas Bertolli Costa',
    expectedCloseDate: expectedCloseDate || '2026-12-31'
  };

  crmDeals.unshift(newDeal);

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userName: ownerName || 'Comercial',
    userRole: 'Comercial',
    action: 'CREATE',
    module: 'CRM & Comercial',
    entity: `Oportunidade ${newDeal.title}`,
    description: `Nova oportunidade registrada para ${newDeal.clientName} no valor de R$ ${newDeal.value.toFixed(2)}`,
    ipAddress: req.ip || '189.44.120.10'
  });

  return res.status(201).json(newDeal);
});

crmRouter.patch('/deals/:id/stage', (req: Request, res: Response) => {
  const { id } = req.params;
  const { stage, userName } = req.body;

  const deal = crmDeals.find(d => d.id === id);
  if (!deal) {
    return res.status(404).json({ error: 'Oportunidade não encontrada.' });
  }

  const oldStage = deal.stage;
  deal.stage = stage;
  if (stage === 'CLIENTE') deal.probability = 100;
  if (stage === 'CONTRATO') deal.probability = 90;

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userName: userName || 'Equipe Comercial',
    userRole: 'Comercial',
    action: 'UPDATE',
    module: 'CRM & Comercial',
    entity: `Oportunidade ${deal.title}`,
    description: `Estágio do funil comercial alterado de ${oldStage} para ${stage}`,
    ipAddress: req.ip || '189.44.120.10'
  });

  return res.json({ success: true, deal });
});
