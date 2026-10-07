// SEEK — Tipos dos Módulos Especializados

export interface TaskItem {
  id: string;
  title: string;
  module: string;
  dueDate: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  status: 'A_FAZER' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  relatedEntity?: string;
}

export interface TicketItem {
  id: string;
  code: string;
  title: string;
  department: 'TI' | 'RH' | 'Financeiro' | 'Jurídico' | 'Administrativo';
  status: 'ABERTO' | 'EM_ATENDIMENTO' | 'PENDENTE' | 'RESOLVIDO';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  slaHoursRemaining: number;
  requesterName: string;
  createdAt: string;
}

export interface DocumentToSign {
  id: string;
  title: string;
  type: 'CONTRATO' | 'ADITIVO' | 'TERMO_RESPONSABILIDADE' | 'FOLHA_PONTO' | 'NDA';
  deadline: string;
  partyName: string;
  status: 'PENDENTE' | 'ASSINADO';
}

export interface FinancialEntry {
  id: string;
  code: string;
  type: 'PAGAR' | 'RECEBER';
  title: string;
  entityName: string; // Fornecedor ou Cliente
  costCenter: string;
  category: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'PREVISTO' | 'CONFIRMADO' | 'PAGO' | 'CONCILIADO';
  paymentMethod: string;
  originType?: string;
  originId?: string;
  bankId?: string;
  bankName?: string;
}

export interface CrmOpportunity {
  id: string;
  clientName: string;
  title: string;
  value: number;
  stage: 'PROSPECCAO' | 'QUALIFICACAO' | 'PROPOSTA' | 'NEGOCIACAO' | 'GANHO' | 'PERDIDO';
  probability: number;
  ownerName: string;
  expectedCloseDate: string;
}

export interface EmployeeProfile {
  id: string;
  registrationNumber: string;
  fullName: string;
  jobTitle: string;
  department: string;
  branch: string;
  regime: 'CLT' | 'PJ' | 'ESTAGIO';
  admissionDate: string;
  vacationBalanceDays: number;
  bankHoursBalance: number; // Em horas positivas ou negativas
  active: boolean;
}

export interface PurchaseRequisition {
  id: string;
  code: string;
  title: string;
  department: string;
  requesterName: string;
  supplierQuoted: string;
  totalAmount: number;
  status: 'COTACAO' | 'PENDENTE_APROVACAO' | 'APROVADO' | 'PEDIDO_EMITIDO' | 'RECEBIDO';
  requiredDate: string;
}

export interface AssetRecord {
  id: string;
  tagNumber: string;
  description: string;
  category: 'TI' | 'MOBILIARIO' | 'EQUIPAMENTO' | 'LICENCA';
  location: string;
  responsibleName: string;
  acquisitionCost: number;
  currentBookValue: number;
  status: 'ATIVO' | 'EM_MANUTENCAO' | 'BAIXADO';
}

export interface ContractRecord {
  id: string;
  contractNumber: string;
  partyName: string;
  type: 'CLIENTE' | 'FORNECEDOR' | 'PRESTADOR' | 'LOCACAO';
  monthlyValue: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  readjustmentIndex: 'IPCA' | 'IGP-M' | 'FIXO';
  status: 'VIGENTE' | 'VENCENDO' | 'RESCINDIDO' | 'RENOVADO';
  costCenter?: string;
  paymentDay?: number;
  recurrence?: 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';
  financialEnabled?: boolean;
  nextDueDate?: string | null;
  pendingObligations?: number;
  pendingAmount?: number;
}

export interface ContractObligation {
  id: string;
  contract_id: string;
  competence: string;
  due_date: string;
  amount: number;
  financial_record_id?: string | null;
  status: 'GERADA' | 'PAGO' | 'PAGA' | 'CANCELADA';
  created_at?: string;
  paid_at?: string | null;
  contract_number?: string;
  party_name?: string;
  financial_code?: string;
  financial_status?: string;
}

export interface EmployeeBenefit {
  id?: string;
  type: 'VT' | 'VA' | 'VR' | 'COMBUSTIVEL';
  enabled: boolean;
  providerName?: string;
  calculationMode?: string;
  unitValue?: number;
  quantity?: number;
  monthlyValue?: number;
  employeeDiscount?: number;
  companyCost: number;
  validFrom?: string;
  validTo?: string;
  notes?: string;
}

export interface BenefitEmployee {
  id: string;
  registrationNumber: string;
  fullName: string;
  department: string;
  jobTitle: string;
  benefits: EmployeeBenefit[];
}

export interface BenefitOrder {
  id: string;
  company_id: string;
  period: string;
  due_date: string;
  status: string;
  employee_count: number;
  vt_total: number;
  va_total: number;
  vr_total: number;
  fuel_total: number;
  total_amount: number;
  financial_record_id?: string;
  created_by: string;
  created_at: string;
  sent_at?: string;
  paid_at?: string;
}

