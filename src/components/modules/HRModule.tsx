import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Users,
  Calendar,
  Clock,
  Award,
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  Building,
  Timer,
  Palmtree,
  GitFork,
  ArrowRight,
  TrendingUp,
  FileCheck,
  AlertCircle,
  Zap,
  DollarSign,
  CreditCard,
  BarChart3,
  Layers,
  WalletCards,
  Send
} from 'lucide-react';
import { EMPLOYEES } from '../../data/mockData';
import { EmployeeProfile } from '../../types/modules';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ScrollSpyNav } from '../common/ScrollSpyNav';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { api } from '../../services/api';
import { FreelanceTaxasSubmodule } from './FreelanceTaxasSubmodule';
import { HRPayrollSection } from './HRPayrollSection';

export const HRModule: React.FC<{ initialTab?: 'dashboard' | 'employees' | 'payroll' | 'benefits' | 'ponto' | 'vacations' | 'freelancers' | 'organogram' }> = ({ initialTab = 'dashboard' }) => {
  const { currentUser } = useAuth();
  const { refreshApprovals } = useWorkflow();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'payroll' | 'benefits' | 'ponto' | 'vacations' | 'freelancers' | 'organogram'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [employees, setEmployees] = useState<any[]>(EMPLOYEES);
  const [timeRecords, setTimeRecords] = useState<any[]>([]);
  const [vacationRequests, setVacationRequests] = useState<any[]>([]);
  const [organogramData, setOrganogramData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [payrollPeriod, setPayrollPeriod] = useState('2026-10');
  const [payrollDueDate, setPayrollDueDate] = useState('2026-11-05');
  const [payrollPreview, setPayrollPreview] = useState<any>(null);
  const [closingPayroll, setClosingPayroll] = useState(false);

  // Estados dos Benefícios (VT, VA, VR, Combustível)
  const [benefitEmployees, setBenefitEmployees] = useState<any[]>([]);
  const [benefitOrders, setBenefitOrders] = useState<any[]>([]);
  const [benefitPeriod, setBenefitPeriod] = useState('2026-10');
  const [benefitDueDate, setBenefitDueDate] = useState('2026-10-25');
  const [benefitPreview, setBenefitPreview] = useState<any>(null);
  const [benefitFilter, setBenefitFilter] = useState<'TODOS'|'VT'|'VA'|'VR'|'COMBUSTIVEL'>('TODOS');

  // Modal de Configuração de Benefícios por Colaborador
  const [isConfigureBenefitsOpen, setIsConfigureBenefitsOpen] = useState(false);
  const [selectedEmpForBenefits, setSelectedEmpForBenefits] = useState<any>(null);
  const [benefitsConfig, setBenefitsConfig] = useState<Record<string, { enabled: boolean; providerName: string; monthlyValue: number; employeeDiscount: number; companyCost: number }>>({
    VT: { enabled: false, providerName: 'Mobilidade Corporativa', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 },
    VA: { enabled: false, providerName: 'Cartão Benefícios', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 },
    VR: { enabled: false, providerName: 'Cartão Benefícios', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 },
    COMBUSTIVEL: { enabled: false, providerName: 'Auxílio Combustível', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 }
  });

  // Modais
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    jobTitle: '',
    department: 'Operações & Logística',
    branch: 'Curitiba (Matriz)',
    regime: 'CLT',
    salary: '',
    managerName: 'Roberto Vianna Guimarães'
  });

  const [isVacationOpen, setIsVacationOpen] = useState(false);
  const [vacationForm, setVacationForm] = useState({
    startDate: '2026-12-01',
    endDate: '2026-12-15',
    daysCount: '15'
  });

  const loadData = async () => {
    try {
      const serverEmployees = await api.getEmployees();
      if (serverEmployees && serverEmployees.length > 0) {
        setEmployees(serverEmployees);
      }
      const serverTime = await api.getTimeRecords();
      if (serverTime) setTimeRecords(serverTime);

      const serverVac = await api.getVacations();
      if (serverVac) setVacationRequests(serverVac);

      const serverOrg = await api.getOrganogram();
      if (serverOrg) setOrganogramData(serverOrg.organogram);

      const serverPayroll = await api.getPayrollRuns();
      if (serverPayroll) setPayrollRuns(serverPayroll);

      const serverBenefits = await api.getBenefits();
      if (serverBenefits) setBenefitEmployees(serverBenefits);

      const serverBenefitOrders = await api.getBenefitOrders();
      if (serverBenefitOrders) setBenefitOrders(serverBenefitOrders);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.fullName || !newEmployee.jobTitle || !newEmployee.salary) return;

    const res = await api.createEmployee({
      fullName: newEmployee.fullName,
      jobTitle: newEmployee.jobTitle,
      department: newEmployee.department,
      branch: newEmployee.branch,
      regime: newEmployee.regime,
      salary: parseFloat(newEmployee.salary),
      managerName: newEmployee.managerName,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`✅ Colaborador ${newEmployee.fullName} admitido com sucesso no SEEK!`);
      setIsAdmitOpen(false);
      setNewEmployee({
        fullName: '',
        jobTitle: '',
        department: 'Operações & Logística',
        branch: 'Curitiba (Matriz)',
        regime: 'CLT',
        salary: '',
        managerName: 'Roberto Vianna Guimarães'
      });
      loadData();
    } else {
      const fallbackEmp = {
        id: `emp-${Date.now()}`,
        registrationNumber: `MAT-0${Math.floor(100 + Math.random() * 899)}`,
        fullName: newEmployee.fullName,
        jobTitle: newEmployee.jobTitle,
        department: newEmployee.department,
        branch: newEmployee.branch,
        regime: newEmployee.regime,
        admissionDate: new Date().toISOString().substring(0, 10),
        salary: parseFloat(newEmployee.salary),
        vacationBalanceDays: 30,
        bankHoursBalance: 0,
        active: true
      };
      setEmployees(prev => [fallbackEmp, ...prev]);
      setIsAdmitOpen(false);
      setNotification(`✅ Colaborador admitido localmente.`);
    }

    setTimeout(() => setNotification(null), 5000);
  };

  const handleClockPunch = async () => {
    const res = await api.clockTimeRecord({
      employeeId: 'emp-07',
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`⏱️ Ponto registrado com sucesso às ${res.clockTime} de hoje!`);
      loadData();
    } else {
      setNotification(`⏱️ Ponto registrado.`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRequestVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createVacationRequest({
      employeeId: 'emp-07',
      employeeName: currentUser.fullName,
      startDate: vacationForm.startDate,
      endDate: vacationForm.endDate,
      daysCount: vacationForm.daysCount,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`🏖️ Solicitação de ${vacationForm.daysCount} dias de férias enviada ao Motor de Alçadas SEEK!`);
      setIsVacationOpen(false);
      loadData();
      refreshApprovals();
    } else {
      setNotification(`🏖️ Solicitação de férias registrada.`);
      setIsVacationOpen(false);
    }
    setTimeout(() => setNotification(null), 6000);
  };

  const handlePreviewPayroll = async () => {
    const preview = await api.previewPayroll({ period: payrollPeriod });
    if (preview) setPayrollPreview(preview);
  };

  const handleClosePayroll = async () => {
    if (!payrollPeriod || !payrollDueDate) return;
    setClosingPayroll(true);
    const result = await api.closePayroll({ period: payrollPeriod, dueDate: payrollDueDate, userName: currentUser?.fullName, userRole: currentUser?.roleTitle });
    setClosingPayroll(false);
    if (result?.success) {
      setNotification(`✅ Folha ${payrollPeriod} fechada e enviada ao Financeiro. Título ${result.financialRecord?.code || ''}.`);
      setPayrollPreview(null);
      loadData();
    } else {
      setNotification(`⚠️ ${result?.error || 'Não foi possível fechar a folha.'}`);
    }
  };

  const handleVacationFinancial = async (vacation: any) => {
    const rawAmount = window.prompt(`Valor final apurado pelo RH para as férias de ${vacation.employee_name} (R$):`);
    if (!rawAmount) return;
    const dueDate = window.prompt('Data limite de pagamento (AAAA-MM-DD):', vacation.start_date || '2026-11-28');
    if (!dueDate) return;
    const amount = Number(rawAmount.replace(',', '.'));
    const result = await api.generateVacationFinancial(vacation.id, { amount, dueDate, userName: currentUser?.fullName, userRole: currentUser?.roleTitle });
    if (result?.success) {
      setNotification(`✅ Obrigação de férias enviada ao Financeiro (${result.financialRecord?.code}).`);
      loadData();
    } else {
      setNotification(`⚠️ ${result?.error || 'Não foi possível gerar a obrigação financeira.'}`);
    }
  };

  const handleOpenConfigureBenefits = (emp: any) => {
    setSelectedEmpForBenefits(emp);
    const initialConfig: Record<string, any> = {
      VT: { enabled: false, providerName: 'Mobilidade Corporativa', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 },
      VA: { enabled: false, providerName: 'Cartão Benefícios', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 },
      VR: { enabled: false, providerName: 'Cartão Benefícios', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 },
      COMBUSTIVEL: { enabled: false, providerName: 'Auxílio Combustível', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 }
    };
    (emp.benefits || []).forEach((b: any) => {
      if (initialConfig[b.type]) {
        initialConfig[b.type] = {
          enabled: Boolean(b.enabled),
          providerName: b.providerName || initialConfig[b.type].providerName,
          monthlyValue: Number(b.monthlyValue || 0),
          employeeDiscount: Number(b.employeeDiscount || 0),
          companyCost: Number(b.companyCost || 0)
        };
      }
    });
    setBenefitsConfig(initialConfig);
    setIsConfigureBenefitsOpen(true);
  };

  const handleSaveBenefits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForBenefits) return;

    const payload = ['VT', 'VA', 'VR', 'COMBUSTIVEL'].map(type => {
      const cfg = benefitsConfig[type];
      const monthly = Number(cfg.companyCost || 0) + Number(cfg.employeeDiscount || 0);
      return {
        type,
        enabled: Boolean(cfg.enabled && Number(cfg.companyCost) > 0),
        providerName: cfg.providerName || '',
        calculationMode: 'MENSAL',
        unitValue: 0,
        quantity: 1,
        monthlyValue: monthly,
        employeeDiscount: Number(cfg.employeeDiscount || 0),
        companyCost: Number(cfg.companyCost || 0)
      };
    });

    const res = await api.saveEmployeeBenefits(selectedEmpForBenefits.id, {
      benefits: payload,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });

    if (res?.success) {
      setNotification(`✅ Benefícios de ${selectedEmpForBenefits.fullName} atualizados com sucesso.`);
      setIsConfigureBenefitsOpen(false);
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao salvar benefícios do colaborador.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handlePreviewBenefits = async () => {
    const res = await api.previewBenefitOrder(benefitPeriod);
    if (res) setBenefitPreview(res);
  };

  const handleCloseBenefits = async () => {
    if (!benefitPeriod || !benefitDueDate) return;
    const res = await api.createBenefitOrder({
      period: benefitPeriod,
      dueDate: benefitDueDate,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification(`✅ Fechamento de benefícios da competência ${benefitPeriod} gerado.`);
      setBenefitPreview(null);
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao fechar lote de benefícios.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSendBenefitsFinance = async (order: any) => {
    const res = await api.sendBenefitOrderToFinance(order.id, {
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification(`✅ Benefícios da competência ${order.period} enviados ao Financeiro (Título ${res.financialRecord?.code || ''}).`);
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao enviar benefícios ao Financeiro.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredEmployees = employees.filter(
    e =>
      e.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner RH */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">RH & Departamento Pessoal</h1>
            <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
              SEEK Gestão de Pessoas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão unificada: Colaboradores, Admissões, Ponto Eletrônico, Banco de Horas, Férias com Alçadas e Organograma.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsAdmitOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Admitir Colaborador</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
        </div>
      )}

      {/* ScrollSpy: Navegador Seccional de RH */}
      <ScrollSpyNav
        sections={[
          { id: 'hr-kpis', label: 'Indicadores de Gente', icon: BarChart3 },
          ...(activeTab === 'dashboard' ? [{ id: 'hr-workspace', label: 'Central de Trabalho', icon: UserCheck }] : []),
          { id: 'hr-tabs', label: 'Abas do RH', icon: Layers },
          { id: 'hr-content', label: 'Colaboradores & Folha', icon: Users }
        ]}
      />

      {/* KPIs do RH */}
      <div id="hr-kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Headcount Total Ativo"
          value={employees.length}
          subtitle="Matriz Curitiba e Filiais SP/RJ"
          icon={Users}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
        />
        <StatCard
          title="Turnover Anual"
          value="3.2%"
          change="-0.8 p.p."
          changeType="positive"
          subtitle="Alta retenção de talentos"
          icon={Award}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Assiduidade de Ponto"
          value="98.7%"
          change="+0.5 p.p."
          changeType="positive"
          subtitle="Cumprimento de jornada diária"
          icon={Timer}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Saldo de Férias a Vencer"
          value="25 dias"
          subtitle="Janela de descanso programada"
          icon={Palmtree}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {activeTab === 'dashboard' && (
        <div id="hr-workspace" className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Central de Trabalho de RH & Departamento Pessoal</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Cadastros, folha CLT, benefícios corporativos, ponto e férias. Obrigações que geram reflexos financeiros nascem no RH e mantêm rastreabilidade até o pagamento.
                </p>
              </div>
              <button
                onClick={() => setIsAdmitOpen(true)}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs"
              >
                + Admitir Colaborador
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Colaboradores Ativos', value: employees.filter(e => e.active !== false).length, sub: 'Quadro funcional', tab: 'employees' as const, action: 'Ver cadastros' },
              { label: 'Folha & Encargos (CLT)', value: 'Motor CLT v1.0', sub: 'Salários, INSS e FGTS', tab: 'payroll' as const, action: 'Calcular folha' },
              { label: 'Gestão de Benefícios', value: `${benefitEmployees.reduce((n, e) => n + (e.benefits || []).filter((b: any) => b.enabled).length, 0)} ativos`, sub: 'VT, VA, VR e Combustível', tab: 'benefits' as const, action: 'Abrir benefícios' },
              { label: 'Ponto & Férias', value: `${timeRecords.length} registros`, sub: `${vacationRequests.length} solicitações`, tab: 'ponto' as const, action: 'Revisar jornada' }
            ].map(item => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.tab)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</div>
                <div className="mt-2 text-xl font-black text-slate-900">{item.value}</div>
                <div className="mt-1 text-[11px] text-slate-500">{item.sub}</div>
                <div className="mt-3 text-xs font-bold text-blue-700">{item.action} →</div>
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-black text-slate-900">Ações Frequentes do Departamento Pessoal</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button onClick={() => setIsAdmitOpen(true)} className="rounded-lg border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50 transition-colors">
                  + Admissão de Colaborador
                </button>
                <button onClick={() => setActiveTab('payroll')} className="rounded-lg border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50 transition-colors text-emerald-800">
                  ⚙ Processar Folha Mensal (CLT)
                </button>
                <button onClick={() => setActiveTab('benefits')} className="rounded-lg border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50 transition-colors text-purple-800">
                  💳 Comprar Benefícios (Lote)
                </button>
                <button onClick={() => setActiveTab('ponto')} className="rounded-lg border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50 transition-colors">
                  ⏱ Espelho de Ponto & Ajustes
                </button>
                <button onClick={() => setActiveTab('vacations')} className="rounded-lg border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50 transition-colors">
                  🏖 Férias e Ausências
                </button>
                <button onClick={() => setActiveTab('freelancers')} className="rounded-lg border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50 transition-colors text-amber-800">
                  ⚡ Freelance & Central de Taxas
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-black text-slate-900">Integração RH → Financeiro & Contábil</h3>
              <div className="mt-3 space-y-2.5 text-xs text-slate-700">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="font-bold text-slate-900">1. Fechamento de Folha → Títulos no Contas a Pagar</div>
                  <p className="mt-0.5 text-slate-600">Geração automática de títulos para líquido da folha, GPS (INSS) e GRF (FGTS) na data de vencimento legal.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="font-bold text-slate-900">2. Compra de Benefícios → Fatura de Operadora</div>
                  <p className="mt-0.5 text-slate-600">O lote de compra gera título a pagar para a operadora (Caju, Flash, Ticket) e grava os descontos no holerite.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="font-bold text-slate-900">3. Freelance & Taxas → Liquidação com Retenção</div>
                  <p className="mt-0.5 text-slate-600">Aprovação na Central de Taxas envia título líquido com destaque de retenções fiscais/previdenciárias.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abas Internas */}
      <div id="hr-tabs" className="flex border-b border-slate-200 space-x-4 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>Visão Geral & Pendências</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'employees'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Colaboradores & Admissões</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{employees.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'payroll'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <WalletCards className="h-4 w-4 text-emerald-600" />
          <span>Folha & Obrigações</span>
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
            Financeiro
          </span>
        </button>

        <button
          onClick={() => setActiveTab('benefits')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'benefits'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <WalletCards className="h-4 w-4 text-cyan-700" />
          <span>Benefícios</span>
          <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-800">
            VT • VA • VR • Combustível
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ponto')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'ponto'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Timer className="h-4 w-4" />
          <span>Espelho de Ponto & Banco de Horas</span>
        </button>

        <button
          onClick={() => setActiveTab('vacations')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'vacations'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Palmtree className="h-4 w-4" />
          <span>Férias & Ausências</span>
          <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
            Alçadas
          </span>
        </button>

        <button
          onClick={() => setActiveTab('freelancers')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'freelancers'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Freelancers & Taxas</span>
          <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800">
            Central
          </span>
        </button>

        <button
          onClick={() => setActiveTab('organogram')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'organogram'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GitFork className="h-4 w-4" />
          <span>Organograma Corporativo</span>
        </button>
      </div>

      {/* Conteúdo das Abas (ScrollSpy Section) */}
      <div id="hr-content" className="space-y-4">
        {/* ABA 1: COLABORADORES */}
        {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="relative w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, cargo ou departamento..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-slate-500">
              Total: <strong>{filteredEmployees.length}</strong> colaboradores cadastrados
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Matrícula</th>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Cargo / Função</th>
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-4">Filial / Lotação</th>
                  <th className="py-3 px-4 text-center">Regime</th>
                  <th className="py-3 px-4 text-center">Banco de Horas</th>
                  <th className="py-3 px-4 text-center">Saldo Férias</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{e.registrationNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{e.fullName}</td>
                    <td className="py-3.5 px-4 text-slate-700">{e.jobTitle}</td>
                    <td className="py-3.5 px-4 text-slate-600">{e.department}</td>
                    <td className="py-3.5 px-4 text-slate-500">{e.branch}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {e.regime}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className={(e.bankHoursBalance ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {(e.bankHoursBalance ?? 0) > 0 ? `+${e.bankHoursBalance}h` : `${e.bankHoursBalance ?? 0}h`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {e.vacationBalanceDays ?? 30} dias
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: FOLHA & OBRIGAÇÕES FINANCEIRAS */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Fechamento da Folha → Financeiro</h3>
                <p className="mt-1 text-xs text-slate-500">
                  O RH fecha a competência; o SEEK cria a obrigação financeira e os lançamentos contábeis de reconhecimento. Valores de encargos e descontos legais devem vir do motor de folha homologado.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Competência</label>
                  <input
                    type="month"
                    value={payrollPeriod}
                    onChange={e => setPayrollPeriod(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Vencimento</label>
                  <input
                    type="date"
                    value={payrollDueDate}
                    onChange={e => setPayrollDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handlePreviewPayroll}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                  >
                    Prévia
                  </button>
                  <button
                    onClick={handleClosePayroll}
                    disabled={closingPayroll}
                    className="flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {closingPayroll ? 'Enviando...' : 'Fechar e enviar'}
                  </button>
                </div>
              </div>
            </div>

            {payrollPreview && (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Colaboradores</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{payrollPreview.employeeCount}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Base salarial</div>
                  <div className="mt-1 text-lg font-black text-slate-900">
                    R$ {Number(payrollPreview.grossAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Ajustes</div>
                  <div className="mt-1 text-lg font-black text-slate-900">
                    R$ {Number(payrollPreview.adjustmentsAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">Líquido previsto</div>
                  <div className="mt-1 text-lg font-black text-emerald-800">
                    R$ {Number(payrollPreview.netAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Competência</th>
                  <th className="px-4 py-3">Colaboradores</th>
                  <th className="px-4 py-3 text-right">Líquido</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Título Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollRuns.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{r.period}</td>
                    <td className="px-4 py-3">{r.employeeCount ?? r.total_employees ?? 0}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      R$ {Number(r.netAmount ?? r.total_net ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono">{r.dueDate || r.due_date || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                      {r.financialRecordId || r.financial_record_id || '—'}
                    </td>
                  </tr>
                ))}
                {payrollRuns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                      Nenhuma folha de pagamento fechada para envio ao Financeiro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <HRPayrollSection employees={employees} />
          </div>
        </div>
      )}

      {/* ABA: GESTÃO & COMPRA DE BENEFÍCIOS CORPORATIVOS (VT, VA, VR, COMBUSTÍVEL) */}
      {activeTab === 'benefits' && (
        <div className="space-y-5">
          {/* Card de Colaboradores e Benefícios */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Benefícios dos Colaboradores</h3>
                <p className="text-xs text-slate-500">Relação nominal e gestão de VT, VA, VR e Auxílio Combustível.</p>
              </div>
              <div className="flex gap-2">
                {(['TODOS', 'VT', 'VA', 'VR', 'COMBUSTIVEL'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setBenefitFilter(f)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                      benefitFilter === f ? 'bg-blue-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'COMBUSTIVEL' ? 'Combustível' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Colaborador</th>
                    <th className="py-3 px-2">Departamento</th>
                    <th className="py-3 px-2 text-right">VT</th>
                    <th className="py-3 px-2 text-right">VA</th>
                    <th className="py-3 px-2 text-right">VR</th>
                    <th className="py-3 px-2 text-right">Combustível</th>
                    <th className="py-3 px-2 text-right">Custo Empresa</th>
                    <th className="py-3 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {benefitEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        Nenhum colaborador com benefício cadastrado.
                      </td>
                    </tr>
                  ) : (
                    benefitEmployees
                      .filter(e => benefitFilter === 'TODOS' || (e.benefits || []).some((b: any) => b.type === benefitFilter && b.enabled))
                      .map(emp => {
                        const getB = (t: string) => (emp.benefits || []).find((b: any) => b.type === t && b.enabled);
                        const vals = ['VT', 'VA', 'VR', 'COMBUSTIVEL'].map(t => getB(t));
                        const totalEmpresa = vals.reduce((acc: number, b: any) => acc + Number(b?.companyCost || 0), 0);

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{emp.fullName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {emp.registrationNumber} • {emp.jobTitle}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-slate-700">{emp.department}</td>
                            {vals.map((b: any, idx: number) => (
                              <td key={idx} className="py-3 px-2 text-right font-medium text-slate-700">
                                {b && Number(b.companyCost) > 0 ? (
                                  <span title={`Operadora: ${b.providerName || 'N/D'}`}>
                                    {Number(b.companyCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            ))}
                            <td className="py-3 px-2 text-right font-black text-slate-900">
                              {totalEmpresa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleOpenConfigureBenefits(emp)}
                                className="rounded-lg border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                Configurar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fechamento Mensal de Benefícios */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">Fechamento do Lote Mensal</h4>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Competência</label>
                <input
                  type="month"
                  value={benefitPeriod}
                  onChange={e => setBenefitPeriod(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-200 p-2 text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Vencimento / Crédito</label>
                <input
                  type="date"
                  value={benefitDueDate}
                  onChange={e => setBenefitDueDate(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-200 p-2 text-xs font-medium text-slate-800"
                />
              </div>
              <button
                onClick={handlePreviewBenefits}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Prévia do fechamento
              </button>
              <button
                onClick={handleCloseBenefits}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer shadow-xs"
              >
                Fechar benefícios
              </button>
            </div>

            {benefitPreview && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2">
                  Prévia Competência {benefitPreview.period} ({benefitPreview.employeeCount} colaboradores com benefícios):
                </div>
                <div className="grid gap-3 sm:grid-cols-5">
                  {[
                    ['VT', benefitPreview.totals?.VT],
                    ['VA', benefitPreview.totals?.VA],
                    ['VR', benefitPreview.totals?.VR],
                    ['Combustível', benefitPreview.totals?.COMBUSTIVEL],
                    ['Total Empresa', benefitPreview.totalAmount]
                  ].map(([label, val]: any, i: number) => (
                    <div key={label} className={`rounded-xl p-3 border ${i === 4 ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
                      <div className={`mt-1 text-base font-black ${i === 4 ? 'text-blue-900' : 'text-slate-900'}`}>
                        {Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Histórico de Fechamentos / Pedidos de Compra */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
            <div className="p-4 border-b border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Histórico de Fechamentos de Benefícios</h4>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Competência</th>
                  <th className="py-3 px-2">Colaboradores</th>
                  <th className="py-3 px-2 text-right">VT</th>
                  <th className="py-3 px-2 text-right">VA</th>
                  <th className="py-3 px-2 text-right">VR</th>
                  <th className="py-3 px-2 text-right">Combustível</th>
                  <th className="py-3 px-2 text-right">Total Empresa</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {benefitOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      Nenhum fechamento de benefícios realizado até o momento.
                    </td>
                  </tr>
                ) : (
                  benefitOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{o.period}</td>
                      <td className="py-3 px-2 text-slate-700">{o.employee_count} colaboradores</td>
                      <td className="py-3 px-2 text-right text-slate-700">{Number(o.vt_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{Number(o.va_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{Number(o.vr_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{Number(o.fuel_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="py-3 px-2 text-right font-black text-slate-900">{Number(o.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="py-3 px-2 text-center"><StatusBadge status={o.status} /></td>
                      <td className="py-3 px-3 text-center">
                        {o.financial_record_id ? (
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {o.financial_record_id}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendBenefitsFinance(o)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                          >
                            Enviar ao Financeiro
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: ESPELHO DE PONTO & BANCO DE HORAS */}
      {activeTab === 'ponto' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Espelho de Ponto Eletrônico (Portaria 671 MTE)</h3>
              <p className="text-xs text-slate-500">Controle biométrico/digital de batidas de ponto, tolerância e banco de horas diário.</p>
            </div>

            <button
              onClick={handleClockPunch}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
            >
              <Timer className="h-4 w-4" />
              <span>Bater Ponto Agora</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-center">Entrada (1)</th>
                  <th className="py-3 px-4 text-center">Saída Intervalo (2)</th>
                  <th className="py-3 px-4 text-center">Retorno Intervalo (3)</th>
                  <th className="py-3 px-4 text-center">Saída Final (4)</th>
                  <th className="py-3 px-4 text-right">Horas Trabalhadas</th>
                  <th className="py-3 px-4 text-center">Saldo Diário</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeRecords.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{t.date}</td>
                    <td className="py-3 px-4 text-center font-mono font-medium">{t.clock_in || '—'}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">{t.clock_out_lunch || '—'}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">{t.clock_in_lunch || '—'}</td>
                    <td className="py-3 px-4 text-center font-mono font-medium">{t.clock_out || '—'}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-800">{t.total_hours || 8.0}h</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">
                      +{(t.balance_minutes ?? 0)} min
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {t.status || 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: FÉRIAS & AUSÊNCIAS */}
      {activeTab === 'vacations' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Programação de Férias & Ausências Legais</h3>
              <p className="text-xs text-slate-500">Solicitação integrada diretamente com o Motor de Alçadas do SEEK Core.</p>
            </div>

            <button
              onClick={() => setIsVacationOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-2xs transition-colors"
            >
              <Palmtree className="h-4 w-4" />
              <span>Solicitar Férias</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Data Início</th>
                  <th className="py-3 px-4">Data Fim</th>
                  <th className="py-3 px-4 text-center">Dias de Gozo</th>
                  <th className="py-3 px-4 text-center">Status Alçada</th>
                  <th className="py-3 px-4">Data Solicitação</th>
                  <th className="py-3 px-4 text-right">Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacationRequests.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{v.employee_name}</td>
                    <td className="py-3 px-4 text-slate-700">{v.start_date}</td>
                    <td className="py-3 px-4 text-slate-700">{v.end_date}</td>
                    <td className="py-3 px-4 text-center font-black text-slate-900">{v.days_count} dias</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500">{v.created_at?.substring(0, 10)}</td>
                    <td className="py-3 px-4 text-right">
                      {v.status === 'APROVADO' ? (
                        <button
                          onClick={() => handleVacationFinancial(v)}
                          className="rounded-lg bg-blue-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer"
                        >
                          Gerar obrigação
                        </button>
                      ) : v.financial_record_id ? (
                        <span className="text-[10px] font-bold text-emerald-700">Enviado</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Aguardando</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: ORGANOGRAMA CORPORATIVO */}
      {activeTab === 'organogram' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Estrutura Organizacional & Hierarquia Corporativa</h3>
            <p className="text-xs text-slate-500">Mapeamento dinâmico de subordinação hierárquica e alçadas de decisão.</p>
          </div>

          {/* Nível 1: Conselho & Diretoria */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Nível Estratégico — Conselho & C-Level</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="font-bold text-xs text-slate-900 block">Roberto Vianna Guimarães</span>
                <span className="text-[11px] text-blue-800 font-semibold block">Diretor Presidente / C-Level</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Alçada Executiva: R$ 500.000,00</span>
              </div>
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="font-bold text-xs text-slate-900 block">Administrador Geral</span>
                <span className="text-[11px] text-blue-800 font-semibold block">Administrador Geral SEEK</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Alçada Global: R$ 1.000.000,00</span>
              </div>
            </div>
          </div>

          {/* Nível 2: Gestores Departamentais */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Nível Tático — Gerências & Lideranças</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-xs text-slate-900 block">Helena Silveira</span>
                <span className="text-[10px] text-slate-600 block">Gerente Financeira</span>
                <span className="text-[9px] text-emerald-700 font-bold mt-1 block">Alçada: R$ 75.000</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-xs text-slate-900 block">Eduardo Martins</span>
                <span className="text-[10px] text-slate-600 block">Gestor de Operações & TI</span>
                <span className="text-[9px] text-emerald-700 font-bold mt-1 block">Alçada: R$ 50.000</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-xs text-slate-900 block">Lucas Bertolli</span>
                <span className="text-[10px] text-slate-600 block">Líder Comercial & CRM</span>
                <span className="text-[9px] text-emerald-700 font-bold mt-1 block">Alçada: R$ 25.000</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-xs text-slate-900 block">Camila Duarte</span>
                <span className="text-[10px] text-slate-600 block">Gerente de RH & DP</span>
                <span className="text-[9px] text-emerald-700 font-bold mt-1 block">Alçada: R$ 30.000</span>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ABA 4: FREELANCERS & CENTRAL DE TAXAS */}
        {activeTab === 'freelancers' && <FreelanceTaxasSubmodule />}
      </div>

      {/* Modal Admitir Colaborador */}
      <Modal
        isOpen={isAdmitOpen}
        onClose={() => setIsAdmitOpen(false)}
        title="Admissão de Novo Colaborador"
        subtitle="Registro no RH integrado ao Core corporativo do SEEK"
      >
        <form onSubmit={handleAdmitEmployee} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={newEmployee.fullName}
              onChange={e => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
              placeholder="Ex: Amanda Nogueira Ribeiro"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Cargo / Função *</label>
              <input
                type="text"
                required
                value={newEmployee.jobTitle}
                onChange={e => setNewEmployee({ ...newEmployee, jobTitle: e.target.value })}
                placeholder="Ex: Analista de Operações Jr"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Salário Base (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newEmployee.salary}
                onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Departamento</label>
              <select
                value={newEmployee.department}
                onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Operações & Logística">Operações & Logística</option>
                <option value="Tecnologia da Informação">Tecnologia da Informação</option>
                <option value="Financeiro & Controladoria">Financeiro & Controladoria</option>
                <option value="Comercial & CRM">Comercial & CRM</option>
                <option value="Recursos Humanos & DP">Recursos Humanos & DP</option>
                <option value="Jurídico">Jurídico</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Regime de Contratação</label>
              <select
                value={newEmployee.regime}
                onChange={e => setNewEmployee({ ...newEmployee, regime: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="CLT">CLT (Consolidação)</option>
                <option value="PJ">PJ (Prestador Pessoa Jurídica)</option>
                <option value="ESTAGIO">Estágio Supervisionado</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdmitOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 shadow-xs"
            >
              Confirmar Admissão
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Solicitar Férias */}
      <Modal
        isOpen={isVacationOpen}
        onClose={() => setIsVacationOpen(false)}
        title="Solicitação de Férias com Alçada"
        subtitle="O pedido será encaminhado ao Gestor Departamental para aprovação"
      >
        <form onSubmit={handleRequestVacation} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Data de Início</label>
              <input
                type="date"
                required
                value={vacationForm.startDate}
                onChange={e => setVacationForm({ ...vacationForm, startDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Data de Retorno</label>
              <input
                type="date"
                required
                value={vacationForm.endDate}
                onChange={e => setVacationForm({ ...vacationForm, endDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Quantidade de Dias</label>
            <input
              type="number"
              required
              value={vacationForm.daysCount}
              onChange={e => setVacationForm({ ...vacationForm, daysCount: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsVacationOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 shadow-xs"
            >
              Submeter Solicitação
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Configuração de Benefícios por Colaborador */}
      {isConfigureBenefitsOpen && selectedEmpForBenefits && (
        <Modal
          isOpen={isConfigureBenefitsOpen}
          onClose={() => setIsConfigureBenefitsOpen(false)}
          title={`Configurar Benefícios — ${selectedEmpForBenefits.fullName}`}
        >
          <form onSubmit={handleSaveBenefits} className="space-y-4">
            <p className="text-xs text-slate-500 font-mono">
              {selectedEmpForBenefits.registrationNumber} • {selectedEmpForBenefits.jobTitle} ({selectedEmpForBenefits.department})
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {[
                { type: 'VT', title: 'Vale-Transporte (VT)', defaultProvider: 'Mobilidade Corporativa' },
                { type: 'VA', title: 'Vale-Alimentação (VA)', defaultProvider: 'Cartão Benefícios' },
                { type: 'VR', title: 'Vale-Refeição (VR)', defaultProvider: 'Cartão Benefícios' },
                { type: 'COMBUSTIVEL', title: 'Auxílio Combustível', defaultProvider: 'Auxílio Combustível' }
              ].map(item => {
                const cfg = benefitsConfig[item.type] || { enabled: false, providerName: '', monthlyValue: 0, employeeDiscount: 0, companyCost: 0 };
                return (
                  <div key={item.type} className={`rounded-xl border p-3.5 transition-colors ${cfg.enabled ? 'border-blue-300 bg-blue-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          onChange={e => {
                            const en = e.target.checked;
                            setBenefitsConfig(prev => ({
                              ...prev,
                              [item.type]: { ...prev[item.type], enabled: en }
                            }));
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      </label>
                      {cfg.enabled && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      )}
                    </div>

                    {cfg.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5 pt-2.5 border-t border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">Operadora / Fornecedor</label>
                          <input
                            type="text"
                            value={cfg.providerName}
                            onChange={e => {
                              const val = e.target.value;
                              setBenefitsConfig(prev => ({
                                ...prev,
                                [item.type]: { ...prev[item.type], providerName: val }
                              }));
                            }}
                            placeholder={item.defaultProvider}
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">Custo Empresa (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={cfg.companyCost || ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setBenefitsConfig(prev => ({
                                ...prev,
                                [item.type]: { ...prev[item.type], companyCost: val }
                              }));
                            }}
                            placeholder="0,00"
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs bg-white font-semibold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">Desconto Colaborador (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={cfg.employeeDiscount || ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setBenefitsConfig(prev => ({
                                ...prev,
                                [item.type]: { ...prev[item.type], employeeDiscount: val }
                              }));
                            }}
                            placeholder="0,00"
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsConfigureBenefitsOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
