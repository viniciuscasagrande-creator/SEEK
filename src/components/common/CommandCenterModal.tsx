import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutDashboard,
  Home,
  CheckSquare,
  DollarSign,
  Users2,
  ShoppingCart,
  UserCheck,
  FileText,
  Headphones,
  FolderLock,
  ShieldCheck,
  BarChart3,
  Building,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { ActiveView } from '../layout/Sidebar';

interface CommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ActiveView) => void;
  onOpenQuickAction: () => void;
  onOpenSeekAI: () => void;
}

export const CommandCenterModal: React.FC<CommandCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenQuickAction,
  onOpenSeekAI
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent, but if already open, toggle
        }
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { label: 'Meu Painel (Central de Trabalho)', icon: Home, view: 'my-workstation' as ActiveView, category: 'Navegação' },
    { label: 'Painel Executivo C-Level', icon: LayoutDashboard, view: 'executive-dashboard' as ActiveView, category: 'Navegação' },
    { label: 'Minhas Aprovações & Alçadas', icon: CheckSquare, view: 'approvals' as ActiveView, category: 'Navegação' },
    { label: 'CRM & Pipeline Comercial', icon: Users2, view: 'crm' as ActiveView, category: 'Navegação' },
    { label: 'Financeiro & Contas a Pagar/Receber', icon: DollarSign, view: 'finance' as ActiveView, category: 'Navegação' },
    { label: 'Contabilidade & Livro Diário', icon: FileText, view: 'accounting' as ActiveView, category: 'Navegação' },
    { label: 'Fiscal & Impostos', icon: FileText, view: 'fiscal' as ActiveView, category: 'Navegação' },
    { label: 'Compras & Cotações', icon: ShoppingCart, view: 'purchasing' as ActiveView, category: 'Navegação' },
    { label: 'RH & Colaboradores', icon: UserCheck, view: 'hr' as ActiveView, category: 'Navegação' },
    { label: 'Contratos & Jurídico', icon: FileText, view: 'contracts' as ActiveView, category: 'Navegação' },
    { label: 'Atendimento / Service Desk', icon: Headphones, view: 'service-desk' as ActiveView, category: 'Navegação' },
    { label: 'Governança & Riscos LGPD', icon: ShieldCheck, view: 'governance' as ActiveView, category: 'Navegação' },
    { label: 'BI & Relatórios Executivos', icon: BarChart3, view: 'reports' as ActiveView, category: 'Navegação' },
    { label: 'Empresas, Filiais & RBAC', icon: Building, view: 'admin-companies' as ActiveView, category: 'Administração' }
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-200 px-4 py-3 bg-slate-50/50">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Digite para navegar no SEEK, buscar módulos ou disparar ações..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Action Shortcuts */}
        <div className="p-2 border-b border-slate-100 bg-blue-50/40 flex items-center justify-between text-xs px-4">
          <button
            onClick={() => {
              onClose();
              onOpenQuickAction();
            }}
            className="flex items-center text-blue-700 font-bold hover:underline"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            + Nova Solicitação / Despesa / Lead
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSeekAI();
            }}
            className="flex items-center text-indigo-700 font-bold hover:underline"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Consultar SEEK IA
          </button>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum módulo ou comando encontrado para "{search}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onNavigate(item.view);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left rounded-lg text-xs hover:bg-slate-100 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-blue-700 group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.category}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
