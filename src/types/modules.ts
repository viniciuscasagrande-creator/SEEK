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
}
