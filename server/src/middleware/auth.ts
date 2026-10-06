import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'seek-corp-sec-jwt-2026-auth-prod-token-salt';

export interface TokenPayload {
  id: string;
  sessionId?: string;
  email: string;
  fullName: string;
  roleLevel: string;
  roleTitle: string;
  department: string;
  companyId: string;
  branchId?: string;
  approvalLimitAmount: number;
  accessibleModules: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  companyId?: string;
  branchId?: string;
  correlationId?: string;
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

    // Se o token foi emitido com um sessionId, validação de revogação em tempo real no banco
    if (decoded.sessionId) {
      try {
        const session = db.prepare('SELECT is_revoked, expires_at FROM user_sessions WHERE id = ?').get(decoded.sessionId) as { is_revoked: number; expires_at: string } | undefined;
        if (session) {
          if (session.is_revoked === 1) {
            res.status(401).json({ error: 'Sessão corporativa revogada ou encerrada pelo servidor. Efetue login novamente.' });
            return;
          }
          if (new Date(session.expires_at) < new Date()) {
            res.status(401).json({ error: 'Sessão expirada. Efetue novo login com suas credenciais corporativas.' });
            return;
          }
          // Atualiza timestamp da última atividade da sessão
          db.prepare('UPDATE user_sessions SET last_active_at = ? WHERE id = ?').run(new Date().toISOString(), decoded.sessionId);
        }
      } catch (dbErr) {
        // Log interno sem expor erro ao cliente
        console.error('[Auth Middleware] Erro na verificação de sessão:', dbErr);
      }
    }

    // Contexto Multiempresa & Multifilial (Cabeçalhos ou payload)
    req.companyId = (req.headers['x-company-id'] as string) || decoded.companyId || 'comp-1';
    req.branchId = (req.headers['x-branch-id'] as string) || decoded.branchId || 'branch-1';
    req.correlationId = (req.headers['x-correlation-id'] as string) || (req as any).correlationId;
    next();
  } catch (_err) {
    res.status(401).json({ error: 'Sessão expirada ou token corporativo inválido. Efetue login novamente.' });
    return;
  }
};

export const requireApprovalLimit = (getAmount: (req: AuthenticatedRequest) => number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado.' });
      return;
    }
    if (req.user.roleLevel === 'ADMIN_GERAL' || req.user.roleLevel === 'DIRETORIA') {
      next();
      return;
    }
    const amount = getAmount(req);
    if (amount > req.user.approvalLimitAmount) {
      res.status(403).json({
        error: `Alçada insuficiente: o valor (R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede seu teto de alçada autorizado (R$ ${req.user.approvalLimitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Requer aprovação de alçada executiva superior.`
      });
      return;
    }
    next();
  };
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
