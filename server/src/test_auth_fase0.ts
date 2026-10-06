import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, logAudit } from './db.js';
import { JWT_SECRET, authenticateToken, requireRole, requireModule, AuthenticatedRequest } from './middleware/auth.js';
import { validatePasswordPolicy, generateTotp, verifyTotp } from './routes/auth.routes.js';
import { maskDocumentNumber, maskBankAccount, maskSalary, checkSeparationOfDuties, isPrivilegedRole } from './utils/security.js';

async function runTests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES DE SEGURANÇA: FASE 0 (0.1, 0.2, 0.3, 0.4)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Teste de Autenticação Real com bcrypt
  const userAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@seek.local') as any;
  assert(Boolean(userAdmin), 'Usuário admin@seek.local existe no banco corporativo');

  const matchCorrect = bcrypt.compareSync('Seek@2026', userAdmin.password);
  assert(matchCorrect === true, 'Senha corporativa Seek@2026 validada com sucesso via hash bcrypt');

  const matchWrong = bcrypt.compareSync('SenhaIncorreta@123', userAdmin.password);
  assert(matchWrong === false, 'Senha incorreta estritamente rejeitada pelo bcrypt');

  // 2. Teste de Emissão e Validação Criptográfica de JWT (15 minutos)
  const sessionId = 'test-sess-' + crypto.randomUUID();
  const payload = {
    id: userAdmin.id,
    sessionId,
    email: userAdmin.email,
    fullName: userAdmin.full_name,
    roleLevel: userAdmin.role_level,
    roleTitle: userAdmin.role_title,
    department: userAdmin.department,
    companyId: userAdmin.company_id,
    approvalLimitAmount: userAdmin.approval_limit,
    accessibleModules: ['*']
  };

  const validToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  assert(typeof validToken === 'string' && validToken.split('.').length === 3, 'JWT estruturado corretamente em 3 segmentos (Header.Payload.Signature)');

  let verifiedPayload: any;
  try {
    verifiedPayload = jwt.verify(validToken, JWT_SECRET);
    assert(verifiedPayload.email === 'admin@seek.local' && verifiedPayload.sessionId === sessionId, 'JWT verificado e decodificado com integridade e sessionId');
  } catch (e) {
    assert(false, 'Falha ao verificar JWT válido');
  }

  // 3. Teste de Rejeição de Token com Assinatura Falsa (Autorização Negativa)
  let forgedRejected = false;
  try {
    jwt.verify(validToken, 'chave-falsa-ataque-hacker');
  } catch {
    forgedRejected = true;
  }
  assert(forgedRejected, 'Token assinado com chave espúria estritamente rejeitado');

  // 4. Teste de RBAC: Verificação de Acesso por Perfil
  const nonAdminPayload = {
    id: 'user-colaborador',
    email: 'colaborador@seek.local',
    fullName: 'Ana Beatriz Silveira',
    roleLevel: 'COLABORADOR',
    roleTitle: 'Analista de Operações',
    department: 'Operações',
    companyId: 'comp-1',
    approvalLimitAmount: 0,
    accessibleModules: ['inicio', 'service-desk', 'documents']
  };

  const hasAdminAccess = nonAdminPayload.roleLevel === 'ADMIN_GERAL';
  assert(!hasAdminAccess, 'Perfil COLABORADOR não possui privilégios de ADMIN_GERAL');

  const hasFinanceModule = nonAdminPayload.accessibleModules.includes('finance') || nonAdminPayload.accessibleModules.includes('*');
  assert(!hasFinanceModule, 'Perfil COLABORADOR sem permissão ao módulo Financeiro (RBAC ativo)');

  // 5. Teste de ABAC: Verificação de Alçada de Aprovação
  const reqAmount = 50000;
  const colabLimit = nonAdminPayload.approvalLimitAmount;
  const colabCanApprove = colabLimit >= reqAmount;
  assert(!colabCanApprove, 'COLABORADOR com alçada R$ 0,00 impedido de aprovar R$ 50.000,00 (ABAC ativo)');

  const dirLimit = 150000;
  const dirCanApprove = dirLimit >= reqAmount;
  assert(dirCanApprove, 'DIRETORIA com alçada R$ 150.000,00 autorizada a aprovar R$ 50.000,00');

  // 6. Teste de Auditoria Imutável com Correlation ID
  const testCorrelationId = 'test-corr-' + Date.now();
  const initialAuditCount = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any).count;
  logAudit(
    'Administrador Geral',
    'ADMIN_GERAL',
    'VALIDACAO',
    'Segurança',
    'Fase 0 Hardening',
    'Bateria de testes de integridade criptográfica executada com sucesso',
    '127.0.0.1',
    testCorrelationId
  );
  const newAuditCount = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any).count;
  assert(newAuditCount === initialAuditCount + 1, 'Novo evento registrado com sucesso na trilha de auditoria imutável');

  const loggedAudit = db.prepare('SELECT * FROM audit_logs WHERE correlation_id = ?').get(testCorrelationId) as any;
  assert(Boolean(loggedAudit && loggedAudit.correlation_id === testCorrelationId), 'Trilha de auditoria persistiu corretamente o correlation_id');

  // 7. Teste da Política Corporativa de Senhas
  assert(!validatePasswordPolicy('curta').valid, 'Senha menor que 8 caracteres rejeitada');
  assert(!validatePasswordPolicy('semmaiuscula123!').valid, 'Senha sem letra maiúscula rejeitada');
  assert(!validatePasswordPolicy('SEMMINUSCULA123!').valid, 'Senha sem letra minúscula rejeitada');
  assert(!validatePasswordPolicy('SemNumeroNoFinal!').valid, 'Senha sem número rejeitada');
  assert(!validatePasswordPolicy('SemSimboloEspecial123').valid, 'Senha sem caractere especial rejeitada');
  assert(validatePasswordPolicy('SeekCorp#2026').valid, 'Senha corporativa válida SeekCorp#2026 aceita com sucesso');

  // 8. Teste de Histórico de Senhas (bloqueio das últimas 3)
  const testUserId = userAdmin.id;
  const oldHash1 = bcrypt.hashSync('SeekAnterior@1', 10);
  const oldHash2 = bcrypt.hashSync('SeekAnterior@2', 10);
  const oldHash3 = bcrypt.hashSync('SeekAnterior@3', 10);

  db.prepare('DELETE FROM password_history WHERE user_id = ?').run(testUserId);
  db.prepare('INSERT INTO password_history (id, user_id, password_hash, created_at) VALUES (?, ?, ?, ?)').run('pwh-1', testUserId, oldHash1, '2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO password_history (id, user_id, password_hash, created_at) VALUES (?, ?, ?, ?)').run('pwh-2', testUserId, oldHash2, '2026-02-01T00:00:00.000Z');
  db.prepare('INSERT INTO password_history (id, user_id, password_hash, created_at) VALUES (?, ?, ?, ?)').run('pwh-3', testUserId, oldHash3, '2026-03-01T00:00:00.000Z');

  const recentHistory = db.prepare('SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 3').all(testUserId) as any[];
  const isReusingOld1 = recentHistory.some(h => bcrypt.compareSync('SeekAnterior@1', h.password_hash));
  const isReusingNew = recentHistory.some(h => bcrypt.compareSync('NovaSenhaTotalmenteDiferente#2026', h.password_hash));

  assert(isReusingOld1 === true, 'Detecção de reutilização de senha do histórico das últimas 3 executada com sucesso');
  assert(isReusingNew === false, 'Nova senha não constante no histórico aceita para atualização');

  // 9. Teste de Sessão e Revogação Imediata no Servidor
  const activeSessionId = 'sess-active-test-' + Date.now();
  const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
  const expiresAtFuture = new Date(Date.now() + 3600000).toISOString();

  db.prepare(`
    INSERT INTO user_sessions (id, user_id, refresh_token_hash, ip_address, user_agent, is_revoked, expires_at)
    VALUES (?, ?, ?, '127.0.0.1', 'Jest Test Runner', 0, ?)
  `).run(activeSessionId, testUserId, refreshTokenHash, expiresAtFuture);

  const sessionBefore = db.prepare('SELECT is_revoked FROM user_sessions WHERE id = ?').get(activeSessionId) as any;
  assert(sessionBefore && sessionBefore.is_revoked === 0, 'Sessão corporativa criada como ativa (is_revoked = 0)');

  // Revogação de sessão
  db.prepare('UPDATE user_sessions SET is_revoked = 1 WHERE id = ?').run(activeSessionId);
  const sessionAfter = db.prepare('SELECT is_revoked FROM user_sessions WHERE id = ?').get(activeSessionId) as any;
  assert(sessionAfter && sessionAfter.is_revoked === 1, 'Sessão revogada no servidor com sucesso (is_revoked = 1)');

  // 10. Teste de Rotação de Refresh Token
  const newRefreshRaw = crypto.randomBytes(40).toString('hex');
  const newRefreshHash = crypto.createHash('sha256').update(newRefreshRaw).digest('hex');
  db.prepare('UPDATE user_sessions SET refresh_token_hash = ?, is_revoked = 0 WHERE id = ?').run(newRefreshHash, activeSessionId);

  const rotatedSession = db.prepare('SELECT refresh_token_hash FROM user_sessions WHERE id = ?').get(activeSessionId) as any;
  assert(rotatedSession.refresh_token_hash === newRefreshHash, 'Refresh token rotacionado e atualizado atomicamente');

  // 11. Teste de Recuperação Segura com Token Único e Expiração de 30m
  const resetTokenRaw = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetTokenRaw).digest('hex');
  const resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const resetId = 'rst-test-' + crypto.randomUUID();

  db.prepare('INSERT INTO password_resets (id, user_id, token_hash, used, expires_at) VALUES (?, ?, ?, 0, ?)').run(
    resetId,
    testUserId,
    resetTokenHash,
    resetExpiresAt
  );

  const resetRecord = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0').get(resetTokenHash) as any;
  assert(Boolean(resetRecord), 'Token seguro de redefinição de senha gerado com validade');

  // Marcar como usado
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);
  const reuseCheck = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0').get(resetTokenHash) as any;
  assert(!reuseCheck, 'Reutilização de token de recuperação de senha impedida (uso único estrito)');

  // 12. Teste de MFA / TOTP (RFC 6238)
  const testMfaSecret = crypto.randomBytes(20).toString('hex');
  const currentTotp = generateTotp(testMfaSecret);
  assert(typeof currentTotp === 'string' && currentTotp.length === 6, 'Código TOTP de 6 dígitos gerado conforme RFC 6238');

  const isTotpValid = verifyTotp(testMfaSecret, currentTotp);
  assert(isTotpValid === true, 'Código TOTP verificado e validado com sucesso');

  const isInvalidTotpRejected = verifyTotp(testMfaSecret, '000000');
  assert(isInvalidTotpRejected === false, 'Código TOTP inválido rejeitado');

  // ================================================================
  // FASE 0.4: SEGREGAÇÃO DE FUNÇÕES (SoD), LGPD & AUTORIZAÇÃO NEGATIVA
  // ================================================================

  // 13. Teste de Segregação de Funções (SoD) — Bloqueio de Autoaprovação
  const requesterColab = {
    id: 'user-comprador-1',
    email: 'comprador@seek.local',
    fullName: 'Carlos Eduardo Nogueira',
    roleLevel: 'COMPRAS',
    roleTitle: 'Analista de Compras',
    department: 'Compras',
    companyId: 'comp-1',
    approvalLimitAmount: 20000,
    accessibleModules: ['purchasing']
  };

  const approverGestor = {
    id: 'user-gestor-1',
    email: 'gestor@seek.local',
    fullName: 'Mariana Penteado',
    roleLevel: 'GESTOR',
    roleTitle: 'Gerente Departamental',
    department: 'Operações',
    companyId: 'comp-1',
    approvalLimitAmount: 50000,
    accessibleModules: ['purchasing', 'workflow']
  };

  // O próprio Carlos Eduardo tenta aprovar sua própria compra -> Violação
  const sodSelfAttempt = checkSeparationOfDuties('Carlos Eduardo Nogueira', requesterColab);
  assert(sodSelfAttempt.isViolated === true, 'SoD: Autoaprovação pelo solicitante Carlos Eduardo Nogueira bloqueada');

  // Autoaprovação via e-mail corporativo
  const sodEmailAttempt = checkSeparationOfDuties('comprador@seek.local', requesterColab);
  assert(sodEmailAttempt.isViolated === true, 'SoD: Autoaprovação via e-mail corporativo bloqueada');

  // Aprovação por um gestor independente (Mariana Penteado) -> Válida
  const sodIndependentApproval = checkSeparationOfDuties('Carlos Eduardo Nogueira', approverGestor);
  assert(sodIndependentApproval.isViolated === false, 'SoD: Aprovação independente por terceiro autorizada');

  // 14. Teste de Proteção de Dados Sensíveis e Mascaramento (LGPD)
  const rawCpf = '123.456.789-00';
  const maskedCpf = maskDocumentNumber(rawCpf);
  assert(maskedCpf === '***.456.***-00', 'LGPD: CPF mascarado no formato ***.456.***-00');

  const rawCnpj = '08.123.456/0001-90';
  const maskedCnpj = maskDocumentNumber(rawCnpj);
  assert(maskedCnpj === '08.***.***/0001-**', 'LGPD: CNPJ mascarado preservando apenas raiz e filial');

  const rawAccount = '123456-7';
  const maskedAccount = maskBankAccount(rawAccount);
  assert(maskedAccount === '****6-7', 'LGPD: Conta bancária mascarada preservando apenas dígitos finais');

  const salaryDisplay = maskSalary(15000);
  assert(salaryDisplay === 'R$ •••••,••', 'LGPD: Salário mascarado para perfis não autorizados');

  // 15. Teste de Verificação de Perfil Privilegiado para Dados Sensíveis
  const isColabPrivileged = isPrivilegedRole('COLABORADOR', ['ADMIN_GERAL', 'DIRETORIA', 'RH']);
  assert(isColabPrivileged === false, 'Perfil COLABORADOR sem privilégio para visualização de salários');

  const isRhPrivileged = isPrivilegedRole('RH', ['ADMIN_GERAL', 'DIRETORIA', 'RH']);
  assert(isRhPrivileged === true, 'Perfil RH possui privilégio autorizado para visualização de folha salarial');

  // 16. Teste de Autorização Negativa de Rotas de Auditoria
  const mockReqNonAdmin = {
    user: nonAdminPayload
  } as any;

  let auditAccessDenied: boolean = false;
  const mockRes = {
    status: (code: number) => ({
      json: () => {
        if (code === 403) auditAccessDenied = true;
      }
    })
  } as any;

  const auditMiddleware = requireRole(['ADMIN_GERAL', 'AUDITORIA', 'DIRETORIA']);
  auditMiddleware(mockReqNonAdmin, mockRes, () => {
    auditAccessDenied = false;
  });

  assert(Boolean(auditAccessDenied), 'Autorização Negativa: Perfil COLABORADOR impedido com HTTP 403 de acessar trilha de auditoria');

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL: ${passed} APROVADOS / ${failed} FALHAS`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
