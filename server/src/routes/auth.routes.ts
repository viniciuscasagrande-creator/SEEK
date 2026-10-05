import { Router, Request, Response } from 'express';
import { users, auditLogs } from '../db.js';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail corporativo ou matrícula é obrigatório.' });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo no SEEK Core.' });
  }

  // Gera token de sessão simulado
  const sessionToken = `seek_session_${user.id}_${Date.now()}`;

  // Grava auditoria de login
  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userName: user.fullName,
    userRole: user.roleTitle,
    action: 'LOGIN',
    module: 'Autenticação',
    entity: 'Sessão Corporativa',
    description: `Login efetuado com sucesso via perfil ${user.roleTitle} (${user.roleLevel})`,
    ipAddress: req.ip || '189.44.120.10'
  });

  return res.json({
    user,
    token: sessionToken,
    expiresIn: '8h'
  });
});

authRouter.post('/recover-password', (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (user) {
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: user.fullName,
      userRole: user.roleTitle,
      action: 'UPDATE',
      module: 'Segurança',
      entity: 'Recuperação de Senha',
      description: `Solicitação de token de redefinição de senha para ${email}`,
      ipAddress: req.ip || '189.44.120.10'
    });
  }

  return res.json({
    message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas.',
    success: true
  });
});

authRouter.get('/profiles', (_req: Request, res: Response) => {
  return res.json({
    total: users.length,
    profiles: users
  });
});
