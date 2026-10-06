import { useState, useEffect, useCallback } from 'react';

export interface ScrollSpySection {
  id: string;
  label: string;
  icon?: any;
}

export function useScrollSpy(
  sectionIds: string[],
  options: {
    offset?: number;
    containerId?: string;
  } = {}
) {
  const { offset = 100, containerId = 'seek-main-scroll-container' } = options;
  const [activeId, setActiveId] = useState<string>(sectionIds[0] || '');

  const handleScroll = useCallback(() => {
    const container = document.getElementById(containerId) || window;
    const isWindow = container === window;
    const scrollPosition = isWindow ? window.scrollY : (container as HTMLElement).scrollTop;

    for (let i = sectionIds.length - 1; i >= 0; i--) {
      const id = sectionIds[i];
      const element = document.getElementById(id);
      if (element) {
        const top = isWindow
          ? element.getBoundingClientRect().top + window.scrollY
          : element.offsetTop;

        if (scrollPosition >= top - offset) {
          setActiveId(id);
          return;
        }
      }
    }

    if (sectionIds.length > 0) {
      setActiveId(sectionIds[0]);
    }
  }, [sectionIds, offset, containerId]);

  useEffect(() => {
    const container = document.getElementById(containerId) || window;
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerId, handleScroll]);

  const scrollToSection = useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveId(id);
      }
    },
    []
  );

  return { activeId, scrollToSection };
}
