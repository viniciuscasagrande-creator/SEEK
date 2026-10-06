// SEEK Core — Repositório de Usuários, Credenciais e Sessões
import { db } from '../db.js';
import crypto from 'crypto';

export interface UserEntity {
  id: string;
  company_id: string;
  email: string;
  registration_number: string;
  password?: string;
  full_name: string;
  role_level: string;
  role_title: string;
  department: string;
  approval_limit: number;
  accessible_modules: string;
  active: number;
  mfa_enabled: number;
  mfa_secret?: string;
  last_login_at?: string;
  created_at?: string;
}

export interface UserSessionEntity {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  ip_address: string;
  user_agent: string;
  is_revoked: number;
  expires_at: string;
  created_at: string;
  last_active_at: string;
}

export class UserRepository {
  findByEmail(email: string): UserEntity | undefined {
    return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND active = 1').get(email) as UserEntity | undefined;
  }

  findById(id: string): UserEntity | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(id) as UserEntity | undefined;
  }

  listActive(companyId?: string): UserEntity[] {
    let sql = 'SELECT id, company_id, email, registration_number, full_name, role_level, role_title, department, approval_limit, accessible_modules, active, mfa_enabled, last_login_at FROM users WHERE active = 1';
    const params: any[] = [];
    if (companyId) {
      sql += ' AND company_id = ?';
      params.push(companyId);
    }
    sql += ' ORDER BY approval_limit DESC, full_name ASC';
    return db.prepare(sql).all(...params) as UserEntity[];
  }

  updateLastLogin(id: string, timestamp: string): void {
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(timestamp, id);
  }

  updatePassword(id: string, hash: string): void {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, id);
  }

  setMfaSecret(userId: string, secret: string): void {
    db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(secret, userId);
  }

  activateMfa(userId: string): void {
    db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(userId);
  }

  // --- SESSÕES ---
  createSession(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: string;
    createdAt: string;
  }): void {
    db.prepare(`
      INSERT INTO user_sessions (id, user_id, refresh_token_hash, ip_address, user_agent, is_revoked, expires_at, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      data.id,
      data.userId,
      data.refreshTokenHash,
      data.ipAddress,
      data.userAgent,
      data.expiresAt,
      data.createdAt,
      data.createdAt
    );
  }

  findSessionByRefreshHash(hash: string): UserSessionEntity | undefined {
    return db.prepare('SELECT * FROM user_sessions WHERE refresh_token_hash = ? AND is_revoked = 0').get(hash) as UserSessionEntity | undefined;
  }

  findSessionById(id: string): UserSessionEntity | undefined {
    return db.prepare('SELECT * FROM user_sessions WHERE id = ?').get(id) as UserSessionEntity | undefined;
  }

  rotateRefreshToken(sessionId: string, newHash: string, newExpiresAt: string, now: string): void {
    db.prepare(`
      UPDATE user_sessions
      SET refresh_token_hash = ?, expires_at = ?, last_active_at = ?
      WHERE id = ?
    `).run(newHash, newExpiresAt, now, sessionId);
  }

  revokeSession(sessionId: string): void {
    db.prepare('UPDATE user_sessions SET is_revoked = 1 WHERE id = ?').run(sessionId);
  }

  revokeAllUserSessions(userId: string): void {
    db.prepare('UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?').run(userId);
  }

  listSessions(userId?: string, limit: number = 50): any[] {
    if (userId) {
      return db.prepare(`
        SELECT id, user_id as userId, ip_address as ipAddress, user_agent as userAgent,
               is_revoked as isRevoked, expires_at as expiresAt, created_at as createdAt,
               last_active_at as lastActiveAt
        FROM user_sessions
        WHERE user_id = ?
        ORDER BY last_active_at DESC
        LIMIT ?
      `).all(userId, limit);
    } else {
      return db.prepare(`
        SELECT s.id, s.user_id as userId, u.full_name as userName, u.email as userEmail,
               u.role_level as userRole, s.ip_address as ipAddress, s.user_agent as userAgent,
               s.is_revoked as isRevoked, s.expires_at as expiresAt, s.created_at as createdAt,
               s.last_active_at as lastActiveAt
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.last_active_at DESC
        LIMIT ?
      `).all(limit);
    }
  }

  // --- HISTÓRICO DE SENHAS ---
  getPasswordHistory(userId: string, limit: number = 3): { password_hash: string }[] {
    return db.prepare(`
      SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(userId, limit) as { password_hash: string }[];
  }

  addPasswordHistory(userId: string, hash: string, createdAt: string): void {
    db.prepare(`
      INSERT INTO password_history (id, user_id, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `).run('pwh-' + crypto.randomUUID(), userId, hash, createdAt);
  }

  // --- RECUPERAÇÃO DE SENHAS ---
  createPasswordReset(id: string, userId: string, tokenHash: string, expiresAt: string): void {
    db.prepare(`
      INSERT INTO password_resets (id, user_id, token_hash, used, expires_at)
      VALUES (?, ?, ?, 0, ?)
    `).run(id, userId, tokenHash, expiresAt);
  }

  findActivePasswordReset(tokenHash: string): any | undefined {
    return db.prepare(`
      SELECT * FROM password_resets WHERE token_hash = ? AND used = 0
    `).get(tokenHash);
  }

  markPasswordResetUsed(id: string): void {
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(id);
  }
}

export const userRepository = new UserRepository();
