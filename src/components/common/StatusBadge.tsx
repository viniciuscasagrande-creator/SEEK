import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'approval' | 'financial' | 'ticket' | 'priority' | 'contract' | 'default';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'default' }) => {
  const getStyle = (): string => {
    switch (status.toUpperCase()) {
      // Aprovações & Sucesso
      case 'APROVADO':
      case 'CONFIRMADO':
      case 'PAGO':
      case 'RESOLVIDO':
      case 'GANHO':
      case 'ATIVO':
      case 'VIGENTE':
      case 'CONCLUIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      // Pendências & Alertas
      case 'PENDENTE':
      case 'PREVISTO':
      case 'EM_ANDAMENTO':
      case 'EM_ATENDIMENTO':
      case 'PROPOSTA':
      case 'NEGOCIACAO':
      case 'COTACAO':
      case 'VENCENDO':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      // Crítico, Rejeitado, Cancelado
      case 'REJEITADO':
      case 'CANCELADO':
      case 'PERDIDO':
      case 'CRITICA':
      case 'URGENTE':
      case 'RESCINDIDO':
      case 'BAIXADO':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      // Informações & Neutros
      case 'ABERTO':
      case 'PROSPECCAO':
      case 'A_FAZER':
      case 'PEDIDO_EMITIDO':
      case 'ALTA':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'MEDIA':
      case 'BAIXA':
      case 'RENOVADO':
        return 'bg-slate-100 text-slate-700 border-slate-200';

      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wider ${getStyle()}`}
    >
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {formatText(status)}
    </span>
  );
};
