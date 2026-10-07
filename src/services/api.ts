// SEEK — Cliente HTTP & Camada de Serviços da API
// Hiper Pacote 4: Administração Empresarial (Full-Stack Integrado)

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';


async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('seek_token') : null;
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('seek_company_id') || 'comp-1' : 'comp-1';
  const branchId = typeof window !== 'undefined' ? localStorage.getItem('seek_branch_id') || 'branch-1' : 'branch-1';
  const headers = new Headers(init?.headers || {});

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('x-company-id')) {
    headers.set('x-company-id', companyId);
  }
  if (!headers.has('x-branch-id')) {
    headers.set('x-branch-id', branchId);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('seek_token');
    localStorage.removeItem('seek_user');
  }

  return response;
}

export const api = {
  // Health
  async healthCheck(): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // Auth & Perfis
  async login(email: string, password?: string): Promise<{ success: boolean; user?: any; token?: string; error?: string; isNetworkOr405?: boolean }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      // Se a rota retornou 405/404 (ambiente estático como Vercel sem backend remoto acoplado)
      if (res.status === 405 || res.status === 404) {
        return { success: false, isNetworkOr405: true, error: 'Servidor remoto não acoplado.' };
      }

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('seek_token', data.token);
            if (data.refreshToken) {
              localStorage.setItem('seek_refresh_token', data.refreshToken);
            }
            localStorage.setItem('seek_user', JSON.stringify(data.user));
          }
          return { success: true, user: data.user, token: data.token };
        }
      }

      if (res.status === 400 || res.status === 401) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || 'Credenciais corporativas inválidas.' };
      }

      return { success: false, isNetworkOr405: true, error: 'Servidor corporativo indisponível ou falha de rede.' };
    } catch {
      return { success: false, isNetworkOr405: true, error: 'Servidor corporativo indisponível ou falha de rede.' };
    }
  },

  async getMe(): Promise<any> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('seek_token') : null;
      if (!token) return null;

      // Se for token local de homologação
      if (token.startsWith('seek_demo_') || token.startsWith('demo_')) {
        const cached = localStorage.getItem('seek_user');
        return cached ? JSON.parse(cached) : null;
      }

      const res = await authFetch(`${API_BASE_URL}/auth/me`);
      if (res.ok) {
        const data = await res.json();
        return data.user;
      }
      return null;
    } catch {
      const cached = localStorage.getItem('seek_user');
      return cached ? JSON.parse(cached) : null;
    }
  },

  async logout(): Promise<void> {
    try {
      await authFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('seek_token');
      localStorage.removeItem('seek_refresh_token');
      localStorage.removeItem('seek_user');
    }
  },

  async logoutAll(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/logout-all`, { method: 'POST' });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('seek_token');
          localStorage.removeItem('seek_refresh_token');
          localStorage.removeItem('seek_user');
        }
        return { success: true };
      }
      const data = await res.json().catch(() => ({}));
      return { success: false, message: data.error };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async getSessions(all: boolean = false): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/sessions${all ? '?all=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        return data.sessions || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Falha ao alterar senha.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão ao alterar senha.' };
    }
  },

  async getProfiles(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/profiles`);
      if (res.ok) {
        const data = await res.json();
        return data.profiles || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async recoverPassword(email: string): Promise<{ success: boolean; message?: string; resetToken?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/recover-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message, resetToken: data.resetToken };
      }
      return { success: false };
    } catch {
      return { success: true };
    }
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Falha ao redefinir senha.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao conectar para redefinir senha.' };
    }
  },

  // Dashboard Executivo Integrado C-Level
  async getDashboard(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/dashboard`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  // Financeiro & Controladoria Enterprise
  async getFinanceRecords(type?: string, status?: string, originType?: string, search?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (type && type !== 'ALL') params.append('type', type);
      if (status && status !== 'ALL') params.append('status', status);
      if (originType && originType !== 'ALL') params.append('originType', originType);
      if (search) params.append('search', search);

      const res = await authFetch(`${API_BASE_URL}/finance/records?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.records || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createFinanceRecord(record: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async payFinanceRecord(id: string, bankId?: string, paymentMethod?: string, userName?: string, userRole?: string, paymentDate?: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/records/${id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankId, paymentMethod, userName, userRole, paymentDate })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getFinanceSummary(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/summary`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getBankAccounts(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/accounts`);
      if (res.ok) {
        const data = await res.json();
        return data.accounts || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createBankAccount(account: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getBankTransactions(accountId: string, reconciled?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (reconciled && reconciled !== 'ALL') params.append('reconciled', reconciled);
      const res = await authFetch(`${API_BASE_URL}/finance/accounts/${accountId}/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.transactions || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getBankReconciliations(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/reconciliations`);
      if (res.ok) {
        const data = await res.json();
        return data.reconciliations || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createBankReconciliation(rec: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/reconciliations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rec)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async toggleTransactionReconcile(id: string, reconciled: boolean): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/transactions/${id}/reconcile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconciled })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async importOfx(accountId: string, fileName: string, content: string): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/finance/ofx/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, fileName, content })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao importar OFX.');
    return data;
  },

  async getOfxStatement(accountId: string, status: string = 'ALL'): Promise<any> {
    const params = new URLSearchParams({ accountId });
    if (status !== 'ALL') params.set('status', status);
    const res = await authFetch(`${API_BASE_URL}/finance/ofx/statement?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar extrato OFX.');
    return data;
  },

  async getOfxSuggestions(statementId: string): Promise<any[]> {
    const res = await authFetch(`${API_BASE_URL}/finance/ofx/statement/${statementId}/suggestions`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao localizar correspondências.');
    return data.suggestions || [];
  },

  async reconcileOfx(statementId: string, bankTransactionId: string): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/finance/ofx/statement/${statementId}/reconcile`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankTransactionId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao conciliar movimento.');
    return data;
  },

  async markOfxDivergence(statementId: string, reason: string): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/finance/ofx/statement/${statementId}/divergence`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao registrar divergência.');
    return data;
  },

  async getFinanceTrace(recordId: string): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/finance/trace/${encodeURIComponent(recordId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar rastreabilidade financeira.');
    return data;
  },

  async getRealizedCashFlow(): Promise<any[]> {
    const res = await authFetch(`${API_BASE_URL}/finance/cash-flow/realized`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.rows || [];
  },

  async getBudgets(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/budgets`);
      if (res.ok) return await res.json();
      return { summary: {}, budgets: [] };
    } catch {
      return { summary: {}, budgets: [] };
    }
  },

  async getDre(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/dre`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getFinancialClosings(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/closings`);
      if (res.ok) {
        const data = await res.json();
        return data.closings || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async lockFinancialPeriod(closing: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/finance/closings/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closing)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // CRM & Comercial
  async getCrmDeals(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/crm/deals`);
      if (res.ok) {
        const data = await res.json();
        return data.deals || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createCrmDeal(deal: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/crm/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deal)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async updateCrmStage(id: string, stage: string, userName?: string, autoGenerateContract?: boolean): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/crm/deals/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, userName, autoGenerateContract })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // Central de Aprovações & Workflows
  async getApprovals(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/workflow/approvals`);
      if (res.ok) {
        const data = await res.json();
        return data.approvals || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async decideApproval(id: string, decision: 'approve' | 'reject', comment?: string, deciderName?: string, deciderRole?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/workflow/approvals/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment, deciderName, deciderRole })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async createApproval(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/workflow/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // Compras, Suprimentos & Cotações Enterprise
  async getPurchaseRequisitions(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/requisitions`);
      if (res.ok) {
        const data = await res.json();
        return data.requisitions || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getPurchaseRequisition(id: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/requisitions/${id}`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async createPurchaseRequisition(reqData: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/requisitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getPurchaseQuotations(requisitionId: string): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/requisitions/${requisitionId}/quotations`);
      if (res.ok) {
        const data = await res.json();
        return data.quotations || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createPurchaseQuotation(requisitionId: string, quotation: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/requisitions/${requisitionId}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotation)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async selectPurchaseQuotation(quotationId: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/quotations/${quotationId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, userRole })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getPurchasingOrders(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/orders`);
      if (res.ok) {
        const data = await res.json();
        return data.orders || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createPurchasingOrder(order: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async approvePurchasingOrder(id: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/orders/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, userRole })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async receivePurchasingOrder(
    id: string,
    payloadOrInvoice?: string | { invoiceNumber: string; invoiceDate?: string; dueDate?: string; userName?: string; userRole?: string },
    userName?: string,
    userRole?: string
  ): Promise<any> {
    try {
      const body = typeof payloadOrInvoice === 'object' && payloadOrInvoice !== null
        ? payloadOrInvoice
        : { invoiceNumber: payloadOrInvoice, userName, userRole };
      const res = await authFetch(`${API_BASE_URL}/purchasing/orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      return { success: false, error: err?.error || 'Erro ao receber pedido' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha de comunicação com o servidor' };
    }
  },

  async getPurchasingTraceability(orderId: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/orders/${orderId}/traceability`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getPurchasingReceipts(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/receipts`);
      if (res.ok) {
        const data = await res.json();
        return data.receipts || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getSuppliers(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/suppliers`);
      if (res.ok) {
        const data = await res.json();
        return data.suppliers || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createSupplier(supplier: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async compareQuotations(quotations: any[]): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/purchasing/quotations/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotations })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // Contratos & Jurídico
  async getContracts(type?: string, status?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (type && type !== 'ALL') params.append('type', type);
      if (status && status !== 'ALL') params.append('status', status);

      const res = await authFetch(`${API_BASE_URL}/contracts?${params.toString()}`);
      if (res.ok) return await res.json();
      return { contracts: [], total: 0, totalMonthlyBilling: 0 };
    } catch {
      return { contracts: [], total: 0, totalMonthlyBilling: 0 };
    }
  },

  async getContractsAlerts(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/contracts/alerts`);
      if (res.ok) return await res.json();
      return { within30Days: [], within60Days: [], within90Days: [], totalAlerts: 0 };
    } catch {
      return { within30Days: [], within60Days: [], within90Days: [], totalAlerts: 0 };
    }
  },

  async createContract(contract: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async readjustContract(id: string, percentage: number, indexName: string, userName?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/contracts/${id}/readjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage, indexName, userName })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async renewContract(id: string, months: number = 12, userName?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/contracts/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months, userName })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getContractObligations(contractId?: string): Promise<any> {
    try {
      const q = contractId ? `?contractId=${encodeURIComponent(contractId)}` : '';
      const res = await authFetch(`${API_BASE_URL}/contracts/obligations${q}`);
      if (res.ok) return await res.json();
      return { obligations: [] };
    } catch {
      return { obligations: [] };
    }
  },

  async generateContractObligation(id: string, payload: any = {}): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/contracts/${id}/generate-obligation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      return res.ok ? data : { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async generateDueContractObligations(referenceDate?: string, userName?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/contracts/generate-due/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceDate, userName })
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  // PACOTE 4: RH & Departamento Pessoal
  async getEmployees(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/employees`);
      if (res.ok) {
        const data = await res.json();
        return data.employees || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createEmployee(employee: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getTimeRecords(employeeId?: string): Promise<any[]> {
    try {
      const url = employeeId ? `${API_BASE_URL}/hr/time-records?employeeId=${employeeId}` : `${API_BASE_URL}/hr/time-records`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.records || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async clockTimeRecord(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/time-records/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getVacations(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/vacations`);
      if (res.ok) {
        const data = await res.json();
        return data.vacations || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createVacationRequest(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/vacations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getOrganogram(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/organogram`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // RH HCM: Folha de Pagamento & Holerites
  async getPayrollRuns(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/payroll`);
      if (res.ok) {
        const data = await res.json();
        return data.runs || [];
      }
      const fallback = await authFetch(`${API_BASE_URL}/hr/payroll/runs`);
      if (fallback.ok) {
        const fbData = await fallback.json();
        return fbData.runs || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async previewPayroll(data: any = {}): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/payroll/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async closePayroll(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/payroll/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json().catch(() => null);
      return res.ok ? body : { success: false, error: body?.error || 'Falha ao fechar folha.' };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor.' };
    }
  },

  async generateVacationFinancial(id: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/vacations/${id}/generate-financial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json().catch(() => null);
      return res.ok ? body : { success: false, error: body?.error || 'Falha ao gerar obrigação.' };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor.' };
    }
  },

  async getPayrollRunDetails(id: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/payroll/runs/${id}`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async processPayroll(period: string): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/hr/payroll/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao processar folha de pagamento.');
    return data;
  },

  async simulatePayslip(employeeId: string, overtimeHours: number = 0, dependentsCount: number = 0): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/hr/payroll/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, overtimeHours, dependentsCount })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao simular cálculo de holerite.');
    return data;
  },

  async integratePayroll(runId: string): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/hr/payroll/runs/${runId}/integrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao integrar folha com Financeiro e Contabilidade.');
    return data;
  },

  // RH HCM: Gestão & Compra de Benefícios Corporativos
  async getBenefitProviders(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/providers`);
      if (res.ok) {
        const data = await res.json();
        return data.providers || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getBenefitPlans(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/plans`);
      if (res.ok) {
        const data = await res.json();
        return data.plans || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getEmployeeBenefits(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/employees`);
      if (res.ok) {
        const data = await res.json();
        return data.employeeBenefits || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async calculateBenefitBatch(period: string, businessDays: number = 21): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/hr/benefits/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, businessDays })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao calcular lote de benefícios.');
    return data;
  },

  async integrateBenefitBatch(period: string, businessDays: number = 21): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/hr/benefits/integrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, businessDays })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao integrar compra de benefícios ao Financeiro e Contabilidade.');
    return data;
  },

  async getBenefits(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits`);
      if (res.ok) {
        const d = await res.json();
        return d.employees || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async saveEmployeeBenefits(employeeId: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await res.json().catch(() => null);
      return res.ok ? d : { success: false, error: d?.error || 'Falha ao salvar benefícios.' };
    } catch {
      return { success: false, error: 'Falha de comunicação.' };
    }
  },

  async previewBenefitOrder(period: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/orders/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period })
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async getBenefitOrders(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/orders`);
      if (res.ok) {
        const d = await res.json();
        return d.orders || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createBenefitOrder(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await res.json().catch(() => null);
      return res.ok ? d : { success: false, error: d?.error || 'Falha ao fechar benefícios.' };
    } catch {
      return { success: false, error: 'Falha de comunicação.' };
    }
  },

  async sendBenefitOrderToFinance(id: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/orders/${id}/send-finance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await res.json().catch(() => null);
      return res.ok ? d : { success: false, error: d?.error || 'Falha ao enviar ao Financeiro.' };
    } catch {
      return { success: false, error: 'Falha de comunicação.' };
    }
  },

  async getBenefitAbsences(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/absences`);
      if (res.ok) {
        const d = await res.json();
        return d.absences || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createBenefitAbsence(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await res.json().catch(() => null);
      return res.ok ? d : { success: false, error: d?.error || 'Falha ao registrar afastamento.' };
    } catch {
      return { success: false, error: 'Falha de comunicação.' };
    }
  },



  async createBenefitProvider(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await res.json().catch(() => null);
      return res.ok ? d : { success: false, error: d?.error || 'Falha ao cadastrar operadora.' };
    } catch {
      return { success: false, error: 'Falha de comunicação.' };
    }
  },

  async updateBenefitProvider(id: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await res.json().catch(() => null);
      return res.ok ? d : { success: false, error: d?.error || 'Falha ao atualizar operadora.' };
    } catch {
      return { success: false, error: 'Falha de comunicação.' };
    }
  },

  async getBenefitAdjustments(period?: string): Promise<any[]> {
    try {
      const q = period ? `?period=${encodeURIComponent(period)}` : '';
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/adjustments${q}`);
      if (res.ok) {
        const d = await res.json();
        return d.adjustments || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createBenefitAdjustment(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await res.json().catch(() => null);
      return res.ok ? d : { success: false, error: d?.error || 'Falha ao registrar ajuste.' };
    } catch {
      return { success: false, error: 'Falha de comunicação.' };
    }
  },

  async getBenefitPurchases(orderId?: string): Promise<any[]> {
    try {
      const q = orderId ? `?orderId=${encodeURIComponent(orderId)}` : '';
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/purchases${q}`);
      if (res.ok) {
        const d = await res.json();
        return d.purchases || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async sendBenefitPurchaseToFinance(id: string, data: any = {}): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/benefits/purchases/${id}/send-finance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await res.json().catch(() => null);
      return res.ok ? d : { success: false, error: d?.error || 'Falha ao enviar pedido ao Financeiro.' };
    } catch {
      return { success: false, error: 'Falha de comunicação.' };
    }
  },

  async getJobPostings(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/jobs`);
      if (res.ok) {
        const data = await res.json();
        return data.jobs || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createJobPosting(job: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getPerformanceReviews(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/hr/performance`);
      if (res.ok) {
        const data = await res.json();
        return data.reviews || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  // PACOTE 4: Estoque & Patrimônio
  async getInventoryItems(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory/items`);
      if (res.ok) {
        const data = await res.json();
        return data.items || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createInventoryMovement(data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getAssets(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory/assets`);
      if (res.ok) return await res.json();
      return { assets: [], total: 0, totalBookValue: 0 };
    } catch {
      return { assets: [], total: 0, totalBookValue: 0 };
    }
  },

  async createAsset(asset: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async signAssetCustody(id: string, userName?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory/assets/${id}/custody`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // PACOTE 4: Projetos & Operações
  async getProjects(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        return data.projects || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createProject(project: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getProjectTasks(projectId?: string): Promise<any[]> {
    try {
      const url = projectId ? `${API_BASE_URL}/projects/tasks?projectId=${projectId}` : `${API_BASE_URL}/projects/tasks`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.tasks || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async updateProjectTaskStatus(id: string, status: string, userName?: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/projects/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userName })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async createProjectTask(task: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/projects/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // PACOTE 4: Service Desk Interno
  async getTickets(department?: string, status?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (department && department !== 'ALL') params.append('department', department);
      if (status && status !== 'ALL') params.append('status', status);

      const res = await authFetch(`${API_BASE_URL}/service-desk/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.tickets || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createTicket(ticket: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/service-desk/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async updateTicketStatus(id: string, status: string, assignedTo?: string, userName?: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/service-desk/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, assignedTo, userName })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // PACOTE 4: Documentos Corporativos (GED)
  async getDocuments(category?: string, department?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'ALL') params.append('category', category);
      if (department && department !== 'ALL') params.append('department', department);

      const res = await authFetch(`${API_BASE_URL}/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.documents || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createDocument(doc: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // PACOTE 4: Governança & Riscos / LGPD
  async getRisks(category?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'ALL') params.append('category', category);

      const res = await authFetch(`${API_BASE_URL}/governance/risks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.risks || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createRisk(risk: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/governance/risks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(risk)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // SEEK V1.9: Central de Trabalho Operacional
  async getWorkCenter(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/work-center`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // PACOTE 4: Notificações
  async getNotifications(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/notifications`);
      if (res.ok) return await res.json();
      return { notifications: [], total: 0, unreadCount: 0 };
    } catch {
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH'
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async markAllNotificationsRead(): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST'
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Auditoria
  async getAuditLogs(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/core/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  // SEEK IA
  async askSeekAI(query: string, userRole: string): Promise<string | null> {
    try {
      const res = await authFetch(`${API_BASE_URL}/seek-ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userRole })
      });
      if (res.ok) {
        const data = await res.json();
        return data.answer;
      }
      return null;
    } catch {
      return null;
    }
  },

  // ========================================================
  // PACOTE 5: CONTABILIDADE AVANÇADA, MOTOR & FECHAMENTO
  // ========================================================
  async getChartOfAccounts(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/accounting/chart-of-accounts`);
      if (res.ok) {
        const data = await res.json();
        return data.accounts || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createChartOfAccount(account: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/accounting/chart-of-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getJournalEntries(period?: string, search?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (search) params.append('search', search);

      const url = `${API_BASE_URL}/accounting/journal-entries${params.toString() ? '?' + params.toString() : ''}`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.entries || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createJournalEntry(entry: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/accounting/journal-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getTrialBalance(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/accounting/trial-balance`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getFinancialStatements(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/accounting/financial-statements`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getAccountingPeriods(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/accounting/periods`);
      if (res.ok) {
        const data = await res.json();
        return data.periods || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async closeAccountingPeriod(period: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/accounting/close-period`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, userName, userRole })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // ========================================================
  // PACOTE 5: FISCAL, APURAÇÃO & NOTAS FISCAIS
  // ========================================================
  async getTaxObligations(period?: string, status?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (status) params.append('status', status);

      const url = `${API_BASE_URL}/fiscal/taxes${params.toString() ? '?' + params.toString() : ''}`;
      const res = await authFetch(url);
      if (res.ok) return await res.json();
      return { obligations: [], summary: { totalPendente: 0, totalPago: 0, count: 0 } };
    } catch {
      return { obligations: [], summary: { totalPendente: 0, totalPago: 0, count: 0 } };
    }
  },

  async calculateTaxes(baseAmount: number, issRate: number = 5.0): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/fiscal/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseAmount, issRate })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async sendTaxObligationToFinance(obligationId: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/fiscal/taxes/${obligationId}/send-finance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, userRole })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Não foi possível enviar a obrigação fiscal ao Financeiro.' };
    }
  },

  async payTaxObligation(obligationId: string, paymentMethod?: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/fiscal/pay-tax`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligationId, paymentMethod, userName, userRole })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getTaxCalendar(): Promise<any[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/fiscal/calendar`);
      if (res.ok) {
        const data = await res.json();
        return data.calendar || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getFiscalInvoices(type?: string, search?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (search) params.append('search', search);

      const url = `${API_BASE_URL}/fiscal/invoices${params.toString() ? '?' + params.toString() : ''}`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.invoices || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createFiscalInvoice(invoice: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/fiscal/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // ========================================================
  // RH: FREELANCERS & CENTRAL DE TAXAS
  // ========================================================
  async getFreelanceDashboard(): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/freelance/dashboard`);
      if (res.ok) {
        const data = await res.json();
        return data.metrics;
      }
      return null;
    } catch {
      return null;
    }
  },

  async getFreelancers(search?: string, role?: string, status?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (status) params.append('status', status);

      const url = `${API_BASE_URL}/freelance/freelancers${params.toString() ? '?' + params.toString() : ''}`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.freelancers || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createFreelancer(freelancer: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/freelance/freelancers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freelancer)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async updateFreelancer(id: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/freelance/freelancers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getTaxas(status?: string, search?: string, operation?: string, date?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'TODAS') params.append('status', status);
      if (search) params.append('search', search);
      if (operation) params.append('operation_name', operation);
      if (date) params.append('date', date);

      const url = `${API_BASE_URL}/freelance/taxas${params.toString() ? '?' + params.toString() : ''}`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.taxas || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async createTaxa(taxa: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/freelance/taxas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taxa)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async updateTaxaStatus(id: string, status: string, validatorName?: string, notes?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/freelance/taxas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, validator_name: validatorName, validation_notes: notes })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async closeTaxaAndPay(id: string, data: any): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/freelance/taxas/${id}/close-and-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async settleTaxaPayment(id: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await authFetch(`${API_BASE_URL}/freelance/taxas/${id}/settle-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, userRole })
      });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }
};
