-- Migration 001: Core, Identity e Estrutura Organizacional Multiempresa
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  version TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  trade_name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  document_number TEXT UNIQUE NOT NULL,
  is_holding INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_headquarter INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  budget_limit REAL DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS corporate_parameters (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  email TEXT UNIQUE NOT NULL,
  registration_number TEXT,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_level TEXT NOT NULL,
  role_title TEXT NOT NULL,
  department TEXT NOT NULL,
  approval_limit REAL DEFAULT 0,
  accessible_modules TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  mfa_enabled INTEGER DEFAULT 0,
  mfa_secret TEXT,
  last_login_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
