import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, CircleAlert, ExternalLink, Filter, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ActiveView } from '../layout/Sidebar';

interface NotificationCenterProps {
  onNavigate?: (view: ActiveView) => void;
}

const typeLabel = (type: string) => {
  const labels: Record<string, string> = {
    APPROVAL: 'Aprovação',
    SLA_ALERT: 'SLA',
    CONTRACT: 'Contrato',
    FINANCE: 'Financeiro',
    TAX: 'Fiscal',
    HR: 'RH',
    PURCHASE: 'Compras',
    SYSTEM: 'Sistema'
  };
  return labels[type] || type.replaceAll('_', ' ');
};

const typeClass = (type: string) => {
  if (type === 'APPROVAL') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (type === 'SLA_ALERT') return 'bg-rose-50 text-rose-800 border-rose-200';
  if (type === 'FINANCE') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (type === 'HR') return 'bg-violet-50 text-violet-800 border-violet-200';
  if (type === 'PURCHASE') return 'bg-blue-50 text-blue-800 border-blue-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const { notifications, unreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [type, setType] = useState('ALL');
  const [search, setSearch] = useState('');

  const types = useMemo(() => Array.from(new Set(notifications.map(n => n.type))), [notifications]);
  const filtered = useMemo(() => notifications.filter(n => {
    if (filter === 'UNREAD' && n.read) return false;
    if (type !== 'ALL' && n.type !== type) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${n.title} ${n.message}`.toLowerCase().includes(q)) return false;
    return true;
  }), [notifications, filter, type, search]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900">Central de Notificações</h1>
                <p className="text-xs text-slate-500">Avisos operacionais, aprovações, prazos e ocorrências geradas pelos módulos.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              {unreadNotificationsCount} não lida(s)
            </div>
            <button onClick={markAllNotificationsAsRead} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título ou conteúdo..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white" />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={type} onChange={e => setType(e.target.value)} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none">
              <option value="ALL">Todos os tipos</option>
              {types.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
            </select>
          </div>
          <div className="flex rounded-lg border border-slate-200 dark:border-cyan-500/30 bg-slate-50 dark:bg-[#070e1c] p-1">
            <button onClick={() => setFilter('ALL')} className={`rounded-md px-3 py-1.5 text-xs font-bold cursor-pointer transition-all ${filter === 'ALL' ? 'bg-white dark:bg-cyan-950/90 text-blue-700 dark:text-[#00f5ff] dark:border dark:border-[#00f5ff] shadow-xs dark:shadow-[0_0_12px_rgba(0,245,255,0.35)] dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]' : 'text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff]'}`}>Todas</button>
            <button onClick={() => setFilter('UNREAD')} className={`rounded-md px-3 py-1.5 text-xs font-bold cursor-pointer transition-all ${filter === 'UNREAD' ? 'bg-white dark:bg-cyan-950/90 text-blue-700 dark:text-[#00f5ff] dark:border dark:border-[#00f5ff] shadow-xs dark:shadow-[0_0_12px_rgba(0,245,255,0.35)] dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]' : 'text-slate-500 dark:text-cyan-400/80 hover:text-slate-800 dark:hover:text-[#00f5ff]'}`}>Não lidas</button>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.map(n => (
          <div key={n.id} className={`rounded-xl border p-4 transition-all ${n.read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/30 shadow-xs'}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${typeClass(n.type)}`}>
                <CircleAlert className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black text-slate-900">{n.title}</h3>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.message}</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">{n.createdAt}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${typeClass(n.type)}`}>{typeLabel(n.type)}</span>
                  <div className="flex items-center gap-2">
                    {!n.read && <button onClick={() => markNotificationAsRead(n.id)} className="text-[11px] font-bold text-slate-600 hover:text-blue-700 cursor-pointer">Marcar como lida</button>}
                    {n.linkRoute && onNavigate && (
                      <button onClick={() => { markNotificationAsRead(n.id); onNavigate(n.linkRoute as ActiveView); }} className="flex items-center gap-1 rounded-md bg-blue-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-800 cursor-pointer">
                        Abrir origem <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-xs text-slate-500">Nenhuma notificação encontrada para os filtros selecionados.</div>}
      </div>
    </div>
  );
};
