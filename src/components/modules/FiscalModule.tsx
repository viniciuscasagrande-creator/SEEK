import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calculator,
  Calendar,
  FileCheck,
  Building2,
  DollarSign,
  RefreshCw,
  Send,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  TaxObligation,
  TaxCalculationResult,
  TaxCalendarEvent,
  FiscalInvoice
} from '../../types/fiscal';

export const FiscalModule: React.FC = () => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'taxes' | 'calculator' | 'calendar' | 'invoices'>('taxes');
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Dados
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [summary, setSummary] = useState({ totalPendente: 0, totalPago: 0, count: 0 });
  const [calendarEvents, setCalendarEvents] = useState<TaxCalendarEvent[]>([]);
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);

  // Filtros
  const [selectedPeriod, setSelectedPeriod] = useState('2026-09');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Calculadora
  const [calcInput, setCalcInput] = useState('100000');
  const [calcIssRate, setCalcIssRate] = useState('5.0');
  const [calcResult, setCalcResult] = useState<TaxCalculationResult | null>(null);

  // Modal Nova NFS-e
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    entity_name: 'Grupo Votorantim Participações S.A.',
    document_number: '12.987.654/0001-33',
    total_amount: '50000.00',
    iss_rate: 5.0,
    description: 'Prestação de serviços contínuos de consultoria em infraestrutura e redes.'
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [taxRes, calRes, invRes, calcRes] = await Promise.all([
        api.getTaxObligations(selectedPeriod),
        api.getTaxCalendar(),
        api.getFiscalInvoices(invoiceTypeFilter, invoiceSearch),
        api.calculateTaxes(parseFloat(calcInput) || 0, parseFloat(calcIssRate) || 5.0)
      ]);

      if (taxRes) {
        setObligations(taxRes.obligations || []);
        if (taxRes.summary) setSummary(taxRes.summary);
      }
      if (calRes) setCalendarEvents(calRes);
      if (invRes) setInvoices(invRes);
      if (calcRes && calcRes.calculation) setCalcResult(calcRes.calculation);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedPeriod, invoiceTypeFilter]);

  const handleCalculate = async () => {
    const res = await api.calculateTaxes(parseFloat(calcInput) || 0, parseFloat(calcIssRate) || 5.0);
    if (res && res.calculation) {
      setCalcResult(res.calculation);
    }
  };

  const handlePayTax = async (id: string, code: string) => {
    if (!confirm(`Confirmar recolhimento da guia tributária ${code}? O valor será liquidado com débito bancário e lançado na contabilidade.`)) {
      return;
    }

    const res = await api.payTaxObligation(id, 'Débito Automático C/C Bradesco', currentUser.fullName, currentUser.roleTitle);
    if (res && res.success) {
      setNotification(`✅ ${res.message}`);
      loadAllData();
    } else {
      setNotification(`❌ Erro no recolhimento: ${res?.message}`);
    }
  };

  const handleEmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.entity_name || !newInvoice.document_number || !newInvoice.total_amount) return;

    const res = await api.createFiscalInvoice({
      ...newInvoice,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`✅ ${res.message}`);
      setIsNewInvoiceModalOpen(false);
      loadAllData();
    } else {
      setNotification(`❌ Erro ao emitir NFS-e: ${res?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo / Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-700" />
            Fiscal, Tributário & Notas Fiscais
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Apuração de Impostos (PIS/COFINS/ISS/IRPJ) • Retenções na Fonte • Calendário SPED • NFS-e & NF-e
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => setIsNewInvoiceModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-indigo-800 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Emitir Nova NFS-e</span>
          </button>
        </div>
      </div>

      {/* Notificação Temporária */}
      {notification && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-3 text-xs font-semibold text-indigo-900 flex justify-between items-center shadow-xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-indigo-500 hover:text-indigo-800 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Cards de KPIs Fiscais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Tributos a Recolher (Competência {selectedPeriod})
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-rose-600 font-mono">
              R$ {summary.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              Pendente
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">DARF Federal + ISSQN Municipal</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Tributos e Encargos Liquidados
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-emerald-600 font-mono">
              R$ {summary.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Homologado
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Guias de FGTS e Encargos baixadas</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Compliance & Documentos Fiscais
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-slate-900 font-mono">
              {invoices.length} Notas Fiscais
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              100% Regular
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">NFS-e Emitidas e NF-e Recebidas</span>
        </div>
      </div>

      {/* Abas Superiores */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('taxes')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'taxes'
              ? 'border-indigo-700 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Apuração de Tributos & Guias</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'calculator'
              ? 'border-indigo-700 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>Calculadora de Retenções na Fonte</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-indigo-700 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Agenda & Obrigações SPED</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'invoices'
              ? 'border-indigo-700 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Documentos Fiscais (NFS-e / NF-e)</span>
        </button>
      </div>

      {/* ========================================================
          ABA 1: APURAÇÃO DE IMPOSTOS (GUIAS & DARF)
      ======================================================== */}
      {activeTab === 'taxes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Competência de Apuração:</span>
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 font-bold focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="2026-09">Setembro/2026 (Vencimento Outubro)</option>
                <option value="2026-08">Agosto/2026 (Liquidado)</option>
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Total de Guias: <strong>{obligations.length}</strong>
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">Código / Guia</th>
                  <th className="py-3 px-4">Tributo</th>
                  <th className="py-3 px-4 text-right">Base de Cálculo (R$)</th>
                  <th className="py-3 px-4 text-right">Alíquota</th>
                  <th className="py-3 px-4 text-right">Valor Apurado (R$)</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {obligations.map(ob => {
                  const isPaid = ob.status === 'PAGO';

                  return (
                    <tr key={ob.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{ob.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 mr-2">
                          {ob.tax_type}
                        </span>
                        {ob.tax_type === 'ISS'
                          ? 'Imposto Sobre Serviços (Curitiba)'
                          : ob.tax_type === 'PIS'
                          ? 'PIS Faturamento Não-Cumulativo'
                          : ob.tax_type === 'COFINS'
                          ? 'COFINS Seguridade Social'
                          : ob.tax_type === 'IRPJ'
                          ? 'IRPJ Apuração Lucro Presumido'
                          : ob.tax_type === 'CSLL'
                          ? 'CSLL Contribuição Social'
                          : ob.tax_type === 'INSS'
                          ? 'INSS Contribuição Previdenciária Patronal'
                          : 'FGTS Digital Mensal'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        R$ {ob.base_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {ob.rate_percent.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        R$ {ob.tax_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{ob.due_date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPaid ? 'LIQUIDADO' : 'A RECOLHER'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPaid ? (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Pago em {ob.payment_date?.substring(0, 10)}
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePayTax(ob.id, ob.code)}
                            className="inline-flex items-center space-x-1 rounded bg-indigo-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-800 transition-colors cursor-pointer"
                          >
                            <span>Recolher Guia</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 2: CALCULADORA DE RETENÇÕES NA FONTE
      ======================================================== */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Simulação */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Simulador de Retenções Tributárias</h3>
              <p className="text-[11px] text-slate-500">
                Calcule instantaneamente o impacto de impostos federais e municipais para contratos e notas fiscais.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor Bruto do Faturamento / Contrato (R$)</label>
                <input
                  type="number"
                  step="100"
                  value={calcInput}
                  onChange={e => setCalcInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alíquota de ISSQN Municipal (%)</label>
                <select
                  value={calcIssRate}
                  onChange={e => setCalcIssRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                >
                  <option value="2.0">2,0% — Alíquota Mínima Legal</option>
                  <option value="3.0">3,0% — Serviços de Hospedagem / Cloud</option>
                  <option value="5.0">5,0% — Curitiba / SP / Consultoria Geral</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCalculate}
                  className="w-full py-2.5 rounded-lg bg-indigo-700 font-bold text-white hover:bg-indigo-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Calcular Retenções & Valor Líquido</span>
                </button>
              </div>
            </div>
          </div>

          {/* Resultado Detalhado */}
          {calcResult && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                <h4 className="text-sm font-bold text-indigo-950">Memória de Cálculo Fiscal</h4>
                <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  Alíquota Efetiva Total: {calcResult.aliquotaEfetivaPercent}%
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-indigo-100/60 font-semibold text-slate-700">
                  <span>Valor Bruto Informado:</span>
                  <span className="font-mono">R$ {calcResult.baseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 pl-3">
                  <span>• ISSQN Municipal ({calcResult.issRate}%):</span>
                  <span className="font-mono text-rose-700">- R$ {calcResult.issAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 pl-3">
                  <span>• PIS Faturamento (0,65%):</span>
                  <span className="font-mono text-rose-700">- R$ {calcResult.pisAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 pl-3">
                  <span>• COFINS Seguridade (3,00%):</span>
                  <span className="font-mono text-rose-700">- R$ {calcResult.cofinsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 pl-3">
                  <span>• IRPJ Retido na Fonte (1,50%):</span>
                  <span className="font-mono text-rose-700">- R$ {calcResult.irpjAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 pl-3">
                  <span>• CSLL Retida na Fonte (1,00%):</span>
                  <span className="font-mono text-rose-700">- R$ {calcResult.csllAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2 border-t border-indigo-200 font-bold text-rose-800">
                  <span>Total de Tributos e Retenções:</span>
                  <span className="font-mono">- R$ {calcResult.totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2.5 bg-indigo-900 text-white px-3 rounded-lg text-sm font-bold mt-3">
                  <span>(=) VALOR LÍQUIDO A RECEBER/PAGAR:</span>
                  <span className="font-mono text-emerald-400">
                    R$ {calcResult.valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ABA 3: CALENDÁRIO & OBRIGAÇÕES SPED
      ======================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Calendário de Obrigações Fiscais e Compliance SPED</h3>
            <p className="text-xs text-slate-500 mb-4">
              Monitoramento preventivo de entrega de obrigações principais (recolhimento) e acessórias (declarações digitais).
            </p>

            <div className="space-y-3">
              {calendarEvents.map(evt => {
                const isConcluded = evt.urgency === 'CONCLUIDA';
                const isCritical = evt.urgency === 'CRITICA';

                return (
                  <div
                    key={evt.id}
                    className={`rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isConcluded
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : isCritical
                        ? 'border-rose-200 bg-rose-50/30'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            evt.obligationType === 'PRINCIPAL' ? 'bg-indigo-100 text-indigo-900' : 'bg-purple-100 text-purple-900'
                          }`}
                        >
                          {evt.obligationType}
                        </span>
                        <h4 className="font-bold text-xs text-slate-800">{evt.title}</h4>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-4">
                        <span>Órgão: <strong>{evt.responsibleAgency}</strong></span>
                        <span>Frequência: {evt.frequency}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400">Prazo Fatal</span>
                        <span className="font-mono font-bold text-xs text-slate-900 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {evt.dueDate}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isConcluded
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCritical
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 4: NOTAS FISCAIS (NFS-E / NF-E)
      ======================================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={invoiceTypeFilter}
                onChange={e => setInvoiceTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 font-bold focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="">Todas as Notas Fiscais</option>
                <option value="EMITIDA">NFS-e Emitidas (Faturamento)</option>
                <option value="RECEBIDA">NF-e Recebidas (Fornecedores)</option>
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar número, razão social..."
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              onClick={() => setIsNewInvoiceModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg border border-indigo-600 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Emitir NFS-e com Retenções</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">Número</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Razão Social / CNPJ</th>
                  <th className="py-3 px-4 text-right">Valor Bruto</th>
                  <th className="py-3 px-4 text-right">Retenções (Fed+Mun)</th>
                  <th className="py-3 px-4 text-right">Valor Líquido</th>
                  <th className="py-3 px-4">Emissão</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => {
                  const isEmitida = inv.type === 'EMITIDA';
                  const totalRetencoes = inv.iss_amount + inv.pis_amount + inv.cofins_amount + inv.irrf_amount + inv.csll_amount;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {inv.number}
                        {inv.xml_key && (
                          <span className="block text-[9px] text-slate-400 font-mono truncate max-w-[120px]">
                            {inv.xml_key}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isEmitida ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {inv.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div>{inv.entity_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">{inv.document_number}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        R$ {inv.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 font-semibold">
                        {totalRetencoes > 0 ? `- R$ ${totalRetencoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900 bg-indigo-50/30">
                        R$ {inv.net_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EMITIR NOVA NFS-E
      ======================================================== */}
      {isNewInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Emissão de NFS-e de Serviços Corporativos</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cálculo automático de retenções federais (PIS, COFINS, IRRF, CSLL) e municipal (ISSQN).
            </p>

            <form onSubmit={handleEmitInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tomador do Serviço (Cliente Corporativo) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Grupo Votorantim Participações S.A."
                  value={newInvoice.entity_name}
                  onChange={e => setNewInvoice({ ...newInvoice, entity_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ do Tomador *</label>
                  <input
                    type="text"
                    required
                    placeholder="12.987.654/0001-33"
                    value={newInvoice.document_number}
                    onChange={e => setNewInvoice({ ...newInvoice, document_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Bruto da Nota (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={newInvoice.total_amount}
                    onChange={e => setNewInvoice({ ...newInvoice, total_amount: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-bold font-mono text-slate-900 focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alíquota ISSQN Municipal</label>
                <select
                  value={newInvoice.iss_rate}
                  onChange={e => setNewInvoice({ ...newInvoice, iss_rate: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                >
                  <option value="5.0">5,0% — Curitiba / Prestação Geral</option>
                  <option value="3.0">3,0% — Hosting e Armazenamento Cloud</option>
                  <option value="2.0">2,0% — Alíquota Mínima Legal</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Discriminação dos Serviços Prestados</label>
                <textarea
                  rows={2}
                  value={newInvoice.description}
                  onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceModalOpen(false)}
                  className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-indigo-800 cursor-pointer"
                >
                  Homologar e Emitir NFS-e
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default FiscalModule;
