// SEEK Core — Serviço de Domínio de Compras, Suprimentos, Cotações e Pedidos de Compra
import { purchasingRepository, PurchaseRequisitionEntity, PurchaseQuotationEntity, PurchaseOrderEntity } from '../repositories/purchasing.repository.js';
import { financeRepository } from '../repositories/finance.repository.js';
import { workflowRepository } from '../repositories/workflow.repository.js';
import { checkSeparationOfDuties } from '../utils/security.js';
import { TokenPayload } from '../middleware/auth.js';
import { db, createCorporateNotification } from '../db.js';
import { accountingService } from './accounting.service.js';

export class PurchasingService {
  /**
   * Lista requisições de compra com contadores de cotação
   */
  getRequisitions(department?: string) {
    const requisitions = purchasingRepository.listRequisitions(department);
    return { total: requisitions.length, requisitions };
  }

  /**
   * Obtém detalhes de uma requisição e mapa comparativo de cotações
   */
  getRequisitionDetails(id: string) {
    const requisition = purchasingRepository.findRequisitionById(id);
    if (!requisition) {
      throw new Error('Solicitação de compra não encontrada.');
    }
    const quotations = purchasingRepository.listQuotations(id);
    return { requisition, quotations };
  }

  /**
   * Cria nova solicitação de compra
   */
  createRequisition(data: {
    requesterName?: string;
    department: string;
    costCenter?: string;
    description: string;
    justification?: string;
    totalEstimated: number | string;
    priority?: string;
    requiredDate?: string;
    userName?: string;
    userRole?: string;
  }, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    if (!data.department || !data.description || !data.totalEstimated) {
      throw new Error('Campos obrigatórios: department, description, totalEstimated.');
    }

    const id = `req-${Date.now()}`;
    const code = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedAmount = parseFloat(data.totalEstimated as string);
    const reqUser = data.requesterName || user?.fullName || data.userName || 'Comprador SEEK';
    const reqCenter = data.costCenter || 'Operações & Serviços Corporativos';

    const entity: PurchaseRequisitionEntity = {
      id,
      code,
      requester_name: reqUser,
      department: data.department,
      cost_center: reqCenter,
      description: data.description,
      justification: data.justification || 'Necessidade operacional corporativa com base no plano orçamentário anual.',
      total_estimated: parsedAmount,
      priority: data.priority || 'MEDIA',
      status: 'SOLICITADO',
      required_date: data.requiredDate || new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10)
    };

    purchasingRepository.createRequisition(entity);

    workflowRepository.logAudit({
      userName: reqUser,
      userRole: user?.roleTitle || data.userRole || 'Compras',
      action: 'CREATE',
      module: 'Compras & Suprimentos',
      entity: `Solicitação ${code}`,
      description: `Nova solicitação de compra cadastrada (R$ ${parsedAmount.toFixed(2)} - ${data.department})`,
      ipAddress
    });

    return {
      id,
      code,
      requesterName: reqUser,
      department: data.department,
      costCenter: reqCenter,
      description: data.description,
      totalEstimated: parsedAmount,
      status: 'SOLICITADO'
    };
  }

  /**
   * Adiciona cotação de fornecedor a uma requisição existente
   */
  addQuotation(requisitionId: string, data: {
    supplierId?: string;
    supplierName: string;
    supplierCnpj?: string;
    unitPrice: number | string;
    quantity?: number | string;
    deliveryDays?: number | string;
    paymentTerms?: string;
    proposalNumber?: string;
    rating?: number;
    notes?: string;
  }) {
    if (!data.supplierName || !data.unitPrice) {
      throw new Error('Campos obrigatórios: supplierName, unitPrice.');
    }

    const quotId = `quot-${Date.now()}`;
    const qty = parseFloat((data.quantity as string) || '1');
    const uPrice = parseFloat(data.unitPrice as string);
    const totalPrice = uPrice * qty;

    const entity: PurchaseQuotationEntity = {
      id: quotId,
      requisition_id: requisitionId,
      supplier_id: data.supplierId,
      supplier_name: data.supplierName,
      supplier_cnpj: data.supplierCnpj || '00.000.000/0001-00',
      unit_price: uPrice,
      quantity: qty,
      total_price: totalPrice,
      delivery_days: parseInt((data.deliveryDays as string) || '7', 10),
      payment_terms: data.paymentTerms || '30 dias Boleto Bancário',
      proposal_number: data.proposalNumber || `PROP-${Math.floor(1000 + Math.random() * 9000)}`,
      rating: data.rating || 5.0,
      selected: 0,
      notes: data.notes
    };

    purchasingRepository.createQuotation(entity);
    purchasingRepository.updateRequisitionStatus(requisitionId, 'EM_COTACAO');

    return { quotationId: quotId, totalPrice };
  }

  /**
   * Seleciona a proposta vencedora no mapa comparativo de cotações
   */
  selectQuotation(quotationId: string, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    const quotation = purchasingRepository.findQuotationById(quotationId);
    if (!quotation) {
      throw new Error('Cotação não encontrada.');
    }

    purchasingRepository.selectQuotation(quotationId, quotation.requisition_id);
    purchasingRepository.updateRequisitionStatus(quotation.requisition_id, 'COTADO');

    const operator = user?.fullName || 'Comprador Corporativo';
    const operatorRole = user?.roleTitle || 'Compras';

    workflowRepository.logAudit({
      userName: operator,
      userRole: operatorRole,
      action: 'SELECT',
      module: 'Compras & Suprimentos',
      entity: `Cotação ${quotation.proposal_number || quotation.id}`,
      description: `Fornecedor ${quotation.supplier_name} selecionado para requisição ${quotation.requisition_id} no valor total de R$ ${quotation.total_price.toFixed(2)}`,
      ipAddress
    });

    return {
      selectedQuotationId: quotationId,
      supplierName: quotation.supplier_name,
      totalPrice: quotation.total_price
    };
  }

  /**
   * Aprovação de Ordem de Compra com SoD e ABAC
   */
  approveOrder(orderId: string, user?: TokenPayload, ipAddress: string = '127.0.0.1', correlationId?: string) {
    const order = purchasingRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('Ordem de compra não encontrada.');
    }

    // 1. SoD — Segregação de Funções: Solicitante não pode aprovar
    if (user) {
      const sodCheck = checkSeparationOfDuties(order.requester_name, user);
      if (sodCheck.isViolated) {
        workflowRepository.logAudit({
          userName: user.fullName,
          userRole: user.roleTitle,
          action: 'VIOLACAO_SOD',
          module: 'Compras & Suprimentos',
          entity: `Pedido ${order.code}`,
          description: `Tentativa de autoaprovação de ordem de compra bloqueada pela política de Segregação de Funções (SoD)`,
          ipAddress,
          correlationId
        });
        const err: any = new Error(`Violação de Segregação de Funções (SoD): o colaborador ${user.fullName} não pode aprovar sua própria ordem de compra. É requerida a deliberação de um aprovador independente.`);
        err.statusCode = 403;
        throw err;
      }
    }

    // 2. ABAC — Verificação Criptográfica de Alçada
    if (user) {
      const isExecutive = user.roleLevel === 'ADMIN_GERAL' || user.roleLevel === 'DIRETORIA';
      if (!isExecutive && order.total_amount > user.approvalLimitAmount) {
        const err: any = new Error(`Alçada de compras insuficiente: o valor do pedido (R$ ${Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede seu teto de alçada autorizado (R$ ${Number(user.approvalLimitAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Requer aprovação de alçada executiva superior.`);
        err.statusCode = 403;
        throw err;
      }
    }

    purchasingRepository.updateOrderStatus(orderId, 'APROVADO');
    const deciderName = user?.fullName || 'Gestor de Compras';
    const deciderRole = user?.roleTitle || 'Diretoria';

    db.prepare(`UPDATE purchase_orders SET approved_at = ?, approved_by = ? WHERE id = ?`)
      .run(new Date().toISOString(), deciderName, orderId);

    workflowRepository.logAudit({
      userName: deciderName,
      userRole: deciderRole,
      action: 'APPROVE',
      module: 'Compras & Suprimentos',
      entity: `Pedido ${order.code}`,
      description: `Ordem de compra aprovada no valor de R$ ${order.total_amount.toFixed(2)}. A obrigação financeira será gerada somente após o recebimento físico/fiscal e conferência do documento do fornecedor.`,
      ipAddress,
      correlationId
    });

    createCorporateNotification({
      title: 'Ordem de compra aprovada',
      message: `${order.code} — ${order.title} foi aprovada e aguarda recebimento físico/fiscal para faturamento.`,
      type: 'PURCHASE',
      linkRoute: 'purchasing-orders'
    });

    return {
      success: true,
      order: { ...order, status: 'APROVADO', approvedBy: deciderName }
    };
  }

  /**
   * Recebimento físico/fiscal atômico: documento do fornecedor → título → reconhecimento contábil.
   * Impede faturamento duplicado da mesma ordem.
   */
  receiveOrder(orderId: string, data: {
    invoiceNumber: string;
    invoiceDate?: string;
    dueDate?: string;
    userName?: string;
    userRole?: string;
  }, user?: TokenPayload, ipAddress: string = '127.0.0.1', correlationId?: string) {
    const order: any = purchasingRepository.findOrderById(orderId);
    if (!order) {
      const e: any = new Error('Ordem de compra não encontrada.'); e.statusCode = 404; throw e;
    }
    if (order.status !== 'APROVADO') {
      const e: any = new Error('Somente ordens aprovadas podem ser recebidas e faturadas.'); e.statusCode = 409; throw e;
    }
    if (!data.invoiceNumber?.trim()) {
      const e: any = new Error('O número da Nota Fiscal/NFS-e é obrigatório para gerar a obrigação financeira.'); e.statusCode = 400; throw e;
    }

    const existing = db.prepare('SELECT * FROM purchase_receipts WHERE order_id = ?').get(orderId) as any;
    if (existing) {
      const e: any = new Error(`Esta ordem já foi recebida e faturada no título ${existing.financial_record_code}.`); e.statusCode = 409; throw e;
    }

    const now = new Date();
    const invoiceDate = data.invoiceDate || now.toISOString().substring(0, 10);
    const dueDate = data.dueDate || new Date(now.getTime() + 30 * 86400000).toISOString().substring(0, 10);
    const companyId = user?.companyId || 'comp-1';
    const operator = user?.fullName || data.userName || 'Almoxarifado & Recebimento';
    const operatorRole = user?.roleTitle || data.userRole || 'Compras';
    const costCenter = order.cost_center || order.department || 'Operações & Serviços Corporativos';
    const legacyFinancial = db.prepare(`
      SELECT * FROM financial_records
      WHERE origin_type='PO' AND (origin_id=? OR origin_id=?)
      ORDER BY created_at ASC LIMIT 1
    `).get(order.id, order.code) as any;
    const finId = legacyFinancial?.id || `fin-po-${Date.now()}`;
    const finCode = legacyFinancial?.code || `CP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptId = `rec-po-${Date.now()}`;

    const tx = db.transaction(() => {
      if (legacyFinancial) {
        db.prepare(`
          UPDATE financial_records
          SET title=?, entity_name=?, cost_center=?, category=?, amount=?, due_date=?, status='CONFIRMADO', origin_id=?
          WHERE id=?
        `).run(
          `Compra ${order.code} — ${order.title} (NF ${data.invoiceNumber.trim()})`,
          order.supplier_name, costCenter, 'Compras / Fornecedores', order.total_amount,
          dueDate, order.id, finId
        );
      } else {
        financeRepository.createRecord({
          id: finId,
          company_id: companyId,
          code: finCode,
          type: 'PAGAR',
          title: `Compra ${order.code} — ${order.title} (NF ${data.invoiceNumber.trim()})`,
          entity_name: order.supplier_name,
          cost_center: costCenter,
          category: 'Compras / Fornecedores',
          amount: order.total_amount,
          due_date: dueDate,
          status: 'CONFIRMADO',
          payment_method: 'Boleto Bancário',
          origin_type: 'PO',
          origin_id: order.id
        });
      }

      accountingService.postFinancialRecognition({
        recordId: finId,
        recordCode: finCode,
        type: 'PAGAR',
        amount: order.total_amount,
        date: invoiceDate,
        costCenter,
        createdBy: operator
      });

      db.prepare(`
        INSERT INTO purchase_receipts
          (id, order_id, company_id, requisition_id, supplier_name, invoice_number, invoice_date, due_date, amount, cost_center, received_by, received_at, financial_record_id, financial_record_code, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FATURADO')
      `).run(
        receiptId, order.id, companyId, order.requisition_id || null, order.supplier_name,
        data.invoiceNumber.trim(), invoiceDate, dueDate, order.total_amount, costCenter,
        operator, now.toISOString(), finId, finCode
      );

      db.prepare(`
        UPDATE purchase_orders
        SET status='RECEBIDO', received_at=?, invoice_number=?, financial_record_id=?
        WHERE id=?
      `).run(now.toISOString(), data.invoiceNumber.trim(), finId, order.id);

      try {
        db.prepare(`
          UPDATE cost_center_budgets
          SET committed_amount = MAX(0, committed_amount - ?),
              realized_amount = realized_amount + ?
          WHERE cost_center = ?
        `).run(order.total_amount, order.total_amount, costCenter);
      } catch {}

      workflowRepository.logAudit({
        userName: operator,
        userRole: operatorRole,
        action: 'RECEIVE_AND_BILL',
        module: 'Compras & Suprimentos',
        entity: `Ordem ${order.code}`,
        description: `Recebimento físico/fiscal confirmado com documento ${data.invoiceNumber.trim()}. Gerado título ${finCode} no valor de R$ ${Number(order.total_amount).toFixed(2)} e reconhecimento contábil automático.`,
        ipAddress,
        correlationId
      });
    });

    tx();

    createCorporateNotification({
      title: 'Compra recebida — pagamento pendente',
      message: `${order.code} / NF ${data.invoiceNumber.trim()} gerou o título ${finCode}, vencimento ${dueDate}.`,
      type: 'FINANCE',
      linkRoute: 'finance-payables'
    });

    return {
      success: true,
      order: { ...order, status: 'RECEBIDO', invoiceNumber: data.invoiceNumber.trim(), receivedAt: now.toISOString() },
      receipt: { id: receiptId, invoiceNumber: data.invoiceNumber.trim(), invoiceDate, dueDate, amount: order.total_amount },
      financialRecord: { id: finId, code: finCode, dueDate, originType: 'PO', originId: order.id }
    };
  }
}

export const purchasingService = new PurchasingService();
