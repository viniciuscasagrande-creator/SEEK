export type FreelanceAvailability = 'DISPONIVEL' | 'EM_JOB' | 'INDISPONIVEL';
export type FreelanceStatus = 'ATIVO' | 'EM_ANALISE' | 'BLOQUEADO';

export interface Freelancer {
  id: string;
  full_name: string;
  cpf: string;
  rg?: string;
  phone: string;
  email?: string;
  pix_key: string;
  pix_type: 'CPF' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  bank_name?: string;
  agency?: string;
  account_number?: string;
  primary_role: string;
  secondary_roles?: string;
  standard_daily_rate: number;
  city: string;
  state: string;
  rating: number;
  total_jobs: number;
  punctuality_score: number;
  availability: FreelanceAvailability;
  status: FreelanceStatus;
  notes?: string;
  created_at?: string;
}

export type TaxaShiftStatus =
  | 'ABERTA'
  | 'AGUARDANDO_APROVACAO'
  | 'CONVOCADO'
  | 'CONFIRMADO'
  | 'PRESENTE'
  | 'FALTA'
  | 'REALIZADA'
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGO';

export interface FreelanceShift {
  id: string;
  code: string; // TX-2026-XXXX
  operation_name: string; // Operação de Referência (ex: Montagem Expotrade, Operação Logística Curitiba)
  cost_center: string;
  job_date: string;
  work_shift: string; // '08:00 - 18:00'
  location: string;
  requester_manager: string;
  freelancer_id?: string;
  freelancer_name: string;
  freelancer_cpf?: string;
  freelancer_pix?: string;
  role_title: string;
  base_fee: number;
  allowance_food: number;
  allowance_transport: number;
  overtime_amount: number;
  reimbursement_amount: number;
  total_amount: number;
  status: TaxaShiftStatus;
  hours_worked: number;
  performance_rating: number;
  validator_name?: string;
  validation_notes?: string;
  financial_record_id?: string;
  approval_id?: string;
  closed_at?: string;
  paid_at?: string;
  created_at?: string;
}

export interface TaxaDashboardMetrics {
  totalTaxas: number;
  abertas: number;
  aguardandoAprovacao: number;
  convocados: number;
  confirmados: number;
  presentes: number;
  realizadas: number;
  aguardandoFechamento: number;
  aguardandoPagamento: number;
  pagas: number;
  faltas: number;
  totalComprometido: number;
  totalPago: number;
  totalAguardandoPagamento: number;
  mediaPorTaxa: number;
  totalFreelancersAtivos: number;
  taxaPresencaPercent: string;
}
