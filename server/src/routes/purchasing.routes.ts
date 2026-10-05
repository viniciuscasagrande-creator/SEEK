import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const purchasingRouter = Router();

// Lista todas as ordens de compra
purchasingRouter.get('/orders', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all() as any[];
    const orders = rows.map(r => ({
      id: r.id,
      code: r.code,
      title: r.title,
      department: r.department,
      requesterName: r.requester_name,
      supplierName: r.supplier_name,
      totalAmount: r.total_amount,
      status: r.status,
      requiredDate: r.required_date,
      itemsJson: r.items_json ? JSON.parse(r.items_json) : [],
      createdAt: r.created_at
    }));

    return res.json({ total: orders.length, orders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Criação de ordem de compra e submissão automática às alçadas
purchasingRouter.post('/orders', (req: Request, res: Response) => {
  try {
    const { title, department, requesterName, requesterRole, supplierName, totalAmount, requiredDate, items, userName, userRole } = req.body;

    if (!title || !department || !totalAmount) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, department, totalAmount.' });
    }

    const id = `po-${Date.now()}`;
    const code = `OC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedAmount = parseFloat(totalAmount);
    const reqName = requesterName || userName || 'Comprador SEEK';
    const suppName = supplierName || 'Fornecedor Homologado';
    const itemsJson = items ? JSON.stringify(items) : JSON.stringify([]);

    db.prepare(`
      INSERT INTO purchase_orders (id, code, title, department, requester_name, supplier_name, total_amount, status, required_date, items_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE_APROVACAO', ?, ?)
    `).run(id, code, title, department, reqName, suppName, parsedAmount, requiredDate || '2026-10-30', itemsJson);

    // Criação automática do fluxo de aprovação de alçadas
    const approvalId = `app-${Date.now()}`;
    const totalSteps = parsedAmount > 50000 ? 3 : parsedAmount > 15000 ? 2 : 1;

    db.prepare(`
      INSERT INTO approvals (id, company_id, entity_type, title, description, department, requester_name, requester_role, amount, status, priority, current_step, total_steps)
      VALUES (?, 'comp-1', 'COMPRA', ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, 1, ?)
    `).run(
      approvalId,
      `Ordem de Compra ${code} — ${title}`,
      `Aquisição de materiais/serviços junto a ${suppName}. Dotação orçamentária: ${department}.`,
      department,
      reqName,
      requesterRole || 'Comprador Pleno',
      parsedAmount,
      parsedAmount > 30000 ? 'ALTA' : 'MEDIA',
      totalSteps
    );

    // Passo 1: Gestor
    db.prepare(`
      INSERT INTO approval_steps (id, approval_id, step_number, label, required_level, status)
      VALUES (?, ?, 1, 'Aprovação do Gestor Departamental', 'GESTOR', 'PENDENTE')
    `).run(`step-${Date.now()}-1`, approvalId);

    // Passo 2: Financeiro se > 15.000
    if (parsedAmount > 15000) {
      db.prepare(`
        INSERT INTO approval_steps (id, approval_id, step_number, label, required_level, status)
        VALUES (?, ?, 2, 'Alçada Financeira & Orçamento', 'FINANCEIRO', 'PENDENTE')
      `).run(`step-${Date.now()}-2`, approvalId);
    }

    // Passo 3: Diretoria se > 50.000
    if (parsedAmount > 50000) {
      db.prepare(`
        INSERT INTO approval_steps (id, approval_id, step_number, label, required_level, status)
        VALUES (?, ?, 3, 'Alçada de Diretoria Executiva (> R$ 50.000)', 'DIRETORIA', 'PENDENTE')
      `).run(`step-${Date.now()}-3`, approvalId);
    }

    logAudit(
      reqName,
      userRole || 'Compras',
      'CREATE',
      'Compras & Suprimentos',
      `Ordem ${code}`,
      `Ordem de compra submetida às alçadas (R$ ${parsedAmount.toFixed(2)} - ${suppName})`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      order: {
        id,
        code,
        title,
        department,
        requesterName: reqName,
        supplierName: suppName,
        totalAmount: parsedAmount,
        status: 'PENDENTE_APROVACAO',
        requiredDate
      },
      approvalId
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Recebimento de mercadoria / serviço com geração automática no Contas a Pagar
purchasingRouter.post('/orders/:id/receive', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, userRole } = req.body;

    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Ordem de compra não encontrada.' });
    }

    db.prepare(`UPDATE purchase_orders SET status = 'RECEBIDO' WHERE id = ?`).run(id);

    // Gera Contas a Pagar automaticamente
    const finId = `fin-${Date.now()}`;
    const finCode = `CP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    db.prepare(`
      INSERT INTO financial_records (id, company_id, code, type, title, entity_name, cost_center, category, amount, due_date, status, payment_method)
      VALUES (?, 'comp-1', ?, 'PAGAR', ?, ?, 'Suprimentos & Operações', 'Compras de Insumos', ?, ?, 'CONFIRMADO', 'Boleto Bancário')
    `).run(finId, finCode, `Pagamento ${order.code}: ${order.title}`, order.supplier_name, order.total_amount, dueDate);

    logAudit(
      userName || 'Almoxarifado & Recebimento',
      userRole || 'Compras',
      'RECEIVE',
      'Compras & Estoque',
      `Ordem ${order.code}`,
      `Mercadoria/serviço recebido. Gerado Contas a Pagar ${finCode} no valor de R$ ${order.total_amount.toFixed(2)}`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      order: { ...order, status: 'RECEBIDO' },
      financialRecord: { id: finId, code: finCode, dueDate }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Lista de Fornecedores Homologados e SLA
purchasingRouter.get('/suppliers', (_req: Request, res: Response) => {
  try {
    const suppliers = db.prepare(`SELECT * FROM business_partners WHERE type = 'FORNECEDOR' AND active = 1 ORDER BY rating DESC, sla_percent DESC`).all() as any[];
    return res.json({ total: suppliers.length, suppliers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Quadro Comparativo de Cotações com Cálculo de Saving Automático
purchasingRouter.post('/quotations/compare', (req: Request, res: Response) => {
  try {
    const { quotations } = req.body;
    // quotations: Array<{ supplierName: string, price: number, deliveryDays: number, warrantyMonths: number, paymentTerms: string }>

    if (!quotations || !Array.isArray(quotations) || quotations.length < 2) {
      return res.status(400).json({ error: 'Envie ao menos 2 propostas para comparação de cotações.' });
    }

    const sortedByPrice = [...quotations].sort((a, b) => a.price - b.price);
    const lowest = sortedByPrice[0];
    const highest = sortedByPrice[sortedByPrice.length - 1];
    const savingAmount = highest.price - lowest.price;
    const savingPercent = ((savingAmount / highest.price) * 100).toFixed(1);

    return res.json({
      recommendedSupplier: lowest.supplierName,
      lowestPrice: lowest.price,
      highestPrice: highest.price,
      savingAmount,
      savingPercent: Number(savingPercent),
      comparisonMatrix: quotations.map(q => ({
        ...q,
        isBestPrice: q.supplierName === lowest.supplierName,
        diffFromLowest: q.price - lowest.price
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
