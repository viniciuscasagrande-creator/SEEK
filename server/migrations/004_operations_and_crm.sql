-- Migration 004: CRM, Parceiros de Negócios, Compras e Contratos
CREATE TABLE IF NOT EXISTS business_partners (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  type TEXT NOT NULL, -- CLIENTE, FORNECEDOR, PARCEIRO
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  document_number TEXT NOT NULL,
  category TEXT,
  contact_name TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  rating INTEGER DEFAULT 5,
  sla_percent REAL DEFAULT 98.0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS crm_deals (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  client_name TEXT NOT NULL,
  title TEXT NOT NULL,
  value REAL NOT NULL,
  stage TEXT NOT NULL, -- LEAD, QUALIFICACAO, OPORTUNIDADE, PROPOSTA, NEGOCIACAO, APROVACAO, CONTRATO, CLIENTE
  probability INTEGER DEFAULT 20,
  owner_name TEXT NOT NULL,
  expected_close_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_empresas (
  id TEXT PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  setor TEXT,
  porte TEXT DEFAULT 'GRANDE',
  cidade TEXT,
  estado TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_contatos (
  id TEXT PRIMARY KEY,
  empresa_id TEXT REFERENCES crm_empresas(id),
  nome TEXT NOT NULL,
  cargo TEXT,
  email TEXT,
  telefone TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id TEXT PRIMARY KEY,
  empresa_id TEXT REFERENCES crm_empresas(id),
  titulo TEXT NOT NULL,
  valor REAL NOT NULL,
  estagio TEXT NOT NULL DEFAULT 'PROSPECCAO',
  probabilidade INTEGER DEFAULT 50,
  responsavel_nome TEXT NOT NULL,
  previsao_fechamento TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_propostas (
  id TEXT PRIMARY KEY,
  oportunidade_id TEXT REFERENCES crm_oportunidades(id),
  numero_proposta TEXT UNIQUE NOT NULL,
  valor_total REAL NOT NULL,
  validade TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ENVIADA',
  itens_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_atividades (
  id TEXT PRIMARY KEY,
  oportunidade_id TEXT REFERENCES crm_oportunidades(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  data_agendada TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  responsavel TEXT NOT NULL,
  notas TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  requester_name TEXT NOT NULL,
  department TEXT NOT NULL,
  cost_center TEXT NOT NULL,
  description TEXT NOT NULL,
  justification TEXT NOT NULL,
  total_estimated REAL NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  status TEXT NOT NULL DEFAULT 'SOLICITADO',
  required_date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_quotations (
  id TEXT PRIMARY KEY,
  requisition_id TEXT NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  supplier_id TEXT,
  supplier_name TEXT NOT NULL,
  supplier_cnpj TEXT,
  unit_price REAL NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  total_price REAL NOT NULL,
  delivery_days INTEGER NOT NULL,
  payment_terms TEXT NOT NULL,
  proposal_number TEXT,
  rating REAL DEFAULT 5.0,
  selected INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE_APROVACAO',
  required_date TEXT,
  items_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  counterpart_name TEXT NOT NULL,
  counterpart_doc TEXT,
  category TEXT NOT NULL, -- CLIENTE, FORNECEDOR, PRESTADOR, PARCEIRO
  monthly_value REAL NOT NULL,
  total_value REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days_remaining INTEGER,
  status TEXT NOT NULL DEFAULT 'VIGENTE', -- VIGENTE, A_RENOVAR, EM_REVISAO, RESCINDIDO
  retention_percent REAL DEFAULT 0,
  sla_target TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
