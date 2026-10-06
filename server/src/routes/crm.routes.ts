import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const crmRouter = Router();

crmRouter.get('/deals', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM crm_deals ORDER BY created_at DESC').all() as any[];
    const deals = rows.map(r => ({
      id: r.id,
      companyId: r.company_id,
      clientName: r.client_name,
      title: r.title,
      value: r.value,
      stage: r.stage,
      probability: r.probability,
      ownerName: r.owner_name,
      expectedCloseDate: r.expected_close_date,
      createdAt: r.created_at
    }));

    const totalValue = deals.reduce((acc, d) => acc + d.value, 0);
    const weightedValue = deals.reduce((acc, d) => acc + (d.value * (d.probability / 100)), 0);

    return res.json({
      total: deals.length,
      totalValue,
      weightedValue,
      deals
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

crmRouter.post('/deals', (req: Request, res: Response) => {
  try {
    const { clientName, title, value, stage, ownerName, expectedCloseDate, userRole } = req.body;

    if (!clientName || !title || !value) {
      return res.status(400).json({ error: 'Campos obrigatórios: clientName, title, value.' });
    }

    const id = `crm-${Date.now()}`;
    const parsedValue = parseFloat(value);
    const currentStage = stage || 'LEAD';
    let probability = 20;
    if (currentStage === 'QUALIFICACAO') probability = 40;
    else if (currentStage === 'OPORTUNIDADE') probability = 50;
    else if (currentStage === 'PROPOSTA') probability = 60;
    else if (currentStage === 'NEGOCIACAO') probability = 80;
    else if (currentStage === 'APROVACAO') probability = 85;
    else if (currentStage === 'CONTRATO') probability = 95;
    else if (currentStage === 'CLIENTE') probability = 100;

    const owner = ownerName || 'Lucas Bertolli Costa';
    const closeDate = expectedCloseDate || '2026-12-31';

    db.prepare(`
      INSERT INTO crm_deals (id, company_id, client_name, title, value, stage, probability, owner_name, expected_close_date)
      VALUES (?, 'comp-1', ?, ?, ?, ?, ?, ?, ?)
    `).run(id, clientName, title, parsedValue, currentStage, probability, owner, closeDate);

    logAudit(
      owner,
      userRole || 'Comercial',
      'CREATE',
      'CRM & Comercial',
      `Oportunidade ${title}`,
      `Nova oportunidade registrada para ${clientName} no valor de R$ ${parsedValue.toFixed(2)}`,
      req.ip || '189.44.120.10'
    );

    const newDeal = {
      id,
      clientName,
      title,
      value: parsedValue,
      stage: currentStage,
      probability,
      ownerName: owner,
      expectedCloseDate: closeDate
    };

    return res.status(201).json(newDeal);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

crmRouter.patch('/deals/:id/stage', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stage, userName, userRole, autoGenerateContract } = req.body;

    const deal = db.prepare('SELECT * FROM crm_deals WHERE id = ?').get(id) as any;
    if (!deal) {
      return res.status(404).json({ error: 'Oportunidade não encontrada no CRM.' });
    }

    let probability = deal.probability;
    if (stage === 'QUALIFICACAO') probability = 40;
    else if (stage === 'OPORTUNIDADE') probability = 50;
    else if (stage === 'PROPOSTA') probability = 60;
    else if (stage === 'NEGOCIACAO') probability = 80;
    else if (stage === 'APROVACAO') probability = 85;
    else if (stage === 'CONTRATO') probability = 95;
    else if (stage === 'CLIENTE') probability = 100;

    db.prepare(`
      UPDATE crm_deals
      SET stage = ?, probability = ?
      WHERE id = ?
    `).run(stage, probability, id);

    logAudit(
      userName || 'Equipe Comercial',
      userRole || 'Comercial',
      'UPDATE',
      'CRM & Comercial',
      `Oportunidade ${deal.title}`,
      `Estágio alterado de ${deal.stage} para ${stage} (${deal.client_name})`,
      req.ip || '189.44.120.10'
    );

    // Integração Core: se avançou para CLIENTE e solicitado, cria Contrato e Contas a Receber
    let createdContract = null;
    let createdFinance = null;

    if (stage === 'CLIENTE' && autoGenerateContract) {
      const contractId = `ct-${Date.now()}`;
      const contractNumber = `CT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const startDate = new Date().toISOString().substring(0, 10);
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

      db.prepare(`
        INSERT INTO contracts (id, contract_number, party_name, type, monthly_value, start_date, end_date, days_remaining, readjustment_index, status)
        VALUES (?, ?, ?, 'CLIENTE', ?, ?, ?, 365, 'IPCA', 'VIGENTE')
      `).run(contractId, contractNumber, deal.client_name, deal.value / 12, startDate, endDate);

      createdContract = { id: contractId, contractNumber };

      // Gera primeira parcela no contas a receber
      const finId = `fin-${Date.now()}`;
      const finCode = `CR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare(`
        INSERT INTO financial_records (id, company_id, code, type, title, entity_name, cost_center, category, amount, due_date, status, payment_method)
        VALUES (?, 'comp-1', ?, 'RECEBER', ?, ?, 'Operações & Serviços Corporativos', 'Receita Operacional Bruta', ?, ?, 'CONFIRMADO', 'Boleto Registrado')
      `).run(finId, finCode, `Faturamento Inicial: ${deal.title}`, deal.client_name, deal.value / 12, startDate);

      createdFinance = { id: finId, code: finCode };

      logAudit(
        userName || 'Motor SEEK Core',
        userRole || 'Comercial',
        'CREATE',
        'Contratos & Financeiro',
        `Conversão Comercial ${deal.client_name}`,
        `Gerado contrato ${contractNumber} e fatura ${finCode} a partir do fechamento no CRM`,
        req.ip || '189.44.120.10'
      );
    }

    return res.json({
      success: true,
      deal: {
        ...deal,
        stage,
        probability
      },
      createdContract,
      createdFinance
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
