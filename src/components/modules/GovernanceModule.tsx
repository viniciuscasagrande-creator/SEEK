import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckSquare,
  FileText,
  Lock,
  Plus,
  Search,
  CheckCircle2,
  Activity,
  Layers,
  FileCheck,
  Users
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const GovernanceModule: React.FC = () => {
  const { currentUser } = useAuth();

  const [risks, setRisks] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form novo risco
  const [riskForm, setRiskForm] = useState({
    title: '',
    category: 'Tecnologia / Operações',
    probability: 'MEDIA',
    impact: 'CRITICO',
    mitigationPlan: '',
    responsibleName: currentUser.fullName
  });

  const loadData = async () => {
    try {
      const res = await api.getRisks(selectedCategory);
      if (res && res.length > 0) {
        setRisks(res);
      } else {
        // Fallback default risks
        setRisks([
          {
            id: 'rsk-01',
            title: 'Pico de Tráfego e Indisponibilidade de Bilheteria Online',
            category: 'Tecnologia / Operações',
            probability: 'MEDIA',
            impact: 'CRITICO',
            status: 'MITIGADO',
            mitigationPlan: 'Auto-scaling em cluster AWS + Fila virtual de espera implementada.',
            responsibleName: 'Eduardo Martins'
          },
          {
            id: 'rsk-02',
            title: 'Vazamento ou Incidente de Dados Pessoais (LGPD)',
            category: 'Segurança / Jurídico',
            probability: 'BAIXA',
            impact: 'CRITICO',
            status: 'MONITORADO',
            mitigationPlan: 'Criptografia ponta a ponta, tokenização de cartões e DPO ativo.',
            responsibleName: 'Roberto Vianna Guimarães'
          },
          {
            id: 'rsk-03',
            title: 'Inadimplência de Produtor de Eventos em Fechamento de Lote',
            category: 'Financeiro & Controladoria',
            probability: 'BAIXA',
            impact: 'ALTO',
            status: 'CONTROLADO',
            mitigationPlan: 'Retenção automática de repasses e garantia caução em contrato.',
            responsibleName: 'Camila Fernandes Souza'
          },
          {
            id: 'rsk-04',
            title: 'Interrupção de Fornecimento Elétrico em Festival ao Vivo',
            category: 'Operações de Eventos',
            probability: 'MEDIA',
            impact: 'ALTO',
            status: 'MITIGADO',
            mitigationPlan: 'Redundância com geradores a diesel em stand-by com chave de transferência automática.',
            responsibleName: 'Beatriz Castro Lima'
          }
        ]);
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: riskForm.title,
      category: riskForm.category,
      probability: riskForm.probability,
      impact: riskForm.impact,
      mitigationPlan: riskForm.mitigationPlan,
      status: 'MONITORADO',
      responsibleName: riskForm.responsibleName
    };

    const res = await api.createRisk(payload);
    if (res && res.risk) {
      setRisks(prev => [res.risk, ...prev]);
    } else {
      const mockRisk = {
        id: `rsk-${Date.now()}`,
        ...payload
      };
      setRisks(prev => [mockRisk, ...prev]);
    }

    setNotification(`Risco corporativo cadastrado com plano de mitigação ativo.`);
    setIsRiskModalOpen(false);
    setRiskForm({
      title: '',
      category: 'Tecnologia / Operações',
      probability: 'MEDIA',
      impact: 'CRITICO',
      mitigationPlan: '',
      responsibleName: currentUser.fullName
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // KPIs
  const criticalCount = risks.filter(r => r.impact === 'CRITICO').length;
  const mitigatedCount = risks.filter(r => r.status === 'MITIGADO' || r.status === 'CONTROLADO').length;

  const filteredRisks = risks.filter(r => {
    const matchesCat = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch =
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mitigationPlan?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Governança */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Governança, Riscos & Compliance</h1>
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
              SEEK Estratégia
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Matriz de riscos corporativos, conformidade irrestrita com a LGPD, auditorias internas e evidências de controles.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => setIsRiskModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Mapear Novo Risco</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {notification && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPIs Governança */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Índice Geral de Compliance"
          value="98.5%"
          change="+0.5 p.p."
          changeType="positive"
          subtitle="Aderência às políticas do SEEK"
          icon={ShieldCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Riscos Críticos Mapeados"
          value={criticalCount}
          subtitle="Com plano de contingência ativo"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Conformidade LGPD"
          value="100%"
          subtitle="DPO & encarregado homologados"
          icon={Lock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Controles Auditados"
          value={`${mitigatedCount}/${risks.length}`}
          subtitle="Planos de mitigação eficazes"
          icon={CheckSquare}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Seção LGPD & Segurança */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shrink-0 shadow-xs">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Programa de Privacidade & Proteção de Dados (LGPD)</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Bases legais mapeadas, relatório de impacto à privacidade (RIPD) vigente e canal DPO disponível.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="rounded-lg bg-white px-3 py-2 border border-blue-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Encarregado (DPO)</span>
              <span className="font-bold text-slate-800">dpo@seek.local</span>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 border border-blue-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Titulares com Consentimento</span>
              <span className="font-bold text-emerald-700">100% Homologado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matriz de Riscos */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Matriz de Riscos Corporativos Prioritários</h3>
            <p className="text-[11px] text-slate-500">Monitoramento contínuo de probabilidades, impactos e planos de mitigação.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar risco ou plano de ação..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-56 sm:w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Risco Mapeado</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-center">Probabilidade</th>
                <th className="py-3 px-4 text-center">Impacto</th>
                <th className="py-3 px-4">Plano de Mitigação & Controle</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRisks.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">{r.title}</td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {r.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">{r.probability}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-black rounded px-2 py-0.5 text-[10px] ${
                        r.impact === 'CRITICO' || r.impact === 'CRÍTICO'
                          ? 'bg-rose-100 text-rose-700'
                          : r.impact === 'ALTO'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.impact}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-sm">{r.mitigationPlan}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{r.responsibleName || 'Gestor da Área'}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
              {filteredRisks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Nenhum risco encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Mapear Risco */}
      <Modal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        title="Mapear Risco Corporativo"
        subtitle="Identifique vulnerabilidades de negócio, probabilidade, impacto e defina o plano de ação."
      >
        <form onSubmit={handleCreateRisk} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Título do Evento de Risco</label>
            <input
              type="text"
              required
              value={riskForm.title}
              onChange={e => setRiskForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Falha de link dedicado de internet durante transmissão de festival"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Categoria</label>
              <select
                value={riskForm.category}
                onChange={e => setRiskForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Tecnologia / Operações">Tecnologia / Operações</option>
                <option value="Segurança / Jurídico">Segurança / Jurídico</option>
                <option value="Financeiro & Controladoria">Financeiro & Controladoria</option>
                <option value="Operações de Eventos">Operações de Eventos</option>
                <option value="Compliance & Reputação">Compliance & Reputação</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Probabilidade</label>
              <select
                value={riskForm.probability}
                onChange={e => setRiskForm(prev => ({ ...prev, probability: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Impacto</label>
              <select
                value={riskForm.impact}
                onChange={e => setRiskForm(prev => ({ ...prev, impact: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="BAIXO">Baixo</option>
                <option value="MEDIO">Médio</option>
                <option value="ALTO">Alto</option>
                <option value="CRITICO">Crítico</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Plano de Mitigação & Ação Preventiva</label>
            <textarea
              rows={3}
              required
              value={riskForm.mitigationPlan}
              onChange={e => setRiskForm(prev => ({ ...prev, mitigationPlan: e.target.value }))}
              placeholder="Descreva o controle estabelecido para prevenir ou remediar o evento..."
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Líder / Responsável pelo Controle</label>
            <input
              type="text"
              required
              value={riskForm.responsibleName}
              onChange={e => setRiskForm(prev => ({ ...prev, responsibleName: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRiskModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              Homologar Risco
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
