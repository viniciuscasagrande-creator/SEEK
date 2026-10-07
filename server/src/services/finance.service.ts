// SEEK Core — Serviço de Domínio Financeiro, Tesouraria, Liquidação e Conciliação
import crypto from 'crypto';
import { db, createCorporateNotification } from '../db.js';
import { accountingService } from './accounting.service.js';
import {
  financeRepository,
  FinancialRecordEntity,
  BankAccountEntity,
  BankTransactionEntity,
  CostCenterBudgetEntity,
  OfxImportEntity,
  OfxTransactionEntity
} from '../repositories/finance.repository.js';
import { workflowRepository } from '../repositories/workflow.repository.js';
import { TokenPayload } from '../middleware/auth.js';
import { parseOfx } from '../utils/ofxParser.js';

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

    const operator = user?.fullName || data.userName || 'Operador Financeiro';
    const operatorRole = user?.roleTitle || data.userRole || 'Financeiro';
    const createTx = db.transaction(() => {
      financeRepository.createRecord(entity);
      accountingService.postFinancialRecognition({ recordId:id, recordCode:code, type, amount:parsedAmount, date:new Date().toISOString().substring(0,10), costCenter:entity.cost_center, createdBy:operator, originType:entity.origin_type, originId:entity.origin_id });
    });
    createTx();

    workflowRepository.logAudit({
      userName: operator,
      userRole: operatorRole,
      action: 'CREATE',
      module: 'Financeiro',
      entity: `Lançamento ${code}`,
      description: `Criado lançamento ${type} (${entity.origin_type}) no valor de R$ ${parsedAmount.toFixed(2)} (${data.title})`,
      ipAddress
    });

    if (type === 'PAGAR') {
      createCorporateNotification({
        title: 'Novo título a pagar',
        message: `${code} — ${data.title} no valor de R$ ${parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, vencimento ${data.dueDate}.`,
        type: 'FINANCE',
        linkRoute: 'finance-payables'
      });
    }

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
    bankId?: string; paymentMethod?: string; paymentDate?: string; userName?: string; userRole?: string;
  }, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    const record = financeRepository.findRecordById(id);
    if (!record) throw new Error('Lançamento financeiro não encontrado.');
    if (record.status === 'PAGO') { const e:any = new Error('Este título já foi liquidado.'); e.statusCode = 409; throw e; }

    if (user) {
      const isExecutive = user.roleLevel === 'ADMIN_GERAL' || user.roleLevel === 'DIRETORIA';
      if (!isExecutive && record.amount > user.approvalLimitAmount) {
        const e:any = new Error('Alçada financeira insuficiente para esta liquidação.'); e.statusCode = 403; throw e;
      }
      if (record.company_id && user.companyId && record.company_id !== user.companyId && !isExecutive) {
        const e:any = new Error('Título pertence a outra empresa.'); e.statusCode = 403; throw e;
      }
    }

    const paymentDate = options.paymentDate || new Date().toISOString().substring(0, 10);
    const method = options.paymentMethod || record.payment_method || 'PIX';
    const bank = options.bankId ? financeRepository.findBankAccountById(options.bankId) : undefined;
    if (options.bankId && !bank) { const e:any = new Error('Conta bancária não encontrada.'); e.statusCode = 404; throw e; }
    if (record.type === 'PAGAR' && bank && bank.current_balance < record.amount) {
      const e:any = new Error('Saldo bancário insuficiente para a liquidação.'); e.statusCode = 422; throw e;
    }
    const operator = user?.fullName || options.userName || 'Operador Financeiro';
    const operatorRole = user?.roleTitle || options.userRole || 'Financeiro';

    const tx = db.transaction(() => {
      financeRepository.payRecord(id, { paymentDate, paymentMethod: method, bankId: options.bankId || null, bankName: bank?.bank_name || null });
      let bankTransactionId: string | null = null;
      if (bank && options.bankId) {
        const isPay = record.type === 'PAGAR';
        financeRepository.updateAccountBalance(options.bankId, isPay ? -record.amount : record.amount);
        bankTransactionId = `btx-settle-${record.id}`;
        financeRepository.createBankTransaction({ id: bankTransactionId, account_id: options.bankId, type: isPay ? 'DEBITO' : 'CREDITO',
          category: record.category, amount: record.amount, transaction_date: paymentDate,
          description: `Liquidação ${record.code} — ${record.title} (${record.entity_name})`, reference_type: 'TITULO', reference_id: record.id, reconciled: 0 });
      }
      const accountingEntry = accountingService.postFinancialSettlement({ recordId: record.id, recordCode: record.code, type: record.type, amount: record.amount, date: paymentDate, costCenter: record.cost_center, createdBy: operator, originType: record.origin_type, originId: record.origin_id });
      if (record.origin_type === 'TAXA' && record.origin_id) db.prepare(`UPDATE freelance_shifts SET status='PAGO', paid_at=? WHERE id=? OR code=?`).run(paymentDate, record.origin_id, record.origin_id);
      if (record.origin_type === 'PO' && record.origin_id) {
        db.prepare(`UPDATE purchase_orders SET status='PAGO' WHERE id=? OR code=?`).run(record.origin_id, record.origin_id);
        db.prepare(`UPDATE purchase_receipts SET status='PAGO' WHERE order_id=? OR financial_record_id=?`).run(record.origin_id, record.id);
      }
      if (record.origin_type === 'FISCAL' && record.origin_id) db.prepare(`UPDATE tax_obligations SET status='PAGO', payment_date=? WHERE id=? OR code=?`).run(paymentDate, record.origin_id, record.origin_id);
      if ((record.origin_type === 'FOLHA' || record.origin_type === 'FOLHA_PAGAMENTO') && record.origin_id) db.prepare(`UPDATE payroll_runs SET status='PAGO' WHERE id=?`).run(record.origin_id);
      if (record.origin_type === 'FERIAS' && record.origin_id) db.prepare(`UPDATE vacation_requests SET status='PAGO' WHERE id=?`).run(record.origin_id);
      if (record.origin_type === 'BENEFICIOS' && record.origin_id) db.prepare(`UPDATE benefit_purchase_orders SET status='PAGO' WHERE id=?`).run(record.origin_id);
      if (record.origin_type === 'CONTRATO' && record.origin_id) db.prepare(`UPDATE contract_obligations SET status='PAGO', paid_at=? WHERE id=? OR financial_record_id=?`).run(paymentDate, record.origin_id, record.id);
      workflowRepository.logAudit({ userName: operator, userRole: operatorRole, action: 'LIQUIDATE', module: 'Financeiro', entity: `Lançamento ${record.code}`, description: `Liquidação atômica de R$ ${record.amount.toFixed(2)}${bank ? ` via ${bank.bank_name}` : ''}; lançamento contábil gerado automaticamente.`, ipAddress });
      return { bankTransactionId, accountingEntry };
    });
    const result = tx();

    createCorporateNotification({
      title: 'Pagamento realizado',
      message: `${record.code} — ${record.title} foi liquidado no valor de R$ ${record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      type: 'FINANCE',
      linkRoute: 'finance-payables'
    });

    return { success: true, record: { ...record, status:'PAGO', paymentDate, bankId: options.bankId, bankName: bank?.bank_name || null }, ...result };
  }

  /**
   * Retorna os KPIs consolidados do fluxo de caixa e tesouraria
   */
  getDashboardKpis(companyId?: string) {
    const allRecords = financeRepository.listRecords({ companyId });
    const bankAccounts = financeRepository.listBankAccounts();
    const today = new Date().toISOString().substring(0, 10);

    let totalPagar = 0;
    let totalPagarPago = 0;
    let totalReceber = 0;
    let totalReceberPago = 0;

    let overdueCount = 0;
    let overdueAmount = 0;
    let dueTodayCount = 0;
    let dueTodayAmount = 0;
    let rhPendingCount = 0;
    let rhPendingAmount = 0;
    let purchasingPendingCount = 0;
    let purchasingPendingAmount = 0;
    let fiscalPendingCount = 0;
    let fiscalPendingAmount = 0;

    for (const r of allRecords) {
      if (r.type === 'PAGAR') {
        totalPagar += r.amount;
        if (r.status === 'PAGO') {
          totalPagarPago += r.amount;
        } else {
          if (r.due_date < today) {
            overdueCount++;
            overdueAmount += r.amount;
          } else if (r.due_date === today) {
            dueTodayCount++;
            dueTodayAmount += r.amount;
          }

          const origin = r.origin_type || 'AVULSO';
          if (['RH', 'FOLHA_PAGAMENTO', 'BENEFICIOS', 'TAXA'].includes(origin)) {
            rhPendingCount++;
            rhPendingAmount += r.amount;
          } else if (['PO', 'COMPRAS', 'COMPRAS_PEDIDO'].includes(origin)) {
            purchasingPendingCount++;
            purchasingPendingAmount += r.amount;
          } else if (origin === 'FISCAL') {
            fiscalPendingCount++;
            fiscalPendingAmount += r.amount;
          }
        }
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
      netPosition: totalCashBalance + (totalReceber - totalReceberPago) - (totalPagar - totalPagarPago),
      overdueCount,
      overdueAmount,
      dueTodayCount,
      dueTodayAmount,
      rhPendingCount,
      rhPendingAmount,
      purchasingPendingCount,
      purchasingPendingAmount,
      fiscalPendingCount,
      fiscalPendingAmount
    };
  }

  /**
   * Importação de extrato OFX com idempotência por FITID e hash de integridade
   */
  importOfx(accountId: string, ofxContent: string, fileName: string = 'extrato.ofx', user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    const bankAccount = financeRepository.findBankAccountById(accountId);
    if (!bankAccount) {
      const err: any = new Error('Conta bancária não encontrada.');
      err.statusCode = 404;
      throw err;
    }

    const fileHash = crypto.createHash('sha256').update(ofxContent).digest('hex');
    const parsed = parseOfx(ofxContent);

    const importId = `ofx-imp-${Date.now()}`;
    const companyId = user?.companyId || 'comp-1';
    const operator = user?.fullName || 'Operador Financeiro';
    const operatorRole = user?.roleTitle || 'Financeiro';

    let newCount = 0;
    let duplicateCount = 0;

    const tx = db.transaction(() => {
      financeRepository.createOfxImport({
        id: importId,
        account_id: accountId,
        company_id: companyId,
        filename: fileName,
        file_hash: fileHash,
        bank_code: parsed.bankCode,
        account_number: parsed.accountNumber,
        start_date: parsed.startDate,
        end_date: parsed.endDate,
        total_transactions: parsed.transactions.length,
        imported_by: operator
      });

      for (let i = 0; i < parsed.transactions.length; i++) {
        const item = parsed.transactions[i];
        const existing = financeRepository.findOfxTransactionByFitid(accountId, item.fitid);
        if (existing) {
          duplicateCount++;
          continue;
        }

        const txId = `ofx-tx-${Date.now()}-${i + 1}`;
        financeRepository.createOfxTransaction({
          id: txId,
          import_id: importId,
          account_id: accountId,
          company_id: companyId,
          fitid: item.fitid,
          type: item.type,
          amount: item.amount,
          posted_date: item.postedDate,
          memo: item.memo,
          check_number: item.checkNumber,
          status: 'PENDENTE'
        });
        newCount++;
      }
    });

    tx();

    workflowRepository.logAudit({
      userName: operator,
      userRole: operatorRole,
      action: 'IMPORT',
      module: 'Financeiro',
      entity: `OFX ${fileName}`,
      description: `Importação de extrato OFX para ${bankAccount.bank_name}: ${parsed.transactions.length} transações lidas (${newCount} novas, ${duplicateCount} já existentes/duplicadas)`,
      ipAddress
    });

    return {
      success: true,
      importId,
      fileHash,
      bankCode: parsed.bankCode,
      accountNumber: parsed.accountNumber,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      totalParsed: parsed.transactions.length,
      newCount,
      duplicateCount,
      transactions: this.listOfxTransactions(accountId)
    };
  }

  /**
   * Lista transações do extrato OFX com candidatos de conciliação do sistema
   */
  listOfxTransactions(accountId: string, status?: string) {
    const rows = financeRepository.listOfxTransactions(accountId, status);
    return rows.map(r => {
      let candidates: any[] = [];
      if (r.status === 'PENDENTE') {
        candidates = financeRepository.findMatchingBankTransactions(r.account_id, r.type, r.amount, r.posted_date);
      }
      return {
        id: r.id,
        importId: r.import_id,
        accountId: r.account_id,
        fitid: r.fitid,
        type: r.type,
        amount: r.amount,
        postedDate: r.posted_date,
        memo: r.memo,
        checkNumber: r.check_number,
        status: r.status,
        matchedBankTxId: r.matched_bank_tx_id,
        reconciledAt: r.reconciled_at,
        candidates
      };
    });
  }

  /**
   * Conciliação transacional entre item do extrato OFX e movimentação do sistema
   */
  matchAndReconcile(ofxTxId: string, bankTxId: string, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    const ofxTx = financeRepository.findOfxTransactionById(ofxTxId);
    if (!ofxTx) {
      const err: any = new Error('Transação do extrato OFX não encontrada.');
      err.statusCode = 404;
      throw err;
    }
    if (ofxTx.status === 'CONCILIADO') {
      const err: any = new Error('Esta transação OFX já está conciliada.');
      err.statusCode = 409;
      throw err;
    }

    const bankTx = financeRepository.findBankTransactionById(bankTxId);
    if (!bankTx) {
      const err: any = new Error('Movimentação bancária do sistema não encontrada.');
      err.statusCode = 404;
      throw err;
    }
    if (bankTx.reconciled === 1) {
      const err: any = new Error('Esta movimentação bancária já foi conciliada.');
      err.statusCode = 409;
      throw err;
    }
    if (bankTx.account_id !== ofxTx.account_id) {
      const err: any = new Error('A conta bancária da movimentação difere do extrato OFX.');
      err.statusCode = 400;
      throw err;
    }
    if (bankTx.type !== ofxTx.type) {
      const err: any = new Error(`Incompatibilidade de tipo: OFX é ${ofxTx.type} e movimentação é ${bankTx.type}.`);
      err.statusCode = 400;
      throw err;
    }
    if (Math.abs(bankTx.amount - ofxTx.amount) > 0.01) {
      const err: any = new Error(`Divergência de valor: OFX R$ ${ofxTx.amount.toFixed(2)} vs Sistema R$ ${bankTx.amount.toFixed(2)}.`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const operator = user?.fullName || 'Operador Financeiro';
    const operatorRole = user?.roleTitle || 'Financeiro';

    const tx = db.transaction(() => {
      financeRepository.updateBankTransactionReconciled(bankTxId, 1, now);
      financeRepository.updateOfxTransactionStatus(ofxTxId, 'CONCILIADO', bankTxId, now);

      workflowRepository.logAudit({
        userName: operator,
        userRole: operatorRole,
        action: 'RECONCILE',
        module: 'Financeiro',
        entity: `OFX ${ofxTx.fitid}`,
        description: `Conciliação confirmada: OFX FITID ${ofxTx.fitid} (${ofxTx.type} R$ ${ofxTx.amount.toFixed(2)}) vinculado à transação bancária ${bankTx.id} (${bankTx.description})`,
        ipAddress
      });
    });

    tx();

    return {
      success: true,
      ofxTxId,
      bankTxId,
      reconciledAt: now
    };
  }

  /**
   * Reversão de conciliação bancária
   */
  unmatchReconciliation(ofxTxId: string, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    const ofxTx = financeRepository.findOfxTransactionById(ofxTxId);
    if (!ofxTx) {
      const err: any = new Error('Transação do extrato OFX não encontrada.');
      err.statusCode = 404;
      throw err;
    }
    if (ofxTx.status !== 'CONCILIADO') {
      const err: any = new Error('Esta transação OFX não está conciliada.');
      err.statusCode = 400;
      throw err;
    }

    const matchedBankTxId = ofxTx.matched_bank_tx_id;
    const operator = user?.fullName || 'Operador Financeiro';
    const operatorRole = user?.roleTitle || 'Financeiro';

    const tx = db.transaction(() => {
      if (matchedBankTxId) {
        financeRepository.updateBankTransactionReconciled(matchedBankTxId, 0, null);
      }
      financeRepository.updateOfxTransactionStatus(ofxTxId, 'PENDENTE', null, null);

      workflowRepository.logAudit({
        userName: operator,
        userRole: operatorRole,
        action: 'UNRECONCILE',
        module: 'Financeiro',
        entity: `OFX ${ofxTx.fitid}`,
        description: `Desconciliação efetuada: OFX FITID ${ofxTx.fitid} revertido para pendente.`,
        ipAddress
      });
    });

    tx();

    return {
      success: true,
      ofxTxId,
      unmatchedBankTxId: matchedBankTxId
    };
  }

  /**
   * Conciliação Avulsa (tarifas bancárias, rendimentos, débitos diretos não lançados previamente)
   * Gera automaticamente título financeiro, baixa contábil em partidas dobradas e movimentação bancária.
   */
  createAndReconcileAvulso(ofxTxId: string, options: {
    category?: string;
    costCenter?: string;
    entityName?: string;
    description?: string;
  } = {}, user?: TokenPayload, ipAddress: string = '127.0.0.1') {
    const ofxTx = financeRepository.findOfxTransactionById(ofxTxId);
    if (!ofxTx) {
      const err: any = new Error('Transação do extrato OFX não encontrada.');
      err.statusCode = 404;
      throw err;
    }
    if (ofxTx.status === 'CONCILIADO') {
      const err: any = new Error('Esta transação OFX já está conciliada.');
      err.statusCode = 409;
      throw err;
    }

    const bank = financeRepository.findBankAccountById(ofxTx.account_id);
    if (!bank) {
      const err: any = new Error('Conta bancária associada não encontrada.');
      err.statusCode = 404;
      throw err;
    }

    const isDebit = ofxTx.type === 'DEBITO';
    const finType = isDebit ? 'PAGAR' : 'RECEBER';
    const now = new Date().toISOString();
    const paymentDate = ofxTx.posted_date || now.substring(0, 10);
    const operator = user?.fullName || 'Operador Financeiro';
    const operatorRole = user?.roleTitle || 'Financeiro';
    const companyId = user?.companyId || ofxTx.company_id || 'comp-1';

    const recordId = `fin-ofx-${Date.now()}`;
    const recordCode = `${isDebit ? 'CP' : 'CR'}-OFX-${Math.floor(1000 + Math.random() * 9000)}`;
    const bankTxId = `btx-ofx-${Date.now()}`;
    const title = options.description || ofxTx.memo || (isDebit ? 'Despesa/Tarifa Bancária OFX' : 'Receita/Rendimento Bancário OFX');
    const category = options.category || (isDebit ? 'Despesas Bancárias' : 'Rendimentos Financeiros');
    const costCenter = options.costCenter || 'Controladoria & Finanças';
    const entityName = options.entityName || bank.bank_name;

    const tx = db.transaction(() => {
      // 1. Cria o registro financeiro já liquidado
      financeRepository.createRecord({
        id: recordId,
        company_id: companyId,
        code: recordCode,
        type: finType,
        title,
        entity_name: entityName,
        cost_center: costCenter,
        category,
        amount: ofxTx.amount,
        due_date: paymentDate,
        status: 'PAGO',
        payment_method: 'DEBITO_EM_CONTA',
        origin_type: 'CONCILIACAO_OFX',
        origin_id: ofxTx.id,
        bank_id: bank.id,
        bank_name: bank.bank_name
      });

      // 2. Atualiza saldo da conta e insere bank_transactions já como conciliado
      financeRepository.updateAccountBalance(bank.id, isDebit ? -ofxTx.amount : ofxTx.amount);
      financeRepository.createBankTransaction({
        id: bankTxId,
        account_id: bank.id,
        type: ofxTx.type,
        category,
        amount: ofxTx.amount,
        transaction_date: paymentDate,
        description: `${title} (OFX FITID ${ofxTx.fitid})`,
        reference_type: 'OFX_AVULSO',
        reference_id: recordId,
        reconciled: 1,
        reconciled_at: now
      });

      // 3. Reflexo contábil em partidas dobradas
      const accountingEntry = accountingService.postFinancialSettlement({
        recordId,
        recordCode,
        type: finType,
        amount: ofxTx.amount,
        date: paymentDate,
        costCenter,
        createdBy: operator
      });

      // 4. Marca OFX como conciliado
      financeRepository.updateOfxTransactionStatus(ofxTxId, 'CONCILIADO', bankTxId, now);

      // 5. Auditoria
      workflowRepository.logAudit({
        userName: operator,
        userRole: operatorRole,
        action: 'RECONCILE_AVULSO',
        module: 'Financeiro',
        entity: `OFX ${ofxTx.fitid}`,
        description: `Conciliação avulsa com lançamento contábil ${accountingEntry}: gerado título ${recordCode} (${category}) no valor de R$ ${ofxTx.amount.toFixed(2)}`,
        ipAddress
      });

      return { recordId, recordCode, bankTxId, accountingEntry };
    });

    const result = tx();
    return {
      success: true,
      ofxTxId,
      ...result
    };
  }
}

export const financeService = new FinanceService();
