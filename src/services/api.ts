// SEEK — Cliente HTTP & Camada de Serviços da API
// Hiper Pacote 3: Gestão Corporativa Integrada (Full-Stack Integrado)

const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  // Health
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // Auth & Perfis
  async login(email: string, password?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  async getProfiles(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profiles`);
      if (res.ok) {
        const data = await res.json();
        return data.profiles || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async recoverPassword(email: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/recover-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return res.ok;
    } catch {
      return true;
    }
  },

  // Dashboard Executivo Integrado C-Level
  async getDashboard(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  // Financeiro
  async getFinanceRecords(type?: string, status?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (type && type !== 'ALL') params.append('type', type);
      if (status && status !== 'ALL') params.append('status', status);

      const res = await fetch(`${API_BASE_URL}/finance/records?${params.toString()}`);
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
      const res = await fetch(`${API_BASE_URL}/finance/records`, {
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

  async payFinanceRecord(id: string, bankId?: string, userName?: string, userRole?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/records/${id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankId, userName, userRole })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getFinanceSummary(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/summary`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getBankAccounts(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/accounts`);
      if (res.ok) {
        const data = await res.json();
        return data.accounts || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  // CRM & Comercial
  async getCrmDeals(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/deals`);
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
      const res = await fetch(`${API_BASE_URL}/crm/deals`, {
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
      const res = await fetch(`${API_BASE_URL}/crm/deals/${id}/stage`, {
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
      const res = await fetch(`${API_BASE_URL}/workflow/approvals`);
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
      const res = await fetch(`${API_BASE_URL}/workflow/approvals/${id}/decide`, {
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
      const res = await fetch(`${API_BASE_URL}/workflow/approvals`, {
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

  // Compras & Fornecedores
  async getPurchasingOrders(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/orders`);
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
      const res = await fetch(`${API_BASE_URL}/purchasing/orders`, {
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

  async receivePurchasingOrder(id: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/orders/${id}/receive`, {
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

  async getSuppliers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/suppliers`);
      if (res.ok) {
        const data = await res.json();
        return data.suppliers || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async compareQuotations(quotations: any[]): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/quotations/compare`, {
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

      const res = await fetch(`${API_BASE_URL}/contracts?${params.toString()}`);
      if (res.ok) return await res.json();
      return { contracts: [], total: 0, totalMonthlyBilling: 0 };
    } catch {
      return { contracts: [], total: 0, totalMonthlyBilling: 0 };
    }
  },

  async getContractsAlerts(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/contracts/alerts`);
      if (res.ok) return await res.json();
      return { within30Days: [], within60Days: [], within90Days: [], totalAlerts: 0 };
    } catch {
      return { within30Days: [], within60Days: [], within90Days: [], totalAlerts: 0 };
    }
  },

  async createContract(contract: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/contracts`, {
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
      const res = await fetch(`${API_BASE_URL}/contracts/${id}/readjust`, {
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
      const res = await fetch(`${API_BASE_URL}/contracts/${id}/renew`, {
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

  // Auditoria
  async getAuditLogs(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/core/audit-logs`);
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
      const res = await fetch(`${API_BASE_URL}/seek-ai/query`, {
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
  }
};
