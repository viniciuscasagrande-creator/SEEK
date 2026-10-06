// SEEK — Teste Automatizado de Banco de Dados Relacional & Migrations (Fase 1: PostgreSQL / SQLite Dual)
import { db, getDatabaseEngine, formatSqlForEngine, runTransaction, getMigrationsStatus, isPostgresConfigured } from './db.js';
import { runMigrations } from './migrate.js';

async function runFase1Tests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES: FASE 1 — POSTGRESQL & MIGRATIONS');
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

  // 1. Verificação da Tabela de Controle de Migrations
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'
  `).get() as any;
  assert(Boolean(tableCheck), 'Tabela schema_migrations criada e operacional');

  // 2. Verificação de Migrations Aplicadas
  const migrationsStatus = getMigrationsStatus();
  assert(migrationsStatus.totalApplied >= 6, `Total de migrations aplicadas no banco (${migrationsStatus.totalApplied}/6)`);

  const appliedVersions = migrationsStatus.migrations.map(m => m.version);
  assert(appliedVersions.includes('001'), 'Migration 001 (Core & Identity) confirmada no banco');
  assert(appliedVersions.includes('002'), 'Migration 002 (Financeiro & Tesouraria) confirmada no banco');
  assert(appliedVersions.includes('003'), 'Migration 003 (Contabilidade & Fiscal) confirmada no banco');
  assert(appliedVersions.includes('004'), 'Migration 004 (Operações & CRM) confirmada no banco');
  assert(appliedVersions.includes('005'), 'Migration 005 (RH, Estoque & Governança) confirmada no banco');
  assert(appliedVersions.includes('006'), 'Migration 006 (Segurança Hardening Fase 0) confirmada no banco');

  // 3. Teste de Idempotência do Motor de Migrations
  try {
    await runMigrations();
    const reRun = await runMigrations();
    assert(reRun.appliedCount === 0, 'Idempotência do motor: segunda execução não reaplica migrations existentes');
  } catch (err) {
    assert(false, 'Falha ao testar idempotência do motor de migrations');
  }

  // 4. Teste de Tradução de Dialeto SQL (SQLite '?' vs PostgreSQL '$1, $2, ...')
  const rawSql = 'SELECT * FROM users WHERE email = ? AND company_id = ? AND active = ?';
  const sqliteSql = formatSqlForEngine(rawSql, 'sqlite');
  assert(sqliteSql === rawSql, 'Dialeto SQLite preserva parâmetros posicionais (?)');

  const pgSql = formatSqlForEngine(rawSql, 'postgres');
  assert(pgSql === 'SELECT * FROM users WHERE email = $1 AND company_id = $2 AND active = $3', 'Dialeto PostgreSQL converte parâmetros para ($1, $2, $3)');

  // 5. Teste de Detecção do Motor de Banco
  const currentEngine = getDatabaseEngine();
  assert(currentEngine === 'sqlite' || currentEngine === 'postgres', `Motor de banco de dados detectado: ${currentEngine.toUpperCase()}`);

  // 6. Teste de Transações Atômicas (Commit com Sucesso)
  const testRecordId = `test-rec-${Date.now()}`;
  try {
    await runTransaction(async client => {
      client.prepare(`
        INSERT INTO corporate_parameters (key, value, description)
        VALUES (?, 'ATIVO', 'Teste transacional de integridade Fase 1')
      `).run(`PARAM_TEST_${Date.now()}`);
    });
    assert(true, 'Transação atômica concluída e comitada com sucesso');
  } catch (e) {
    assert(false, 'Falha na execução de transação atômica válida');
  }

  // 7. Teste de Transações Atômicas com Rollback em Falha
  const rollbackKey = `PARAM_ROLLBACK_${Date.now()}`;
  let rollbackSuccess = false;
  try {
    await runTransaction(async client => {
      client.prepare(`
        INSERT INTO corporate_parameters (key, value, description)
        VALUES (?, 'VALOR_PROVISORIO', 'Deve sofrer rollback')
      `).run(rollbackKey);

      // Lança erro proposital para forçar rollback
      throw new Error('SIMULACAO_ERRO_TRANSACAO');
    });
  } catch (err: any) {
    if (err.message === 'SIMULACAO_ERRO_TRANSACAO') {
      rollbackSuccess = true;
    }
  }

  const checkRollback = db.prepare('SELECT * FROM corporate_parameters WHERE key = ?').get(rollbackKey);
  assert(rollbackSuccess && !checkRollback, 'Rollback atômico: dados provisórios descartados após exceção na transação');

  // 8. Teste de Integridade Estrutural das Tabelas do Core
  const requiredTables = [
    'companies',
    'branches',
    'departments',
    'cost_centers',
    'users',
    'financial_records',
    'bank_accounts',
    'chart_of_accounts',
    'accounting_entries',
    'purchase_orders',
    'contracts',
    'employees',
    'audit_logs',
    'user_sessions',
    'password_history',
    'password_resets',
    'approvals'
  ];

  let missingTables = 0;
  for (const t of requiredTables) {
    const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(t);
    if (!exists) {
      console.error(`[FAIL] Tabela obrigatória ausente: ${t}`);
      missingTables++;
    }
  }
  assert(missingTables === 0, `Integridade relacional: todas as ${requiredTables.length} tabelas corporativas presentes`);

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL FASE 1: ${passed} APROVADOS / ${failed} FALHAS`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFase1Tests().catch(err => {
  console.error('Erro na execução dos testes da Fase 1:', err);
  process.exit(1);
});
