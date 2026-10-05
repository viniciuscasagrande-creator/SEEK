import React, { createContext, useContext, useState } from 'react';
import { Company, Branch, UserProfile } from '../types/core';
import { COMPANIES, BRANCHES, DEMO_PROFILES } from '../data/mockData';

interface AuthContextType {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCompany, setActiveCompany] = useState<Company>(COMPANIES[0]);
  const [activeBranch, setActiveBranch] = useState<Branch>(BRANCHES[0]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_PROFILES[0]);

  const hasPermission = (moduleKey: string, action: string = 'read'): boolean => {
    // Diretoria / Admin Global tem permissão total
    if (currentUser.roleLevel === 'ADMIN_GLOBAL' || currentUser.roleLevel === 'DIRETORIA') {
      return true;
    }

    // Gestores têm acesso a módulos de gestão e seus respectivos departamentos
    if (currentUser.roleLevel === 'GESTOR_DEPARTAMENTO') {
      if (moduleKey === 'admin') {
        return currentUser.department === 'Tecnologia da Informação';
      }
      return true;
    }

    // Operacional tem acesso às suas tarefas e chamados, com leitura em módulos
    if (currentUser.roleLevel === 'OPERACIONAL') {
      if (moduleKey === 'admin' || moduleKey === 'governance') {
        return false;
      }
      if (action === 'approve') {
        return false;
      }
      return true;
    }

    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        activeCompany,
        setActiveCompany,
        activeBranch,
        setActiveBranch,
        currentUser,
        setCurrentUser,
        companies: COMPANIES,
        branches: BRANCHES.filter(b => b.companyId === activeCompany.id),
        availableProfiles: DEMO_PROFILES,
        hasPermission
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
