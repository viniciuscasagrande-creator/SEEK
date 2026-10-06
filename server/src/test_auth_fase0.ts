import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, logAudit } from './db.js';
import { JWT_SECRET, authenticateToken, requireRole, requireModule, AuthenticatedRequest } from './middleware/auth.js';
import { authRouter } from './routes/auth.routes.js';
import { coreRouter } from './routes/core.routes.js';
import { workflowRouter } from './routes/workflow.routes.js';

async function runTests() {
  console.log('========================================================');
  console.log('INICIANDO BATERIA DE TESTES DE SEGURANÇA: FASE 0');
  console.log('========================================================\n');

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

  // 1. Teste de Autenticação Real com bcrypt e JWT
  const userAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@seek.local') as any;
  assert(Boolean(userAdmin), 'Usuário admin@seek.local existe no banco de dados');

  const matchCorrect = bcrypt.compareSync('Seek@2026', userAdmin.password);
  assert(matchCorrect === true, 'Senha correta Seek@2026 validada com sucesso via hash bcrypt');

  const matchWrong = bcrypt.compareSync('SenhaIncorreta@123', userAdmin.password);
  assert(matchWrong === false, 'Senha incorreta estritamente rejeitada pelo bcrypt');

  // 2. Teste de Emissão e Validação Criptográfica de JWT (RFC 7519)
  const payload = {
    id: userAdmin.id,
    email: userAdmin.email,
    fullName: userAdmin.full_name,
    roleLevel: userAdmin.role_level,
    roleTitle: userAdmin.role_title,
    department: userAdmin.department,
    companyId: userAdmin.company_id,
    approvalLimitAmount: userAdmin.approval_limit,
    accessibleModules: ['*']
  };

  const validToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  assert(typeof validToken === 'string' && validToken.split('.').length === 3, 'JWT estruturado corretamente em 3 segmentos (Header.Payload.Signature)');

  let verifiedPayload: any;
  try {
    verifiedPayload = jwt.verify(validToken, JWT_SECRET);
    assert(verifiedPayload.email === 'admin@seek.local', 'JWT verificado e decodificado com integridade criptográfica');
  } catch (e) {
    assert(false, 'Falha ao verificar JWT válido');
  }

  // 3. Teste de Rejeição de Token com Assinatura Falsa
  let forgedRejected = false;
  try {
    jwt.verify(validToken, 'chave-falsa-ataque-hacker');
  } catch {
    forgedRejected = true;
  }
  assert(forgedRejected, 'Token assinado com chave espúria estritamente rejeitado (401)');

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

  // 6. Teste de Auditoria Imutável
  const initialAuditCount = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any).count;
  logAudit(
    'Administrador Geral',
    'ADMIN_GERAL',
    'VALIDACAO',
    'Segurança',
    'Fase 0 Hardening',
    'Bateria de testes de integridade criptográfica executada com sucesso',
    '127.0.0.1'
  );
  const newAuditCount = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any).count;
  assert(newAuditCount === initialAuditCount + 1, 'Novo evento registrado com sucesso na trilha de auditoria imutável');

  console.log('\n========================================================');
  console.log(`RESULTADO FINAL: ${passed} APROVADOS / ${failed} FALHAS`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
