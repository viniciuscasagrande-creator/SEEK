-- Migration 005: RH, Ativos, Estoque, Projetos, Service Desk e Governança
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  registration_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  branch TEXT NOT NULL,
  regime TEXT NOT NULL, -- CLT, PJ, ESTAGIO
  admission_date TEXT NOT NULL,
  salary REAL NOT NULL,
  vacation_balance_days INTEGER DEFAULT 30,
  bank_hours_balance REAL DEFAULT 0.0,
  manager_name TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  date TEXT NOT NULL,
  clock_in_1 TEXT NOT NULL,
  clock_out_1 TEXT,
  clock_in_2 TEXT,
  clock_out_2 TEXT,
  total_hours REAL DEFAULT 8.0,
  status TEXT DEFAULT 'REGULAR',
  approved_by TEXT
);

CREATE TABLE IF NOT EXISTS freelance_shifts (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  code TEXT UNIQUE NOT NULL,
  event_or_department_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  freelancer_name TEXT NOT NULL,
  document_number TEXT NOT NULL,
  phone TEXT,
  pix_key TEXT,
  shift_date TEXT NOT NULL,
  call_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  base_rate_amount REAL NOT NULL,
  overtime_amount REAL DEFAULT 0.0,
  reimbursement_amount REAL DEFAULT 0.0,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMADO',
  hours_worked REAL DEFAULT 0.0,
  performance_rating INTEGER DEFAULT 5,
  validator_name TEXT,
  validation_notes TEXT,
  financial_record_id TEXT,
  approval_id TEXT,
  closed_at TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  department TEXT NOT NULL,
  branch TEXT NOT NULL,
  acquisition_date TEXT NOT NULL,
  acquisition_value REAL NOT NULL,
  current_book_value REAL NOT NULL,
  depreciation_rate_annual REAL DEFAULT 10.0,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  assigned_to TEXT
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_stock REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  avg_unit_cost REAL DEFAULT 0,
  warehouse_location TEXT
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES inventory_items(id),
  type TEXT NOT NULL, -- ENTRADA, SAIDA, AJUSTE, TRANSFERENCIA
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  movement_date TEXT NOT NULL,
  requester_name TEXT,
  department TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  planned_budget REAL NOT NULL,
  spent_amount REAL DEFAULT 0,
  start_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  progress_percent INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_name TEXT NOT NULL,
  due_date TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  status TEXT NOT NULL DEFAULT 'A_FAZER',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  requester_name TEXT NOT NULL,
  department TEXT NOT NULL,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'ABERTO',
  sla_limit_date TEXT,
  resolution_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_url TEXT,
  file_size_bytes INTEGER DEFAULT 0,
  owner_name TEXT NOT NULL,
  current_version TEXT DEFAULT 'v1.0',
  is_signed INTEGER DEFAULT 0,
  expiration_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_signatures (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  role_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  signed_at TEXT,
  signature_hash TEXT
);

CREATE TABLE IF NOT EXISTS risks_compliance (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  probability TEXT NOT NULL,
  impact TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  mitigation_plan TEXT NOT NULL,
  status TEXT DEFAULT 'MONITORADO'
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link_route TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planejamento_ciclos (
  id TEXT PRIMARY KEY,
  ano INTEGER NOT NULL DEFAULT 2026,
  titulo TEXT NOT NULL,
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planejamento_objetivos (
  id TEXT PRIMARY KEY,
  ciclo_id TEXT REFERENCES planejamento_ciclos(id),
  codigo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  peso REAL DEFAULT 1.0,
  progresso_percent REAL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planejamento_metas (
  id TEXT PRIMARY KEY,
  objetivo_id TEXT REFERENCES planejamento_objetivos(id),
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor_meta REAL NOT NULL,
  valor_atual REAL NOT NULL DEFAULT 0.0,
  unidade TEXT NOT NULL DEFAULT 'R$',
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NO_PRAZO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planejamento_cenarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  receita_projetada REAL NOT NULL,
  ebitda_projetado REAL NOT NULL,
  premissas TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planejamento_acompanhamentos (
  id TEXT PRIMARY KEY,
  meta_id TEXT REFERENCES planejamento_metas(id),
  mes INTEGER NOT NULL,
  valor_realizado REAL NOT NULL,
  desvio REAL NOT NULL,
  comentario TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seguranca_politicas (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  obrigatoria INTEGER DEFAULT 1,
  versao TEXT DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'VIGENTE',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seguranca_regras_acesso (
  id TEXT PRIMARY KEY,
  perfil_nome TEXT NOT NULL,
  modulo TEXT NOT NULL,
  permissao_leitura INTEGER DEFAULT 1,
  permissao_escrita INTEGER DEFAULT 0,
  permissao_aprovacao INTEGER DEFAULT 0,
  permissao_exclusao INTEGER DEFAULT 0,
  condicao_abac TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integracoes_catalogo (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo_comunicacao TEXT NOT NULL DEFAULT 'REST_API',
  endpoint_url TEXT,
  status TEXT NOT NULL DEFAULT 'CONFIGURADO',
  auth_type TEXT DEFAULT 'BEARER_TOKEN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integracoes_webhooks (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  evento TEXT NOT NULL,
  url_destino TEXT NOT NULL,
  metodo TEXT DEFAULT 'POST',
  ativo INTEGER DEFAULT 1,
  total_disparos INTEGER DEFAULT 0,
  ultimo_disparo TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_eventos_avancados (
  id TEXT PRIMARY KEY,
  evento_tipo TEXT NOT NULL,
  severidade TEXT NOT NULL DEFAULT 'INFO',
  ip_origem TEXT,
  user_agent TEXT,
  detalhes_json TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
