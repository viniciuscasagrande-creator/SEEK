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
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { api } from '../../services/api';
import { FreelanceTaxasSubmodule } from './FreelanceTaxasSubmodule';
import { HRPayrollSection } from './HRPayrollSection';

export const HRModule: React.FC<{ initialTab?: 'dashboard' | 'employees' | 'payroll' | 'benefits' | 'ponto' | 'vacations' | 'freelancers' | 'organogram' | 'reports' }> = ({ initialTab = 'dashboard' }) => {
  const { currentUser } = useAuth();
  const { refreshApprovals } = useWorkflow();

  const normalizeTab = (tab?: string): 'dashboard' | 'employees' | 'payroll' | 'benefits' | 'ponto' | 'vacations' | 'freelancers' | 'organogram' => {
    if (tab === 'reports') return 'organogram';
    return (tab as any) || 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'payroll' | 'benefits' | 'ponto' | 'vacations' | 'freelancers' | 'organogram'>(() => normalizeTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
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

  // Estados dos Benefícios (VT, VA, VR, Combustível) — Fases 3, 4 & 5
  const [benefitSection, setBenefitSection] = useState<'COLABORADORES' | 'CONFERENCIA' | 'FECHAMENTO' | 'PEDIDOS' | 'OPERADORAS' | 'AFASTAMENTOS' | 'HISTORICO' | 'CUSTOS' | 'DEPARTAMENTOS' | 'COMPARATIVO'>('COLABORADORES');
  const [benefitConference, setBenefitConference] = useState<any>(null);
  const [benefitAnalytics, setBenefitAnalytics] = useState<any>(null);
  const [benefitHistoryEmployeeId, setBenefitHistoryEmployeeId] = useState('');
  const [benefitEmployees, setBenefitEmployees] = useState<any[]>([]);
  const [benefitOrders, setBenefitOrders] = useState<any[]>([]);
  const [benefitPeriod, setBenefitPeriod] = useState('2026-10');
  const [benefitDueDate, setBenefitDueDate] = useState('2026-10-25');
  const [benefitPreview, setBenefitPreview] = useState<any>(null);
  const [benefitFilter, setBenefitFilter] = useState<'TODOS'|'VT'|'VA'|'VR'|'COMBUSTIVEL'>('TODOS');
  const [benefitAbsences, setBenefitAbsences] = useState<any[]>([]);
  const [benefitProviders, setBenefitProviders] = useState<any[]>([]);
  const [benefitAdjustments, setBenefitAdjustments] = useState<any[]>([]);
  const [benefitPurchases, setBenefitPurchases] = useState<any[]>([]);

  // Modais de Benefícios
  const [isRegisterAbsenceOpen, setIsRegisterAbsenceOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({
    employeeId: '',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
    reason: 'Atestado Médico / Licença',
    notes: ''
  });

  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<{
    employeeId: string;
    employeeName: string;
    benefitType: 'VT' | 'VA' | 'VR' | 'COMBUSTIVEL';
    adjustmentType: 'CREDITO' | 'DESCONTO';
    amount: string;
    reason: string;
  }>({
    employeeId: '',
    employeeName: '',
    benefitType: 'VT',
    adjustmentType: 'CREDITO',
    amount: '',
    reason: ''
  });

  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [providerForm, setProviderForm] = useState<{
    name: string;
    document: string;
    benefitType: 'VT' | 'VA' | 'VR' | 'COMBUSTIVEL';
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    paymentMethod: string;
    billingDay: string;
  }>({
    name: '',
    document: '',
    benefitType: 'VA',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentMethod: 'BOLETO',
    billingDay: '20'
  });

  // Modal de Configuração de Benefícios por Colaborador
  const [isConfigureBenefitsOpen, setIsConfigureBenefitsOpen] = useState(false);
  const [selectedEmpForBenefits, setSelectedEmpForBenefits] = useState<any>(null);
  const [benefitsConfig, setBenefitsConfig] = useState<Record<string, {
    enabled: boolean;
    providerName: string;
    calculationMode: 'MENSAL' | 'DIAS_UTEIS';
    dailyValue: number;
    monthlyValue: number;
    employeeDiscount: number;
    companyCost: number;
    prorateAdmission: boolean;
    deductVacation: boolean;
    deductLeave: boolean;
  }>>({
    VT: { enabled: false, providerName: 'Mobilidade Corporativa', calculationMode: 'DIAS_UTEIS', dailyValue: 0, monthlyValue: 0, employeeDiscount: 0, companyCost: 0, prorateAdmission: true, deductVacation: true, deductLeave: true },
    VA: { enabled: false, providerName: 'Cartão Benefícios', calculationMode: 'MENSAL', dailyValue: 0, monthlyValue: 0, employeeDiscount: 0, companyCost: 0, prorateAdmission: true, deductVacation: true, deductLeave: true },
    VR: { enabled: false, providerName: 'Cartão Benefícios', calculationMode: 'DIAS_UTEIS', dailyValue: 0, monthlyValue: 0, employeeDiscount: 0, companyCost: 0, prorateAdmission: true, deductVacation: true, deductLeave: true },
    COMBUSTIVEL: { enabled: false, providerName: 'Auxílio Combustível', calculationMode: 'MENSAL', dailyValue: 0, monthlyValue: 0, employeeDiscount: 0, companyCost: 0, prorateAdmission: true, deductVacation: true, deductLeave: true }
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

      const serverBenefitAbsences = await api.getBenefitAbsences();
      if (serverBenefitAbsences) setBenefitAbsences(serverBenefitAbsences);

      const serverBenefitProviders = await api.getBenefitProviders();
      if (serverBenefitProviders) setBenefitProviders(serverBenefitProviders);

      const serverBenefitAdjustments = await api.getBenefitAdjustments(benefitPeriod);
      if (serverBenefitAdjustments) setBenefitAdjustments(serverBenefitAdjustments);

      const serverBenefitPurchases = await api.getBenefitPurchases();
      if (serverBenefitPurchases) setBenefitPurchases(serverBenefitPurchases);

      const conference = await api.getBenefitConference(benefitPeriod);
      if (conference) setBenefitConference(conference);

      const analytics = await api.getBenefitAnalytics(benefitPeriod);
      if (analytics) {
        setBenefitAnalytics(analytics);
        if (!benefitHistoryEmployeeId && analytics.employeeDirectory?.length) {
          setBenefitHistoryEmployeeId(analytics.employeeDirectory[0].id);
        }
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'benefits') return;
    api.getBenefitAnalytics(benefitPeriod).then((analytics: any) => {
      if (!analytics) return;
      setBenefitAnalytics(analytics);
      if (!benefitHistoryEmployeeId && analytics.employeeDirectory?.length) {
        setBenefitHistoryEmployeeId(analytics.employeeDirectory[0].id);
      }
    });
  }, [benefitPeriod, activeTab]);

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
      VT: { enabled: false, providerName: 'Mobilidade Corporativa', calculationMode: 'DIAS_UTEIS', dailyValue: 0, monthlyValue: 0, employeeDiscount: 0, companyCost: 0, prorateAdmission: true, deductVacation: true, deductLeave: true },
      VA: { enabled: false, providerName: 'Cartão Benefícios', calculationMode: 'MENSAL', dailyValue: 0, monthlyValue: 0, employeeDiscount: 0, companyCost: 0, prorateAdmission: true, deductVacation: true, deductLeave: true },
      VR: { enabled: false, providerName: 'Cartão Benefícios', calculationMode: 'DIAS_UTEIS', dailyValue: 0, monthlyValue: 0, employeeDiscount: 0, companyCost: 0, prorateAdmission: true, deductVacation: true, deductLeave: true },
      COMBUSTIVEL: { enabled: false, providerName: 'Auxílio Combustível', calculationMode: 'MENSAL', dailyValue: 0, monthlyValue: 0, employeeDiscount: 0, companyCost: 0, prorateAdmission: true, deductVacation: true, deductLeave: true }
    };
    (emp.benefits || []).forEach((b: any) => {
      if (initialConfig[b.type]) {
        initialConfig[b.type] = {
          enabled: Boolean(b.enabled),
          providerName: b.providerName || initialConfig[b.type].providerName,
          calculationMode: b.calculationMode || initialConfig[b.type].calculationMode,
          dailyValue: Number(b.dailyValue || b.unitValue || 0),
          monthlyValue: Number(b.monthlyValue || 0),
          employeeDiscount: Number(b.employeeDiscount || 0),
          companyCost: Number(b.companyCost || 0),
          prorateAdmission: b.prorateAdmission !== undefined ? Boolean(b.prorateAdmission) : true,
          deductVacation: b.deductVacation !== undefined ? Boolean(b.deductVacation) : true,
          deductLeave: b.deductLeave !== undefined ? Boolean(b.deductLeave) : true,
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
      const isDaily = cfg.calculationMode === 'DIAS_UTEIS';
      const dailyVal = Number(cfg.dailyValue || 0);
      let monthly = Number(cfg.companyCost || 0) + Number(cfg.employeeDiscount || 0);
      if (isDaily && dailyVal > 0 && monthly === 0) {
        monthly = dailyVal * 22;
      }
      return {
        type,
        enabled: Boolean(cfg.enabled && (Number(cfg.companyCost) > 0 || dailyVal > 0)),
        providerName: cfg.providerName || '',
        calculationMode: cfg.calculationMode || 'MENSAL',
        dailyValue: dailyVal,
        unitValue: dailyVal,
        quantity: isDaily ? 22 : 1,
        monthlyValue: monthly,
        employeeDiscount: Number(cfg.employeeDiscount || 0),
        companyCost: Number(cfg.companyCost || 0),
        prorateAdmission: Boolean(cfg.prorateAdmission),
        deductVacation: Boolean(cfg.deductVacation),
        deductLeave: Boolean(cfg.deductLeave)
      };
    });

    const res = await api.saveEmployeeBenefits(selectedEmpForBenefits.id, {
      benefits: payload,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });

    if (res?.success) {
      setNotification(`✅ Benefícios e regras de proporcionalidade de ${selectedEmpForBenefits.fullName} atualizados.`);
      setIsConfigureBenefitsOpen(false);
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao salvar benefícios do colaborador.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceForm.employeeId || !absenceForm.startDate || !absenceForm.endDate) return;
    const res = await api.createBenefitAbsence({
      employeeId: absenceForm.employeeId,
      startDate: absenceForm.startDate,
      endDate: absenceForm.endDate,
      reason: absenceForm.reason,
      notes: absenceForm.notes,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification('✅ Afastamento registrado com sucesso e considerado nos benefícios.');
      setIsRegisterAbsenceOpen(false);
      setAbsenceForm({
        employeeId: '',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        reason: 'Atestado Médico / Licença',
        notes: ''
      });
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao registrar afastamento.'}`);
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

  const handleOpenAdjustment = (emp: any, defaultType: string = 'VT') => {
    const activeBenefit = (emp.benefits || []).find((b: any) => b.enabled);
    const bType = (activeBenefit?.type || defaultType) as 'VT' | 'VA' | 'VR' | 'COMBUSTIVEL';
    setAdjustmentForm({
      employeeId: emp.id,
      employeeName: emp.fullName,
      benefitType: bType,
      adjustmentType: 'CREDITO',
      amount: '',
      reason: ''
    });
    setIsAdjustmentOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentForm.employeeId || !(Number(adjustmentForm.amount) > 0) || !adjustmentForm.reason) return;
    const res = await api.createBenefitAdjustment({
      period: benefitPeriod,
      employeeId: adjustmentForm.employeeId,
      benefitType: adjustmentForm.benefitType,
      adjustmentType: adjustmentForm.adjustmentType,
      amount: Number(adjustmentForm.amount),
      reason: adjustmentForm.reason,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification(`✅ Ajuste de ${adjustmentForm.adjustmentType.toLowerCase()} registrado para ${adjustmentForm.employeeName}.`);
      setIsAdjustmentOpen(false);
      setBenefitPreview(null);
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao registrar ajuste.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerForm.name || !providerForm.benefitType) return;
    const res = await api.createBenefitProvider({
      ...providerForm,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification(`✅ Operadora ${providerForm.name} cadastrada com sucesso.`);
      setIsProviderOpen(false);
      setProviderForm({
        name: '',
        document: '',
        benefitType: 'VA',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        paymentMethod: 'BOLETO',
        billingDay: '20'
      });
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao cadastrar operadora.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSendBenefitPurchase = async (batch: any) => {
    const res = await api.sendBenefitPurchaseToFinance(batch.id, {
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      const label = batch.benefit_type === 'COMBUSTIVEL' ? 'Auxílio Combustível' : batch.benefit_type;
      setNotification(`✅ Pedido ${label} · ${batch.provider_name} enviado ao Financeiro (Título ${res.financialRecord?.code || ''}).`);
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao enviar pedido ao Financeiro.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const refreshBenefitConference = async () => {
    const res = await api.getBenefitConference(benefitPeriod);
    if (res) setBenefitConference(res);
  };

  const confirmClearBenefits = async () => {
    const res = await api.confirmClearBenefitConference(benefitPeriod, {
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification(`✅ ${res.updated || 0} item(ns) sem divergência marcados como conferidos.`);
      refreshBenefitConference();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha na conferência.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const reviewBenefitItem = async (item: any) => {
    const res = await api.reviewBenefitConference({
      period: benefitPeriod,
      employeeId: item.employee_id,
      benefitType: item.benefit_type,
      status: 'CONFERIDO',
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification('✅ Item conferido com sucesso.');
      refreshBenefitConference();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha na conferência.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const approveBenefitOrder = async (order: any) => {
    const res = await api.approveBenefitOrder(order.id, {
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification(`✅ Fechamento ${order.period} aprovado e bloqueado para compra.`);
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha na aprovação do fechamento.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const downloadOperatorFile = async (batch: any) => {
    const res = await api.downloadBenefitOperatorFile(batch.id, currentUser?.fullName || 'RH');
    if (!res.success || !res.text) {
      setNotification(`⚠️ ${res.error || 'Falha ao gerar arquivo da operadora.'}`);
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    const blob = new Blob([res.text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName || 'beneficios_operadora.csv';
    a.click();
    URL.revokeObjectURL(url);
    setNotification('✅ Arquivo nominal da operadora gerado com sucesso.');
    loadData();
    setTimeout(() => setNotification(null), 5000);
  };

  const registerOperatorReturn = async (batch: any) => {
    const raw = window.prompt(`Retorno da operadora para ${batch.provider_name} (${batch.benefit_type}):\nInforme ID/Matrícula do colaborador e valor processado separados por vírgula, uma linha por colaborador.\nExemplo:\nemp-01,250.00\nemp-02,570.00`);
    if (!raw) return;
    const items = raw.split(/\n+/).map(line => {
      const [employeeId, value] = line.split(',');
      return {
        employeeId: employeeId?.trim(),
        processedAmount: Number(String(value || '0').replace(',', '.'))
      };
    }).filter(x => x.employeeId);

    const res = await api.registerBenefitOperatorReturn(batch.id, {
      items,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification(res.divergences ? `⚠️ Retorno processado com ${res.divergences} divergência(s). Verifique os valores.` : '✅ Retorno da operadora conferido sem divergências.');
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha ao processar retorno.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const confirmBenefitCredit = async (batch: any) => {
    const res = await api.confirmBenefitCredit(batch.id, {
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });
    if (res?.success) {
      setNotification('✅ Crédito / disponibilização aos colaboradores confirmado pelo RH.');
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Falha na confirmação de crédito.'}`);
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const currencyBRL = (value: any) =>
    Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const benefitLabel = (type: string) => (type === 'COMBUSTIVEL' ? 'Auxílio Combustível' : type);
  const refreshBenefitAnalytics = async () => {
    const r = await api.getBenefitAnalytics(benefitPeriod);
    if (r) setBenefitAnalytics(r);
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

      {/* Abas Superiores de RH & Departamento Pessoal (Navegação Linear Dominante) */}
      <div id="hr-tabs" className="flex border-b border-slate-200 space-x-3 text-xs font-bold overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Visão Geral do RH</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'employees'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Colaboradores</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-bold">
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ponto')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'ponto'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Timer className="h-4 w-4" />
          <span>Ponto & Jornada</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'payroll'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <WalletCards className="h-4 w-4 text-emerald-600" />
          <span>Folha de Pagamento</span>
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
            Financeiro
          </span>
        </button>

        <button
          onClick={() => setActiveTab('benefits')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'benefits'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <WalletCards className="h-4 w-4 text-cyan-700" />
          <span>Benefícios</span>
          <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-800">
            VT • VA • VR • Comb.
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vacations')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'vacations'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Palmtree className="h-4 w-4 text-amber-600" />
          <span>Férias & Afastamentos</span>
          <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
            Alçadas
          </span>
        </button>

        <button
          onClick={() => setActiveTab('freelancers')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'freelancers'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Freelance / Taxas</span>
          <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800">
            Central
          </span>
        </button>

        <button
          onClick={() => setActiveTab('organogram')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'organogram'
              ? 'border-blue-700 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GitFork className="h-4 w-4" />
          <span>Relatórios de RH</span>
        </button>
      </div>

      {/* Conteúdo das Abas do Módulo */}
      <div id="hr-content" className="space-y-5">
        {/* ABA: VISÃO GERAL DO RH (CENTRAL DE TRABALHO) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 1. Linha Superior: 6 Cards Pequenos e Alinhados */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Colaboradores</span>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-2 text-xl font-black text-slate-900">{employees.filter(e => e.active !== false).length}</div>
                <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Quadro ativo CLT</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ponto Pendente</span>
                  <Timer className="h-4 w-4 text-amber-600" />
                </div>
                <div className="mt-2 text-xl font-black text-amber-700">3</div>
                <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Ajustes de espelho</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Férias Próximas</span>
                  <Palmtree className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-xl font-black text-slate-900">{vacationRequests.filter(v => v.status === 'PENDENTE' || v.status === 'EM_APROVACAO').length || 2}</div>
                <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Programadas 60d</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Afastamentos</span>
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                </div>
                <div className="mt-2 text-xl font-black text-slate-900">1</div>
                <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Licença médica ativa</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Benefícios</span>
                  <WalletCards className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="mt-2 text-xl font-black text-cyan-700">1 lote</div>
                <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Conferência Outubro</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Folha Atual</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-xl font-black text-emerald-700">10/2026</div>
                <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Aberta p/ cálculo</div>
              </div>
            </div>

            {/* 2. Centro: Duas Áreas Fixas (Pendências que Exigem Ação & Movimentações Recentes) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Coluna 1: Pendências que exigem ação */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Pendências que exigem ação</h3>
                    <p className="text-[11px] text-slate-500">Tarefas prioritárias aguardando decisão ou execução do RH</p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                    5 itens
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-800">Urgente</span>
                        <span className="text-xs font-bold text-slate-900">Processamento da Folha 10/2026</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Simular proventos, conferir encargos INSS/FGTS e gerar títulos no Contas a Pagar.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('payroll')}
                      className="shrink-0 rounded-lg bg-blue-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer"
                    >
                      Calcular Folha →
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-800">Alçadas</span>
                        <span className="text-xs font-bold text-slate-900">Aprovação de Férias & Ausências</span>
                      </div>
                      <p className="text-[11px] text-slate-600">2 solicitações de descanso programadas aguardando homologação formal do gestor.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('vacations')}
                      className="shrink-0 rounded-lg bg-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      Aprovar Férias →
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-800">Ponto</span>
                        <span className="text-xs font-bold text-slate-900">Ajustes de Espelho & Banco de Horas</span>
                      </div>
                      <p className="text-[11px] text-slate-600">3 ocorrências de batida ímpar e horas extras aguardando justificativa de colaborador.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('ponto')}
                      className="shrink-0 rounded-lg bg-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      Revisar Ponto →
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-cyan-800">Benefícios</span>
                        <span className="text-xs font-bold text-slate-900">Lote Mensal VT • VA • VR • Combustível</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Conferir proporcionalidade de dias úteis, faturas das operadoras e compras.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('benefits')}
                      className="shrink-0 rounded-lg bg-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      Abrir Benefícios →
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-800">Taxas</span>
                        <span className="text-xs font-bold text-slate-900">Fechamento de Diárias de Freelancers</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Serviços temporários com presenças confirmadas aguardando envio ao Financeiro.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('freelancers')}
                      className="shrink-0 rounded-lg bg-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      Central de Taxas →
                    </button>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Movimentações recentes */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Movimentações recentes</h3>
                    <p className="text-[11px] text-slate-500">Histórico cronológico auditável de eventos operacionais</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Últimas 24h</span>
                </div>

                <div className="mt-4 space-y-3.5">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Snapshot de Benefícios Consolidado</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">Histórico nominal gravado com sucesso para a competência anterior sem alterar cadastro atual.</p>
                      <span className="text-[10px] text-slate-400">Hoje às 14:16 • Módulo Benefícios</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Admissão de Colaborador Concluída</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">Lucas Ferreira homologado como Engenheiro de Software Pleno na Tecnologia.</p>
                      <span className="text-[10px] text-slate-400">Hoje às 11:20 • Departamento Pessoal</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <WalletCards className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Integração Folha → Contas a Pagar</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">Títulos de provisão de folha e GPS/GRF emitidos no Financeiro com origin_type='FOLHA'.</p>
                      <span className="text-[10px] text-slate-400">Hoje às 09:45 • Core Transacional</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Palmtree className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Programação de Férias Homologada</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">Janela de descanso de 15 dias confirmada para colaborador de Suporte Técnico.</p>
                      <span className="text-[10px] text-slate-400">Ontem às 17:30 • Alçada Gerencial</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Convocação de Freelancers Corporativos</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">2 diárias temporárias autorizadas para suporte operacional com retenções calculadas.</p>
                      <span className="text-[10px] text-slate-400">Ontem às 15:10 • Central de Taxas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Parte Inferior: Atalhos Operacionais */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-3">
                <h3 className="text-sm font-black text-slate-900">Atalhos Operacionais de RH</h3>
                <p className="text-[11px] text-slate-500">Acesso direto às funções dominantes do módulo</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => setActiveTab('employees')}
                  className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 text-left transition-all cursor-pointer group"
                >
                  <Users className="h-5 w-5 text-blue-700 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Colaboradores</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Fichas e cadastros</span>
                </button>

                <button
                  onClick={() => setActiveTab('ponto')}
                  className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 text-left transition-all cursor-pointer group"
                >
                  <Timer className="h-5 w-5 text-blue-700 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Ponto & Jornada</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Espelho e horas</span>
                </button>

                <button
                  onClick={() => setActiveTab('payroll')}
                  className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 text-left transition-all cursor-pointer group"
                >
                  <WalletCards className="h-5 w-5 text-emerald-700 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Folha de Pagamento</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Cálculo e holerites</span>
                </button>

                <button
                  onClick={() => setActiveTab('benefits')}
                  className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 text-left transition-all cursor-pointer group"
                >
                  <WalletCards className="h-5 w-5 text-cyan-700 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Benefícios</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">VT, VA, VR, Comb.</span>
                </button>

                <button
                  onClick={() => setActiveTab('vacations')}
                  className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 text-left transition-all cursor-pointer group"
                >
                  <Palmtree className="h-5 w-5 text-amber-700 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Férias & Afastamentos</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Escalas e alçadas</span>
                </button>

                <button
                  onClick={() => setActiveTab('freelancers')}
                  className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 text-left transition-all cursor-pointer group"
                >
                  <Zap className="h-5 w-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Freelance / Taxas</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Central de diárias</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
          {/* Header de Navegação Interna da Área de Benefícios */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Gestão de Benefícios</h3>
                <p className="text-xs text-slate-500">
                  VT, VA, VR e Auxílio Combustível: vínculo nominal, proporcionalidade, ajustes, operadoras, fechamento e compra por competência.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  ['COLABORADORES', 'Colaboradores'],
                  ['CONFERENCIA', 'Conferência'],
                  ['FECHAMENTO', 'Fechamento'],
                  ['PEDIDOS', 'Pedidos de compra'],
                  ['OPERADORAS', 'Operadoras'],
                  ['AFASTAMENTOS', 'Afastamentos'],
                  ['HISTORICO', 'Histórico'],
                  ['CUSTOS', 'Custos'],
                  ['DEPARTAMENTOS', 'Departamentos'],
                  ['COMPARATIVO', 'Comparativo']
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setBenefitSection(key)}
                    className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-colors cursor-pointer ${
                      benefitSection === key
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SUB-ABA 1: COLABORADORES */}
          {benefitSection === 'COLABORADORES' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Relação nominal de colaboradores</h3>
                  <p className="text-xs text-slate-500">
                    Consulte e edite os benefícios de cada colaborador. Use Ajuste para crédito/desconto excepcional da competência.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                      <th className="py-3 px-3 text-center">Ações</th>
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
                                <td key={idx} className="py-3 px-2 text-right">
                                  <div className="font-semibold text-slate-800">
                                    {b && Number(b.companyCost) > 0 ? (
                                      Number(b.companyCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    ) : (
                                      <span className="text-slate-300 font-normal">—</span>
                                    )}
                                  </div>
                                  {b?.providerName && (
                                    <div className="text-[9px] text-slate-400 font-medium truncate max-w-[120px]" title={b.providerName}>
                                      {b.providerName}
                                    </div>
                                  )}
                                </td>
                              ))}
                              <td className="py-3 px-2 text-right font-black text-slate-900">
                                {totalEmpresa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex justify-center items-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenConfigureBenefits(emp)}
                                    className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                  >
                                    Configurar
                                  </button>
                                  <button
                                    onClick={() => handleOpenAdjustment(emp)}
                                    className="rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                  >
                                    Ajuste
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA: CONFERENCIA */}
          {benefitSection === 'CONFERENCIA' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Conferência da competência</h3>
                    <p className="text-xs text-slate-500">
                      Pendências críticas bloqueiam o fechamento. Itens sem divergência precisam ser conferidos pelo RH.
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Competência</label>
                      <input
                        type="month"
                        value={benefitPeriod}
                        onChange={e => {
                          setBenefitPeriod(e.target.value);
                          setBenefitConference(null);
                        }}
                        className="mt-1 block rounded-lg border border-slate-200 p-2 text-xs font-medium text-slate-800"
                      />
                    </div>
                    <button
                      onClick={refreshBenefitConference}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Atualizar conferência
                    </button>
                    <button
                      onClick={confirmClearBenefits}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                    >
                      Conferir itens sem divergência
                    </button>
                  </div>
                </div>

                {benefitConference && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-5">
                    {[
                      ['Total', benefitConference.summary?.total],
                      ['Conferidos', benefitConference.summary?.conferidos],
                      ['Pendentes', benefitConference.summary?.pendentes],
                      ['Críticos', benefitConference.summary?.criticos],
                      ['Atenções', benefitConference.summary?.atencoes]
                    ].map(([label, value]: any) => (
                      <div
                        key={label}
                        className={`rounded-lg p-3 ${
                          label === 'Críticos' && Number(value) > 0
                            ? 'bg-rose-50 border border-rose-200'
                            : label === 'Conferidos'
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
                        <div className="mt-1 text-xl font-black text-slate-900">{value || 0}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Colaborador</th>
                      <th className="py-3 px-2">Benefício</th>
                      <th className="py-3 px-2">Operadora</th>
                      <th className="py-3 px-2 text-center">Dias</th>
                      <th className="py-3 px-2 text-right">Valor final</th>
                      <th className="py-3 px-2">Pendência</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(benefitConference?.items || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          Nenhum dado de conferência carregado. Selecione a competência e clique em &quot;Atualizar conferência&quot;.
                        </td>
                      </tr>
                    ) : (
                      (benefitConference?.items || []).map((i: any, idx: number) => {
                        const c = i.conference || {};
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{i.full_name}</div>
                              <div className="text-[10px] text-slate-400">{i.department}</div>
                            </td>
                            <td className="py-3 px-2 text-slate-700">
                              {i.benefit_type === 'COMBUSTIVEL' ? 'Combustível' : i.benefit_type}
                            </td>
                            <td className="py-3 px-2">
                              {i.provider_name ? (
                                <span className="font-medium text-slate-900">{i.provider_name}</span>
                              ) : (
                                <span className="font-bold text-rose-600">Não definida</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-slate-700">
                              {i.eligible_days}/{i.business_days}
                            </td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">
                              {Number(i.calculated_company_cost || 0).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </td>
                            <td className="py-3 px-2">
                              {c.issue_level === 'CRITICO' ? (
                                <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                                  {c.issue_message}
                                </span>
                              ) : c.issue_level === 'ATENCAO' ? (
                                <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                  {c.issue_message}
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                                  Sem divergência
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <StatusBadge status={c.status || 'PENDENTE'} />
                            </td>
                            <td className="py-3 px-3 text-center">
                              {c.issue_level !== 'CRITICO' && c.status !== 'CONFERIDO' ? (
                                <button
                                  onClick={() => reviewBenefitItem(i)}
                                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                  Conferir
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA 2: FECHAMENTO */}
          {benefitSection === 'FECHAMENTO' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">Fechamento do Lote Mensal</h4>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Competência</label>
                    <input
                      type="month"
                      value={benefitPeriod}
                      onChange={e => {
                        setBenefitPeriod(e.target.value);
                        setBenefitPreview(null);
                        api.getBenefitAdjustments(e.target.value).then(res => setBenefitAdjustments(res || []));
                      }}
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
                    Recalcular prévia
                  </button>
                  <button
                    onClick={handleCloseBenefits}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer shadow-xs"
                  >
                    Fechar competência
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

                    {/* Memória de Cálculo da Prévia com Ajustes */}
                    <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden bg-white">
                      <div className="border-b bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Memória de cálculo detalhada · {benefitPreview.businessDays || 22} dias úteis · Ajustes manuais destacados
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Proporcionalidade & Ajustes aplicados
                        </span>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="p-3">Colaborador</th>
                              <th className="py-3 px-2">Benefício</th>
                              <th className="py-3 px-2 text-center">Elegíveis</th>
                              <th className="py-3 px-2 text-center">Admissão</th>
                              <th className="py-3 px-2 text-center">Férias</th>
                              <th className="py-3 px-2 text-center">Afast.</th>
                              <th className="py-3 px-2 text-right">Ajuste</th>
                              <th className="py-3 px-3 text-right">Final Empresa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {benefitPreview.items?.map((item: any, idx: number) => {
                              const adj = Number(item.adjustment_amount || 0);
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-3 font-semibold text-slate-900">{item.full_name}</td>
                                  <td className="py-3 px-2 font-medium text-slate-700">{item.benefit_type === 'COMBUSTIVEL' ? 'Combustível' : item.benefit_type}</td>
                                  <td className="py-3 px-2 text-center font-bold text-slate-800">
                                    {item.eligible_days}/{item.business_days}
                                  </td>
                                  <td className="py-3 px-2 text-center font-semibold text-slate-600">
                                    {item.admission_days_deducted > 0 ? `-${item.admission_days_deducted}` : '0'}
                                  </td>
                                  <td className="py-3 px-2 text-center font-semibold text-amber-700">
                                    {item.vacation_days_deducted > 0 ? `-${item.vacation_days_deducted}` : '0'}
                                  </td>
                                  <td className="py-3 px-2 text-center font-semibold text-rose-700">
                                    {item.leave_days_deducted > 0 ? `-${item.leave_days_deducted}` : '0'}
                                  </td>
                                  <td className={`py-3 px-2 text-right font-bold ${adj > 0 ? 'text-emerald-600' : adj < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                    {adj === 0 ? '—' : `${adj > 0 ? '+' : ''}${adj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                  </td>
                                  <td className="py-3 px-3 text-right font-black text-slate-900">
                                    {Number(item.calculated_company_cost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ajustes da Competência */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Ajustes da competência {benefitPeriod}</h3>
                    <p className="text-xs text-slate-500">Créditos e descontos excepcionais entram na memória de cálculo antes do fechamento.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                    {benefitAdjustments.filter((a: any) => a.period === benefitPeriod).length} ajuste(s) registrado(s)
                  </span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Colaborador</th>
                        <th className="py-3 px-2">Benefício</th>
                        <th className="py-3 px-2 text-center">Tipo</th>
                        <th className="py-3 px-2 text-right">Valor</th>
                        <th className="py-3 px-2">Motivo</th>
                        <th className="py-3 px-3 text-center">Registrado por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {benefitAdjustments.filter((a: any) => a.period === benefitPeriod).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            Nenhum ajuste excepcional registrado para a competência {benefitPeriod}.
                          </td>
                        </tr>
                      ) : (
                        benefitAdjustments.filter((a: any) => a.period === benefitPeriod).map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{a.employee_name || a.employee_id}</td>
                            <td className="py-3 px-2 text-slate-700">{a.benefit_type === 'COMBUSTIVEL' ? 'Combustível' : a.benefit_type}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.adjustment_type === 'CREDITO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {a.adjustment_type}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">
                              {Number(a.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3 px-2 text-slate-600">{a.reason}</td>
                            <td className="py-3 px-3 text-center text-[10px] text-slate-400">{a.created_by || 'RH'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-ABA 3: PEDIDOS DE COMPRA */}
          {benefitSection === 'PEDIDOS' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900">Pedidos de compra por operadora</h3>
                  <p className="text-xs text-slate-500">
                    Após o fechamento, o SEEK separa automaticamente a compra por benefício e fornecedor. Cada pedido pode seguir individualmente ao Financeiro.
                  </p>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Competência</th>
                        <th className="py-3 px-2">Benefício</th>
                        <th className="py-3 px-2">Operadora / Fornecedor</th>
                        <th className="py-3 px-2 text-center">Colaboradores</th>
                        <th className="py-3 px-2 text-right">Valor Total</th>
                        <th className="py-3 px-2 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Ações / Operação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {benefitPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400">
                            Nenhum pedido de compra gerado. Feche uma competência para gerar os pedidos agrupados por operadora.
                          </td>
                        </tr>
                      ) : (
                        benefitPurchases.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{p.period}</td>
                            <td className="py-3 px-2 font-medium text-slate-700">
                              {p.benefit_type === 'COMBUSTIVEL' ? 'Auxílio Combustível' : p.benefit_type}
                            </td>
                            <td className="py-3 px-2 font-semibold text-slate-900">{p.provider_name}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-700">{p.employee_count}</td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">
                              {Number(p.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                <button
                                  onClick={() => downloadOperatorFile(p)}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                                  title="Baixar arquivo nominal para envio à operadora"
                                >
                                  Arquivo operadora
                                </button>
                                {p.financial_record_id ? (
                                  <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {p.financial_record_id}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSendBenefitPurchase(p)}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                                  >
                                    Financeiro
                                  </button>
                                )}
                                <button
                                  onClick={() => registerOperatorReturn(p)}
                                  className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                                  title="Importar/registrar retorno de processamento da operadora"
                                >
                                  Retorno
                                </button>
                                <button
                                  onClick={() => confirmBenefitCredit(p)}
                                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Confirmar disponibilização do crédito aos colaboradores"
                                >
                                  Confirmar crédito
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela de Fechamentos Mensais */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
                <div className="p-4 border-b border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Histórico de Fechamentos de Benefícios</h4>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Competência</th>
                      <th className="py-3 px-2 text-center">Colaboradores</th>
                      <th className="py-3 px-2 text-right">VT</th>
                      <th className="py-3 px-2 text-right">VA</th>
                      <th className="py-3 px-2 text-right">VR</th>
                      <th className="py-3 px-2 text-right">Combustível</th>
                      <th className="py-3 px-2 text-right">Total Empresa</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {benefitOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400">
                          Nenhum fechamento realizado.
                        </td>
                      </tr>
                    ) : (
                      benefitOrders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{o.period}</td>
                          <td className="py-3 px-2 text-center text-slate-700">{o.employee_count}</td>
                          <td className="py-3 px-2 text-right text-slate-700">{Number(o.vt_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="py-3 px-2 text-right text-slate-700">{Number(o.va_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="py-3 px-2 text-right text-slate-700">{Number(o.vr_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="py-3 px-2 text-right text-slate-700">{Number(o.fuel_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="py-3 px-2 text-right font-black text-slate-900">{Number(o.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="py-3 px-2 text-center"><StatusBadge status={o.status} /></td>
                          <td className="py-3 px-3 text-center">
                            {o.status === 'AGUARDANDO_APROVACAO' ? (
                              <button
                                onClick={() => approveBenefitOrder(o)}
                                className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                              >
                                Aprovar fechamento
                              </button>
                            ) : o.approved_at ? (
                              <div className="text-[10px] text-slate-500">
                                <span className="font-bold text-slate-700">{o.approved_by || 'RH'}</span>
                                <div>{String(o.approved_at).slice(0, 16).replace('T', ' ')}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
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

          {/* SUB-ABA 4: OPERADORAS */}
          {benefitSection === 'OPERADORAS' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Operadoras e Fornecedores</h3>
                  <p className="text-xs text-slate-500">Cadastro usado para organizar as compras mensais de VT, VA, VR e Auxílio Combustível.</p>
                </div>
                <button
                  onClick={() => setIsProviderOpen(true)}
                  className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                >
                  + Nova Operadora
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Operadora</th>
                      <th className="py-3 px-2">Benefício</th>
                      <th className="py-3 px-2">Documento / CNPJ</th>
                      <th className="py-3 px-2">Pagamento</th>
                      <th className="py-3 px-2 text-center">Dia Venc.</th>
                      <th className="py-3 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {benefitProviders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          Nenhuma operadora cadastrada.
                        </td>
                      </tr>
                    ) : (
                      benefitProviders.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{p.name}</td>
                          <td className="py-3 px-2 font-medium text-slate-700">
                            {p.benefit_type === 'COMBUSTIVEL' ? 'Auxílio Combustível' : p.benefit_type}
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-600">{p.document || '—'}</td>
                          <td className="py-3 px-2 text-slate-700">{p.payment_method || '—'}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-800">{p.billing_day || '—'}</td>
                          <td className="py-3 px-2 text-center">
                            {Number(p.active) !== 0 ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                                Ativa
                              </span>
                            ) : (
                              <span className="font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                                Inativa
                              </span>
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

          {/* SUB-ABA 5: AFASTAMENTOS */}
          {benefitSection === 'AFASTAMENTOS' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Afastamentos considerados nos benefícios</h3>
                  <p className="text-xs text-slate-500">Períodos aqui registrados reduzem dias elegíveis somente nos benefícios configurados para descontar afastamento.</p>
                </div>
                <button
                  onClick={() => {
                    setAbsenceForm({
                      employeeId: benefitEmployees[0]?.id || '',
                      startDate: `${benefitPeriod}-01`,
                      endDate: `${benefitPeriod}-05`,
                      reason: 'Atestado Médico / Licença',
                      notes: ''
                    });
                    setIsRegisterAbsenceOpen(true);
                  }}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  + Registrar afastamento
                </button>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Colaborador</th>
                      <th className="py-3 px-2">Data Início</th>
                      <th className="py-3 px-2">Data Fim</th>
                      <th className="py-3 px-2">Motivo</th>
                      <th className="py-3 px-2">Observações</th>
                      <th className="py-3 px-3">Registrado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {benefitAbsences.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400">
                          Nenhum afastamento registrado.
                        </td>
                      </tr>
                    ) : (
                      benefitAbsences.map((a: any) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{a.employee_name || a.employeeId}</td>
                          <td className="py-3 px-2 font-mono text-slate-700">{a.start_date}</td>
                          <td className="py-3 px-2 font-mono text-slate-700">{a.end_date}</td>
                          <td className="py-3 px-2 font-medium text-slate-800">{a.reason}</td>
                          <td className="py-3 px-2 text-slate-500">{a.notes || '—'}</td>
                          <td className="py-3 px-3 text-slate-500 text-[11px]">{a.created_by || 'Sistema'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA 6: HISTÓRICO MENSAL POR COLABORADOR */}
          {benefitSection === 'HISTORICO' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Histórico mensal por colaborador</h3>
                    <p className="text-xs text-slate-500">
                      Consulte a fotografia de cada competência fechada, sem alterar o histórico anterior.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Colaborador</label>
                    <select
                      value={benefitHistoryEmployeeId}
                      onChange={e => setBenefitHistoryEmployeeId(e.target.value)}
                      className="min-w-72 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800"
                    >
                      <option value="">Todos os colaboradores</option>
                      {benefitAnalytics?.employeeDirectory?.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.name} · {e.department}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Competência</th>
                      <th className="py-3 px-2">Colaborador</th>
                      <th className="py-3 px-2">Departamento</th>
                      <th className="py-3 px-2">Benefício</th>
                      <th className="py-3 px-2">Operadora</th>
                      <th className="py-3 px-2 text-center">Dias (Eleg./Úteis)</th>
                      <th className="py-3 px-2 text-right">Desconto Colab.</th>
                      <th className="py-3 px-2 text-right">Custo Empresa</th>
                      <th className="py-3 px-3 text-center">Situação Crédito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(benefitAnalytics?.historyItems || [])
                      .filter((i: any) => !benefitHistoryEmployeeId || i.employee_id === benefitHistoryEmployeeId)
                      .length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400">
                          Nenhum histórico disponível para a seleção.
                        </td>
                      </tr>
                    ) : (
                      (benefitAnalytics?.historyItems || [])
                        .filter((i: any) => !benefitHistoryEmployeeId || i.employee_id === benefitHistoryEmployeeId)
                        .map((i: any, idx: number) => (
                          <tr key={`${i.period}-${i.employee_id}-${i.benefit_type}-${idx}`} className="hover:bg-slate-50">
                            <td className="p-3 font-black text-slate-900">{i.period}</td>
                            <td className="py-3 px-2 font-semibold text-slate-900">{i.employee_name}</td>
                            <td className="py-3 px-2 text-slate-600">{i.department || '—'}</td>
                            <td className="py-3 px-2 font-medium text-slate-800">{benefitLabel(i.benefit_type)}</td>
                            <td className="py-3 px-2 text-slate-700">{i.provider_name || '—'}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-700">
                              {i.eligible_days || 0}/{i.business_days || 0}
                            </td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(i.employee_discount)}</td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">{currencyBRL(i.company_cost)}</td>
                            <td className="py-3 px-3 text-center">
                              <StatusBadge status={i.credit_status || i.order_status || 'PENDENTE'} />
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA 7: RELATÓRIO DE CUSTOS */}
          {benefitSection === 'CUSTOS' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {['VT', 'VA', 'VR', 'COMBUSTIVEL'].map(t => {
                  const r = (benefitAnalytics?.benefitTotals || []).find((x: any) => x.benefit_type === t);
                  return (
                    <div key={t} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="text-[10px] font-black uppercase text-slate-500">{benefitLabel(t)}</div>
                      <div className="mt-1 text-xl font-black text-slate-900">{currencyBRL(r?.company_cost)}</div>
                      <div className="mt-1 text-[10px] text-slate-500">{r?.employee_count || 0} colaborador(es)</div>
                    </div>
                  );
                })}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-xs">
                  <div className="text-[10px] font-black uppercase text-blue-700">Total {benefitPeriod}</div>
                  <div className="mt-1 text-xl font-black text-blue-900">
                    {currencyBRL(benefitAnalytics?.currentOrder?.total_amount)}
                  </div>
                  <div className="mt-1 text-[10px] text-blue-700">Custo empresa da competência</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Evolução mensal de custos</h3>
                    <p className="text-xs text-slate-500">Últimas competências fechadas, com custo por tipo de benefício.</p>
                  </div>
                  <button
                    onClick={refreshBenefitAnalytics}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Atualizar
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Competência</th>
                        <th className="py-3 px-2 text-right">VT</th>
                        <th className="py-3 px-2 text-right">VA</th>
                        <th className="py-3 px-2 text-right">VR</th>
                        <th className="py-3 px-2 text-right">Combustível</th>
                        <th className="py-3 px-2 text-right">Total Empresa</th>
                        <th className="py-3 px-2 text-right">Desconto Colaboradores</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(benefitAnalytics?.monthlyTrend || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400">
                            Nenhum histórico de competências encontrado.
                          </td>
                        </tr>
                      ) : (
                        (benefitAnalytics?.monthlyTrend || []).map((m: any) => (
                          <tr key={m.period} className="hover:bg-slate-50">
                            <td className="p-3 font-black text-slate-900">{m.period}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(m.vt_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(m.va_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(m.vr_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(m.fuel_total)}</td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">{currencyBRL(m.total_amount)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(m.employee_discount)}</td>
                            <td className="py-3 px-3 text-center">
                              <StatusBadge status={m.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-ABA 8: VISÃO POR DEPARTAMENTO */}
          {benefitSection === 'DEPARTAMENTOS' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Custos por departamento · {benefitPeriod}</h3>
                    <p className="text-xs text-slate-500">
                      Distribuição dos benefícios por área, usando o departamento registrado no fechamento da competência.
                    </p>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Departamento</th>
                        <th className="py-3 px-2 text-center">Colaboradores</th>
                        <th className="py-3 px-2 text-right">VT</th>
                        <th className="py-3 px-2 text-right">VA</th>
                        <th className="py-3 px-2 text-right">VR</th>
                        <th className="py-3 px-2 text-right">Combustível</th>
                        <th className="py-3 px-2 text-right">Total</th>
                        <th className="py-3 px-3 text-right">% do Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(benefitAnalytics?.departments || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400">
                            Nenhum departamento com fechamento registrado para a competência {benefitPeriod}.
                          </td>
                        </tr>
                      ) : (
                        (benefitAnalytics?.departments || []).map((d: any) => (
                          <tr key={d.department} className="hover:bg-slate-50">
                            <td className="p-3 font-black text-slate-900">{d.department}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-700">{d.employee_count}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(d.vt_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(d.va_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(d.vr_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(d.fuel_total)}</td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">{currencyBRL(d.total_amount)}</td>
                            <td className="py-3 px-3 text-right font-bold text-blue-700">
                              {Number(benefitAnalytics?.currentOrder?.total_amount || 0) > 0
                                ? `${(
                                    (Number(d.total_amount || 0) /
                                      Number(benefitAnalytics.currentOrder.total_amount)) *
                                    100
                                  ).toFixed(1)}%`
                                : '0,0%'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-ABA 9: COMPARAÇÃO ENTRE COMPETÊNCIAS */}
          {benefitSection === 'COMPARATIVO' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Comparação entre competências</h3>
                    <p className="text-xs text-slate-500">
                      Compara {benefitAnalytics?.comparison?.current?.period || benefitPeriod} com{' '}
                      {benefitAnalytics?.comparison?.previous?.period ||
                        benefitAnalytics?.previousPeriod ||
                        'competência anterior'}.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">
                    Variação positiva = aumento de custo
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {['VT', 'VA', 'VR', 'COMBUSTIVEL', 'total'].map(k => {
                    const label = k === 'total' ? 'Total Geral' : benefitLabel(k);
                    const cur = benefitAnalytics?.comparison?.current?.[k] || 0;
                    const prev = benefitAnalytics?.comparison?.previous?.[k] || 0;
                    const delta = benefitAnalytics?.comparison?.deltas?.[k];
                    return (
                      <div key={k} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                        <div className="text-[10px] font-black uppercase text-slate-500">{label}</div>
                        <div className="mt-2 text-lg font-black text-slate-900">{currencyBRL(cur)}</div>
                        <div className="text-[10px] text-slate-500">Anterior: {currencyBRL(prev)}</div>
                        <div
                          className={`mt-2 text-xs font-black ${
                            Number(delta?.amount || 0) > 0
                              ? 'text-rose-600'
                              : Number(delta?.amount || 0) < 0
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {Number(delta?.amount || 0) >= 0 ? '+' : ''}
                          {currencyBRL(delta?.amount)} ·{' '}
                          {delta?.percent === null
                            ? 'sem base'
                            : `${Number(delta?.percent || 0) >= 0 ? '+' : ''}${Number(
                                delta?.percent || 0
                              ).toFixed(2)}%`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
                <div className="p-4 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Detalhamento Nominal por Competência
                  </h4>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Colaborador</th>
                      <th className="py-3 px-2">Departamento</th>
                      <th className="py-3 px-2 text-center">Competência</th>
                      <th className="py-3 px-2 text-right">VT</th>
                      <th className="py-3 px-2 text-right">VA</th>
                      <th className="py-3 px-2 text-right">VR</th>
                      <th className="py-3 px-2 text-right">Combustível</th>
                      <th className="py-3 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(benefitAnalytics?.employeeMonthly || []).filter((r: any) =>
                      [
                        benefitAnalytics?.comparison?.current?.period,
                        benefitAnalytics?.comparison?.previous?.period
                      ].includes(r.period)
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          Nenhum dado comparativo disponível para os períodos selecionados.
                        </td>
                      </tr>
                    ) : (
                      (benefitAnalytics?.employeeMonthly || [])
                        .filter((r: any) =>
                          [
                            benefitAnalytics?.comparison?.current?.period,
                            benefitAnalytics?.comparison?.previous?.period
                          ].includes(r.period)
                        )
                        .map((r: any) => (
                          <tr key={`${r.period}-${r.employee_id}`} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{r.employee_name}</td>
                            <td className="py-3 px-2 text-slate-600">{r.department}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">{r.period}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(r.vt_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(r.va_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(r.vr_total)}</td>
                            <td className="py-3 px-2 text-right text-slate-700">{currencyBRL(r.fuel_total)}</td>
                            <td className="py-3 px-3 text-right font-black text-slate-900">
                              {currencyBRL(r.total_amount)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

      {/* ABA: RELATÓRIOS DE RH & ESTRUTURA ORGANIZACIONAL */}
      {activeTab === 'organogram' && (
        <div className="space-y-5">
          {/* Indicadores Consolidados de Gente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Headcount Total Ativo</span>
                <Users className="h-4 w-4 text-teal-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">{employees.length} colaboradores</div>
              <div className="mt-1 text-[11px] text-slate-500">Matriz Curitiba e Filiais SP/RJ</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Turnover Anual</span>
                <Award className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-700">3.2%</div>
              <div className="mt-1 text-[11px] text-emerald-600 font-bold">-0.8 p.p. · Alta retenção</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Assiduidade de Ponto</span>
                <Timer className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">98.7%</div>
              <div className="mt-1 text-[11px] text-blue-600 font-bold">+0.5 p.p. · Cumprimento diário</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Saldo de Férias a Vencer</span>
                <Palmtree className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-700">25 dias</div>
              <div className="mt-1 text-[11px] text-slate-500">Janela de descanso programada</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Estrutura Organizacional & Hierarquia Corporativa</h3>
              <p className="text-xs text-slate-500">Mapeamento dinâmico de subordinação hierárquica e alçadas de decisão corporativa.</p>
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
                const cfg = benefitsConfig[item.type] || {
                  enabled: false,
                  providerName: '',
                  calculationMode: (item.type === 'VT' || item.type === 'VR') ? 'DIAS_UTEIS' : 'MENSAL',
                  dailyValue: 0,
                  monthlyValue: 0,
                  employeeDiscount: 0,
                  companyCost: 0,
                  prorateAdmission: true,
                  deductVacation: true,
                  deductLeave: true
                };
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
                      <div className="space-y-3 mt-2.5 pt-2.5 border-t border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase">Operadora / Fornecedor</label>
                            <input
                              type="text"
                              list={`providers-${item.type}`}
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
                            <datalist id={`providers-${item.type}`}>
                              {benefitProviders
                                .filter((p: any) => p.benefit_type === item.type)
                                .map((p: any) => (
                                  <option key={p.id} value={p.name} />
                                ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase">Forma de Cálculo</label>
                            <select
                              value={cfg.calculationMode || 'MENSAL'}
                              onChange={e => {
                                const mode = e.target.value as 'MENSAL' | 'DIAS_UTEIS';
                                setBenefitsConfig(prev => ({
                                  ...prev,
                                  [item.type]: {
                                    ...prev[item.type],
                                    calculationMode: mode,
                                    companyCost: mode === 'DIAS_UTEIS' && prev[item.type].dailyValue ? prev[item.type].dailyValue * 22 : prev[item.type].companyCost
                                  }
                                }));
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs bg-white font-medium text-slate-800"
                            >
                              <option value="MENSAL">MENSAL — Valor Fixo Mensal</option>
                              <option value="DIAS_UTEIS">DIAS_UTEIS — Proporcional a Dias Úteis</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {cfg.calculationMode === 'DIAS_UTEIS' ? (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase">Valor Diário (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={cfg.dailyValue || ''}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setBenefitsConfig(prev => ({
                                    ...prev,
                                    [item.type]: {
                                      ...prev[item.type],
                                      dailyValue: val,
                                      companyCost: val * 22
                                    }
                                  }));
                                }}
                                placeholder="0,00"
                                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs bg-white font-semibold text-slate-800"
                              />
                            </div>
                          ) : (
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
                          )}

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

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase">
                              {cfg.calculationMode === 'DIAS_UTEIS' ? 'Base 22 dias (R$)' : 'Custo Total (R$)'}
                            </label>
                            <div className="mt-1 w-full rounded-lg border border-slate-100 bg-slate-100/70 p-2 text-xs font-bold text-slate-800">
                              {Number(cfg.companyCost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          </div>
                        </div>

                        {/* Regras de Proporcionalidade */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-[11px]">
                          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={cfg.prorateAdmission ?? true}
                              onChange={e => {
                                const chk = e.target.checked;
                                setBenefitsConfig(prev => ({
                                  ...prev,
                                  [item.type]: { ...prev[item.type], prorateAdmission: chk }
                                }));
                              }}
                              className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                            />
                            <span>Proporcional à admissão</span>
                          </label>

                          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={cfg.deductVacation ?? true}
                              onChange={e => {
                                const chk = e.target.checked;
                                setBenefitsConfig(prev => ({
                                  ...prev,
                                  [item.type]: { ...prev[item.type], deductVacation: chk }
                                }));
                              }}
                              className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                            />
                            <span>Descontar férias</span>
                          </label>

                          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={cfg.deductLeave ?? true}
                              onChange={e => {
                                const chk = e.target.checked;
                                setBenefitsConfig(prev => ({
                                  ...prev,
                                  [item.type]: { ...prev[item.type], deductLeave: chk }
                                }));
                              }}
                              className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                            />
                            <span>Descontar afastamentos</span>
                          </label>
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

      {/* Modal Registrar Afastamento */}
      {isRegisterAbsenceOpen && (
        <Modal
          isOpen={isRegisterAbsenceOpen}
          onClose={() => setIsRegisterAbsenceOpen(false)}
          title="Registrar Afastamento de Colaborador"
          subtitle="Afastamentos reduzem os dias úteis elegíveis para os benefícios com desconto habilitado"
        >
          <form onSubmit={handleSaveAbsence} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Colaborador *</label>
              <select
                required
                value={absenceForm.employeeId}
                onChange={e => setAbsenceForm({ ...absenceForm, employeeId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="">Selecione o colaborador...</option>
                {benefitEmployees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.registrationNumber || emp.id}) — {emp.jobTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Data Início *</label>
                <input
                  type="date"
                  required
                  value={absenceForm.startDate}
                  onChange={e => setAbsenceForm({ ...absenceForm, startDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data Fim *</label>
                <input
                  type="date"
                  required
                  value={absenceForm.endDate}
                  onChange={e => setAbsenceForm({ ...absenceForm, endDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Motivo do Afastamento *</label>
              <select
                required
                value={absenceForm.reason}
                onChange={e => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Atestado Médico / Licença Médica">Atestado Médico / Licença Médica</option>
                <option value="Licença Maternidade / Paternidade">Licença Maternidade / Paternidade</option>
                <option value="Afastamento Previdenciário (INSS)">Afastamento Previdenciário (INSS)</option>
                <option value="Suspensão do Contrato de Trabalho">Suspensão do Contrato de Trabalho</option>
                <option value="Licença Não Remunerada">Licença Não Remunerada</option>
                <option value="Outro Motivo Legal">Outro Motivo Legal</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Observações Adicionais (opcional)</label>
              <textarea
                rows={2}
                value={absenceForm.notes}
                onChange={e => setAbsenceForm({ ...absenceForm, notes: e.target.value })}
                placeholder="Ex: CID, número do benefício ou protocolo de entrega do atestado..."
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRegisterAbsenceOpen(false)}
                className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 shadow-xs"
              >
                Registrar Afastamento
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Lançar Ajuste Manual */}
      {isAdjustmentOpen && (
        <Modal
          isOpen={isAdjustmentOpen}
          onClose={() => setIsAdjustmentOpen(false)}
          title={`Lançar Ajuste de Benefício — ${adjustmentForm.employeeName}`}
          subtitle={`Competência ${benefitPeriod} • Crédito ou desconto com motivo obrigatório`}
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Colaborador</label>
                <input
                  type="text"
                  disabled
                  value={adjustmentForm.employeeName}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-slate-600 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Competência</label>
                <input
                  type="text"
                  disabled
                  value={benefitPeriod}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-slate-600 font-mono font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Benefício *</label>
                <select
                  required
                  value={adjustmentForm.benefitType}
                  onChange={e => setAdjustmentForm({ ...adjustmentForm, benefitType: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-medium focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="VT">Vale-Transporte (VT)</option>
                  <option value="VA">Vale-Alimentação (VA)</option>
                  <option value="VR">Vale-Refeição (VR)</option>
                  <option value="COMBUSTIVEL">Auxílio Combustível</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Ajuste *</label>
                <select
                  required
                  value={adjustmentForm.adjustmentType}
                  onChange={e => setAdjustmentForm({ ...adjustmentForm, adjustmentType: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="CREDITO">Crédito (+ Valor adicional)</option>
                  <option value="DESCONTO">Desconto (- Redução de valor)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor do Ajuste (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={adjustmentForm.amount}
                onChange={e => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 font-black focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Motivo do Ajuste (obrigatório) *</label>
              <textarea
                rows={3}
                required
                value={adjustmentForm.reason}
                onChange={e => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                placeholder="Descreva o motivo detalhado para fins de auditoria (ex: Diferença retroativa, estorno de VR não utilizado, etc.)..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdjustmentOpen(false)}
                className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
              >
                Salvar Ajuste
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Nova Operadora / Fornecedor */}
      {isProviderOpen && (
        <Modal
          isOpen={isProviderOpen}
          onClose={() => setIsProviderOpen(false)}
          title="Nova Operadora / Fornecedor de Benefício"
          subtitle="Cadastre o emissor/convênio para geração dos pedidos de compra na competência"
        >
          <form onSubmit={handleSaveProvider} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={providerForm.name}
                  onChange={e => setProviderForm({ ...providerForm, name: e.target.value })}
                  placeholder="Ex: Sodexo Pass do Brasil, Alelo..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Benefício *</label>
                <select
                  required
                  value={providerForm.benefitType}
                  onChange={e => setProviderForm({ ...providerForm, benefitType: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-medium focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="VA">Vale-Alimentação (VA)</option>
                  <option value="VR">Vale-Refeição (VR)</option>
                  <option value="VT">Vale-Transporte (VT)</option>
                  <option value="COMBUSTIVEL">Auxílio Combustível</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">CNPJ / Documento</label>
                <input
                  type="text"
                  value={providerForm.document}
                  onChange={e => setProviderForm({ ...providerForm, document: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-mono focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contato / Consultor</label>
                <input
                  type="text"
                  value={providerForm.contactName}
                  onChange={e => setProviderForm({ ...providerForm, contactName: e.target.value })}
                  placeholder="Ex: Ana Consultoria Corporativa"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail de Contato</label>
                <input
                  type="email"
                  value={providerForm.contactEmail}
                  onChange={e => setProviderForm({ ...providerForm, contactEmail: e.target.value })}
                  placeholder="pedidos@operadora.com.br"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={providerForm.contactPhone}
                  onChange={e => setProviderForm({ ...providerForm, contactPhone: e.target.value })}
                  placeholder="(11) 4004-0000"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento Preferencial</label>
                <select
                  value={providerForm.paymentMethod}
                  onChange={e => setProviderForm({ ...providerForm, paymentMethod: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="PIX">PIX Corporativo</option>
                  <option value="TED">Transferência TED / DOC</option>
                  <option value="CARTAO">Cartão Corporativo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dia de Fechamento / Vencimento (1 a 31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={providerForm.billingDay}
                  onChange={e => setProviderForm({ ...providerForm, billingDay: e.target.value })}
                  placeholder="20"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsProviderOpen(false)}
                className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 shadow-xs cursor-pointer"
              >
                Cadastrar Operadora
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
