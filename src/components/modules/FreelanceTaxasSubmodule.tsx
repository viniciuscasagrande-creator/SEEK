import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Star,
  UserCheck,
  Send,
  Zap,
  Building,
  MapPin,
  Phone,
  CreditCard,
  FileText,
  TrendingUp,
  XCircle,
  ArrowRight,
  Filter,
  ShieldCheck,
  RefreshCw,
  Award
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Freelancer, FreelanceShift, TaxaDashboardMetrics, TaxaShiftStatus } from '../../types/freelance';

export const FreelanceTaxasSubmodule: React.FC = () => {
  const { currentUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'taxas' | 'freelancers'>('taxas');
  const [metrics, setMetrics] = useState<TaxaDashboardMetrics | null>(null);
  const [taxas, setTaxas] = useState<FreelanceShift[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODAS');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modais
  const [isNewTaxaOpen, setIsNewTaxaOpen] = useState(false);
  const [isNewFreelancerOpen, setIsNewFreelancerOpen] = useState(false);
  const [isCloseTaxaOpen, setIsCloseTaxaOpen] = useState(false);
  const [selectedTaxaForClose, setSelectedTaxaForClose] = useState<FreelanceShift | null>(null);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [selectedTaxaForSettle, setSelectedTaxaForSettle] = useState<FreelanceShift | null>(null);

  // Formulário de Nova Demanda de Taxa
  const [newTaxaForm, setNewTaxaForm] = useState({
    operation_name: '',
    cost_center: 'Operações & Logística Corporativa',
    job_date: new Date().toISOString().substring(0, 10),
    work_shift: '08:00 - 18:00',
    location: '',
    requester_manager: 'Eduardo Martins Fontes',
    freelancer_id: '',
    role_title: 'Carregador / Roadie',
    base_fee: '220.00',
    allowance_food: '30.00',
    allowance_transport: '0.00'
  });

  // Formulário de Cadastro de Freelancer
  const [newFreelancerForm, setNewFreelancerForm] = useState({
    full_name: '',
    cpf: '',
    rg: '',
    phone: '',
    email: '',
    pix_key: '',
    pix_type: 'CPF' as 'CPF' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA',
    bank_name: 'Nubank',
    agency: '0001',
    account_number: '',
    primary_role: 'Carregador / Roadie',
    secondary_roles: '',
    standard_daily_rate: '220.00',
    city: 'Curitiba',
    state: 'PR',
    notes: ''
  });

  // Formulário de Fechamento de Taxa
  const [closeForm, setCloseForm] = useState({
    hours_worked: '10.0',
    overtime_amount: '0.00',
    reimbursement_amount: '0.00',
    performance_rating: '5',
    validator_name: currentUser?.fullName || 'Eduardo Martins Fontes',
    validation_notes: 'Trabalho realizado e validado presencialmente no local.'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashData, taxasData, freelData] = await Promise.all([
        api.getFreelanceDashboard(),
        api.getTaxas(statusFilter !== 'TODAS' ? statusFilter : undefined),
        api.getFreelancers()
      ]);

      if (dashData) setMetrics(dashData);
      if (taxasData) setTaxas(taxasData);
      if (freelData) setFreelancers(freelData);
    } catch (err: any) {
      console.error('Erro ao carregar dados de freelance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // 1. Criar Nova Demanda de Taxa
  const handleCreateTaxa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxaForm.operation_name || !newTaxaForm.job_date || !newTaxaForm.location || !newTaxaForm.role_title) {
      showNotification('Preencha os campos obrigatórios da escala.', 'error');
      return;
    }

    const res = await api.createTaxa({
      ...newTaxaForm,
      base_fee: parseFloat(newTaxaForm.base_fee) || 200,
      allowance_food: parseFloat(newTaxaForm.allowance_food) || 0,
      allowance_transport: parseFloat(newTaxaForm.allowance_transport) || 0,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });

    if (res && res.success) {
      showNotification(`✅ ${res.message}`);
      setIsNewTaxaOpen(false);
      setNewTaxaForm({
        operation_name: '',
        cost_center: 'Operações & Logística Corporativa',
        job_date: new Date().toISOString().substring(0, 10),
        work_shift: '08:00 - 18:00',
        location: '',
        requester_manager: 'Eduardo Martins Fontes',
        freelancer_id: '',
        role_title: 'Carregador / Roadie',
        base_fee: '220.00',
        allowance_food: '30.00',
        allowance_transport: '0.00'
      });
      loadData();
    } else {
      showNotification(res?.message || 'Erro ao criar escala de taxa.', 'error');
    }
  };

  // 2. Cadastrar Novo Freelancer
  const handleCreateFreelancer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFreelancerForm.full_name || !newFreelancerForm.cpf || !newFreelancerForm.phone || !newFreelancerForm.pix_key) {
      showNotification('Preencha nome, CPF, telefone e chave PIX.', 'error');
      return;
    }

    const res = await api.createFreelancer({
      ...newFreelancerForm,
      standard_daily_rate: parseFloat(newFreelancerForm.standard_daily_rate) || 200,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });

    if (res && res.success) {
      showNotification(`✅ ${res.message}`);
      setIsNewFreelancerOpen(false);
      setNewFreelancerForm({
        full_name: '',
        cpf: '',
        rg: '',
        phone: '',
        email: '',
        pix_key: '',
        pix_type: 'CPF',
        bank_name: 'Nubank',
        agency: '0001',
        account_number: '',
        primary_role: 'Carregador / Roadie',
        secondary_roles: '',
        standard_daily_rate: '220.00',
        city: 'Curitiba',
        state: 'PR',
        notes: ''
      });
      loadData();
    } else {
      showNotification(res?.message || 'Erro ao cadastrar profissional.', 'error');
    }
  };

  // 3. Atualizar Status da Taxa (Convocação, Confirmação, Check-in, Falta)
  const handleUpdateStatus = async (id: string, status: TaxaShiftStatus) => {
    const res = await api.updateTaxaStatus(
      id,
      status,
      currentUser?.fullName,
      `Status atualizado para ${status} pelo gestor de RH.`
    );

    if (res && res.success) {
      showNotification(`✅ ${res.message}`);
      loadData();
    } else {
      showNotification(res?.message || 'Erro ao atualizar status da taxa.', 'error');
    }
  };

  // 4. Abrir Modal de Fechamento de Taxa
  const openCloseTaxaModal = (shift: FreelanceShift) => {
    setSelectedTaxaForClose(shift);
    setCloseForm({
      hours_worked: shift.hours_worked > 0 ? String(shift.hours_worked) : '10.0',
      overtime_amount: '0.00',
      reimbursement_amount: '0.00',
      performance_rating: '5',
      validator_name: currentUser?.fullName || 'Eduardo Martins Fontes',
      validation_notes: 'Trabalho realizado, validado presencialmente e enviado ao Financeiro.'
    });
    setIsCloseTaxaOpen(true);
  };

  // 5. Executar Fechamento da Taxa e Enviar ao Financeiro (PIX)
  const handleExecuteCloseTaxa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaxaForClose) return;

    const res = await api.closeTaxaAndPay(selectedTaxaForClose.id, {
      ...closeForm,
      hours_worked: parseFloat(closeForm.hours_worked) || 8,
      overtime_amount: parseFloat(closeForm.overtime_amount) || 0,
      reimbursement_amount: parseFloat(closeForm.reimbursement_amount) || 0,
      performance_rating: parseInt(closeForm.performance_rating) || 5,
      userName: currentUser?.fullName,
      userRole: currentUser?.roleTitle
    });

    if (res && res.success) {
      showNotification(`✅ ${res.message}`);
      setIsCloseTaxaOpen(false);
      setSelectedTaxaForClose(null);
      loadData();
    } else {
      showNotification(res?.message || 'Erro ao fechar taxa.', 'error');
    }
  };

  // 6. Abrir Modal de Liquidação PIX
  const openSettleModal = (shift: FreelanceShift) => {
    setSelectedTaxaForSettle(shift);
    setIsSettleOpen(true);
  };

  // 7. Executar Liquidação PIX & Integração Contábil
  const handleExecuteSettlePayment = async () => {
    if (!selectedTaxaForSettle) return;

    const res = await api.settleTaxaPayment(
      selectedTaxaForSettle.id,
      currentUser?.fullName,
      currentUser?.roleTitle
    );

    if (res && res.success) {
      showNotification(`💰 ${res.message}`);
      setIsSettleOpen(false);
      setSelectedTaxaForSettle(null);
      loadData();
    } else {
      showNotification(res?.message || 'Erro ao liquidar pagamento via PIX.', 'error');
    }
  };

  // Helper para cor do badge de status
  const getStatusBadge = (status: TaxaShiftStatus) => {
    switch (status) {
      case 'ABERTA':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Aberta / Vaga</span>;
      case 'AGUARDANDO_APROVACAO':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Aguardando Alçada</span>;
      case 'CONVOCADO':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">Convocado</span>;
      case 'CONFIRMADO':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Confirmado</span>;
      case 'PRESENTE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">Em Execução / Check-in</span>;
      case 'REALIZADA':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">Aguardando Fechamento</span>;
      case 'AGUARDANDO_PAGAMENTO':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 font-mono">No Financeiro (PIX)</span>;
      case 'PAGO':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 font-mono">Pago via PIX</span>;
      case 'FALTA':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Falta Registrada</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  // Filtragem de taxas
  const filteredTaxas = taxas.filter(t => {
    const matchesSearch =
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.freelancer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.operation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.role_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Filtragem de freelancers
  const filteredFreelancers = freelancers.filter(f => {
    const matchesSearch =
      f.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cpf.includes(searchTerm) ||
      f.primary_role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.pix_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Notificação Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-bold uppercase underline">
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho da Central */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Zap className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">RH &middot; Central de Freelancers & Taxas</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ciclo completo de trabalhadores temporários: Necessidade &rarr; Seleção &rarr; Aprovação &rarr; Convocação &rarr; Fechamento &rarr; Financeiro (PIX) &rarr; Contabilidade.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewFreelancerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
          >
            <UserCheck className="h-4 w-4 text-blue-600" />
            Cadastrar Freelancer
          </button>
          <button
            onClick={() => setIsNewTaxaOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-700 text-white hover:bg-blue-800 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nova Demanda de Taxa
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Taxas (Mês)"
            value={metrics.totalTaxas.toString()}
            subtitle={`${metrics.confirmados} confirmadas / ${metrics.abertas} abertas`}
            icon={Clock}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="Montante Comprometido"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalComprometido)}
            subtitle={`Média: R$ ${metrics.mediaPorTaxa.toFixed(2)} / taxa`}
            icon={DollarSign}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            title="Aguardando Fechamento"
            value={metrics.aguardandoFechamento.toString()}
            subtitle="Trabalhos realizados no local"
            icon={CheckCircle2}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
          <StatCard
            title="No Financeiro (PIX)"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalAguardandoPagamento)}
            subtitle={`${metrics.aguardandoPagamento} taxas prontas para envio`}
            icon={CreditCard}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
          <StatCard
            title="Banco de Talentos"
            value={metrics.totalFreelancersAtivos.toString()}
            subtitle={`Presença histórica: ${metrics.taxaPresencaPercent}%`}
            icon={Users}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
        </div>
      )}

      {/* Sub-Tabs de Navegação */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('taxas')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'taxas'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] bg-blue-50/40 dark:bg-cyan-950/40 rounded-t-lg font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Central de Taxas & Escalas ({taxas.length})
        </button>
        <button
          onClick={() => setActiveSubTab('freelancers')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'freelancers'
              ? 'border-blue-700 dark:border-[#00f5ff] text-blue-700 dark:text-[#00f5ff] bg-blue-50/40 dark:bg-cyan-950/40 rounded-t-lg font-bold dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
              : 'border-transparent text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
          }`}
        >
          <Users className="h-4 w-4" />
          Banco de Talentos / Freelancers ({freelancers.length})
        </button>
      </div>

      {/* Barra de Filtros & Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeSubTab === 'taxas'
                ? 'Buscar por código (TX-...), profissional, operação ou local...'
                : 'Buscar freelancer por nome, CPF, PIX, função ou cidade...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {activeSubTab === 'taxas' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
              Status:
            </span>
            {[
              { id: 'TODAS', label: 'Todas' },
              { id: 'ABERTA', label: 'Abertas' },
              { id: 'CONFIRMADO', label: 'Confirmadas' },
              { id: 'REALIZADA', label: 'Aguard. Fechamento' },
              { id: 'AGUARDANDO_PAGAMENTO', label: 'No Financeiro' },
              { id: 'PAGO', label: 'Pagas PIX' },
              { id: 'FALTA', label: 'Faltas' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  statusFilter === pill.id
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          VISÃO 1: CENTRAL DE TAXAS & ESCALAS
          ======================================================== */}
      {activeSubTab === 'taxas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Código / Ref. Operação</th>
                  <th className="px-4 py-3.5">Data & Turno</th>
                  <th className="px-4 py-3.5">Profissional / Função</th>
                  <th className="px-4 py-3.5">Chave PIX</th>
                  <th className="px-4 py-3.5 text-right">Valor da Taxa</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Ações de Fluxo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTaxas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      Nenhuma taxa encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTaxas.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 font-mono">{t.code}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>{t.operation_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span>{t.location}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {t.job_date}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {t.work_shift}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{t.freelancer_name}</div>
                        <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                          {t.role_title}
                        </div>
                        {t.performance_rating > 0 && t.status !== 'ABERTA' && t.status !== 'CONVOCADO' && (
                          <div className="flex items-center gap-0.5 mt-0.5 text-amber-500">
                            {Array.from({ length: t.performance_rating }).map((_, i) => (
                              <Star key={i} className="h-2.5 w-2.5 fill-amber-400" />
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {t.freelancer_pix ? (
                          <div>
                            <span className="font-mono text-slate-700 font-medium text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {t.freelancer_pix}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Favorecido: {t.freelancer_name.split(' ')[0]}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pendente</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.total_amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Base: R$ {t.base_fee.toFixed(2)}
                          {t.allowance_food > 0 && ` + Alim R$ ${t.allowance_food}`}
                          {t.allowance_transport > 0 && ` + Transp R$ ${t.allowance_transport}`}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(t.status)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ações contextuais de fluxo */}
                          {t.status === 'ABERTA' && (
                            <button
                              onClick={() => {
                                setNewTaxaForm(prev => ({
                                  ...prev,
                                  operation_name: t.operation_name,
                                  location: t.location,
                                  role_title: t.role_title
                                }));
                                setIsNewTaxaOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              Alocar
                            </button>
                          )}

                          {t.status === 'CONVOCADO' && (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'CONFIRMADO')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Confirmar presença antecipada"
                            >
                              Confirmar
                            </button>
                          )}

                          {t.status === 'CONFIRMADO' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateStatus(t.id, 'PRESENTE')}
                                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                                title="Check-in no local do evento/operação"
                              >
                                Check-in
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(t.id, 'FALTA')}
                                className="px-1.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                                title="Registrar falta do profissional"
                              >
                                Falta
                              </button>
                            </div>
                          )}

                          {t.status === 'PRESENTE' && (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'REALIZADA')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              Concluir Turno
                            </button>
                          )}

                          {t.status === 'REALIZADA' && (
                            <button
                              onClick={() => openCloseTaxaModal(t)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
                              title="Validar horas, adicionais e enviar automaticamente para o Financeiro via PIX"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Fechar & Enviar ao Financeiro
                            </button>
                          )}

                          {t.status === 'AGUARDANDO_PAGAMENTO' && (
                            <button
                              onClick={() => openSettleModal(t)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-700 text-white hover:bg-blue-800 shadow-2xs transition-all cursor-pointer"
                              title="Liquidar transferência via PIX no Financeiro"
                            >
                              <Send className="h-3 w-3" />
                              Pagar PIX
                            </button>
                          )}

                          {t.status === 'PAGO' && (
                            <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Liquidado
                            </span>
                          )}

                          {t.status === 'FALTA' && (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'ABERTA')}
                              className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                              Reabrir Vaga
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          VISÃO 2: BANCO DE TALENTOS / CADASTRO DE FREELANCERS
          ======================================================== */}
      {activeSubTab === 'freelancers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Profissional / Documentos</th>
                  <th className="px-4 py-3.5">Função Principal & Secundárias</th>
                  <th className="px-4 py-3.5">Chave PIX & Dados Bancários</th>
                  <th className="px-4 py-3.5 text-right">Diária Padrão</th>
                  <th className="px-4 py-3.5 text-center">Avaliação / Jobs</th>
                  <th className="px-4 py-3.5 text-center">Disponibilidade</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFreelancers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      Nenhum profissional encontrado no banco de talentos.
                    </td>
                  </tr>
                ) : (
                  filteredFreelancers.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-sm">{f.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          CPF: {f.cpf} {f.rg && `| RG: ${f.rg}`}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>{f.phone}</span>
                          <span className="text-slate-300">&middot;</span>
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>{f.city} - {f.state}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs bg-blue-50 text-blue-800">
                          {f.primary_role}
                        </span>
                        {f.secondary_roles && (
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            {f.secondary_roles}
                          </div>
                        )}
                        {f.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                            "{f.notes}"
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-800 font-semibold text-[11px] bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                          {f.pix_key} ({f.pix_type})
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {f.bank_name || 'Banco'} {f.agency && `Ag: ${f.agency}`} {f.account_number && `CC: ${f.account_number}`}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.standard_daily_rate)}
                        </div>
                        <div className="text-[10px] text-slate-400">por diária base</div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          <span>{f.rating.toFixed(1)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                          {f.total_jobs} escalas realizadas
                        </div>
                        <div className="text-[10px] text-emerald-600">
                          {f.punctuality_score}% pontualidade
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {f.availability === 'DISPONIVEL' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            Disponível
                          </span>
                        ) : f.availability === 'EM_JOB' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                            Em Operação
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Indisponível
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {f.status === 'ATIVO' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ATIVO
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {f.status}
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

      {/* ========================================================
          MODAL 1: NOVA DEMANDA DE TAXA / ESCALA
          ======================================================== */}
      {isNewTaxaOpen && (
        <Modal
          isOpen={isNewTaxaOpen}
          onClose={() => setIsNewTaxaOpen(false)}
          title="Nova Demanda / Escala de Taxa Operacional"
        >
          <form onSubmit={handleCreateTaxa} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operação / Referência Administrativa *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Montagem Corporativa Curitiba, Operação Logística PR"
                value={newTaxaForm.operation_name}
                onChange={e => setNewTaxaForm({ ...newTaxaForm, operation_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                No ERP, a operação serve apenas como centro/referência de alocação de equipe.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data do Trabalho *
                </label>
                <input
                  type="date"
                  required
                  value={newTaxaForm.job_date}
                  onChange={e => setNewTaxaForm({ ...newTaxaForm, job_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Turno / Horário *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 08:00 - 18:00"
                  value={newTaxaForm.work_shift}
                  onChange={e => setNewTaxaForm({ ...newTaxaForm, work_shift: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Local / Ponto de Encontro *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Expotrade Pavilhão A, Datacenter Curitiba"
                  value={newTaxaForm.location}
                  onChange={e => setNewTaxaForm({ ...newTaxaForm, location: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Centro de Custo
                </label>
                <select
                  value={newTaxaForm.cost_center}
                  onChange={e => setNewTaxaForm({ ...newTaxaForm, cost_center: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Operações & Logística Corporativa">Operações & Logística Corporativa</option>
                  <option value="Tecnologia & Infraestrutura Cloud">Tecnologia & Infraestrutura Cloud</option>
                  <option value="Administrativo & Recursos Humanos">Administrativo & Recursos Humanos</option>
                  <option value="Comercial & Novos Negócios B2B">Comercial & Novos Negócios B2B</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Função da Escala *
                </label>
                <select
                  value={newTaxaForm.role_title}
                  onChange={e => setNewTaxaForm({ ...newTaxaForm, role_title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Carregador / Roadie">Carregador / Roadie</option>
                  <option value="Montador Estrutural">Montador Estrutural</option>
                  <option value="Recepcionista / Credenciamento">Recepcionista / Credenciamento</option>
                  <option value="Técnico de Som / Luz">Técnico de Som / Luz</option>
                  <option value="Operador de Bar / Caixa">Operador de Bar / Caixa</option>
                  <option value="Limpeza Operacional">Limpeza Operacional</option>
                  <option value="Apoio Geral Operacional">Apoio Geral Operacional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profissional do Banco de Talentos
                </label>
                <select
                  value={newTaxaForm.freelancer_id}
                  onChange={e => {
                    const id = e.target.value;
                    const freel = freelancers.find(f => f.id === id);
                    if (freel) {
                      setNewTaxaForm(prev => ({
                        ...prev,
                        freelancer_id: id,
                        base_fee: freel.standard_daily_rate.toFixed(2),
                        role_title: freel.primary_role
                      }));
                    } else {
                      setNewTaxaForm(prev => ({ ...prev, freelancer_id: '' }));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Deixar Vaga Aberta para Convocação --</option>
                  {freelancers.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.full_name} ({f.primary_role} - R$ {f.standard_daily_rate.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Taxa Base (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newTaxaForm.base_fee}
                  onChange={e => setNewTaxaForm({ ...newTaxaForm, base_fee: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adic. Alimentação (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTaxaForm.allowance_food}
                  onChange={e => setNewTaxaForm({ ...newTaxaForm, allowance_food: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adic. Transporte (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTaxaForm.allowance_transport}
                  onChange={e => setNewTaxaForm({ ...newTaxaForm, allowance_transport: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewTaxaOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-700 text-white hover:bg-blue-800 shadow-xs cursor-pointer"
              >
                Gerar Escala de Taxa
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL 2: CADASTRAR FREELANCER (BANCO DE TALENTOS)
          ======================================================== */}
      {isNewFreelancerOpen && (
        <Modal
          isOpen={isNewFreelancerOpen}
          onClose={() => setIsNewFreelancerOpen(false)}
          title="Cadastrar Novo Profissional no Banco de Talentos"
        >
          <form onSubmit={handleCreateFreelancer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do profissional"
                  value={newFreelancerForm.full_name}
                  onChange={e => setNewFreelancerForm({ ...newFreelancerForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CPF *</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={newFreelancerForm.cpf}
                  onChange={e => setNewFreelancerForm({ ...newFreelancerForm, cpf: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">RG</label>
                <input
                  type="text"
                  placeholder="00.000.000-0"
                  value={newFreelancerForm.rg}
                  onChange={e => setNewFreelancerForm({ ...newFreelancerForm, rg: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="(41) 90000-0000"
                  value={newFreelancerForm.phone}
                  onChange={e => setNewFreelancerForm({ ...newFreelancerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="email@dominio.com"
                  value={newFreelancerForm.email}
                  onChange={e => setNewFreelancerForm({ ...newFreelancerForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-blue-700" />
                Dados para Pagamento Automático via PIX
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipo de Chave *</label>
                  <select
                    value={newFreelancerForm.pix_type}
                    onChange={e => setNewFreelancerForm({ ...newFreelancerForm, pix_type: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="CPF">CPF</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="ALEATORIA">Chave Aleatória</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Chave PIX *</label>
                  <input
                    type="text"
                    required
                    placeholder="Chave PIX para recebimento da diária"
                    value={newFreelancerForm.pix_key}
                    onChange={e => setNewFreelancerForm({ ...newFreelancerForm, pix_key: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Banco</label>
                  <input
                    type="text"
                    placeholder="Ex: Nubank, Itaú"
                    value={newFreelancerForm.bank_name}
                    onChange={e => setNewFreelancerForm({ ...newFreelancerForm, bank_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    placeholder="0001"
                    value={newFreelancerForm.agency}
                    onChange={e => setNewFreelancerForm({ ...newFreelancerForm, agency: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Conta Corrente</label>
                  <input
                    type="text"
                    placeholder="00000-0"
                    value={newFreelancerForm.account_number}
                    onChange={e => setNewFreelancerForm({ ...newFreelancerForm, account_number: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Função Principal *</label>
                <select
                  value={newFreelancerForm.primary_role}
                  onChange={e => setNewFreelancerForm({ ...newFreelancerForm, primary_role: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Carregador / Roadie">Carregador / Roadie</option>
                  <option value="Montador Estrutural">Montador Estrutural</option>
                  <option value="Recepcionista / Credenciamento">Recepcionista / Credenciamento</option>
                  <option value="Técnico de Som / Luz">Técnico de Som / Luz</option>
                  <option value="Operador de Bar / Caixa">Operador de Bar / Caixa</option>
                  <option value="Limpeza Operacional">Limpeza Operacional</option>
                  <option value="Apoio de Segurança">Apoio de Segurança</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diária Padrão (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newFreelancerForm.standard_daily_rate}
                  onChange={e => setNewFreelancerForm({ ...newFreelancerForm, standard_daily_rate: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade / UF</label>
                <input
                  type="text"
                  value={`${newFreelancerForm.city} - ${newFreelancerForm.state}`}
                  onChange={e => setNewFreelancerForm({ ...newFreelancerForm, city: e.target.value.split('-')[0].trim() })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações & Qualificações</label>
              <textarea
                rows={2}
                placeholder="Ex: Treinamento em NR-35, experiência em mesa digital, inglês intermediário..."
                value={newFreelancerForm.notes}
                onChange={e => setNewFreelancerForm({ ...newFreelancerForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewFreelancerOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-700 text-white hover:bg-blue-800 shadow-xs cursor-pointer"
              >
                Salvar no Banco de Talentos
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL 3: FECHAMENTO DE TAXA & ENVIO AO FINANCEIRO (PIX)
          ======================================================== */}
      {isCloseTaxaOpen && selectedTaxaForClose && (
        <Modal
          isOpen={isCloseTaxaOpen}
          onClose={() => setIsCloseTaxaOpen(false)}
          title={`Fechamento de Taxa: ${selectedTaxaForClose.code}`}
        >
          <form onSubmit={handleExecuteCloseTaxa} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profissional</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedTaxaForClose.freelancer_name}</div>
                  <div className="text-xs text-blue-700 font-medium">{selectedTaxaForClose.role_title} &middot; {selectedTaxaForClose.operation_name}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chave PIX</span>
                  <div className="font-mono text-xs text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedTaxaForClose.freelancer_pix}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Horas Trabalhadas</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={closeForm.hours_worked}
                  onChange={e => setCloseForm({ ...closeForm, hours_worked: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Horas Extras / Adic. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={closeForm.overtime_amount}
                  onChange={e => setCloseForm({ ...closeForm, overtime_amount: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reembolsos / Desp. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={closeForm.reimbursement_amount}
                  onChange={e => setCloseForm({ ...closeForm, reimbursement_amount: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Avaliação de Desempenho</label>
                <select
                  value={closeForm.performance_rating}
                  onChange={e => setCloseForm({ ...closeForm, performance_rating: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="5">⭐⭐⭐⭐⭐ 5 Estrelas (Excelente)</option>
                  <option value="4">⭐⭐⭐⭐ 4 Estrelas (Muito Bom)</option>
                  <option value="3">⭐⭐⭐ 3 Estrelas (Regular / Atendeu)</option>
                  <option value="2">⭐⭐ 2 Estrelas (Abaixo do Esperado)</option>
                  <option value="1">⭐ 1 Estrela (Insatisfatório / Advertência)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gestor Validador</label>
                <input
                  type="text"
                  required
                  value={closeForm.validator_name}
                  onChange={e => setCloseForm({ ...closeForm, validator_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Parecer de Validação / Observações</label>
              <textarea
                rows={2}
                value={closeForm.validation_notes}
                onChange={e => setCloseForm({ ...closeForm, validation_notes: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Totalizador Final */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">Total a Pagar via PIX:</span>
                <span className="text-[11px] text-emerald-700">
                  Base (R$ {selectedTaxaForClose.base_fee}) + Alim (R$ {selectedTaxaForClose.allowance_food}) + Transp (R$ {selectedTaxaForClose.allowance_transport}) + HE/Reemb
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold font-mono text-emerald-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    selectedTaxaForClose.base_fee +
                    selectedTaxaForClose.allowance_food +
                    selectedTaxaForClose.allowance_transport +
                    (parseFloat(closeForm.overtime_amount) || 0) +
                    (parseFloat(closeForm.reimbursement_amount) || 0)
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCloseTaxaOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Fechamento e Enviar ao Financeiro (PIX)
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL 4: LIQUIDAÇÃO PIX NO FINANCEIRO & LIVRO DIÁRIO
          ======================================================== */}
      {isSettleOpen && selectedTaxaForSettle && (
        <Modal
          isOpen={isSettleOpen}
          onClose={() => setIsSettleOpen(false)}
          title={`Liquidação de Pagamento PIX: ${selectedTaxaForSettle.code}`}
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-xs font-bold text-blue-900 mb-1">
                Integração Nativa: RH &rarr; Financeiro &rarr; PIX &rarr; Contabilidade
              </div>
              <p className="text-xs text-blue-700">
                Ao confirmar a liquidação, o status será marcado como <strong>PAGO</strong> e será gerado automaticamente um lançamento por partidas dobradas no Livro Diário Contábil da competência.
              </p>
            </div>

            <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Profissional Favorecido:</span>
                <span className="font-bold text-slate-900">{selectedTaxaForSettle.freelancer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Chave PIX:</span>
                <span className="font-mono font-bold text-blue-700">{selectedTaxaForSettle.freelancer_pix}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Operação de Referência:</span>
                <span className="font-medium text-slate-800">{selectedTaxaForSettle.operation_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Centro de Custo:</span>
                <span className="font-medium text-slate-800">{selectedTaxaForSettle.cost_center}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Partidas Dobradas Geradas:</span>
                <span className="font-mono text-slate-700 text-[11px]">
                  D: 4.02.01.001 (Terceiros) / C: 1.01.01.001 (Bradesco C/C)
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">Valor a Liquidar:</span>
                <span className="text-[10px] text-emerald-600">Disparo via API PIX Corporativa</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-800">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTaxaForSettle.total_amount)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSettleOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleExecuteSettlePayment}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-700 text-white hover:bg-blue-800 shadow-xs cursor-pointer"
              >
                <Send className="h-4 w-4" />
                Confirmar Transferência PIX & Liquidar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
