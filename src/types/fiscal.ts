// SEEK — Tipos Oficiais do Módulo Fiscal & Tributário (Hiper Pacote 5)

export interface TaxObligation {
  id: string;
  code: string;
  tax_type: 'ISS' | 'PIS' | 'COFINS' | 'IRPJ' | 'CSLL' | 'INSS' | 'FGTS';
  period: string;
  base_amount: number;
  rate_percent: number;
  tax_amount: number;
  due_date: string;
  status: 'PENDENTE' | 'CALCULADO' | 'PAGO' | 'ATRASADO';
  payment_date?: string | null;
  receipt_url?: string | null;
  company_id?: string | null;
  entity_name?: string | null;
  cost_center?: string | null;
  guide_number?: string | null;
  barcode?: string | null;
  financial_record_id?: string | null;
  financial_code?: string | null;
  financial_status?: string | null;
  financial_payment_date?: string | null;
  financial_bank_name?: string | null;
  sent_to_finance_at?: string | null;
  sent_to_finance_by?: string | null;
  created_at?: string;
}

export interface TaxCalculationResult {
  baseAmount: number;
  issRate: number;
  issAmount: number;
  pisAmount: number;
  cofinsAmount: number;
  irpjAmount: number;
  csllAmount: number;
  retencoesFederais: number;
  totalImpostos: number;
  valorLiquido: number;
  aliquotaEfetivaPercent: string;
}

export interface TaxCalendarEvent {
  id: string;
  title: string;
  frequency: string;
  dueDate: string;
  obligationType: 'PRINCIPAL' | 'ACESSORIA';
  responsibleAgency: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'PRONTO_ENVIO' | 'LIQUIDADO';
  urgency: 'CRITICA' | 'ALTA' | 'MEDIA' | 'CONCLUIDA';
}

export interface FiscalInvoice {
  id: string;
  number: string;
  series: string;
  type: 'EMITIDA' | 'RECEBIDA';
  entity_name: string;
  document_number: string;
  total_amount: number;
  iss_amount: number;
  pis_amount: number;
  cofins_amount: number;
  irrf_amount: number;
  csll_amount: number;
  net_amount: number;
  issue_date: string;
  status: 'AUTORIZADA' | 'CANCELADA' | 'PENDENTE';
  xml_key?: string | null;
  created_at?: string;
}
