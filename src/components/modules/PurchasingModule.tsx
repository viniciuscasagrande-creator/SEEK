import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  CheckCircle,
  Truck,
  TrendingDown,
  Clock,
  ShieldCheck,
  Building,
  PackageCheck,
  Percent,
  Search,
  ArrowRight,
  Sparkles,
  AlertCircle,
  FileText,
  Layers,
  Award,
  DollarSign,
  Check,
  BarChart3
} from 'lucide-react';
import { PURCHASING_REQUISITIONS } from '../../data/mockData';
import { PurchaseRequisition } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { ScrollSpyNav } from '../common/ScrollSpyNav';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { api } from '../../services/api';

export interface PurchasingModuleProps {
  initialTab?: 'dashboard' | 'requisitions' | 'comparison' | 'orders' | 'suppliers';
}

export const PurchasingModule: React.FC<PurchasingModuleProps> = ({ initialTab = 'dashboard' }) => {
  const { currentUser } = useAuth();
  const { refreshApprovals, addAuditLog } = useWorkflow();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'requisitions' | 'comparison' | 'orders' | 'suppliers'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [selectedReqForQuotation, setSelectedReqForQuotation] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [comparisonSummary, setComparisonSummary] = useState<any>(null);

  const [orders, setOrders] = useState<any[]>(PURCHASING_REQUISITIONS);
  const [suppliers, setSuppliers] = useState<any[]>([
    {
      id: 'part-1',
      legal_name: 'Cisco Systems Brasil Ltda.',
      trade_name: 'Cisco Redes & Switches',
      document_number: '01.234.567/0001-89',
      category: 'Equipamentos de Rede',
      contact_name: 'Marcos Silva',
      email: 'contato@cisco.com.br',
      rating: 5,
      sla_percent: 98.5
    },
    {
      id: 'part-2',
      legal_name: 'Kalunga Comércio e Indústria Gráfica Ltda.',
      trade_name: 'Kalunga Suprimentos Corporativos',
      document_number: '02.345.678/0001-90',
      category: 'Papelaria & Insumos',
      contact_name: 'Cláudia Peixoto',
      email: 'vendas@kalunga.com.br',
      rating: 4,
      sla_percent: 96.0
    },
    {
      id: 'part-3',
      legal_name: 'Dell Computadores do Brasil Ltda.',
      trade_name: 'Dell Brasil',
      document_number: '72.381.189/0001-10',
      category: 'Equipamentos de TI',
      contact_name: 'Rodrigo Mendes',
      email: 'corporativo@dell.com.br',
      rating: 5,
      sla_percent: 99.2
    }
  ]);

  // Modals
  const [isNewReqOpen, setIsNewReqOpen] = useState(false);
  const [newReq, setNewReq] = useState({
    description: '',
    department: 'Tecnologia da Informação & Nuvem',
    costCenter: 'Tecnologia & Infraestrutura Cloud',
    justification: '',
    totalEstimated: '',
    priority: 'MEDIA',
    requiredDate: '2026-10-30'
  });

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    title: '',
    department: 'Tecnologia da Informação & Nuvem',
    costCenter: 'Tecnologia & Infraestrutura Cloud',
    supplierName: 'Cisco Systems Brasil Ltda.',
    totalAmount: '',
    requiredDate: '2026-11-10',
    justification: ''
  });

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<any>(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [invoiceDateInput, setInvoiceDateInput] = useState(new Date().toISOString().substring(0, 10));
  const [invoiceDueDateInput, setInvoiceDueDateInput] = useState(new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10));

  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const serverReqs = await api.getPurchaseRequisitions();
      if (serverReqs && serverReqs.length > 0) {
        setRequisitions(serverReqs);
        if (!selectedReqForQuotation) {
          setSelectedReqForQuotation(serverReqs[0]);
          loadQuotationsForReq(serverReqs[0].id);
        }
      }

      const serverOrders = await api.getPurchasingOrders();
      if (serverOrders && serverOrders.length > 0) {
        setOrders(serverOrders);
      }

      const serverSuppliers = await api.getSuppliers();
      if (serverSuppliers && serverSuppliers.length > 0) {
        setSuppliers(serverSuppliers);
      }
    } catch {
      // fallback
    }
  };

  const loadQuotationsForReq = async (reqId: string) => {
    try {
      const quots = await api.getPurchaseQuotations(reqId);
      if (quots && quots.length > 0) {
        setQuotations(quots);
        const sorted = [...quots].sort((a, b) => a.total_price - b.total_price);
        const lowest = sorted[0];
        const highest = sorted[sorted.length - 1];
        const saving = highest.total_price - lowest.total_price;
        setComparisonSummary({
          recommendedSupplier: lowest.supplier_name,
          lowestPrice: lowest.total_price,
          highestPrice: highest.total_price,
          savingAmount: saving,
          savingPercent: highest.total_price > 0 ? Number(((saving / highest.total_price) * 100).toFixed(1)) : 0
        });
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectReqForComparison = (req: any) => {
    setSelectedReqForQuotation(req);
    loadQuotationsForReq(req.id);
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.description || !newReq.totalEstimated) return;

    const res = await api.createPurchaseRequisition({
      ...newReq,
      requesterName: currentUser.fullName,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`✅ Solicitação de compra ${res.requisition.code} cadastrada com sucesso!`);
      setIsNewReqOpen(false);
      setNewReq({
        description: '',
        department: 'Tecnologia da Informação & Nuvem',
        costCenter: 'Tecnologia & Infraestrutura Cloud',
        justification: '',
        totalEstimated: '',
        priority: 'MEDIA',
        requiredDate: '2026-10-30'
      });
      loadData();
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSelectWinningQuotation = async (quotationId: string, supplierName: string, totalPrice: number) => {
    const res = await api.selectPurchaseQuotation(quotationId, currentUser.fullName, currentUser.roleTitle);
    if (res && res.success) {
      // Cria a Ordem de Compra automaticamente com a proposta vencedora
      if (selectedReqForQuotation) {
        await api.createPurchasingOrder({
          requisitionId: selectedReqForQuotation.id,
          title: selectedReqForQuotation.description,
          department: selectedReqForQuotation.department,
          costCenter: selectedReqForQuotation.cost_center,
          requesterName: currentUser.fullName,
          requesterRole: currentUser.roleTitle,
          supplierName: supplierName,
          totalAmount: totalPrice,
          requiredDate: selectedReqForQuotation.required_date,
          userName: currentUser.fullName,
          userRole: currentUser.roleTitle
        });
      }

      setNotification(`🏆 Fornecedor ${supplierName} selecionado no Mapa de Cotações! Ordem de Compra gerada e enviada para alçadas.`);
      loadData();
      if (selectedReqForQuotation) loadQuotationsForReq(selectedReqForQuotation.id);
      refreshApprovals();
    }
    setTimeout(() => setNotification(null), 6000);
  };

  const handleApproveOrder = async (orderId: string, orderCode: string) => {
    const res = await api.approvePurchasingOrder(orderId, currentUser.fullName, currentUser.roleTitle);
    if (res && res.success) {
      setNotification(`✅ Ordem de Compra ${orderCode} aprovada por alçada de governança.`);
      loadData();
      refreshApprovals();
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenReceive = (order: any) => {
    setReceivingOrder(order);
    setInvoiceNumberInput(order.invoiceNumber || '');
    setInvoiceDateInput(order.invoiceDate || new Date().toISOString().substring(0, 10));
    setInvoiceDueDateInput(order.financialDueDate || order.requiredDate || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10));
    setIsReceiveModalOpen(true);
  };

  const handleConfirmReceive = async () => {
    if (!receivingOrder) return;
    if (!invoiceNumberInput.trim()) {
      alert('Informe o número da Nota Fiscal (NF-e / NFS-e).');
      return;
    }

    const res = await api.receivePurchasingOrder(receivingOrder.id, {
      invoiceNumber: invoiceNumberInput.trim(),
      invoiceDate: invoiceDateInput,
      dueDate: invoiceDueDateInput,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`📦 Ordem ${receivingOrder.code} recebida com sucesso! Gerado título no Contas a Pagar (${res.financialRecord?.code || ''}).`);
      loadData();
    } else {
      setNotification(`⚠️ ${res?.error || 'Não foi possível registrar o recebimento fiscal.'}`);
    }
    setIsReceiveModalOpen(false);
    setReceivingOrder(null);
    setTimeout(() => setNotification(null), 6000);
  };

  const totalOrdersAmount = orders.reduce((acc, o) => acc + (o.totalAmount || o.total_amount || 0), 0);
  const pendingApprovalCount = orders.filter(o => o.status === 'PENDENTE_APROVACAO').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Compras Enterprise */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Compras, Suprimentos & Procurement</h1>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              SEEK Enterprise ERP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ciclo de Suprimentos Corporativo: Solicitação de Compra → Mapa de Cotações (3 Fornecedores) → Alçadas de Governança → Recebimento Físico/Fiscal → Integração Contas a Pagar.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsNewReqOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Solicitação de Compra</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* ScrollSpy: Navegador Seccional de Compras */}
      <ScrollSpyNav
        sections={[
          { id: 'purchasing-kpis', label: 'Indicadores de Suprimentos', icon: BarChart3 },
          ...(activeTab === 'dashboard' ? [{ id: 'purchasing-workspace', label: 'Central de Trabalho', icon: ShoppingCart }] : []),
          { id: 'purchasing-tabs', label: 'Abas de Compras', icon: Layers },
          { id: 'purchasing-content', label: 'Ordens & Cotações', icon: FileText }
        ]}
      />

      {/* KPIs de Compras & Suprimentos */}
      <div id="purchasing-kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saving Acumulado em Cotações"
          value="R$ 48.750,00"
          change="+18.4% economia"
          changeType="positive"
          subtitle="Média de 3 cotações / pedido"
          icon={TrendingDown}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Ordens em Alçada Pendente"
          value={String(pendingApprovalCount)}
          change="Aguardando validação"
          changeType="neutral"
          subtitle="Alçadas Tier 1, 2 e 3"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Fornecedores Homologados"
          value={String(suppliers.length)}
          change="100% com certidões"
          changeType="positive"
          subtitle="Base cadastrada no SEEK"
          icon={Truck}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Cumprimento de SLA de Entrega"
          value="98.2%"
          change="+1.5 p.p."
          changeType="positive"
          subtitle="Pontualidade contratual"
          icon={ShieldCheck}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Tabs de Navegação Interna */}
      <div id="purchasing-tabs" className="flex border-b border-slate-200 space-x-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'dashboard' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Visão Geral & Pendências</span>
        </button>

        <button
          onClick={() => setActiveTab('requisitions')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'requisitions' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Solicitações de Compra ({requisitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'comparison' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Percent className="h-4 w-4" />
          <span>Mapa de Cotações (3 Fornecedores)</span>
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
            Inteligência
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'orders' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Ordens de Compra & Alçadas ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'suppliers' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Fornecedores Homologados ({suppliers.length})</span>
        </button>
      </div>

      {/* CENTRAL DE TRABALHO DE COMPRAS & SUPRIMENTOS */}
      {activeTab === 'dashboard' && (
        <div id="purchasing-workspace" className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Central de Trabalho de Compras & Suprimentos</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Acompanhe requisições abertas, alçadas de governança pendentes, mapas de cotação com 3 fornecedores e integração de notas fiscais com Contas a Pagar.
                </p>
              </div>
              <button
                onClick={() => setIsNewReqOpen(true)}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs"
              >
                + Nova Solicitação de Compra
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Solicitações Abertas', value: requisitions.length, sub: 'Necessidades de compras', tab: 'requisitions' as const, action: 'Ver SCs' },
              { label: 'Ordens a Aprovar', value: pendingApprovalCount, sub: 'Alçadas Tier 1, 2 e 3', tab: 'orders' as const, action: 'Avaliar alçadas' },
              { label: 'Mapa Comparativo', value: comparisonSummary ? `Saving: R$ ${comparisonSummary.savingAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Cotações ativas', sub: '3 fornecedores auditados', tab: 'comparison' as const, action: 'Ver mapa' },
              { label: 'Fornecedores Homologados', value: suppliers.length, sub: '100% com certidões', tab: 'suppliers' as const, action: 'Base de parceiros' }
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Ordens de Compra que Exigem Atenção</h3>
                <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-blue-700 hover:underline">Ver todas ({orders.length}) →</button>
              </div>
              <div className="mt-3 space-y-2">
                {orders.filter(o => o.status === 'PENDING_APPROVAL' || o.status === 'APPROVED').slice(0, 5).map(o => (
                  <button
                    key={o.id}
                    onClick={() => setActiveTab('orders')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{o.title || o.description}</div>
                      <div className="text-[11px] text-slate-500">{o.supplier_name || o.supplierName || 'Fornecedor em homologação'} • {o.cost_center || o.costCenter}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">R$ {(o.total_amount || o.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        o.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {o.status === 'PENDING_APPROVAL' ? 'Alçada Pendente' : o.status}
                      </span>
                    </div>
                  </button>
                ))}
                {orders.length === 0 && (
                  <p className="text-xs text-slate-500">Nenhuma ordem de compra pendente.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-black text-slate-900">Regras de Integração Compras → Financeiro & Contábil</h3>
              <div className="mt-3 space-y-2.5 text-xs text-slate-700">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="font-bold text-slate-900">1. Alçada Aprovada → Compromisso Orçamentário</div>
                  <p className="mt-0.5 text-slate-600">A aprovação do pedido de compra bloqueia a dotação orçamentária do centro de custo requisitante.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="font-bold text-slate-900">2. Recebimento Físico & Fiscal → Contas a Pagar</div>
                  <p className="mt-0.5 text-slate-600">Ao registrar a entrega com o número da Nota Fiscal, o ERP gera automaticamente o título financeiro (origem: PO) para liquidação.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="font-bold text-slate-900">3. Classificação & Rateio → Reflexo Contábil</div>
                  <p className="mt-0.5 text-slate-600">Lançamento automático de débito na conta contábil de despesa/ativo e crédito em fornecedores a pagar.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENTS (ScrollSpy Section) */}
      <div id="purchasing-content" className="space-y-4">
        {/* TAB 1: SOLICITAÇÕES DE COMPRA (SC) */}
        {activeTab === 'requisitions' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Solicitações de Compra Internas (SC)</h3>
              <p className="text-xs text-slate-500">Ponto de partida do processo de suprimentos. Registre a necessidade antes das cotações.</p>
            </div>
            <button
              onClick={() => setIsNewReqOpen(true)}
              className="flex items-center space-x-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 cursor-pointer shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nova SC</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Descrição da Necessidade</th>
                  <th className="py-2.5 px-3">Requisitante / Depto</th>
                  <th className="py-2.5 px-3">Centro de Custo</th>
                  <th className="py-2.5 px-3 text-right">Valor Estimado</th>
                  <th className="py-2.5 px-3 text-center">Prioridade</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisitions.map(req => {
                  const priorityColor = req.priority === 'ALTA' || req.priority === 'URGENTE'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : req.priority === 'MEDIA'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{req.code}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-900">{req.description}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{req.justification}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800">{req.requester_name}</span>
                        <p className="text-[10px] text-slate-400">{req.department}</p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{req.cost_center}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        R$ {req.total_estimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${priorityColor}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            handleSelectReqForComparison(req);
                            setActiveTab('comparison');
                          }}
                          className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Ver Cotações ({req.quotations_count || 0})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MAPA DE COTAÇÕES (3 FORNECEDORES) */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Seletor de Requisição para Cotação */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Requisição em Análise</span>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedReqForQuotation?.code} — {selectedReqForQuotation?.description || 'Selecione uma solicitação'}
              </h3>
              <p className="text-xs text-slate-500">
                Centro de Custo: {selectedReqForQuotation?.cost_center} • Necessidade: {selectedReqForQuotation?.required_date}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedReqForQuotation?.id}
                onChange={e => {
                  const req = requisitions.find(r => r.id === e.target.value);
                  if (req) handleSelectReqForComparison(req);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden"
              >
                {requisitions.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.description.substring(0, 35)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Banner de Saving Recomendado */}
          {comparisonSummary && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-emerald-950">Melhor Oferta Recomendada:</span>
                    <span className="rounded-md bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-900">
                      {comparisonSummary.recommendedSupplier}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Economia calculada de <strong>R$ {comparisonSummary.savingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({comparisonSummary.savingPercent}%) em relação à cotação mais alta.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cards Lado a Lado dos 3 Fornecedores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quotations.map(q => {
              const isWinner = q.selected === 1 || q.supplier_name === comparisonSummary?.recommendedSupplier;

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${
                    isWinner
                      ? 'border-emerald-500 bg-white ring-2 ring-emerald-500 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{q.proposal_number || 'PROPOSTA'}</span>
                        <h4 className="text-sm font-bold text-slate-900">{q.supplier_name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">CNPJ: {q.supplier_cnpj}</p>
                      </div>
                      {isWinner && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Menor Preço</span>
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Preço Unitário:</span>
                        <span className="font-mono text-slate-700">R$ {q.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Quantidade:</span>
                        <span className="font-mono text-slate-700">{q.quantity} un</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Prazo de Entrega:</span>
                        <span className="font-bold text-slate-800">{q.delivery_days} dias úteis</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Condições:</span>
                        <span className="font-medium text-slate-800">{q.payment_terms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avaliação do Fornecedor:</span>
                        <span className="font-bold text-amber-600">★ {q.rating || 5.0}</span>
                      </div>
                    </div>

                    {q.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{q.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Valor Total da Cotação</span>
                      <p className={`text-xl font-black font-mono ${isWinner ? 'text-emerald-700' : 'text-slate-900'}`}>
                        R$ {q.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSelectWinningQuotation(q.id, q.supplier_name, q.total_price)}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center space-x-1.5 ${
                        isWinner
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{q.selected === 1 ? 'Fornecedor Vencedor' : 'Selecionar & Gerar PO'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ORDENS DE COMPRA (PO) & ALÇADAS DE GOVERNANÇA */}
      {activeTab === 'orders' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ordens de Compra & Alçadas de Governança</h3>
              <p className="text-xs text-slate-500">
                Alçadas SEEK: Tier 1 (Gestor até R$ 15k) • Tier 2 (Financeiro até R$ 50k) • Tier 3 (Diretoria Executiva &gt; R$ 50k).
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Volume Total: <strong className="text-slate-900 font-mono">R$ {totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Descrição da Ordem</th>
                  <th className="py-2.5 px-3">Fornecedor Contratado</th>
                  <th className="py-2.5 px-3">Alçada de Governança</th>
                  <th className="py-2.5 px-3 text-right">Valor Total</th>
                  <th className="py-2.5 px-3">Financeiro / Documento</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => {
                  const amount = order.totalAmount || order.total_amount || 0;
                  const tier = amount > 50000 ? { label: 'Tier 3: Diretoria', bg: 'bg-purple-50 text-purple-700 border-purple-200' }
                    : amount > 15000 ? { label: 'Tier 2: Financeiro', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
                    : { label: 'Tier 1: Gestor', bg: 'bg-slate-50 text-slate-600 border-slate-200' };

                  const isPending = order.status === 'PENDENTE_APROVACAO';
                  const isApproved = order.status === 'APROVADO';
                  const isReceived = order.status === 'RECEBIDO' || order.status === 'PAGO';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{order.code}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-900">{order.title}</p>
                        <p className="text-[10px] text-slate-400">Requisitado por: {order.requesterName || order.requester_name}</p>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{order.supplierName || order.supplier_name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${tier.bg}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3">
                        {order.financialRecordCode ? (
                          <div className="space-y-0.5">
                            <p className="font-mono font-bold text-blue-700">{order.financialRecordCode}</p>
                            <p className="text-[10px] text-slate-500">NF: {order.invoiceNumber || '—'} • Venc.: {order.financialDueDate || '—'}</p>
                            <p className="text-[10px] font-bold text-slate-600">Financeiro: {order.financialStatus || 'CONFIRMADO'}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Aguardando recebimento fiscal</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        {isPending && (
                          <button
                            onClick={() => handleApproveOrder(order.id, order.code)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                          >
                            Aprovar Alçada
                          </button>
                        )}
                        {isApproved && (
                          <button
                            onClick={() => handleOpenReceive(order)}
                            className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs"
                          >
                            Receber Físico/Fiscal
                          </button>
                        )}
                        {isReceived && (
                          <span className="text-[10px] font-bold text-slate-400">
                            {order.status === 'PAGO' ? 'Pago / Concluído' : 'Recebido / Faturado'}
                          </span>
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

      {/* TAB 4: FORNECEDORES HOMOLOGADOS & SLA */}
      {activeTab === 'suppliers' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fornecedores Homologados & Conformidade Corporativa</h3>
              <p className="text-xs text-slate-500">Parceiros B2B qualificados com monitoramento contínuo de SLA e regularidade fiscal.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map(s => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{s.trade_name || s.tradeName || s.legal_name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{s.document_number || s.documentNumber}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-500">★ {s.rating || 5.0}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Categoria:</span>
                    <span className="font-medium text-slate-800">{s.category}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>SLA Cumprido:</span>
                    <span className="font-bold text-emerald-700">{s.sla_percent || s.slaPercent || 98.0}%</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Contato:</span>
                    <span className="text-slate-700">{s.contact_name || s.contactName}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>E-mail:</span>
                    <span className="text-slate-700 font-mono text-[10px]">{s.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* MODAL: NOVA SOLICITAÇÃO DE COMPRA */}
      <Modal isOpen={isNewReqOpen} onClose={() => setIsNewReqOpen(false)} title="Nova Solicitação de Compra (SC)">
        <form onSubmit={handleCreateRequisition} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Item / Serviço</label>
            <input
              type="text"
              required
              placeholder="Ex: Aquisição de 10 Racks de Servidor 42U para Datacenter"
              value={newReq.description}
              onChange={e => setNewReq({ ...newReq, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Departamento</label>
              <select
                value={newReq.department}
                onChange={e => setNewReq({ ...newReq, department: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              >
                <option value="Tecnologia da Informação & Nuvem">Tecnologia da Informação & Nuvem</option>
                <option value="Operações & Logística Corporativa">Operações & Logística Corporativa</option>
                <option value="Comercial & Novos Negócios">Comercial & Novos Negócios</option>
                <option value="Recursos Humanos & DP">Recursos Humanos & DP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Centro de Custo</label>
              <select
                value={newReq.costCenter}
                onChange={e => setNewReq({ ...newReq, costCenter: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              >
                <option value="Tecnologia & Infraestrutura Cloud">Tecnologia & Infraestrutura Cloud</option>
                <option value="Operações & Serviços Corporativos">Operações & Serviços Corporativos</option>
                <option value="Comercial & Novos Negócios B2B">Comercial & Novos Negócios B2B</option>
                <option value="Administrativo & Recursos Humanos">Administrativo & Recursos Humanos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valor Estimado (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={newReq.totalEstimated}
                onChange={e => setNewReq({ ...newReq, totalEstimated: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prioridade</label>
              <select
                value={newReq.priority}
                onChange={e => setNewReq({ ...newReq, priority: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data Necessária</label>
              <input
                type="date"
                required
                value={newReq.requiredDate}
                onChange={e => setNewReq({ ...newReq, requiredDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Justificativa Operacional / Orçamentária</label>
            <textarea
              rows={2}
              required
              placeholder="Explique o motivo da contratação/compra para embasar a validação das alçadas..."
              value={newReq.justification}
              onChange={e => setNewReq({ ...newReq, justification: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewReqOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 cursor-pointer"
            >
              Cadastrar SC
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RECEBIMENTO FÍSICO / FISCAL */}
      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Conferência & Recebimento Físico/Fiscal">
        {receivingOrder && (
          <div className="space-y-4 text-xs">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
              <div className="flex justify-between font-mono font-bold text-slate-700">
                <span>{receivingOrder.code}</span>
                <span className="text-slate-900">
                  R$ {(receivingOrder.totalAmount || receivingOrder.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="font-medium text-slate-900">{receivingOrder.title}</p>
              <p className="text-slate-500">Fornecedor: {receivingOrder.supplierName || receivingOrder.supplier_name}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Número da Nota Fiscal (NF-e / NFS-e) *</label>
              <input
                type="text"
                required
                placeholder="Ex: NFE-001298"
                value={invoiceNumberInput}
                onChange={e => setInvoiceNumberInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data de Emissão</label>
                <input type="date" value={invoiceDateInput} onChange={e => setInvoiceDateInput(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vencimento Financeiro</label>
                <input type="date" value={invoiceDueDateInput} onChange={e => setInvoiceDueDateInput(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono" />
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 border border-blue-200 text-blue-900 text-[11px] space-y-1">
              <span className="font-bold flex items-center space-x-1">
                <Check className="h-4 w-4 text-blue-600" />
                <span>Integração Automática com o Contas a Pagar</span>
              </span>
              <p>
                Ao confirmar, o SEEK registrará o recebimento físico/fiscal, moverá o orçamento de comprometido para realizado, criará um único título no Contas a Pagar vinculado à ordem e à nota fiscal e fará o reconhecimento contábil automático. A aprovação da ordem, por si só, não gera pagamento.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 cursor-pointer"
              >
                Confirmar Recebimento & Faturar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
