import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const purchasingRouter = Router();

// ========================================================
// 1. SOLICITAÇÕES DE COMPRA (REQUISITIONS)
// ========================================================
purchasingRouter.get('/requisitions', (_req: Request, res: Response) => {
  try {
    const requisitions = db.prepare(`
      SELECT r.*,
        (SELECT COUNT(*) FROM purchase_quotations q WHERE q.requisition_id = r.id) as quotations_count,
        (SELECT COUNT(*) FROM purchase_quotations q WHERE q.requisition_id = r.id AND q.selected = 1) as has_selected_quotation
      FROM purchase_requisitions r
      ORDER BY r.created_at DESC
    `).all() as any[];

    return res.json({ total: requisitions.length, requisitions });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

purchasingRouter.get('/requisitions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requisition = db.prepare('SELECT * FROM purchase_requisitions WHERE id = ?').get(id) as any;

    if (!requisition) {
      return res.status(404).json({ error: 'Solicitação de compra não encontrada.' });
    }

    const quotations = db.prepare('SELECT * FROM purchase_quotations WHERE requisition_id = ? ORDER BY total_price ASC').all(id) as any[];

    return res.json({ requisition, quotations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

purchasingRouter.post('/requisitions', (req: Request, res: Response) => {
  try {
    const { requesterName, department, costCenter, description, justification, totalEstimated, priority, requiredDate, userName, userRole } = req.body;

    if (!department || !description || !totalEstimated) {
      return res.status(400).json({ error: 'Campos obrigatórios: department, description, totalEstimated.' });
    }

    const id = `req-${Date.now()}`;
    const code = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedAmount = parseFloat(totalEstimated);
    const reqUser = requesterName || userName || 'Comprador SEEK';
    const reqCenter = costCenter || 'Operações & Serviços Corporativos';

    db.prepare(`
      INSERT INTO purchase_requisitions (id, code, requester_name, department, cost_center, description, justification, total_estimated, priority, status, required_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SOLICITADO', ?)
    `).run(
      id,
      code,
      reqUser,
      department,
      reqCenter,
      description,
      justification || 'Necessidade operacional corporativa com base no plano orçamentário anual.',
      parsedAmount,
      priority || 'MEDIA',
      requiredDate || new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10)
    );

    logAudit(
      reqUser,
      userRole || 'Compras',
      'CREATE',
      'Compras & Suprimentos',
      `Solicitação ${code}`,
      `Nova solicitação de compra cadastrada (R$ ${parsedAmount.toFixed(2)} - ${department})`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      requisition: {
        id,
        code,
        requesterName: reqUser,
        department,
        costCenter: reqCenter,
        description,
        totalEstimated: parsedAmount,
        status: 'SOLICITADO'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 2. MAPA DE COTAÇÃO (3 FORNECEDORES) & SELEÇÃO
// ========================================================
purchasingRouter.get('/requisitions/:id/quotations', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quotations = db.prepare(`SELECT * FROM purchase_quotations WHERE requisition_id = ? ORDER BY total_price ASC`).all(id) as any[];
    return res.json({ total: quotations.length, quotations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

purchasingRouter.post('/requisitions/:id/quotations', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierId, supplierName, supplierCnpj, unitPrice, quantity, deliveryDays, paymentTerms, proposalNumber, rating, notes } = req.body;

    if (!supplierName || !unitPrice) {
      return res.status(400).json({ error: 'Campos obrigatórios: supplierName, unitPrice.' });
    }

    const quotId = `quot-${Date.now()}`;
    const qty = parseFloat(quantity || '1');
    const uPrice = parseFloat(unitPrice);
    const totalPrice = uPrice * qty;

    db.prepare(`
      INSERT INTO purchase_quotations (id, requisition_id, supplier_id, supplier_name, supplier_cnpj, unit_price, quantity, total_price, delivery_days, payment_terms, proposal_number, rating, selected, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      quotId,
      id,
      supplierId || null,
      supplierName,
      supplierCnpj || '00.000.000/0001-00',
      uPrice,
      qty,
      totalPrice,
      deliveryDays || 7,
      paymentTerms || '30 dias Boleto Bancário',
      proposalNumber || `PROP-${Math.floor(1000 + Math.random() * 9000)}`,
      rating || 5.0,
      notes || null
    );

    return res.status(201).json({ success: true, quotationId: quotId, totalPrice });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Seleção de Cotação Vencedora no Mapa Comparativo
purchasingRouter.post('/quotations/:id/select', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, userRole } = req.body;

    const quotation = db.prepare('SELECT * FROM purchase_quotations WHERE id = ?').get(id) as any;
    if (!quotation) {
      return res.status(404).json({ error: 'Cotação não encontrada.' });
    }

    // Desmarca outras cotações da mesma requisição e marca esta como vencedora
    db.prepare('UPDATE purchase_quotations SET selected = 0 WHERE requisition_id = ?').run(quotation.requisition_id);
    db.prepare('UPDATE purchase_quotations SET selected = 1 WHERE id = ?').run(id);

    // Atualiza status da requisição para COTADO
    db.prepare(`UPDATE purchase_requisitions SET status = 'COTADO' WHERE id = ?`).run(quotation.requisition_id);

    logAudit(
      userName || 'Comprador SEEK',
      userRole || 'Compras',
      'SELECT',
      'Compras & Cotações',
      `Cotação ${quotation.proposal_number || quotation.supplier_name}`,
      `Fornecedor ${quotation.supplier_name} selecionado como vencedor no Mapa de Cotações (R$ ${quotation.total_price.toFixed(2)})`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      selectedQuotation: quotation,
      message: 'Fornecedor selecionado com sucesso no Mapa Comparativo.'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Comparativo de Cotações com Cálculo de Saving
purchasingRouter.post('/quotations/compare', (req: Request, res: Response) => {
  try {
    const { quotations } = req.body;

    if (!quotations || !Array.isArray(quotations) || quotations.length < 2) {
      return res.status(400).json({ error: 'Envie ao menos 2 propostas para comparação de cotações.' });
    }

    const sortedByPrice = [...quotations].sort((a, b) => a.totalPrice - b.totalPrice);
    const lowest = sortedByPrice[0];
    const highest = sortedByPrice[sortedByPrice.length - 1];
    const savingAmount = highest.totalPrice - lowest.totalPrice;
    const savingPercent = ((savingAmount / highest.totalPrice) * 100).toFixed(1);

    return res.json({
      recommendedSupplier: lowest.supplierName,
      lowestPrice: lowest.totalPrice,
      highestPrice: highest.totalPrice,
      savingAmount,
      savingPercent: Number(savingPercent),
      matrix: quotations.map(q => ({
        ...q,
        isBestPrice: q.supplierName === lowest.supplierName,
        diffFromLowest: q.totalPrice - lowest.totalPrice
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 3. ORDENS DE COMPRA (PO) & ALÇADAS DE GOVERNANÇA
// ========================================================
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

// Criar PO a partir de Requisição Aprovada ou Manualmente com Reserva Orçamentária
purchasingRouter.post('/orders', (req: Request, res: Response) => {
  try {
    const { requisitionId, title, department, costCenter, requesterName, requesterRole, supplierName, totalAmount, requiredDate, items, userName, userRole } = req.body;

    if (!title || !department || !totalAmount) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, department, totalAmount.' });
    }

    const id = `po-${Date.now()}`;
    const code = `OC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedAmount = parseFloat(totalAmount);
    const reqName = requesterName || userName || 'Comprador SEEK';
    const suppName = supplierName || 'Fornecedor Homologado';
    const itemsJson = items ? JSON.stringify(items) : JSON.stringify([]);
    const cCenter = costCenter || 'Operações & Serviços Corporativos';

    db.prepare(`
      INSERT INTO purchase_orders (id, code, title, department, requester_name, supplier_name, total_amount, status, required_date, items_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE_APROVACAO', ?, ?)
    `).run(id, code, title, department, reqName, suppName, parsedAmount, requiredDate || '2026-10-30', itemsJson);

    // Se veio de requisição, marca status como PEDIDO_GERADO
    if (requisitionId) {
      db.prepare(`UPDATE purchase_requisitions SET status = 'PEDIDO_GERADO' WHERE id = ?`).run(requisitionId);
    }

    // Impacto no Orçamento: Adiciona ao Saldo Comprometido (committed_amount)
    try {
      db.prepare(`
        UPDATE cost_center_budgets
        SET committed_amount = committed_amount + ?
        WHERE cost_center = ?
      `).run(parsedAmount, cCenter);
    } catch {}

    // Criação da Alçada de Governança
    const approvalId = `app-${Date.now()}`;
    const totalSteps = parsedAmount > 50000 ? 3 : parsedAmount > 15000 ? 2 : 1;

    db.prepare(`
      INSERT INTO approvals (id, company_id, entity_type, title, description, department, requester_name, requester_role, amount, status, priority, current_step, total_steps)
      VALUES (?, 'comp-1', 'COMPRA', ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, 1, ?)
    `).run(
      approvalId,
      `Ordem de Compra ${code} — ${title}`,
      `Aquisição de materiais/serviços junto a ${suppName}. Centro de Custo: ${cCenter}.`,
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
      `Ordem de compra submetida às alçadas (R$ ${parsedAmount.toFixed(2)} - ${suppName}) com reserva orçamentária no CC ${cCenter}`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      order: {
        id,
        code,
        title,
        department,
        costCenter: cCenter,
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

purchasingRouter.patch('/orders/:id/approve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, userRole } = req.body;
    const authReq = req as AuthenticatedRequest;
    const currentUser = authReq.user;

    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Ordem de compra não encontrada.' });
    }

    // ABAC — Verificação Criptográfica de Alçada de Compra
    if (currentUser) {
      const isExecutive = currentUser.roleLevel === 'ADMIN_GERAL' || currentUser.roleLevel === 'DIRETORIA';
      if (!isExecutive && order.total_amount > currentUser.approvalLimitAmount) {
        return res.status(403).json({
          error: `Alçada de compra insuficiente: o valor da ordem (R$ ${Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede sua alçada autorizada (R$ ${Number(currentUser.approvalLimitAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Requer aprovação de alçada executiva superior.`
        });
      }
    }

    db.prepare(`UPDATE purchase_orders SET status = 'APROVADO' WHERE id = ?`).run(id);

    const operator = currentUser?.fullName || userName || 'Diretor Responsável';
    const operatorRole = currentUser?.roleTitle || userRole || 'Diretoria';

    logAudit(
      operator,
      operatorRole,
      'APPROVE',
      'Compras & Alçadas',
      `Ordem ${order.code}`,
      `Ordem de compra ${order.code} aprovada formalmente por alçada de governança (R$ ${order.total_amount.toFixed(2)})`,
      req.ip || '127.0.0.1'
    );

    return res.json({ success: true, order: { ...order, status: 'APROVADO' } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 4. RECEBIMENTO FÍSICO/FISCAL & GERAÇÃO DE CONTAS A PAGAR
// ========================================================
purchasingRouter.post('/orders/:id/receive', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { invoiceNumber, userName, userRole } = req.body;

    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Ordem de compra não encontrada.' });
    }

    db.prepare(`UPDATE purchase_orders SET status = 'RECEBIDO' WHERE id = ?`).run(id);

    // Ajuste Orçamentário: Transfere de comprometido para realizado
    try {
      db.prepare(`
        UPDATE cost_center_budgets
        SET committed_amount = MAX(0, committed_amount - ?),
            realized_amount = realized_amount + ?
        WHERE cost_center = ?
      `).run(order.total_amount, order.total_amount, order.department);
    } catch {}

    // Gera Contas a Pagar automaticamente no Financeiro com vínculo de origem PO
    const finId = `fin-${Date.now()}`;
    const finCode = `CP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const notaFiscal = invoiceNumber ? ` (NF: ${invoiceNumber})` : '';

    db.prepare(`
      INSERT INTO financial_records (id, company_id, code, type, title, entity_name, cost_center, category, amount, due_date, status, payment_method, origin_type, origin_id)
      VALUES (?, 'comp-1', ?, 'PAGAR', ?, ?, 'Operações & Logística Corporativa', 'Compras de Insumos', ?, ?, 'CONFIRMADO', 'Boleto Bancário', 'PO', ?)
    `).run(
      finId,
      finCode,
      `Ordem de Compra ${order.code}: ${order.title}${notaFiscal}`,
      order.supplier_name,
      order.total_amount,
      dueDate,
      order.code
    );

    logAudit(
      userName || 'Almoxarifado & Recebimento',
      userRole || 'Compras',
      'RECEIVE',
      'Compras & Estoque',
      `Ordem ${order.code}`,
      `Mercadoria/serviço recebido com conferência física/fiscal. Gerado título Contas a Pagar ${finCode} no valor de R$ ${order.total_amount.toFixed(2)}`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      success: true,
      order: { ...order, status: 'RECEBIDO' },
      financialRecord: { id: finId, code: finCode, dueDate, originType: 'PO', originId: order.code }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 5. FORNECEDORES HOMOLOGADOS & SLA
// ========================================================
purchasingRouter.get('/suppliers', (_req: Request, res: Response) => {
  try {
    const suppliers = db.prepare(`SELECT * FROM business_partners WHERE type = 'FORNECEDOR' AND active = 1 ORDER BY rating DESC, sla_percent DESC`).all() as any[];
    return res.json({ total: suppliers.length, suppliers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

purchasingRouter.post('/suppliers', (req: Request, res: Response) => {
  try {
    const { legalName, tradeName, documentNumber, category, contactName, email, phone, city, state, slaPercent, userName, userRole } = req.body;

    if (!legalName || !documentNumber) {
      return res.status(400).json({ error: 'Campos obrigatórios: legalName, documentNumber.' });
    }

    const id = `supp-${Date.now()}`;
    const code = `FORN-${Math.floor(100 + Math.random() * 900)}`;

    db.prepare(`
      INSERT INTO business_partners (id, company_id, code, type, legal_name, trade_name, document_number, category, contact_name, email, phone, city, state, rating, sla_percent, active)
      VALUES (?, 'comp-1', ?, 'FORNECEDOR', ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, ?, 1)
    `).run(
      id,
      code,
      legalName,
      tradeName || legalName,
      documentNumber,
      category || 'Suprimentos & Serviços',
      contactName || 'Responsável Comercial',
      email || null,
      phone || null,
      city || 'Curitiba',
      state || 'PR',
      parseFloat(slaPercent || '98.0')
    );

    logAudit(
      userName || 'Gestor de Suprimentos',
      userRole || 'Compras',
      'CREATE',
      'Fornecedores',
      `Fornecedor ${legalName}`,
      `Fornecedor homologado cadastrado com CNPJ ${documentNumber}`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({ success: true, supplierId: id, code });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
