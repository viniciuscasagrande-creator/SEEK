// SEEK — Motor de Migrations Enterprise (Dual SQLite & PostgreSQL)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationResult {
  engine: 'sqlite' | 'postgres';
  appliedCount: number;
  totalMigrations: number;
  appliedList: string[];
}

export async function runMigrations(): Promise<MigrationResult> {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Diretório de migrations não localizado: ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const isPostgres = Boolean(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DB_TYPE === 'postgres'
  );

  console.log(`[SEEK MIGRATIONS] Iniciando motor de banco de dados (${isPostgres ? 'PostgreSQL' : 'SQLite WAL'})...`);

  if (isPostgres) {
    return await runPostgresMigrations(migrationsDir, files);
  } else {
    return runSqliteMigrations(migrationsDir, files);
  }
}

// 1. Execução no PostgreSQL
async function runPostgresMigrations(migrationsDir: string, files: string[]): Promise<MigrationResult> {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/seek_erp';
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  const appliedList: string[] = [];

  try {
    // Garante tabela de controle de migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        version TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(rows.map(r => r.version));

    for (const file of files) {
      const version = file.split('_')[0];
      if (appliedVersions.has(version)) {
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        const migrationId = 'mig-' + crypto.randomUUID();
        await client.query(
          'INSERT INTO schema_migrations (id, version, name, checksum) VALUES ($1, $2, $3, $4)',
          [migrationId, version, file, checksum]
        );
        await client.query('COMMIT');
        appliedList.push(file);
        console.log(`[SEEK MIGRATIONS] [POSTGRES] Aplicada: ${file} (v${version})`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[SEEK MIGRATIONS] [POSTGRES] Falha na migration ${file}:`, err);
        throw err;
      }
    }

    return {
      engine: 'postgres',
      appliedCount: appliedList.length,
      totalMigrations: files.length,
      appliedList
    };
  } finally {
    client.release();
    await pool.end();
  }
}

// 2. Execução no SQLite
function runSqliteMigrations(migrationsDir: string, files: string[]): MigrationResult {
  const dataDir = path.resolve(__dirname, '../data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'seek.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');

  // Garante tabela de controle de migrations
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      version TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const rows = sqlite.prepare('SELECT version FROM schema_migrations').all() as { version: string }[];
  const appliedVersions = new Set(rows.map(r => r.version));
  const appliedList: string[] = [];

  for (const file of files) {
    const version = file.split('_')[0];
    if (appliedVersions.has(version)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    const runInTransaction = sqlite.transaction(() => {
      sqlite.exec(sql);
      const migrationId = 'mig-' + crypto.randomUUID();
      sqlite.prepare(
        'INSERT INTO schema_migrations (id, version, name, checksum) VALUES (?, ?, ?, ?)'
      ).run(migrationId, version, file, checksum);
    });

    runInTransaction();
    appliedList.push(file);
    console.log(`[SEEK MIGRATIONS] [SQLITE] Aplicada: ${file} (v${version})`);
  }

  sqlite.close();

  return {
    engine: 'sqlite',
    appliedCount: appliedList.length,
    totalMigrations: files.length,
    appliedList
  };
}

// Execução direta via CLI (node/tsx)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(result => {
      console.log(`\n============================================================`);
      console.log(`[SEEK MIGRATIONS CONCLUÍDAS COM SUCESSO]`);
      console.log(`Engine: ${result.engine.toUpperCase()}`);
      console.log(`Migrations Aplicadas Nesta Rodada: ${result.appliedCount}`);
      console.log(`Total de Migrations Gerenciadas: ${result.totalMigrations}`);
      console.log(`============================================================\n`);
    })
    .catch(err => {
      console.error('[SEEK MIGRATIONS ERRO]', err);
      process.exit(1);
    });
}
