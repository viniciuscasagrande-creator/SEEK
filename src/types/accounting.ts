// SEEK — Tipos Oficiais de Contabilidade Avançada (Hiper Pacote 5)

export interface ChartOfAccount {
  id: string;
  company_id?: string;
  code: string;
  name: string;
  type: 'SINTETICA' | 'ANALITICA';
  nature: 'DEVEDORA' | 'CREDORA';
  level: number;
  parent_code?: string | null;
  balance: number;
  created_at?: string;
}

export interface AccountingEntry {
  id: string;
  code: string;
  date: string;
  period: string;
  description: string;
  debit_account_code: string;
  credit_account_code: string;
  amount: number;
  cost_center?: string;
  origin_type: 'FINANCEIRO' | 'COMPRAS' | 'FOLHA' | 'MANUAL' | 'DEPRECIACAO';
  origin_id?: string;
  created_by: string;
  created_at?: string;
}

export interface TrialBalanceItem {
  code: string;
  name: string;
  nature: 'DEVEDORA' | 'CREDORA';
  balance: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceReport {
  items: TrialBalanceItem[];
  totalDebitos: number;
  totalCreditos: number;
  isBalanced: boolean;
  difference: number;
}

export interface DreStatement {
  receitaBruta: number;
  receitaServicos: number;
  receitaSaas: number;
  deducoes: number;
  pisCofins: number;
  iss: number;
  receitaLiquida: number;
  custosTotais: number;
  custosDatacenter: number;
  custosSuprimentos: number;
  lucroBruto: number;
  margemBrutaPercent: string;
  despesasOperacionais: number;
  despPessoal: number;
  despFacilities: number;
  ebitda: number;
  margemEbitdaPercent: string;
  depreciacao: number;
  ebit: number;
  resultadoFinanceiro: number;
  receitasFinanceiras: number;
  despesasFinanceiras: number;
  lair: number;
  irpjCsll: number;
  lucroLiquido: number;
  margemLiquidaPercent: string;
}

export interface BalanceSheetStatement {
  ativoTotal: number;
  ativoCirculante: number;
  ativoNaoCirculante: number;
  passivoTotal: number;
  passivoCirculante: number;
  patrimonioLiquido: number;
  isEquilibrado: boolean;
}

export interface AccountingPeriod {
  id: string;
  period: string;
  status: 'ABERTO' | 'FECHADO' | 'BLOQUEADO';
  closed_by?: string | null;
  closed_at?: string | null;
  net_result?: number;
}
