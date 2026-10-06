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
  CreditCard
} from 'lucide-react';
import { EMPLOYEES } from '../../data/mockData';
import { EmployeeProfile } from '../../types/modules';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { api } from '../../services/api';
import { FreelanceTaxasSubmodule } from './FreelanceTaxasSubmodule';
import { HRPayrollSection } from './HRPayrollSection';
import { HRBenefitsSection } from './HRBenefitsSection';

export const HRModule: React.FC<{ initialTab?: 'employees' | 'payroll' | 'benefits' | 'ponto' | 'vacations' | 'freelancers' | 'organogram' }> = ({ initialTab = 'employees' }) => {
  const { currentUser } = useAuth();
  const { refreshApprovals } = useWorkflow();

  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'benefits' | 'ponto' | 'vacations' | 'freelancers' | 'organogram'>(initialTab);

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

      {/* KPIs do RH */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Abas Internas */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
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
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'payroll'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span>Folha & Encargos (Payroll)</span>
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
            CLT
          </span>
        </button>

        <button
          onClick={() => setActiveTab('benefits')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'benefits'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="h-4 w-4 text-purple-600" />
          <span>Gestão de Benefícios</span>
          <span className="rounded-full bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-800">
            VT/VR/Caju
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

      {/* ABA: FOLHA DE PAGAMENTO & HOLERITES */}
      {activeTab === 'payroll' && <HRPayrollSection employees={employees} />}

      {/* ABA: GESTÃO & COMPRA DE BENEFÍCIOS CORPORATIVOS */}
      {activeTab === 'benefits' && <HRBenefitsSection />}

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
    </div>
  );
};
