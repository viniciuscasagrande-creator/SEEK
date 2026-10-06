import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const JWT_SECRET = process.env.JWT_SECRET || 'seek-corp-sec-jwt-2026-auth-prod-token-salt';

export interface TokenPayload {
  id: string;
  email: string;
  fullName: string;
  roleLevel: string;
  roleTitle: string;
  department: string;
  companyId: string;
  approvalLimitAmount: number;
  accessibleModules: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Acesso não autorizado: token de autenticação corporativo ausente.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (_err) {
    res.status(401).json({ error: 'Sessão expirada ou token corporativo inválido. Efetue login novamente.' });
    return;
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado.' });
      return;
    }
    if (req.user.roleLevel === 'ADMIN_GERAL' || allowedRoles.includes(req.user.roleLevel)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Acesso negado: perfil corporativo sem privilégios suficientes para esta operação.' });
  };
};

export const requireModule = (moduleKey: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado.' });
      return;
    }
    const hasAccess = req.user.roleLevel === 'ADMIN_GERAL' ||
      req.user.accessibleModules.includes('*') ||
      req.user.accessibleModules.includes(moduleKey);

    if (hasAccess) {
      next();
      return;
    }
    res.status(403).json({ error: `Acesso negado: seu perfil não possui acesso ao módulo corporativo '${moduleKey}'.` });
  };
};
