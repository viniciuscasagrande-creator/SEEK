import { db, seedInitialData } from './db.js';

console.log('🔄 Reiniciando e repovoando banco de dados SEEK SQLite...');

// 1. Desabilita foreign keys temporariamente para limpeza limpa
db.exec('PRAGMA foreign_keys = OFF;');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
for (const t of tables) {
  db.exec(`DELETE FROM ${t.name};`);
  console.log(`  ✓ Tabela limpa: ${t.name}`);
}

db.exec('PRAGMA foreign_keys = ON;');

// 2. Chama reseed chamando o próprio db.ts
console.log('🌱 Repovoando tabelas com registros 100% ERP corporativo...');
seedInitialData();

console.log('✅ Banco de dados SEEK SQLite repovoado com sucesso!');
