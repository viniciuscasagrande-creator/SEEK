// SEEK Core — Repositório de Compras, Requisições, Mapa de Cotações e Pedidos de Compra
import { db } from '../db.js';

export interface PurchaseRequisitionEntity {
  id: string;
  code: string;
  requester_name: string;
  department: string;
  cost_center: string;
  description: string;
  justification?: string;
  total_estimated: number;
  priority: string; // 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'
  status: string; // 'SOLICITADO' | 'EM_COTACAO' | 'COTADO' | 'APROVADO' | 'PEDIDO_GERADO' | 'REJEITADO'
  required_date: string;
  created_at?: string;
  quotations_count?: number;
  has_selected_quotation?: number;
}

export interface PurchaseQuotationEntity {
  id: string;
  requisition_id: string;
  supplier_id?: string;
  supplier_name: string;
  supplier_cnpj?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  delivery_days: number;
  payment_terms: string;
  proposal_number?: string;
  rating?: number;
  selected: number;
  notes?: string;
  created_at?: string;
}

export interface PurchaseOrderEntity {
  id: string;
  code: string;
  title: string;
  department: string;
  requester_name: string;
  supplier_name: string;
  total_amount: number;
  status: string; // 'PENDENTE_APROVACAO' | 'APROVADO' | 'RECEBIDO' | 'PAGO' | 'REJEITADO'
  required_date?: string;
  items_json?: string;
  created_at?: string;
}

export class PurchasingRepository {
  // --- REQUISIÇÕES DE COMPRA ---
  listRequisitions(department?: string): PurchaseRequisitionEntity[] {
    let sql = `
      SELECT r.*,
        (SELECT COUNT(*) FROM purchase_quotations q WHERE q.requisition_id = r.id) as quotations_count,
        (SELECT COUNT(*) FROM purchase_quotations q WHERE q.requisition_id = r.id AND q.selected = 1) as has_selected_quotation
      FROM purchase_requisitions r
    `;
    const params: any[] = [];
    if (department && department !== 'ALL') {
      sql += ' WHERE r.department = ?';
      params.push(department);
    }
    sql += ' ORDER BY r.created_at DESC';
    return db.prepare(sql).all(...params) as PurchaseRequisitionEntity[];
  }

  findRequisitionById(id: string): PurchaseRequisitionEntity | undefined {
    return db.prepare('SELECT * FROM purchase_requisitions WHERE id = ?').get(id) as PurchaseRequisitionEntity | undefined;
  }

  createRequisition(data: PurchaseRequisitionEntity): void {
    db.prepare(`
      INSERT INTO purchase_requisitions (id, code, requester_name, department, cost_center, description, justification, total_estimated, priority, status, required_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.code,
      data.requester_name,
      data.department,
      data.cost_center,
      data.description,
      data.justification || '',
      data.total_estimated,
      data.priority || 'MEDIA',
      data.status || 'SOLICITADO',
      data.required_date
    );
  }

  updateRequisitionStatus(id: string, status: string): void {
    db.prepare('UPDATE purchase_requisitions SET status = ? WHERE id = ?').run(status, id);
  }

  // --- MAPA DE COTAÇÃO ---
  listQuotations(requisitionId: string): PurchaseQuotationEntity[] {
    return db.prepare('SELECT * FROM purchase_quotations WHERE requisition_id = ? ORDER BY total_price ASC').all(requisitionId) as PurchaseQuotationEntity[];
  }

  findQuotationById(id: string): PurchaseQuotationEntity | undefined {
    return db.prepare('SELECT * FROM purchase_quotations WHERE id = ?').get(id) as PurchaseQuotationEntity | undefined;
  }

  createQuotation(data: PurchaseQuotationEntity): void {
    db.prepare(`
      INSERT INTO purchase_quotations (id, requisition_id, supplier_id, supplier_name, supplier_cnpj, unit_price, quantity, total_price, delivery_days, payment_terms, proposal_number, rating, selected, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.requisition_id,
      data.supplier_id || null,
      data.supplier_name,
      data.supplier_cnpj || '00.000.000/0001-00',
      data.unit_price,
      data.quantity,
      data.total_price,
      data.delivery_days || 7,
      data.payment_terms || '30 dias Boleto Bancário',
      data.proposal_number || null,
      data.rating || 5.0,
      data.selected || 0,
      data.notes || null
    );
  }

  selectQuotation(quotationId: string, requisitionId: string): void {
    db.prepare('UPDATE purchase_quotations SET selected = 0 WHERE requisition_id = ?').run(requisitionId);
    db.prepare('UPDATE purchase_quotations SET selected = 1 WHERE id = ?').run(quotationId);
  }

  // --- ORDENS DE COMPRA (PURCHASE ORDERS) ---
  listOrders(): PurchaseOrderEntity[] {
    return db.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all() as PurchaseOrderEntity[];
  }

  findOrderById(id: string): PurchaseOrderEntity | undefined {
    return db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as PurchaseOrderEntity | undefined;
  }

  findOrderByCode(code: string): PurchaseOrderEntity | undefined {
    return db.prepare('SELECT * FROM purchase_orders WHERE code = ?').get(code) as PurchaseOrderEntity | undefined;
  }

  createOrder(data: PurchaseOrderEntity): void {
    db.prepare(`
      INSERT INTO purchase_orders (id, code, title, department, requester_name, supplier_name, total_amount, status, required_date, items_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.code,
      data.title,
      data.department,
      data.requester_name,
      data.supplier_name,
      data.total_amount,
      data.status || 'PENDENTE_APROVACAO',
      data.required_date || null,
      data.items_json || null
    );
  }

  updateOrderStatus(id: string, status: string): void {
    db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(status, id);
  }
}

export const purchasingRepository = new PurchasingRepository();
