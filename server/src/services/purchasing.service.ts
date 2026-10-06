// SEEK Core — Serviço de Domínio de Compras, Suprimentos, Cotações e Pedidos de Compra
import { purchasingRepository, PurchaseRequisitionEntity, PurchaseQuotationEntity, PurchaseOrderEntity } from '../repositories/purchasing.repository.js';
import { financeRepository } from '../repositories/finance.repository.js';
import { workflowRepository } from '../repositories/workflow.repository.js';
import { checkSeparationOfDuties } from '../utils/security.js';
import { TokenPayload } from '../middleware/auth.js';

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

    // Integração automática com Contas a Pagar no Financeiro
    const finId = `fin-po-${Date.now()}`;
    const finCode = `CP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueDate = order.required_date || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10);

    financeRepository.createRecord({
      id: finId,
      company_id: user?.companyId || 'comp-1',
      code: finCode,
      type: 'PAGAR',
      title: `Pedido de Compra ${order.code} — ${order.title}`,
      entity_name: order.supplier_name,
      cost_center: 'Compras & Suprimentos',
      category: 'Fornecedores & Materiais',
      amount: order.total_amount,
      due_date: dueDate,
      status: 'CONFIRMADO',
      payment_method: 'Boleto Bancário',
      origin_type: 'PO',
      origin_id: order.code
    });

    const deciderName = user?.fullName || 'Gestor de Compras';
    const deciderRole = user?.roleTitle || 'Diretoria';

    workflowRepository.logAudit({
      userName: deciderName,
      userRole: deciderRole,
      action: 'APPROVE',
      module: 'Compras & Suprimentos',
      entity: `Pedido ${order.code}`,
      description: `Ordem de compra aprovada no valor de R$ ${order.total_amount.toFixed(2)}. Gerado título a pagar ${finCode}.`,
      ipAddress,
      correlationId
    });

    return {
      success: true,
      order: { ...order, status: 'APROVADO' }
    };
  }
}

export const purchasingService = new PurchasingService();
