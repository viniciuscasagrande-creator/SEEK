import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, logAudit } from '../db.js';
import { JWT_SECRET, authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail corporativo e senha são obrigatórios.' });
    }

    const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND active = 1').get(email) as any;

    if (!row) {
      return res.status(401).json({ error: 'Credenciais inválidas: e-mail ou senha incorretos.' });
    }

    // Validação estrita de senha via hash criptográfico bcrypt
    const passwordMatch = bcrypt.compareSync(password, row.password);
    if (!passwordMatch) {
      logAudit(
        row.full_name || email,
        row.role_title || 'Não Autenticado',
        'LOGIN_FALHA',
        'Autenticação',
        'Sessão Corporativa',
        `Tentativa de login com senha incorreta para ${email}`,
        req.ip || '127.0.0.1'
      );
      return res.status(401).json({ error: 'Credenciais inválidas: e-mail ou senha incorretos.' });
    }

    // Atualiza último login
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, row.id);

    // Formata perfil de usuário corporativo
    const accessibleModules = row.accessible_modules === '*' ? ['*'] : row.accessible_modules.split(',');
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
      accessibleModules,
      active: Boolean(row.active),
      lastLoginAt: now
    };

    // Assina JWT com chave segura e expiração formal de 8 horas
    const token = jwt.sign(
      {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        roleLevel: row.role_level,
        roleTitle: row.role_title,
        department: row.department,
        companyId: row.company_id,
        approvalLimitAmount: row.approval_limit,
        accessibleModules
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Grava auditoria de login
    logAudit(
      row.full_name,
      row.role_title,
      'LOGIN',
      'Autenticação',
      'Sessão Corporativa',
      `Login autenticado com sucesso (JWT emitido para ${row.role_title})`,
      req.ip || '127.0.0.1'
    );

    return res.json({
      user,
      token,
      expiresIn: '8h'
    });
  } catch (error: any) {
    console.error('Erro no login corporativo:', error);
    return res.status(500).json({ error: 'Falha interna durante autenticação corporativa.' });
  }
});

// Endpoint para validar token ativo e restaurar sessão segura
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser) {
      return res.status(401).json({ error: 'Sessão inválida.' });
    }

    const row = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(tokenUser.id) as any;
    if (!row) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo no SEEK Core.' });
    }

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
      lastLoginAt: row.last_login_at
    };

    return res.json({ user });
  } catch (error: any) {
    console.error('Erro em /me:', error);
    return res.status(500).json({ error: 'Falha ao carregar sessão autenticada.' });
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
        `Solicitação de recuperação de senha corporativa para ${email}`,
        req.ip || '127.0.0.1'
      );
    }

    return res.json({
      message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas.',
      success: true
    });
  } catch (error: any) {
    console.error('Erro em recover-password:', error);
    return res.status(500).json({ error: 'Falha ao processar solicitação de recuperação.' });
  }
});

authRouter.get('/profiles', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT id, company_id, email, registration_number, full_name, role_level, role_title, department, approval_limit, accessible_modules, active FROM users WHERE active = 1 ORDER BY approval_limit DESC').all() as any[];
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
    console.error('Erro ao listar perfis:', error);
    return res.status(500).json({ error: 'Falha ao carregar perfis autorizados.' });
  }
});
