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
  AlertCircle
} from 'lucide-react';
import { PURCHASING_REQUISITIONS } from '../../data/mockData';
import { PurchaseRequisition } from '../../types/modules';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useWorkflow } from '../../context/WorkflowContext';
import { api } from '../../services/api';

export const PurchasingModule: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshApprovals } = useWorkflow();

  const [activeTab, setActiveTab] = useState<'orders' | 'comparison' | 'suppliers'>('orders');
  const [orders, setOrders] = useState<any[]>(PURCHASING_REQUISITIONS);
  const [suppliers, setSuppliers] = useState<any[]>([
    {
      id: 'part-1',
      legalName: 'Cisco do Brasil Ltda.',
      tradeName: 'Cisco Redes & Switches',
      documentNumber: '01.234.567/0001-89',
      category: 'Equipamentos de Rede',
      contactName: 'Marcos Silva',
      email: 'contato@cisco.com.br',
      rating: 5,
      slaPercent: 98.5
    },
    {
      id: 'part-2',
      legalName: 'Kalunga Comércio e Indústria Gráfica Ltda.',
      tradeName: 'Kalunga Suprimentos Corporativos',
      documentNumber: '02.345.678/0001-90',
      category: 'Papelaria & Insumos',
      contactName: 'Cláudia Peixoto',
      email: 'vendas@kalunga.com.br',
      rating: 4,
      slaPercent: 96.0
    },
    {
      id: 'part-3',
      legalName: 'Dell Computadores do Brasil Ltda.',
      tradeName: 'Dell Brasil',
      documentNumber: '72.381.189/0001-10',
      category: 'Equipamentos de TI',
      contactName: 'Rodrigo Mendes',
      email: 'corporativo@dell.com.br',
      rating: 5,
      slaPercent: 99.2
    },
    {
      id: 'part-4',
      legalName: 'Equinix Brasil Soluções de TI',
      tradeName: 'Equinix Datacenter',
      documentNumber: '04.567.890/0001-12',
      category: 'Infraestrutura Cloud & Hosting',
      contactName: 'Patricia Meirelles',
      email: 'noc@equinix.com.br',
      rating: 5,
      slaPercent: 99.9
    }
  ]);

  // Modal Nova Compra
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    title: '',
    department: 'Tecnologia & Infraestrutura',
    supplierName: 'Cisco do Brasil Ltda.',
    totalAmount: '',
    requiredDate: '2026-11-10',
    justification: ''
  });

  // Quadro Comparativo Interativo
  const [quotationItem, setQuotationItem] = useState('12 Switches Cisco Catalyst Gigabit & Roteadores');
  const [quotations, setQuotations] = useState([
    { supplierName: 'Cisco do Brasil Ltda.', price: 24500, deliveryDays: 7, warrantyMonths: 36, paymentTerms: '30/60 DDL' },
    { supplierName: 'Hewlett Packard Enterprise Brasil', price: 28900, deliveryDays: 14, warrantyMonths: 24, paymentTerms: '28 DDL' },
    { supplierName: 'Dell Computadores do Brasil', price: 31200, deliveryDays: 10, warrantyMonths: 36, paymentTerms: 'À vista com 5%' }
  ]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  // Status message
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const serverOrders = await api.getPurchasingOrders();
      if (serverOrders && serverOrders.length > 0) {
        setOrders(serverOrders);
      }
      const serverSuppliers = await api.getSuppliers();
      if (serverSuppliers && serverSuppliers.length > 0) {
        setSuppliers(serverSuppliers);
      }
    } catch {
      // mantém padrão
    }
  };

  useEffect(() => {
    loadData();
    calculateComparison();
  }, []);

  const calculateComparison = async () => {
    const res = await api.compareQuotations(quotations);
    if (res) {
      setComparisonResult(res);
    } else {
      const sorted = [...quotations].sort((a, b) => a.price - b.price);
      const lowest = sorted[0];
      const highest = sorted[sorted.length - 1];
      const saving = highest.price - lowest.price;
      setComparisonResult({
        recommendedSupplier: lowest.supplierName,
        lowestPrice: lowest.price,
        highestPrice: highest.price,
        savingAmount: saving,
        savingPercent: Number(((saving / highest.price) * 100).toFixed(1)),
        comparisonMatrix: quotations.map(q => ({
          ...q,
          isBestPrice: q.supplierName === lowest.supplierName,
          diffFromLowest: q.price - lowest.price
        }))
      });
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.title || !newOrder.totalAmount) return;

    const res = await api.createPurchasingOrder({
      title: newOrder.title,
      department: newOrder.department,
      requesterName: currentUser.fullName,
      requesterRole: currentUser.roleTitle,
      supplierName: newOrder.supplierName,
      totalAmount: parseFloat(newOrder.totalAmount),
      requiredDate: newOrder.requiredDate,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle
    });

    if (res && res.success) {
      setNotification(`✅ Ordem de compra ${res.order.code} criada e submetida com sucesso às alçadas SEEK!`);
      setIsNewOrderOpen(false);
      setNewOrder({
        title: '',
        department: 'Tecnologia & Infraestrutura',
        supplierName: 'Cisco do Brasil Ltda.',
        totalAmount: '',
        requiredDate: '2026-11-10',
        justification: ''
      });
      loadData();
      refreshApprovals();
    } else {
      // Fallback local
      const fallbackOrder = {
        id: `po-${Date.now()}`,
        code: `OC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: newOrder.title,
        department: newOrder.department,
        requesterName: currentUser.fullName,
        supplierQuoted: newOrder.supplierName,
        supplierName: newOrder.supplierName,
        totalAmount: parseFloat(newOrder.totalAmount),
        status: 'PENDENTE_APROVACAO',
        requiredDate: newOrder.requiredDate
      };
      setOrders(prev => [fallbackOrder, ...prev]);
      setIsNewOrderOpen(false);
      setNotification(`✅ Ordem de compra ${fallbackOrder.code} criada e submetida com sucesso às alçadas!`);
    }

    setTimeout(() => setNotification(null), 5000);
  };

  const handleReceiveOrder = async (orderId: string, orderCode: string) => {
    const res = await api.receivePurchasingOrder(orderId, currentUser.fullName, currentUser.roleTitle);
    if (res && res.success) {
      setNotification(`📦 Ordem ${orderCode} marcada como RECEBIDA! Contas a Pagar gerado automaticamente (${res.financialRecord?.code}).`);
      loadData();
    } else {
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: 'RECEBIDO' } : o)));
      setNotification(`📦 Ordem ${orderCode} marcada como RECEBIDA e integrada com o Contas a Pagar.`);
    }
    setTimeout(() => setNotification(null), 6000);
  };

  const totalOrdersAmount = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const pendingApprovalCount = orders.filter(o => o.status === 'PENDENTE_APROVACAO').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Compras */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Compras & Suprimentos</h1>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              SEEK Gestão Corporativa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão ponta a ponta: Solicitação → Cotação 3 Fornecedores → Alçadas de Aprovação → Recebimento → Integração Automática com Contas a Pagar.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsNewOrderOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Solicitação de Compra</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
        </div>
      )}

      {/* KPIs de Compras & Suprimentos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saving Acumulado (Q4)"
          value="R$ 48.750,00"
          change="+19.2% de economia"
          changeType="positive"
          subtitle="Economia através de concorrência"
          icon={TrendingDown}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Ordens em Tramitação"
          value={pendingApprovalCount}
          subtitle="Aguardando alçadas SEEK"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Fornecedores Homologados"
          value={suppliers.length}
          subtitle="Com SLA e certidões ativas"
          icon={Truck}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Pontualidade de Entrega"
          value="98.2%"
          change="+1.8 p.p."
          changeType="positive"
          subtitle="Cumprimento rigoroso de SLA"
          icon={ShieldCheck}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Tabs de Navegação Interna */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'orders'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Ordens & Solicitações de Compra</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{orders.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'comparison'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Percent className="h-4 w-4" />
          <span>Quadro Comparativo de Cotações (Saving)</span>
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
            Inteligência
          </span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'suppliers'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Gestão de Fornecedores & SLA</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{suppliers.length}</span>
        </button>
      </div>

      {/* TAB 1: ORDENS DE COMPRA */}
      {activeTab === 'orders' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ordens de Compra Registradas</h3>
              <p className="text-xs text-slate-500">Fluxo interligado com o Contas a Pagar e controle orçamentário.</p>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Volume Total: <strong className="text-slate-900">R$ {totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Descrição da Compra</th>
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Data Necessidade</th>
                  <th className="py-3 px-4 text-right">Valor Total (R$)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.code}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{item.title}</span>
                      <span className="text-[10px] text-slate-400">Solicitante: {item.requesterName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.department}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.supplierName || item.supplierQuoted}</td>
                    <td className="py-3 px-4 text-slate-600">{item.requiredDate}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      R$ {item.totalAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'APROVADO' ? (
                        <button
                          onClick={() => handleReceiveOrder(item.id, item.code)}
                          className="flex items-center space-x-1 mx-auto rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>Receber & Integrar</span>
                        </button>
                      ) : item.status === 'RECEBIDO' ? (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center space-x-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Integrado a Pagar</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-700">Tramitando Alçadas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUADRO COMPARATIVO DE COTAÇÕES (SAVING) */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">Motor de Comparação de Cotações com 3 Fornecedores</h3>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Calculadora de Saving Automática
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conformidade com a governança corporativa SEEK: toda compra acima de R$ 5.000 exige no mínimo 3 cotações formalizadas.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600">Item em Cotação:</span>
                <input
                  type="text"
                  value={quotationItem}
                  onChange={e => setQuotationItem(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-hidden"
                />
              </div>
            </div>

            {/* Resultado do Saving Calculado */}
            {comparisonResult && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Proposta Mais Econômica</span>
                  <span className="text-base font-black text-blue-950 block">{comparisonResult.recommendedSupplier}</span>
                  <span className="text-xs font-bold text-emerald-700">
                    R$ {comparisonResult.lowestPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Economia Gerada (Saving)</span>
                  <span className="text-base font-black text-emerald-700 block">
                    R$ {comparisonResult.savingAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">Comparado à maior proposta homologada</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Percentual de Redução</span>
                  <span className="text-base font-black text-indigo-700 block">
                    {comparisonResult.savingPercent}%
                  </span>
                  <span className="text-xs text-slate-600 font-medium">Eficiência orçamentária comprovada</span>
                </div>
              </div>
            )}

            {/* Matriz Comparativa */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Fornecedor / Razão Social</th>
                    <th className="py-3 px-4 text-right">Valor Total (R$)</th>
                    <th className="py-3 px-4 text-center">Prazo Entrega</th>
                    <th className="py-3 px-4 text-center">Garantia</th>
                    <th className="py-3 px-4">Condição Pagamento</th>
                    <th className="py-3 px-4 text-center">Diferença vs Menor</th>
                    <th className="py-3 px-4 text-center">Parecer do Motor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations.map((q, idx) => {
                    const isLowest = q.price === comparisonResult?.lowestPrice;
                    const diff = q.price - (comparisonResult?.lowestPrice || 0);

                    return (
                      <tr key={idx} className={isLowest ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-1.5">
                          {isLowest && <Sparkles className="h-4 w-4 text-emerald-600" />}
                          <span>{q.supplierName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                          R$ {q.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700">{q.deliveryDays} dias úteis</td>
                        <td className="py-3.5 px-4 text-center text-slate-700">{q.warrantyMonths} meses</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{q.paymentTerms}</td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {isLowest ? (
                            <span className="text-emerald-700">— Menor Preço —</span>
                          ) : (
                            <span className="text-rose-600">+ R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isLowest ? (
                            <span className="rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs">
                              Vencedor Homologado
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Desclassificado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setNewOrder({
                    title: `Aquisição: ${quotationItem}`,
                    department: 'Tecnologia & Infraestrutura',
                    supplierName: comparisonResult?.recommendedSupplier || 'Cisco do Brasil Ltda.',
                    totalAmount: String(comparisonResult?.lowestPrice || 24500),
                    requiredDate: '2026-11-15',
                    justification: `Vencedor pelo menor preço no quadro comparativo. Saving apurado de R$ ${comparisonResult?.savingAmount?.toFixed(2)} (${comparisonResult?.savingPercent}%).`
                  });
                  setIsNewOrderOpen(true);
                }}
                className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
              >
                <span>Emitir Ordem de Compra para Vencedor ({comparisonResult?.recommendedSupplier})</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GESTÃO DE FORNECEDORES & SLA */}
      {activeTab === 'suppliers' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fornecedores Homologados & Qualificação</h3>
              <p className="text-xs text-slate-500">Métricas de conformidade, cumprimento de prazos (SLA) e certidões ativas.</p>
            </div>
            <span className="text-xs text-slate-500">Total: <strong>{suppliers.length}</strong> cadastrados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suppliers.map((s: any) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-all bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{s.tradeName || s.legalName}</h4>
                    <span className="text-[11px] text-slate-500 block">Razão: {s.legalName}</span>
                    <span className="text-[11px] font-mono text-slate-600 block mt-0.5">CNPJ: {s.documentNumber}</span>
                  </div>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    {s.category || 'Fornecedor'}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contato Comercial:</span>
                    <span className="font-semibold text-slate-800">{s.contactName}</span>
                    <span className="text-[10px] text-slate-500 block">{s.email}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">SLA de Entrega:</span>
                    <span className="font-black text-emerald-700 text-sm">{s.slaPercent}%</span>
                    <span className="text-[10px] text-emerald-600 block font-semibold">✓ Certidão Negativa Válida</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Nova Solicitação de Compra */}
      <Modal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        title="Nova Ordem / Solicitação de Compra"
        subtitle="O processo será encaminhado diretamente às alçadas SEEK"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Descrição / Finalidade da Compra *</label>
            <input
              type="text"
              required
              value={newOrder.title}
              onChange={e => setNewOrder({ ...newOrder, title: e.target.value })}
              placeholder="Ex: Aquisição de 15 Leitores Biométricos para Turnê"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Departamento Solicitante</label>
              <select
                value={newOrder.department}
                onChange={e => setNewOrder({ ...newOrder, department: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Operações & Logística">Operações & Logística</option>
                <option value="Tecnologia da Informação">Tecnologia da Informação</option>
                <option value="Comercial & Marketing">Comercial & Marketing</option>
                <option value="Administrativo & RH">Administrativo & RH</option>
                <option value="Jurídico">Jurídico</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Fornecedor Homologado</label>
              <select
                value={newOrder.supplierName}
                onChange={e => setNewOrder({ ...newOrder, supplierName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.tradeName || s.legalName}>
                    {s.tradeName || s.legalName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newOrder.totalAmount}
                onChange={e => setNewOrder({ ...newOrder, totalAmount: e.target.value })}
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 font-bold focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Data Limite de Necessidade</label>
              <input
                type="date"
                value={newOrder.requiredDate}
                onChange={e => setNewOrder({ ...newOrder, requiredDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          {parseFloat(newOrder.totalAmount || '0') > 15000 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção de Alçada:</strong> Valores acima de R$ 15.000,00 exigem validação da Controladoria Financeira e Diretoria Executiva.
              </span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewOrderOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 shadow-xs"
            >
              Submeter Solicitação
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
