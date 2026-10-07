import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  TrendingDown,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { api } from '../../services/api';

const money = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const HRBenefitsSection: React.FC = () => {
  const [period, setPeriod] = useState('2026-11');
  const [businessDays, setBusinessDays] = useState(21);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<'lote' | 'beneficiarios' | 'provedores'>('lote');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string; details?: any } | null>(null);

  // Estados dos Dados
  const [providers, setProviders] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [employeeBenefits, setEmployeeBenefits] = useState<any[]>([]);
  const [calculation, setCalculation] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [provs, pls, empBens] = await Promise.all([
        api.getBenefitProviders(),
        api.getBenefitPlans(),
        api.getEmployeeBenefits()
      ]);
      setProviders(provs);
      setPlans(pls);
      setEmployeeBenefits(empBens);

      // Pré-calcula automaticamente a competência atual
      const calc = await api.calculateBenefitBatch(period, businessDays);
      setCalculation(calc);
    } catch (err: any) {
      console.error('Erro ao carregar dados de benefícios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const calc = await api.calculateBenefitBatch(period, businessDays);
      setCalculation(calc);
      setNotification({
        type: 'success',
        message: `Lote de ${period} calculado com sucesso para ${calc.totalLives} vidas.`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Falha ao calcular lote de benefícios.'
      });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleIntegrate = async () => {
    if (!window.confirm(`Deseja aprovar e integrar o lote de ${period} (${money(calculation?.totalCompanyCost)}) diretamente ao Contas a Pagar e Contabilidade?`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await api.integrateBenefitBatch(period, businessDays);
      setNotification({
        type: 'success',
        message: `Lote de benefícios ${period} aprovado e integrado com sucesso!`,
        details: result
      });
      // Recarrega lote após a integração
      const calc = await api.calculateBenefitBatch(period, businessDays);
      setCalculation(calc);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Falha ao integrar compra de benefícios.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcula total de deduções por falta no lote
  const totalAbsencesDeducted = calculation?.orders?.reduce(
    (acc: number, o: any) =>
      acc + (o.beneficiaries?.reduce((bAcc: number, b: any) => bAcc + (b.absencesDeducted || 0), 0) || 0),
    0
  ) || 0;

  return (
    <div className="space-y-5">
      {/* Barra de Controle de Competência & Ações */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Competência de Recarga</label>
              <input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Dias Úteis no Mês</label>
              <input
                type="number"
                min="15"
                max="25"
                value={businessDays}
                onChange={e => setBusinessDays(parseInt(e.target.value) || 21)}
                className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Recalcular Lote</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleIntegrate}
              disabled={loading || !calculation}
              className="flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              <FileCheck className="h-4 w-4" />
              <span>Aprovar Lote e Integrar ao Financeiro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Notificação / Feedback */}
      {notification && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-500 hover:text-slate-800 font-bold"
            >
              ✕
            </button>
          </div>

          {notification.details && (
            <div className="mt-3 rounded-lg border border-emerald-300 bg-white/70 p-3 text-xs space-y-1 font-mono text-emerald-950">
              <p className="font-bold font-sans text-emerald-800">Operação Atômica Realizada no ERP:</p>
              <p>• {notification.details.financialRecords?.length || 0} Títulos gerados no Contas a Pagar: <span className="font-bold">{notification.details.financialRecords?.join(', ')}</span></p>
              <p>• Lançamento Contábil no Livro Diário: <span className="font-bold">{notification.details.accountingEntry}</span> (Partidas dobradas)</p>
              <p>• Trilha de Auditoria gravada e associada ao usuário autenticado.</p>
            </div>
          )}
        </div>
      )}

      {/* Cards de Métricas do Lote */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Custo Total da Empresa</span>
            <span className="rounded-full bg-emerald-100 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {money(calculation?.totalCompanyCost || 0)}
          </div>
          <span className="text-[11px] text-slate-500">Fatura consolidada {period}</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Vidas Atendidas</span>
            <span className="rounded-full bg-blue-100 p-2 text-blue-600">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {calculation?.totalLives || 0} Colaboradores
          </div>
          <span className="text-[11px] text-slate-500">Beneficiários ativos no mês</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Faltas Injustificadas Abatidas</span>
            <span className="rounded-full bg-amber-100 p-2 text-amber-600">
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-amber-800">
            {totalAbsencesDeducted} dias abatidos
          </div>
          <span className="text-[11px] text-slate-500">Economia real extraída do Ponto</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Operadoras Parceiras</span>
            <span className="rounded-full bg-purple-100 p-2 text-purple-600">
              <Building className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {calculation?.orders?.length || providers.length} Parceiros
          </div>
          <span className="text-[11px] text-slate-500">Caju, Flash, Unimed, SPTrans</span>
        </div>
      </div>

      {/* Navegação entre Visualizações Internas de Benefícios */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4 text-xs font-bold">
        <button
          onClick={() => setSubTab('lote')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
            subTab === 'lote'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-700 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Faturas por Operadora ({calculation?.orders?.length || 0})</span>
        </button>

        <button
          onClick={() => setSubTab('beneficiarios')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
            subTab === 'beneficiarios'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-700 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Extrato de Vidas & Créditos ({employeeBenefits.length})</span>
        </button>

        <button
          onClick={() => setSubTab('provedores')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
            subTab === 'provedores'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-700 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Catálogo de Operadoras & Planos</span>
        </button>
      </div>

      {/* SUB-ABA 1: FATURAS POR OPERADORA */}
      {subTab === 'lote' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {calculation?.orders?.map((ord: any) => (
              <div
                key={ord.providerId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{ord.providerName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">CNPJ: {ord.cnpj}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                      {ord.integrationType}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <span className="text-[10px] text-slate-500 block">Vidas no Pedido</span>
                      <span className="text-sm font-bold text-slate-800">{ord.livesCount} colaboradores</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <span className="text-[10px] text-slate-500 block">Competência</span>
                      <span className="text-sm font-bold text-slate-800">{period}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total a Faturar</span>
                    <span className="text-base font-black text-slate-900">{money(ord.totalAmount)}</span>
                  </div>

                  <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold">
                    CP-BENEF-{ord.providerId.replace('prov-', '').toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Dica de integração ERP */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Regra de Integração Contábil & Financeira do SEEK</span>
            </div>
            <p className="text-blue-800">
              Ao clicar em <strong>"Aprovar Lote e Integrar ao Financeiro"</strong>, o ERP gera automaticamente títulos em <strong>Contas a Pagar</strong> para cada operadora com vencimento no dia 25 da competência e realiza o lançamento em partidas dobradas no <strong>Livro Diário</strong> (Débito: Despesa com Benefícios / Crédito: Fornecedores a Pagar).
            </p>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: EXTRATO DE VIDAS & CRÉDITOS */}
      {subTab === 'beneficiarios' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Extrato Consolidado de Créditos de Benefícios</h3>
              <p className="text-xs text-slate-500">Demonstrativo por colaborador com apuração de dias úteis e estorno de faltas.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Operadora / Provedor</th>
                  <th className="py-3 px-4">Benefício / Plano</th>
                  <th className="py-3 px-4 text-center">Regra de Desconto</th>
                  <th className="py-3 px-4 text-center">Dias Úteis</th>
                  <th className="py-3 px-4 text-center">Faltas Abatidas</th>
                  <th className="py-3 px-4 text-right">Valor da Carga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculation?.orders?.flatMap((o: any) =>
                  o.beneficiaries.map((b: any, idx: number) => (
                    <tr key={`${o.providerId}-${b.employeeId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{b.employeeName}</td>
                      <td className="py-3 px-4 text-slate-700">{o.providerName}</td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {b.benefitName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded bg-purple-50 text-purple-700 px-1.5 py-0.5 text-[10px] font-semibold">
                          {b.benefitType === 'TRANSPORTE' ? 'CLT 6%' : b.benefitType === 'SAUDE' ? 'Coparticipação' : 'Isento'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{b.daysCount} dias</td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={b.absencesDeducted > 0 ? 'text-amber-700' : 'text-slate-400'}>
                          {b.absencesDeducted > 0 ? `-${b.absencesDeducted} dia(s)` : '0'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {money(b.calculatedAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: CATÁLOGO DE OPERADORAS & PLANOS */}
      {subTab === 'provedores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map(p => {
            const pPlans = plans.filter(pl => pl.provider_id === p.id);
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{p.trade_name}</h4>
                    <p className="text-[11px] text-slate-500">{p.legal_name}</p>
                    <p className="text-[10px] font-mono text-slate-400">CNPJ: {p.cnpj}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {p.status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Planos Ofertados ({pPlans.length})
                  </span>
                  <div className="space-y-2">
                    {pPlans.map(pl => (
                      <div key={pl.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">{pl.name}</span>
                          <span className="text-[10px] text-slate-500">Regra: {pl.deduction_rule}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">
                            {pl.default_daily_value > 0 ? `${money(pl.default_daily_value)}/dia` : `${money(pl.default_monthly_value)}/mês`}
                          </span>
                          <span className="text-[10px] text-purple-700 font-semibold">{pl.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
