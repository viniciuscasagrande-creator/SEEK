import React, { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldCheck,
  Building,
  User,
  Clock,
  Download,
  Landmark,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

const money = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const HRPayrollSection: React.FC<{ employees: any[] }> = ({ employees }) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [period, setPeriod] = useState('2026-10');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modal de Simulação
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simEmployeeId, setSimEmployeeId] = useState(employees[0]?.id || '');
  const [simOvertimeHours, setSimOvertimeHours] = useState('10');
  const [simDependents, setSimDependents] = useState('1');
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Modal de Visualização de Holerite Individual
  const [viewingPayslip, setViewingPayslip] = useState<any>(null);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await api.getPayrollRuns();
      setRuns(data || []);
      if (data && data.length > 0) {
        const activeRun = data.find((r: any) => r.period === period) || data[0];
        const details = await api.getPayrollRunDetails(activeRun.id);
        setSelectedRun(details);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleSelectRun = async (runId: string) => {
    setLoading(true);
    try {
      const details = await api.getPayrollRunDetails(runId);
      setSelectedRun(details);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.processPayroll(period);
      setNotification(`✅ Folha da competência ${period} processada com sucesso para ${res.totalEmployees} colaboradores!`);
      await loadRuns();
    } catch (err: any) {
      setNotification(`❌ ${err.message || 'Falha ao processar folha.'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await api.simulatePayslip(
        simEmployeeId || employees[0]?.id,
        parseFloat(simOvertimeHours) || 0,
        parseInt(simDependents) || 0
      );
      setSimulationResult(res);
    } catch (err: any) {
      setNotification(`❌ ${err.message || 'Falha ao simular cálculo.'}`);
    }
  };

  const handleIntegratePayroll = async () => {
    if (!selectedRun) return;
    setLoading(true);
    try {
      const res = await api.integratePayroll(selectedRun.id);
      setNotification(
        `⚡ Folha ${selectedRun.period} aprovada e integrada! Gerados títulos de Contas a Pagar (${res.financialRecords.join(', ')}) e lançamento contábil ${res.accountingEntry}.`
      );
      await loadRuns();
    } catch (err: any) {
      setNotification(`❌ ${err.message || 'Falha na integração.'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 8000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Banner Superior da Folha */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black text-slate-900">Motor de Folha de Pagamento & Encargos CLT</h2>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 font-mono">
                Competência: {period}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Apuração oficial: INSS Progressivo, IRRF com dependentes, FGTS 8%, Vale Transporte e reflexos de horas extras/DSR.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold"
              placeholder="YYYY-MM"
            />
            <button
              onClick={handleProcessPayroll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-teal-800 cursor-pointer disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Processar Folha</span>
            </button>
            <button
              onClick={() => {
                setIsSimulateOpen(true);
                handleRunSimulation();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Calculator className="h-3.5 w-3.5 text-teal-600" />
              <span>Simular Holerite</span>
            </button>
          </div>
        </div>

        {notification && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-900 flex items-center justify-between">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-blue-700 font-black">✕</button>
          </div>
        )}

        {/* Histórico de Competências */}
        {runs.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Histórico de Folhas:</span>
            {runs.map(r => (
              <button
                key={r.id}
                onClick={() => handleSelectRun(r.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold font-mono transition-colors ${
                  selectedRun?.id === r.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.period} • {r.status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPIs Consolidados da Folha Selecionada */}
      {selectedRun && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Proventos Bruto</span>
              <div className="mt-1 text-sm font-black text-slate-900 font-mono">{money(selectedRun.total_gross)}</div>
              <span className="text-[10px] text-slate-500">{selectedRun.total_employees} colaboradores</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Desconto INSS</span>
              <div className="mt-1 text-sm font-black text-rose-600 font-mono">- {money(selectedRun.total_inss)}</div>
              <span className="text-[10px] text-slate-500">Previdência oficial</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Retenção IRRF</span>
              <div className="mt-1 text-sm font-black text-rose-600 font-mono">- {money(selectedRun.total_irrf)}</div>
              <span className="text-[10px] text-slate-500">Imposto de Renda</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Descontos</span>
              <div className="mt-1 text-sm font-black text-rose-700 font-mono">- {money(selectedRun.total_deductions)}</div>
              <span className="text-[10px] text-slate-500">INSS + IRRF + VT</span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Total Líquido a Pagar</span>
              <div className="mt-1 text-sm font-black text-emerald-700 font-mono">{money(selectedRun.total_net)}</div>
              <span className="text-[10px] text-emerald-600 font-bold">Salários Líquidos</span>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-blue-800">Encargo FGTS (8%)</span>
              <div className="mt-1 text-sm font-black text-blue-700 font-mono">{money(selectedRun.total_fgts)}</div>
              <span className="text-[10px] text-blue-600 font-bold">Custo Patronal</span>
            </div>
          </div>

          {/* Card de Integração com Financeiro e Contabilidade */}
          <div className={`rounded-xl border p-4.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
            selectedRun.status === 'APROVADO'
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-purple-200 bg-purple-50/40'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {selectedRun.status === 'APROVADO' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-purple-600" />
                )}
                <span className="text-xs font-black text-slate-900">
                  {selectedRun.status === 'APROVADO'
                    ? 'Folha Integrada ao Financeiro & Contabilidade SEEK'
                    : 'Folha Processada — Aguardando Aprovação e Integração ERP'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {selectedRun.status === 'APROVADO'
                  ? `Títulos gerados no Contas a Pagar e provisão contábil registrada no Livro Diário (${selectedRun.accounting_entry_id || 'LAN-FOLHA'}).`
                  : 'Ao aprovar, o sistema gerará automaticamente os títulos de Salários Líquidos, Guias FGTS e DARF Previdenciário no Financeiro e as partidas dobradas na Contabilidade.'}
              </p>
            </div>

            {selectedRun.status !== 'APROVADO' && (
              <button
                onClick={handleIntegratePayroll}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-xs font-black text-white hover:bg-purple-800 transition-colors cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Aprovar & Integrar ERP</span>
              </button>
            )}
          </div>

          {/* Tabela de Holerites da Competência */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-slate-600" />
                <h3 className="text-xs font-black text-slate-900">Holerites Individuais da Equipe</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono font-bold">
                {selectedRun.payslips?.length || 0} holerites emitidos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Cargo / Depto</th>
                    <th className="p-3 text-right">Salário Base</th>
                    <th className="p-3 text-right">H. Extras / DSR</th>
                    <th className="p-3 text-right">Bruto</th>
                    <th className="p-3 text-right">INSS</th>
                    <th className="p-3 text-right">IRRF</th>
                    <th className="p-3 text-right">Líquido</th>
                    <th className="p-3 text-right">FGTS</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {selectedRun.payslips?.map((slip: any) => (
                    <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-sans font-bold text-slate-900">{slip.employee_name}</td>
                      <td className="p-3 font-sans text-slate-500 text-[11px]">
                        {slip.job_title}
                        <span className="block text-[10px] text-slate-400">{slip.department}</span>
                      </td>
                      <td className="p-3 text-right text-slate-600">{money(slip.base_salary)}</td>
                      <td className="p-3 text-right text-slate-600">
                        {slip.overtime_hours > 0 ? (
                          <span className="text-teal-700 font-bold">+{money(slip.overtime_amount + slip.dsr_amount)} ({slip.overtime_hours}h)</span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">{money(slip.gross_salary)}</td>
                      <td className="p-3 text-right text-rose-600">-{money(slip.inss_deduction)}</td>
                      <td className="p-3 text-right text-rose-600">
                        {slip.irrf_deduction > 0 ? `-${money(slip.irrf_deduction)}` : 'Isento'}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700 bg-emerald-50/40">
                        {money(slip.net_salary)}
                      </td>
                      <td className="p-3 text-right text-blue-600">{money(slip.fgts_amount)}</td>
                      <td className="p-3 text-center font-sans">
                        <button
                          onClick={() => setViewingPayslip(slip)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Ver Holerite
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIMULADOR DE HOLERITE */}
      <Modal isOpen={isSimulateOpen} onClose={() => setIsSimulateOpen(false)} title="Simulador de Cálculo Trabalhista CLT">
        <form onSubmit={handleRunSimulation} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Colaborador</label>
              <select
                value={simEmployeeId}
                onChange={e => {
                  setSimEmployeeId(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Horas Extras no Mês</label>
              <input
                type="number"
                step="0.5"
                value={simOvertimeHours}
                onChange={e => setSimOvertimeHours(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                placeholder="Ex: 8.5"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dependentes IRRF</label>
              <input
                type="number"
                value={simDependents}
                onChange={e => setSimDependents(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                placeholder="Ex: 1"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
            >
              Recalcular Simulação
            </button>
          </div>

          {simulationResult && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900">{simulationResult.employee.fullName}</span>
                <span className="text-[11px] font-mono text-slate-500">{simulationResult.employee.jobTitle}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-800">Proventos</span>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Salário Base:</span>
                    <span className="font-mono font-bold">{money(simulationResult.calculation.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Horas Extras (50%):</span>
                    <span className="font-mono text-teal-700 font-bold">+{money(simulationResult.calculation.overtimeAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">DSR s/ Horas Extras:</span>
                    <span className="font-mono text-teal-700 font-bold">+{money(simulationResult.calculation.dsrAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-black">
                    <span>(=) Salário Bruto:</span>
                    <span className="font-mono text-slate-900">{money(simulationResult.calculation.grossSalary)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-rose-800">Descontos Legais</span>
                  <div className="flex justify-between">
                    <span className="text-slate-600">INSS Progressivo:</span>
                    <span className="font-mono text-rose-600">-{money(simulationResult.calculation.inssDeduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">IRRF (c/ dependentes):</span>
                    <span className="font-mono text-rose-600">-{money(simulationResult.calculation.irrfDeduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vale Transporte (6%):</span>
                    <span className="font-mono text-rose-600">-{money(simulationResult.calculation.vtDeduction)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-black">
                    <span>(-) Total Descontos:</span>
                    <span className="font-mono text-rose-700">-{money(simulationResult.calculation.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-100/70 p-3 flex justify-between items-center">
                <div>
                  <span className="text-xs font-black text-emerald-950">Salário Líquido a Receber</span>
                  <p className="text-[10px] text-emerald-800">Depósito em conta bancária até o 5º dia útil</p>
                </div>
                <div className="text-lg font-black font-mono text-emerald-900">
                  {money(simulationResult.calculation.netSalary)}
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* MODAL: VISUALIZAÇÃO DE HOLERITE FORMAL (PAYSTUB) */}
      <Modal isOpen={Boolean(viewingPayslip)} onClose={() => setViewingPayslip(null)} title="Demonstrativo de Pagamento de Salário">
        {viewingPayslip && (
          <div className="space-y-4 text-xs font-sans">
            {/* Cabeçalho do Holerite */}
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 space-y-1">
              <div className="flex justify-between">
                <div>
                  <span className="font-black text-slate-900 text-sm">SEEK PLATFORM TECNOLOGIA S.A.</span>
                  <span className="block text-[10px] text-slate-500 font-mono">CNPJ: 08.123.456/0001-89 • Curitiba - PR</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-800 text-xs">Recibo de Pagamento</span>
                  <span className="block text-[11px] font-mono text-emerald-800 font-bold">Ref: {viewingPayslip.period}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>Colaborador: <strong>{viewingPayslip.employee_name}</strong></div>
                <div>Cargo: <strong>{viewingPayslip.job_title}</strong></div>
                <div>Departamento: <strong>{viewingPayslip.department}</strong></div>
                <div>Regime: <strong>CLT Integral (220h)</strong></div>
              </div>
            </div>

            {/* Linhas de Proventos e Descontos */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                  <tr>
                    <th className="p-2 text-left">Código / Descrição</th>
                    <th className="p-2 text-center">Referência</th>
                    <th className="p-2 text-right">Vencimentos</th>
                    <th className="p-2 text-right">Descontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr>
                    <td className="p-2 font-sans font-medium">001 Salário Base Mensal</td>
                    <td className="p-2 text-center">30 dias</td>
                    <td className="p-2 text-right">{money(viewingPayslip.base_salary)}</td>
                    <td className="p-2 text-right">—</td>
                  </tr>
                  {viewingPayslip.overtime_hours > 0 && (
                    <>
                      <tr>
                        <td className="p-2 font-sans font-medium">010 Horas Extras 50%</td>
                        <td className="p-2 text-center">{viewingPayslip.overtime_hours}h</td>
                        <td className="p-2 text-right">{money(viewingPayslip.overtime_amount)}</td>
                        <td className="p-2 text-right">—</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans font-medium">015 Reflexo DSR s/ Horas Extras</td>
                        <td className="p-2 text-center">DSR</td>
                        <td className="p-2 text-right">{money(viewingPayslip.dsr_amount)}</td>
                        <td className="p-2 text-right">—</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td className="p-2 font-sans font-medium">101 Contribuição Previdenciária INSS</td>
                    <td className="p-2 text-center">Faixa Prog.</td>
                    <td className="p-2 text-right">—</td>
                    <td className="p-2 text-right text-rose-600">{money(viewingPayslip.inss_deduction)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans font-medium">105 Imposto de Renda Retido na Fonte (IRRF)</td>
                    <td className="p-2 text-center">Tabela RFB</td>
                    <td className="p-2 text-right">—</td>
                    <td className="p-2 text-right text-rose-600">{money(viewingPayslip.irrf_deduction)}</td>
                  </tr>
                  {viewingPayslip.vt_deduction > 0 && (
                    <tr>
                      <td className="p-2 font-sans font-medium">110 Vale Transporte</td>
                      <td className="p-2 text-center">6%</td>
                      <td className="p-2 text-right">—</td>
                      <td className="p-2 text-right text-rose-600">{money(viewingPayslip.vt_deduction)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={2} className="p-2 text-right">Totais:</td>
                    <td className="p-2 text-right text-emerald-800">{money(viewingPayslip.gross_salary)}</td>
                    <td className="p-2 text-right text-rose-800">{money(viewingPayslip.total_deductions)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Totalizadores e FGTS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-2.5 bg-slate-50 text-[10px] space-y-1">
                <div>Base Cálculo INSS: <strong className="font-mono">{money(viewingPayslip.gross_salary)}</strong></div>
                <div>Base Cálculo FGTS: <strong className="font-mono">{money(viewingPayslip.gross_salary)}</strong></div>
                <div>FGTS do Mês (Encargo): <strong className="font-mono text-blue-700">{money(viewingPayslip.fgts_amount)}</strong></div>
              </div>
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 flex flex-col justify-center items-end">
                <span className="text-[10px] uppercase font-bold text-emerald-800">Valor Líquido a Receber</span>
                <span className="text-base font-black font-mono text-emerald-900">{money(viewingPayslip.net_salary)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
