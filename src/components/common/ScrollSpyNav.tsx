import React from 'react';
import { ChevronUp } from 'lucide-react';
import { useScrollSpy, ScrollSpySection } from '../../hooks/useScrollSpy';

export interface ScrollSpyNavProps {
  sections: ScrollSpySection[];
  containerId?: string;
  className?: string;
  showBackToTop?: boolean;
}

export const ScrollSpyNav: React.FC<ScrollSpyNavProps> = ({
  sections,
  containerId = 'seek-main-scroll-container',
  className = '',
  showBackToTop = true
}) => {
  const sectionIds = sections.map(s => s.id);
  const { activeId, scrollToSection } = useScrollSpy(sectionIds, { containerId, offset: 120 });

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="ScrollSpy Navegação de Seções"
      className={`sticky top-0 z-20 mb-4 flex items-center justify-between rounded-xl border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-2xs backdrop-blur-md transition-all ${className}`}
    >
      <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 text-xs font-semibold scrollbar-none">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
          Seções:
        </span>
        {sections.map(section => {
          const isActive = activeId === section.id;
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 transition-all cursor-pointer whitespace-nowrap text-xs ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {Icon && <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />}
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>

      {showBackToTop && (
        <button
          onClick={() => {
            const container = document.getElementById(containerId);
            if (container) {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          title="Rolar até o topo"
          className="ml-2 flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shrink-0 transition-colors shadow-2xs"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Topo</span>
        </button>
      )}
    </nav>
  );
};
