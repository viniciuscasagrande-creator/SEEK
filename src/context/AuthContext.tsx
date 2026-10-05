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
  login: (email: string, password?: string) => boolean;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeCompany, setActiveCompany] = useState<Company>(COMPANIES[0]);
  const [activeBranch, setActiveBranch] = useState<Branch>(BRANCHES[0]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_PROFILES[0]); // Padrão: Administrador Geral
  const [notifications, setNotifications] = useState<CorporateNotification[]>(INITIAL_NOTIFICATIONS);
  const [favorites, setFavorites] = useState<UserFavorite[]>(INITIAL_FAVORITES);

  // Carregar notificações da API corporativa
  useEffect(() => {
    const fetchNotifications = async () => {
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
  }, []);

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

  const login = (email: string, password?: string): boolean => {
    const foundProfile = DEMO_PROFILES.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (foundProfile) {
      setCurrentUser(foundProfile);
      setIsAuthenticated(true);
      return true;
    }
    // Fallback: se fornecido e-mail válido, autentica no perfil correspondente ou padrão
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const recoverPassword = async (email: string): Promise<boolean> => {
    // Simula envio de e-mail com token seguro de recuperação
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 800);
    });
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
