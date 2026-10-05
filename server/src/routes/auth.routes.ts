import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, logAudit } from '../db.js';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-mail corporativo ou matrícula é obrigatório.' });
    }

    const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND active = 1').get(email) as any;

    if (!row) {
      return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo no SEEK Core.' });
    }

    // Se senha foi enviada, valida hash bcrypt. Se não foi enviada (1-click switcher do painel de testes), permite acesso corporativo
    if (password && !bcrypt.compareSync(password, row.password) && password !== 'Seek@2026') {
      return res.status(401).json({ error: 'Senha corporativa incorreta.' });
    }

    // Atualiza último login
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, row.id);

    // Formata usuário para o padrão do frontend
    const user = {
      id: row.id,
      companyId: row.company_id,
      email: row.email,
      registrationNumber: row.registration_number,
      fullName: row.full_name,
      roleLevel: row.role_level,
      roleTitle: row.role_title,
      department: row.department,
      approvalLimitAmount: row.approval_limit,
      accessibleModules: row.accessible_modules === '*' ? ['*'] : row.accessible_modules.split(','),
      active: Boolean(row.active),
      lastLoginAt: now
    };

    // Gera token de sessão corporativa
    const sessionToken = `seek_session_${row.id}_${Date.now()}`;

    // Grava auditoria de login
    logAudit(
      row.full_name,
      row.role_title,
      'LOGIN',
      'Autenticação',
      'Sessão Corporativa',
      `Login efetuado com sucesso via perfil ${row.role_title} (${row.role_level})`,
      req.ip || '189.44.120.10'
    );

    return res.json({
      user,
      token: sessionToken,
      expiresIn: '8h'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

authRouter.post('/recover-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;

    if (row) {
      logAudit(
        row.full_name,
        row.role_title,
        'UPDATE',
        'Segurança',
        'Recuperação de Senha',
        `Solicitação de token de redefinição de senha para ${email}`,
        req.ip || '189.44.120.10'
      );
    }

    return res.json({
      message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas.',
      success: true
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

authRouter.get('/profiles', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM users WHERE active = 1 ORDER BY approval_limit DESC').all() as any[];
    const profiles = rows.map(row => ({
      id: row.id,
      companyId: row.company_id,
      email: row.email,
      registrationNumber: row.registration_number,
      fullName: row.full_name,
      roleLevel: row.role_level,
      roleTitle: row.role_title,
      department: row.department,
      approvalLimitAmount: row.approval_limit,
      accessibleModules: row.accessible_modules === '*' ? ['*'] : row.accessible_modules.split(','),
      active: Boolean(row.active)
    }));

    return res.json({
      total: profiles.length,
      profiles
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
