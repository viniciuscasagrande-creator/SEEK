import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, Branch, UserProfile, CorporateNotification, UserFavorite } from '../types/core';
import { COMPANIES, BRANCHES, DEMO_PROFILES, INITIAL_NOTIFICATIONS, INITIAL_FAVORITES } from '../data/mockData';
import { api } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  activeCompany: Company;
  setActiveCompany: (company: Company) => void;
  activeBranch: Branch;
  setActiveBranch: (branch: Branch) => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  companies: Company[];
  branches: Branch[];
  availableProfiles: UserProfile[];
  hasPermission: (moduleKey: string, action?: string) => boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  recoverPassword: (email: string) => Promise<boolean>;
  notifications: CorporateNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  favorites: UserFavorite[];
  toggleFavorite: (moduleCode: string, title: string, route: string) => void;
  isFavorite: (moduleCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('seek_token'));
  });
  const [activeCompany, setActiveCompanyState] = useState<Company>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('seek_company_id');
      const found = COMPANIES.find(c => c.id === savedId);
      if (found) return found;
    }
    return COMPANIES[0];
  });
  const [activeBranch, setActiveBranchState] = useState<Branch>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('seek_branch_id');
      const found = BRANCHES.find(b => b.id === savedId);
      if (found) return found;
    }
    return BRANCHES[0];
  });

  const setActiveCompany = (comp: Company) => {
    setActiveCompanyState(comp);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seek_company_id', comp.id);
    }
  };

  const setActiveBranch = (branch: Branch) => {
    setActiveBranchState(branch);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seek_branch_id', branch.id);
    }
  };
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('seek_user');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }
    }
    return DEMO_PROFILES[0]; // Fallback inicial padrão
  });
  const [notifications, setNotifications] = useState<CorporateNotification[]>(INITIAL_NOTIFICATIONS);
  const [favorites, setFavorites] = useState<UserFavorite[]>(INITIAL_FAVORITES);

  // Verificação real e restauração de sessão JWT no backend ao inicializar
  useEffect(() => {
    const verifySession = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('seek_token') : null;
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      try {
        const user = await api.getMe();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          // Em ambientes sem API acoplada (Vercel estático), preserva a sessão a partir do cache local
          const cached = localStorage.getItem('seek_user');
          if (cached) {
            try {
              setCurrentUser(JSON.parse(cached));
              setIsAuthenticated(true);
            } catch {
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch {
        // Tolerância de conexão offline: mantém cache seguro se existir
        if (localStorage.getItem('seek_user')) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    };
    verifySession();
  }, []);

  // Carregar notificações da API corporativa
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await api.getNotifications();
        if (res && res.notifications && res.notifications.length > 0) {
          setNotifications(res.notifications);
        }
      } catch {
        // Usa mock
      }
    };
    fetchNotifications();
  }, [isAuthenticated]);

  // Verificação Dinâmica de Acesso RBAC / ABAC (Pacote 1)
  const hasPermission = (moduleKey: string, action: string = 'read'): boolean => {
    // 1. Administrador Geral tem acesso irrestrito
    if (currentUser.roleLevel === 'ADMIN_GERAL') {
      return true;
    }

    // 2. Diretoria tem acesso aos módulos executivos, aprovações e relatórios
    if (currentUser.roleLevel === 'DIRETORIA') {
      if (action === 'delete' && moduleKey === 'admin') return false;
      return true;
    }

    // Início (Meu Painel, Minhas Tarefas, Minhas Aprovações, Agenda) é universal
    if (moduleKey === 'inicio' || moduleKey === 'my-workstation' || moduleKey === 'agenda' || moduleKey === 'favorites' || moduleKey === 'notifications') {
      return true;
    }

    // Para os demais perfis, verifica os módulos explicitamente autorizados na matriz
    const isAccessible = currentUser.accessibleModules.includes('*') ||
      currentUser.accessibleModules.includes(moduleKey);

    if (!isAccessible) {
      return false;
    }

    // Ações de aprovação restritas a tetos de alçada
    if (action === 'approve') {
      return currentUser.approvalLimitAmount > 0;
    }

    return true;
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanEmail) {
      return { success: false, error: 'O e-mail ou matrícula corporativa é obrigatório.' };
    }

    if (!cleanPass) {
      return { success: false, error: 'A senha de acesso corporativo é obrigatória.' };
    }

    // 1. Autenticação criptográfica real no backend via JWT (RFC 7519)
    try {
      const res = await api.login(cleanEmail, cleanPass);
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('seek_company_id', res.user.companyId || 'comp-1');
        }
        return { success: true };
      }
      // Se o backend rejeitou as credenciais (400 ou 401), não bypassa: exibe o erro real!
      if (res && !res.isNetworkOr405 && res.error) {
        return { success: false, error: res.error };
      }
    } catch {
      // Ignora erro de conexão com API externa e cai no resolvedor de contingência
    }

    // 2. Validação corporativa de contingência (ambiente estático Vercel sem API Express ativa)
    // Validação estrita de senha padrão corporativa
    if (cleanPass !== 'Seek@2026') {
      return { success: false, error: 'Credenciais corporativas inválidas: senha incorreta.' };
    }

    // Busca perfil oficial correspondente aos 13 Perfis Oficiais
    let foundProfile = DEMO_PROFILES.find(p => 
      p.email.toLowerCase() === cleanEmail ||
      p.registrationNumber?.toLowerCase() === cleanEmail ||
      p.id.toLowerCase() === cleanEmail
    );

    if (!foundProfile) {
      if (cleanEmail === 'admin' || cleanEmail === 'admin@seek.local') foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'ADMIN_GERAL');
      else if (cleanEmail.includes('diretor')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'DIRETORIA');
      else if (cleanEmail.includes('finan')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'FINANCEIRO');
      else if (cleanEmail.includes('rh')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'RH');
      else if (cleanEmail.includes('compras')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'COMPRAS');
      else if (cleanEmail.includes('ti')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'TI');
      else if (cleanEmail.includes('comercial')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'COMERCIAL');
      else if (cleanEmail.includes('gestor')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'GESTOR');
      else if (cleanEmail.includes('contabil')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'CONTABILIDADE');
      else if (cleanEmail.includes('fiscal')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'FISCAL');
      else if (cleanEmail.includes('auditor')) foundProfile = DEMO_PROFILES.find(p => p.roleLevel === 'AUDITORIA');
    }

    if (!foundProfile) {
      return { success: false, error: 'Usuário corporativo não localizado no diretório ativo do SEEK Core.' };
    }

    const sessionToken = `seek_session_${foundProfile.id}_${Date.now()}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('seek_token', sessionToken);
      localStorage.setItem('seek_user', JSON.stringify(foundProfile));
      localStorage.setItem('seek_company_id', foundProfile.companyId || 'comp-1');
    }
    setCurrentUser(foundProfile);
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = () => {
    api.logout();
    setIsAuthenticated(false);
  };

  const recoverPassword = async (email: string): Promise<boolean> => {
    try {
      return await api.recoverPassword(email);
    } catch {
      return true;
    }
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    await api.markNotificationRead(id);
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await api.markAllNotificationsRead();
  };

  const toggleFavorite = (moduleCode: string, title: string, route: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.moduleCode === moduleCode);
      if (exists) {
        return prev.filter(f => f.moduleCode !== moduleCode);
      } else {
        return [...prev, { id: `fav-${Date.now()}`, moduleCode, title, route }];
      }
    });
  };

  const isFavorite = (moduleCode: string): boolean => {
    return favorites.some(f => f.moduleCode === moduleCode);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        activeCompany,
        setActiveCompany,
        activeBranch,
        setActiveBranch,
        currentUser,
        setCurrentUser,
        companies: COMPANIES,
        branches: BRANCHES.filter(b => b.companyId === activeCompany.id),
        availableProfiles: DEMO_PROFILES,
        hasPermission,
        login,
        logout,
        recoverPassword,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        favorites,
        toggleFavorite,
        isFavorite
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
