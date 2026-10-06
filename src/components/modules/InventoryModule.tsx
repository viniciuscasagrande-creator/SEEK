import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Landmark,
  ShieldCheck,
  Tag,
  Plus,
  ArrowDownUp,
  FileCheck,
  Search,
  AlertTriangle,
  Package,
  Layers,
  CheckCircle2,
  Calendar,
  Building
} from 'lucide-react';
import { ASSETS_RECORDS } from '../../data/mockData';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const InventoryModule: React.FC = () => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'assets' | 'stock'>('assets');
  const [assets, setAssets] = useState<any[]>(ASSETS_RECORDS);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Modais
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  // Formulário Novo Ativo
  const [assetForm, setAssetForm] = useState({
    description: '',
    category: 'TI & Hardware',
    acquisitionValue: '',
    depreciationRateAnnual: '20',
    location: 'Sede Curitiba - Datacenter',
    responsibleName: currentUser.fullName
  });

  // Formulário Movimentação de Estoque
  const [movementForm, setMovementForm] = useState({
    itemId: '',
    type: 'ENTRADA',
    quantity: '50',
    reason: 'Reposição operacional de evento'
  });

  const loadData = async () => {
    try {
      const assetsRes = await api.getAssets();
      if (assetsRes && assetsRes.assets && assetsRes.assets.length > 0) {
        setAssets(assetsRes.assets);
      }
      const itemsRes = await api.getInventoryItems();
      if (itemsRes && itemsRes.length > 0) {
        setStockItems(itemsRes);
      } else {
        // Fallback default stock items
        setStockItems([
          {
            id: 'itm-01',
            sku: 'MAT-001',
            name: 'Bobina Térmica 80mm p/ Relógio Ponto',
            category: 'Suprimentos & Facilities',
            unit: 'un',
            minQuantity: 100,
            currentQuantity: 420,
            unitCost: 12.50,
            location: 'Almoxarifado Curitiba - Prateleira A1'
          },
          {
            id: 'itm-02',
            sku: 'MAT-002',
            name: 'Patch Cord UTP Cat6 2.5m (Lote 50)',
            category: 'Infraestrutura de Rede',
            unit: 'pct',
            minQuantity: 200,
            currentQuantity: 140, // Alerta
            unitCost: 185.00,
            location: 'Almoxarifado Curitiba - Prateleira B3'
          },
          {
            id: 'itm-03',
            sku: 'MAT-003',
            name: 'Cordão Personalizado SEEK VIP',
            category: 'Merchandising',
            unit: 'un',
            minQuantity: 500,
            currentQuantity: 1200,
            unitCost: 3.20,
            location: 'Almoxarifado SP - Gaveta C4'
          },
          {
            id: 'itm-04',
            sku: 'MAT-004',
            name: 'Cartucho Toner Laser HP 85A',
            category: 'Suprimentos de Escritório',
            unit: 'un',
            minQuantity: 10,
            currentQuantity: 4, // Crítico
            unitCost: 210.00,
            location: 'Almoxarifado Central - TI'
          }
        ]);
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const acq = parseFloat(assetForm.acquisitionValue) || 0;
    const rate = parseFloat(assetForm.depreciationRateAnnual) || 20;

    const payload = {
      description: assetForm.description,
      category: assetForm.category,
      acquisitionValue: acq,
      currentBookValue: acq, // Inicial
      depreciationRateAnnual: rate,
      location: assetForm.location,
      responsibleName: assetForm.responsibleName
    };

    const res = await api.createAsset(payload);
    if (res && res.asset) {
      setAssets(prev => [res.asset, ...prev]);
    } else {
      const mockNew = {
        id: `ast-${Date.now()}`,
        tagNumber: `PAT-2026-0${Math.floor(100 + Math.random() * 899)}`,
        ...payload,
        acquisitionDate: new Date().toISOString().split('T')[0],
        custodyTermSigned: false,
        status: 'ATIVO'
      };
      setAssets(prev => [mockNew, ...prev]);
    }

    setNotification('Ativo imobilizado tombado com sucesso e registrado no patrimônio corporativo.');
    setIsAssetModalOpen(false);
    setAssetForm({
      description: '',
      category: 'TI & Hardware',
      acquisitionValue: '',
      depreciationRateAnnual: '20',
      location: 'Sede Curitiba - Datacenter',
      responsibleName: currentUser.fullName
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSignCustody = async (assetId: string) => {
    await api.signAssetCustody(assetId, currentUser.fullName);
    setAssets(prev =>
      prev.map(a =>
        a.id === assetId
          ? {
              ...a,
              custodyTermSigned: true,
              custodySignedDate: new Date().toISOString().split('T')[0],
              responsibleName: a.responsibleName || currentUser.fullName
            }
          : a
      )
    );
    setNotification('Termo de Custódia e Responsabilidade assinado digitalmente com validade jurídica interna.');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetItemId = movementForm.itemId || (stockItems[0]?.id ?? '');
    const qty = parseInt(movementForm.quantity, 10) || 0;

    const payload = {
      itemId: targetItemId,
      type: movementForm.type,
      quantity: qty,
      reason: movementForm.reason,
      requesterName: currentUser.fullName
    };

    const res = await api.createInventoryMovement(payload);
    if (res && res.updatedQuantity !== undefined) {
      setStockItems(prev =>
        prev.map(item =>
          item.id === targetItemId ? { ...item, currentQuantity: res.updatedQuantity } : item
        )
      );
    } else {
      // Local fallback
      setStockItems(prev =>
        prev.map(item => {
          if (item.id === targetItemId) {
            let nextQty = item.currentQuantity;
            if (movementForm.type === 'ENTRADA') nextQty += qty;
            else if (movementForm.type === 'SAIDA') nextQty = Math.max(0, nextQty - qty);
            else nextQty = qty;
            return { ...item, currentQuantity: nextQty };
          }
          return item;
        })
      );
    }

    setNotification(`Movimentação de estoque (${movementForm.type}) de ${qty} itens registrada com sucesso.`);
    setIsMovementModalOpen(false);
    setTimeout(() => setNotification(null), 4000);
  };

  // KPIs
  const totalAssetValue = assets.reduce((acc, a) => acc + (Number(a.currentBookValue) || 0), 0);
  const signedCustodyCount = assets.filter(a => a.custodyTermSigned).length;
  const custodyPercentage = assets.length > 0 ? Math.round((signedCustodyCount / assets.length) * 100) : 100;
  const totalStockUnits = stockItems.reduce((acc, it) => acc + (Number(it.currentQuantity) || 0), 0);
  const lowStockCount = stockItems.filter(it => it.currentQuantity <= it.minQuantity).length;

  const filteredAssets = assets.filter(
    a =>
      a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tagNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.responsibleName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStock = stockItems.filter(
    it =>
      it.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Estoque & Patrimônio */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Estoque, Almoxarifado & Patrimônio</h1>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              SEEK Gestão Operacional
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão patrimonial completa com plaquetas de tombamento, termos de custódia e controle de saldo físico de almoxarifado.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          {activeTab === 'assets' ? (
            <button
              onClick={() => setIsAssetModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tombamento de Ativo</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (stockItems.length > 0 && !movementForm.itemId) {
                  setMovementForm(prev => ({ ...prev, itemId: stockItems[0].id }));
                }
                setIsMovementModalOpen(true);
              }}
              className="flex items-center space-x-1.5 rounded-lg bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-800 cursor-pointer"
            >
              <ArrowDownUp className="h-4 w-4" />
              <span>Registrar Movimentação</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Feedback */}
      {notification && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Valor Patrimonial Líquido"
          value={`R$ ${(totalAssetValue / 1000).toFixed(1)}k`}
          subtitle="Valor contábil após depreciação"
          icon={Landmark}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Ativos com Termo Assinado"
          value={`${custodyPercentage}%`}
          change={`${signedCustodyCount}/${assets.length} ativos`}
          changeType="positive"
          subtitle="Custódia jurídica formalizada"
          icon={ShieldCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Saldo Físico em Estoque"
          value={`${totalStockUnits.toLocaleString('pt-BR')} un`}
          subtitle="Materiais nos almoxarifados"
          icon={Boxes}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Alerta de Reposição"
          value={lowStockCount}
          subtitle="Itens no limite ou abaixo do mínimo"
          icon={AlertTriangle}
          iconColor={lowStockCount > 0 ? 'text-amber-600' : 'text-slate-600'}
          iconBg={lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-50'}
        />
      </div>

      {/* Tabs & Barra de Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'assets'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Patrimônio & Ativos Imobilizados ({assets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Estoque & Almoxarifado ({stockItems.length})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'assets' ? 'Buscar por plaqueta, ativo ou responsável...' : 'Buscar insumo por SKU ou nome...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Conteúdo Aba 1: Ativos Imobilizados */}
      {activeTab === 'assets' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Inventário de Ativos Imobilizados Homologados</h3>
              <p className="text-[11px] text-slate-500">Rastreabilidade patrimonial por plaqueta, custodiante e depreciação acumulada.</p>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Total: {filteredAssets.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Plaqueta</th>
                  <th className="py-3 px-4">Descrição do Ativo</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Localização Física</th>
                  <th className="py-3 px-4">Responsável Custodiante</th>
                  <th className="py-3 px-4 text-right">Aquisição</th>
                  <th className="py-3 px-4 text-right">Valor Contábil Atual</th>
                  <th className="py-3 px-4 text-center">Termo de Custódia</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map(ast => (
                  <tr key={ast.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{ast.tagNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{ast.description}</span>
                      <span className="text-[10px] text-slate-400">Depreciação: {ast.depreciationRateAnnual || 20}% a.a.</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {ast.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{ast.location}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{ast.responsibleName || 'Não atribuído'}</td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono">
                      R$ {Number(ast.acquisitionValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">
                      R$ {Number(ast.currentBookValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {ast.custodyTermSigned ? (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Assinado ({ast.custodySignedDate || '05/10/2026'})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          <span>Pendente de Assinatura</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!ast.custodyTermSigned ? (
                        <button
                          onClick={() => handleSignCustody(ast.id)}
                          className="rounded bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          Assinar Termo
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Regularizado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: Estoque & Almoxarifado */}
      {activeTab === 'stock' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Controle Físico & Saldos de Almoxarifado</h3>
              <p className="text-[11px] text-slate-500">Monitoramento de níveis críticos, reposições e custo médio unitário ponderado.</p>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Total: {filteredStock.length} itens catalogados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">SKU / Código</th>
                  <th className="py-3 px-4">Item & Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Endereçamento Almoxarifado</th>
                  <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                  <th className="py-3 px-4 text-center">Saldo Atual</th>
                  <th className="py-3 px-4 text-right">Custo Médio Un.</th>
                  <th className="py-3 px-4 text-right">Valor Total em Estoque</th>
                  <th className="py-3 px-4 text-center">Status de Reposição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.map(it => {
                  const isCritical = it.currentQuantity <= it.minQuantity * 0.5;
                  const isWarning = it.currentQuantity <= it.minQuantity;
                  const totalItemValue = it.currentQuantity * (it.unitCost || 0);

                  return (
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-amber-800">{it.sku}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{it.name}</td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {it.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{it.location}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-500">
                        {it.minQuantity} {it.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-slate-900">
                        {it.currentQuantity} {it.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        R$ {Number(it.unitCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        R$ {totalItemValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isCritical ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800">
                            Crítico (Comprar)
                          </span>
                        ) : isWarning ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Alerta Reposição
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Estoque Adequado
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

      {/* Modal: Tombamento de Ativo */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title="Tombamento de Ativo Imobilizado"
        subtitle="Cadastre o bem patrimonial, vinculando ao colaborador custodiante com geração de termo de responsabilidade."
      >
        <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Descrição do Ativo Imobilizado</label>
            <input
              type="text"
              required
              value={assetForm.description}
              onChange={e => setAssetForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ex: Notebook Dell Latitude 5440 i7 32GB RAM"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Categoria Patrimonial</label>
              <select
                value={assetForm.category}
                onChange={e => setAssetForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="TI & Hardware">TI & Hardware</option>
                <option value="Equipamentos de TI & Servidores">Equipamentos de TI & Servidores</option>
                <option value="Mobiliário Corporativo">Mobiliário Corporativo</option>
                <option value="Infraestrutura & Redes">Infraestrutura & Redes</option>
                <option value="Veículos Operacionais">Veículos Operacionais</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor de Aquisição (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={assetForm.acquisitionValue}
                onChange={e => setAssetForm(prev => ({ ...prev, acquisitionValue: e.target.value }))}
                placeholder="Ex: 8500.00"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Taxa Depreciação Anual (%)</label>
              <input
                type="number"
                value={assetForm.depreciationRateAnnual}
                onChange={e => setAssetForm(prev => ({ ...prev, depreciationRateAnnual: e.target.value }))}
                placeholder="Ex: 20"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Localização Física</label>
              <input
                type="text"
                value={assetForm.location}
                onChange={e => setAssetForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Ex: Sede Curitiba - Datacenter"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Colaborador Custodiante</label>
            <input
              type="text"
              required
              value={assetForm.responsibleName}
              onChange={e => setAssetForm(prev => ({ ...prev, responsibleName: e.target.value }))}
              placeholder="Nome do colaborador responsável"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssetModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              Homologar Tombamento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Registrar Movimentação de Estoque */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Movimentação de Almoxarifado"
        subtitle="Lance entradas, saídas ou acertos de inventário com recálculo automático de saldo."
      >
        <form onSubmit={handleCreateMovement} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Item de Almoxarifado</label>
            <select
              value={movementForm.itemId}
              onChange={e => setMovementForm(prev => ({ ...prev, itemId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-amber-600 focus:outline-hidden"
            >
              {stockItems.map(it => (
                <option key={it.id} value={it.id}>
                  {it.sku} - {it.name} (Saldo Atual: {it.currentQuantity} {it.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo de Movimento</label>
              <select
                value={movementForm.type}
                onChange={e => setMovementForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-amber-600 focus:outline-hidden"
              >
                <option value="ENTRADA">ENTRADA (Recebimento / Compra)</option>
                <option value="SAIDA">SAÍDA (Consumo Operacional / Evento)</option>
                <option value="AJUSTE">AJUSTE (Inventário Físico)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                required
                value={movementForm.quantity}
                onChange={e => setMovementForm(prev => ({ ...prev, quantity: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-amber-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Motivo / Justificativa</label>
            <input
              type="text"
              required
              value={movementForm.reason}
              onChange={e => setMovementForm(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Ex: Fornecimento de cabos de rede e patch cords para Filial SP"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-amber-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-amber-800 cursor-pointer"
            >
              Efetivar Movimentação
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
