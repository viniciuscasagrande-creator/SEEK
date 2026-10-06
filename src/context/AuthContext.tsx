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
  const [activeCompany, setActiveCompany] = useState<Company>(COMPANIES[0]);
  const [activeBranch, setActiveBranch] = useState<Branch>(BRANCHES[0]);
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
          api.logout();
          setIsAuthenticated(false);
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
    if (!password) {
      return { success: false, error: 'A senha corporativa é obrigatória.' };
    }

    // 1. Tenta autenticação real no backend via JWT (RFC 7519)
    const res = await api.login(email, password);
    if (res && res.success && res.user) {
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      return { success: true };
    }

    // 2. Se a API retornou erro explícito de credencial do backend (ex: 400 ou 401 do Express)
    if (res && !res.isNetworkOr405 && res.error) {
      return { success: false, error: res.error };
    }

    // 3. Fallback resiliente para deploy estático (Vercel) e modo demonstração:
    // Permite autenticação dos 13 perfis oficiais com a credencial homologada 'Seek@2026'
    const foundProfile = DEMO_PROFILES.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (foundProfile) {
      if (password === 'Seek@2026') {
        const demoToken = `seek_demo_${foundProfile.id}_${Date.now()}`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('seek_token', demoToken);
          localStorage.setItem('seek_user', JSON.stringify(foundProfile));
        }
        setCurrentUser(foundProfile);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: 'Credenciais inválidas: senha corporativa incorreta.' };
      }
    }

    return { success: false, error: res?.error || 'Credenciais inválidas: e-mail ou senha incorretos.' };
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
