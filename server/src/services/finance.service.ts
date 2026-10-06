// SEEK Core — Serviço de Domínio Financeiro, Tesouraria, Liquidação e Conciliação
import { db } from '../db.js';
import { financeRepository, FinancialRecordEntity, BankAccountEntity, BankTransactionEntity, CostCenterBudgetEntity } from '../repositories/finance.repository.js';
import { workflowRepository } from '../repositories/workflow.repository.js';
import { TokenPayload } from '../middleware/auth.js';

export class FinanceService {
  /**
   * Lista títulos a pagar/receber com filtragem e tenant scoping
   */
  getRecords(filters: {
    companyId?: string;
    type?: string;
    status?: string;
    originType?: string;
    search?: string;
  } = {}) {
    const rows = financeRepository.listRecords(filters);

    const records = rows.map(r => ({
      id: r.id,
      companyId: r.company_id,
      code: r.code,
      type: r.type,
      title: r.title,
      entityName: r.entity_name,
      costCenter: r.cost_center,
      category: r.category,
      amount: r.amount,
      dueDate: r.due_date,
      paymentDate: r.payment_date,
      status: r.status,
      paymentMethod: r.payment_method,
      originType: r.origin_type || 'AVULSO',
      originId: r.origin_id || null,
      bankId: r.bank_id || null,
      bankName: r.bank_name || null,
      createdAt: r.created_at
    }));

    return { total: records.length, records };
  }

  /**
   * Cria novo título a pagar ou a receber
   */
  createRecord(data: {
    type?: string;
    title: string;
    entityName?: string;
    costCenter?: string;
    category?: string;
    amount: number | string;
    dueDate: string;
    paymentMethod?: string;
    originType?: string;
    originId?: string;
    companyId?: string;
    userName?: string;
    userRole?: string;
  }, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    if (!data.title || !data.amount || !data.dueDate) {
      throw new Error('Campos obrigatórios: title, amount, dueDate.');
    }

    const type = data.type || 'PAGAR';
    const codePrefix = type === 'RECEBER' ? 'CR' : 'CP';
    const id = `fin-${Date.now()}`;
    const code = `${codePrefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedAmount = parseFloat(data.amount as string);
    const targetCompanyId = data.companyId || user?.companyId || 'comp-1';

    const entity: FinancialRecordEntity = {
      id,
      company_id: targetCompanyId,
      code,
      type,
      title: data.title,
      entity_name: data.entityName || 'Entidade Corporativa',
      cost_center: data.costCenter || 'Administrativo & Recursos Humanos',
      category: data.category || 'Despesas Gerais',
      amount: parsedAmount,
      due_date: data.dueDate,
      status: 'PREVISTO',
      payment_method: data.paymentMethod || 'PIX',
      origin_type: data.originType || 'AVULSO',
      origin_id: data.originId || undefined
    };

    financeRepository.createRecord(entity);

    const operator = user?.fullName || data.userName || 'Operador Financeiro';
    const operatorRole = user?.roleTitle || data.userRole || 'Financeiro';

    workflowRepository.logAudit({
      userName: operator,
      userRole: operatorRole,
      action: 'CREATE',
      module: 'Financeiro',
      entity: `Lançamento ${code}`,
      description: `Criado lançamento ${type} (${entity.origin_type}) no valor de R$ ${parsedAmount.toFixed(2)} (${data.title})`,
      ipAddress
    });

    return {
      ...entity,
      entityName: entity.entity_name,
      costCenter: entity.cost_center,
      dueDate: entity.due_date,
      paymentMethod: entity.payment_method,
      originType: entity.origin_type,
      originId: entity.origin_id
    };
  }

  /**
   * Liquidação / Baixa de título com verificação de alçada ABAC e movimentação bancária
   */
  liquidateRecord(id: string, options: {
    bankId?: string;
    paymentMethod?: string;
    paymentDate?: string;
    userName?: string;
    userRole?: string;
  }, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    const record = financeRepository.findRecordById(id);
    if (!record) {
      throw new Error('Lançamento financeiro não encontrado.');
    }

    // 1. ABAC — Verificação de Alçada para Liquidação Financeira
    if (user) {
      const isExecutive = user.roleLevel === 'ADMIN_GERAL' || user.roleLevel === 'DIRETORIA';
      if (!isExecutive && record.amount > user.approvalLimitAmount) {
        const err: any = new Error(`Alçada financeira insuficiente: o valor da baixa (R$ ${Number(record.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede seu teto de alçada autorizado (R$ ${Number(user.approvalLimitAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Requer aprovação de alçada executiva superior.`);
        err.statusCode = 403;
        throw err;
      }
    }

    const paymentDate = options.paymentDate || new Date().toISOString().substring(0, 10);
    const selectedMethod = options.paymentMethod || record.payment_method || 'PIX';

    let bankInfo: BankAccountEntity | undefined = undefined;
    if (options.bankId) {
      bankInfo = financeRepository.findBankAccountById(options.bankId);
    }

    // Atualiza status do lançamento
    financeRepository.payRecord(id, {
      paymentDate,
      paymentMethod: selectedMethod,
      bankId: options.bankId || null,
      bankName: bankInfo ? bankInfo.bank_name : null
    });

    const operator = user?.fullName || options.userName || 'Operador Financeiro';
    const operatorRole = user?.roleTitle || options.userRole || 'Financeiro';

    // Movimentação bancária e criação de transação no extrato
    if (options.bankId && bankInfo) {
      const isPay = record.type === 'PAGAR';
      const balanceChange = isPay ? -record.amount : record.amount;
      const txType = isPay ? 'DEBITO' : 'CREDITO';

      financeRepository.updateAccountBalance(options.bankId, balanceChange);

      const btxId = `btx-${Date.now()}`;
      financeRepository.createBankTransaction({
        id: btxId,
        account_id: options.bankId,
        type: txType,
        category: record.category,
        amount: record.amount,
        transaction_date: paymentDate,
        description: `Liquidação ${record.code} — ${record.title} (${record.entity_name})`,
        reference_type: 'TITULO',
        reference_id: record.code,
        reconciled: 1,
        reconciled_at: new Date().toISOString()
      });
    }

    // Sincronização em cascata nas entidades originárias
    if (record.origin_type === 'TAXA' && record.origin_id) {
      try {
        db.prepare(`UPDATE freelance_shifts SET status = 'PAGO', paid_at = ? WHERE id = ? OR code = ?`).run(paymentDate, record.origin_id, record.origin_id);
      } catch {}
    }
    if (record.origin_type === 'PO' && record.origin_id) {
      try {
        db.prepare(`UPDATE purchase_orders SET status = 'PAGO' WHERE id = ? OR code = ?`).run(record.origin_id, record.origin_id);
      } catch {}
    }
    if (record.origin_type === 'FISCAL' && record.origin_id) {
      try {
        db.prepare(`UPDATE tax_obligations SET status = 'PAGO', payment_date = ? WHERE id = ? OR code = ?`).run(paymentDate, record.origin_id, record.origin_id);
      } catch {}
    }

    workflowRepository.logAudit({
      userName: operator,
      userRole: operatorRole,
      action: 'UPDATE',
      module: 'Financeiro',
      entity: `Lançamento ${record.code}`,
      description: `Baixa / liquidação efetuada no valor de R$ ${record.amount.toFixed(2)}${bankInfo ? ` via ${bankInfo.bank_name}` : ''}`,
      ipAddress
    });

    return {
      success: true,
      record: {
        ...record,
        status: 'PAGO',
        paymentDate,
        bankId: options.bankId,
        bankName: bankInfo ? bankInfo.bank_name : null
      }
    };
  }

  /**
   * Retorna os KPIs consolidados do fluxo de caixa e tesouraria
   */
  getDashboardKpis(companyId?: string) {
    const allRecords = financeRepository.listRecords({ companyId });
    const bankAccounts = financeRepository.listBankAccounts();

    let totalPagar = 0;
    let totalPagarPago = 0;
    let totalReceber = 0;
    let totalReceberPago = 0;

    for (const r of allRecords) {
      if (r.type === 'PAGAR') {
        totalPagar += r.amount;
        if (r.status === 'PAGO') totalPagarPago += r.amount;
      } else if (r.type === 'RECEBER') {
        totalReceber += r.amount;
        if (r.status === 'PAGO') totalReceberPago += r.amount;
      }
    }

    const totalCashBalance = bankAccounts.reduce((acc, b) => acc + (b.current_balance || 0), 0);

    return {
      totalCashBalance,
      accountsPayableTotal: totalPagar,
      accountsPayablePaid: totalPagarPago,
      accountsPayablePending: totalPagar - totalPagarPago,
      accountsReceivableTotal: totalReceber,
      accountsReceivablePaid: totalReceberPago,
      accountsReceivablePending: totalReceber - totalReceberPago,
      netPosition: totalCashBalance + (totalReceber - totalReceberPago) - (totalPagar - totalPagarPago)
    };
  }
}

export const financeService = new FinanceService();
