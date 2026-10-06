// SEEK — Cliente HTTP & Camada de Serviços da API
// Hiper Pacote 4: Administração Empresarial (Full-Stack Integrado)

const API_BASE_URL = '/api';

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

  // Financeiro & Controladoria Enterprise
  async getFinanceRecords(type?: string, status?: string, originType?: string, search?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (type && type !== 'ALL') params.append('type', type);
      if (status && status !== 'ALL') params.append('status', status);
      if (originType && originType !== 'ALL') params.append('originType', originType);
      if (search) params.append('search', search);

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

  async payFinanceRecord(id: string, bankId?: string, paymentMethod?: string, userName?: string, userRole?: string, paymentDate?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/records/${id}/pay`, {
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

  async createBankAccount(account: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/accounts`, {
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
      const res = await fetch(`${API_BASE_URL}/finance/accounts/${accountId}/transactions?${params.toString()}`);
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
      const res = await fetch(`${API_BASE_URL}/finance/reconciliations`);
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
      const res = await fetch(`${API_BASE_URL}/finance/reconciliations`, {
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
      const res = await fetch(`${API_BASE_URL}/finance/transactions/${id}/reconcile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconciled })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getBudgets(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/budgets`);
      if (res.ok) return await res.json();
      return { summary: {}, budgets: [] };
    } catch {
      return { summary: {}, budgets: [] };
    }
  },

  async getDre(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/dre`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getFinancialClosings(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/closings`);
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
      const res = await fetch(`${API_BASE_URL}/finance/closings/lock`, {
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

  // Compras, Suprimentos & Cotações Enterprise
  async getPurchaseRequisitions(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/requisitions`);
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
      const res = await fetch(`${API_BASE_URL}/purchasing/requisitions/${id}`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async createPurchaseRequisition(reqData: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/requisitions`, {
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
      const res = await fetch(`${API_BASE_URL}/purchasing/requisitions/${requisitionId}/quotations`);
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
      const res = await fetch(`${API_BASE_URL}/purchasing/requisitions/${requisitionId}/quotations`, {
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
      const res = await fetch(`${API_BASE_URL}/purchasing/quotations/${quotationId}/select`, {
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

  async approvePurchasingOrder(id: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/orders/${id}/approve`, {
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

  async receivePurchasingOrder(id: string, invoiceNumber?: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber, userName, userRole })
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

  async createSupplier(supplier: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/purchasing/suppliers`, {
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

  // PACOTE 4: RH & Departamento Pessoal
  async getEmployees(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/hr/employees`);
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
      const res = await fetch(`${API_BASE_URL}/hr/employees`, {
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
      const res = await fetch(url);
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
      const res = await fetch(`${API_BASE_URL}/hr/time-records/clock`, {
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
      const res = await fetch(`${API_BASE_URL}/hr/vacations`);
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
      const res = await fetch(`${API_BASE_URL}/hr/vacations`, {
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
      const res = await fetch(`${API_BASE_URL}/hr/organogram`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  // PACOTE 4: Estoque & Patrimônio
  async getInventoryItems(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/items`);
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
      const res = await fetch(`${API_BASE_URL}/inventory/movements`, {
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
      const res = await fetch(`${API_BASE_URL}/inventory/assets`);
      if (res.ok) return await res.json();
      return { assets: [], total: 0, totalBookValue: 0 };
    } catch {
      return { assets: [], total: 0, totalBookValue: 0 };
    }
  },

  async createAsset(asset: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/assets`, {
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
      const res = await fetch(`${API_BASE_URL}/inventory/assets/${id}/custody`, {
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
      const res = await fetch(`${API_BASE_URL}/projects`);
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
      const res = await fetch(`${API_BASE_URL}/projects`, {
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
      const res = await fetch(url);
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
      const res = await fetch(`${API_BASE_URL}/projects/tasks/${id}/status`, {
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
      const res = await fetch(`${API_BASE_URL}/projects/tasks`, {
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

      const res = await fetch(`${API_BASE_URL}/service-desk/tickets?${params.toString()}`);
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
      const res = await fetch(`${API_BASE_URL}/service-desk/tickets`, {
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
      const res = await fetch(`${API_BASE_URL}/service-desk/tickets/${id}/status`, {
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

      const res = await fetch(`${API_BASE_URL}/documents?${params.toString()}`);
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
      const res = await fetch(`${API_BASE_URL}/documents`, {
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

      const res = await fetch(`${API_BASE_URL}/governance/risks?${params.toString()}`);
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
      const res = await fetch(`${API_BASE_URL}/governance/risks`, {
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

  // PACOTE 4: Notificações
  async getNotifications(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`);
      if (res.ok) return await res.json();
      return { notifications: [], total: 0, unreadCount: 0 };
    } catch {
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH'
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async markAllNotificationsRead(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
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
  },

  // ========================================================
  // PACOTE 5: CONTABILIDADE AVANÇADA, MOTOR & FECHAMENTO
  // ========================================================
  async getChartOfAccounts(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/chart-of-accounts`);
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
      const res = await fetch(`${API_BASE_URL}/accounting/chart-of-accounts`, {
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
      const res = await fetch(url);
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
      const res = await fetch(`${API_BASE_URL}/accounting/journal-entries`, {
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
      const res = await fetch(`${API_BASE_URL}/accounting/trial-balance`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getFinancialStatements(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/financial-statements`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async getAccountingPeriods(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/periods`);
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
      const res = await fetch(`${API_BASE_URL}/accounting/close-period`, {
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
      const res = await fetch(url);
      if (res.ok) return await res.json();
      return { obligations: [], summary: { totalPendente: 0, totalPago: 0, count: 0 } };
    } catch {
      return { obligations: [], summary: { totalPendente: 0, totalPago: 0, count: 0 } };
    }
  },

  async calculateTaxes(baseAmount: number, issRate: number = 5.0): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/fiscal/calculate`, {
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

  async payTaxObligation(obligationId: string, paymentMethod?: string, userName?: string, userRole?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/fiscal/pay-tax`, {
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
      const res = await fetch(`${API_BASE_URL}/fiscal/calendar`);
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
      const res = await fetch(url);
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
      const res = await fetch(`${API_BASE_URL}/fiscal/invoices`, {
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
      const res = await fetch(`${API_BASE_URL}/freelance/dashboard`);
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
      const res = await fetch(url);
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
      const res = await fetch(`${API_BASE_URL}/freelance/freelancers`, {
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
      const res = await fetch(`${API_BASE_URL}/freelance/freelancers/${id}`, {
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
      const res = await fetch(url);
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
      const res = await fetch(`${API_BASE_URL}/freelance/taxas`, {
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
      const res = await fetch(`${API_BASE_URL}/freelance/taxas/${id}/status`, {
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
      const res = await fetch(`${API_BASE_URL}/freelance/taxas/${id}/close-and-pay`, {
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
      const res = await fetch(`${API_BASE_URL}/freelance/taxas/${id}/settle-payment`, {
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
