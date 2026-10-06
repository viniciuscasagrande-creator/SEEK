// SEEK Backend — Banco de Dados Local Persistente (SQLite / PostgreSQL Ready)
// Hiper Pacote 4: Administração Empresarial (RH/DP, Ponto, Organograma, Estoque, Patrimônio, Projetos, Service Desk, GED, Governança, Notificações)

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garante que o diretório server/data exista
const dataDir = path.resolve(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'seek.db');
export const db = new Database(dbPath);

// Habilita WAL mode para alta performance e concorrência no SQLite
db.pragma('journal_mode = WAL');

// 1. INICIALIZAÇÃO DAS TABELAS DO SEEK CORE E ADMINISTRAÇÃO EMPRESARIAL
export function initializeDatabase() {
  db.exec(`
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
      last_login_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS financial_records (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL, -- PAGAR, RECEBER
      title TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      cost_center TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      payment_date TEXT,
      status TEXT NOT NULL DEFAULT 'PREVISTO', -- PREVISTO, CONFIRMADO, PAGO
      payment_method TEXT NOT NULL DEFAULT 'PIX',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      bank_name TEXT NOT NULL,
      bank_code TEXT NOT NULL,
      agency TEXT NOT NULL,
      account_number TEXT NOT NULL,
      current_balance REAL DEFAULT 0,
      active INTEGER DEFAULT 1
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
      contract_number TEXT UNIQUE NOT NULL,
      party_name TEXT NOT NULL,
      type TEXT NOT NULL,
      monthly_value REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_remaining INTEGER,
      readjustment_index TEXT DEFAULT 'IPCA',
      status TEXT NOT NULL DEFAULT 'VIGENTE',
      signed_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      entity_type TEXT NOT NULL, -- COMPRA, PAGAMENTO, CONTRATO, FERIAS, DESCONTO_COMERCIAL
      title TEXT NOT NULL,
      description TEXT,
      department TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_role TEXT,
      amount REAL,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      priority TEXT NOT NULL DEFAULT 'MEDIA',
      current_step INTEGER DEFAULT 1,
      total_steps INTEGER DEFAULT 2,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approval_steps (
      id TEXT PRIMARY KEY,
      approval_id TEXT REFERENCES approvals(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      label TEXT NOT NULL,
      required_level TEXT NOT NULL,
      decider_name TEXT,
      decision_date TEXT,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      comment TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      entity TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT DEFAULT '189.44.120.10'
    );

    -- PACOTE 4: RH & DEPARTAMENTO PESSOAL
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
      bank_hours_balance REAL DEFAULT 0, -- Em horas
      manager_name TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS time_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT REFERENCES employees(id),
      date TEXT NOT NULL,
      clock_in TEXT,
      clock_out_lunch TEXT,
      clock_in_lunch TEXT,
      clock_out TEXT,
      total_hours REAL DEFAULT 8.0,
      balance_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'NORMAL' -- NORMAL, AJUSTADO, PENDENTE
    );

    CREATE TABLE IF NOT EXISTS vacation_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT REFERENCES employees(id),
      employee_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDENTE', -- PENDENTE, APROVADO, REJEITADO
      approval_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- PACOTE 4: PATRIMÔNIO & ATIVOS IMOBILIZADOS
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      tag_number TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL, -- TI, MOBILIARIO, EQUIPAMENTO, LICENCA
      location TEXT NOT NULL,
      responsible_name TEXT NOT NULL,
      acquisition_cost REAL NOT NULL,
      current_book_value REAL NOT NULL,
      custodian_signed INTEGER DEFAULT 1,
      status TEXT DEFAULT 'ATIVO' -- ATIVO, EM_MANUTENCAO, BAIXADO
    );

    -- PACOTE 4: ESTOQUE & ALMOXARIFADO
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      current_stock INTEGER NOT NULL,
      min_stock INTEGER NOT NULL,
      unit TEXT NOT NULL,
      unit_cost REAL NOT NULL,
      location TEXT NOT NULL,
      status TEXT DEFAULT 'NORMAL' -- NORMAL, BAIXO
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      item_id TEXT REFERENCES inventory_items(id),
      item_name TEXT NOT NULL,
      type TEXT NOT NULL, -- ENTRADA, SAIDA
      quantity INTEGER NOT NULL,
      reason TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- PACOTE 4: PROJETOS & OPERAÇÕES
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      leader_name TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      budget REAL NOT NULL,
      spent REAL NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT DEFAULT 'EM_ANDAMENTO' -- PLANEJAMENTO, EM_ANDAMENTO, CONCLUIDO, PAUSADO
    );

    CREATE TABLE IF NOT EXISTS project_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      title TEXT NOT NULL,
      assignee_name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT DEFAULT 'A_FAZER', -- A_FAZER, EM_ANDAMENTO, CONCLUIDA
      hours_estimated REAL DEFAULT 8.0,
      hours_spent REAL DEFAULT 0.0
    );

    -- PACOTE 4: SERVICE DESK INTERNO
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      department TEXT NOT NULL, -- TI, RH, Financeiro, Jurídico, Administrativo
      status TEXT DEFAULT 'ABERTO', -- ABERTO, EM_ATENDIMENTO, PENDENTE, RESOLVIDO
      priority TEXT NOT NULL, -- BAIXA, MEDIA, ALTA, CRITICA
      sla_hours_remaining INTEGER NOT NULL,
      requester_name TEXT NOT NULL,
      assigned_to TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- PACOTE 4: DOCUMENTOS CORPORATIVOS (GED)
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL, -- POLITICA, CONTRATO, ATA, TERMO, FISCAL
      department TEXT NOT NULL,
      version TEXT NOT NULL,
      file_size TEXT NOT NULL,
      access_level TEXT NOT NULL,
      status TEXT DEFAULT 'VIGENTE',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- PACOTE 4: GOVERNANÇA & RISCOS (COMPLIANCE / LGPD)
    CREATE TABLE IF NOT EXISTS risks_compliance (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL, -- LGPD, FINANCEIRO, OPERACIONAL, JURIDICO
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      probability TEXT NOT NULL, -- BAIXA, MEDIA, ALTA
      impact TEXT NOT NULL, -- BAIXO, MEDIO, ALTO
      risk_level TEXT NOT NULL, -- BAIXO, MEDIO, ALTO, CRITICO
      mitigation_plan TEXT NOT NULL,
      status TEXT DEFAULT 'MONITORADO'
    );

    -- PACOTE 4: CENTRAL DE NOTIFICAÇÕES
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL, -- INFO, ALERTA, APROVACAO, PRAZO
      link_route TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- PACOTE 5: CONTABILIDADE & PLANO DE CONTAS (COA)
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      company_id TEXT DEFAULT 'comp-1',
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- SINTETICA, ANALITICA
      nature TEXT NOT NULL, -- DEVEDORA, CREDORA
      level INTEGER NOT NULL, -- 1, 2, 3, 4
      parent_code TEXT,
      balance REAL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- PACOTE 5: MOTOR DE PARTIDAS DOBRADAS (LIVRO DIÁRIO)
    CREATE TABLE IF NOT EXISTS accounting_entries (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      period TEXT NOT NULL, -- YYYY-MM
      description TEXT NOT NULL,
      debit_account_code TEXT NOT NULL,
      credit_account_code TEXT NOT NULL,
      amount REAL NOT NULL,
      cost_center TEXT,
      origin_type TEXT NOT NULL, -- FINANCEIRO, COMPRAS, FOLHA, MANUAL, DEPRECIACAO
      origin_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- PACOTE 5: COMPETÊNCIAS & FECHAMENTO CONTÁBIL
    CREATE TABLE IF NOT EXISTS accounting_periods (
      id TEXT PRIMARY KEY,
      period TEXT UNIQUE NOT NULL, -- YYYY-MM
      status TEXT DEFAULT 'ABERTO', -- ABERTO, FECHADO, BLOQUEADO
      closed_by TEXT,
      closed_at TEXT,
      net_result REAL DEFAULT 0.0
    );

    -- PACOTE 5: OBRIGAÇÕES & CALENDÁRIO FISCAL
    CREATE TABLE IF NOT EXISTS tax_obligations (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      tax_type TEXT NOT NULL, -- ISS, PIS, COFINS, IRPJ, CSLL, INSS, FGTS
      period TEXT NOT NULL, -- YYYY-MM
      base_amount REAL NOT NULL,
      rate_percent REAL NOT NULL,
      tax_amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'PENDENTE', -- PENDENTE, CALCULADO, PAGO, ATRASADO
      payment_date TEXT,
      receipt_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- PACOTE 5: NOTAS FISCAIS & DOCUMENTOS TRIBUTÁRIOS (NFS-e / NF-e)
    CREATE TABLE IF NOT EXISTS fiscal_invoices (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      series TEXT DEFAULT '1',
      type TEXT NOT NULL, -- EMITIDA, RECEBIDA
      entity_name TEXT NOT NULL,
      document_number TEXT NOT NULL,
      total_amount REAL NOT NULL,
      iss_amount REAL DEFAULT 0.0,
      pis_amount REAL DEFAULT 0.0,
      cofins_amount REAL DEFAULT 0.0,
      irrf_amount REAL DEFAULT 0.0,
      csll_amount REAL DEFAULT 0.0,
      net_amount REAL NOT NULL,
      issue_date TEXT NOT NULL,
      status TEXT DEFAULT 'AUTORIZADA', -- AUTORIZADA, CANCELADA, PENDENTE
      xml_key TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- RH: FREELANCE & GESTÃO DE TAXAS (TRABALHADORES TEMPORÁRIOS / OPERAÇÕES)
    CREATE TABLE IF NOT EXISTS freelancers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      cpf TEXT UNIQUE NOT NULL,
      rg TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      pix_key TEXT NOT NULL,
      pix_type TEXT NOT NULL DEFAULT 'CPF', -- CPF, EMAIL, TELEFONE, ALEATORIA
      bank_name TEXT,
      agency TEXT,
      account_number TEXT,
      primary_role TEXT NOT NULL,
      secondary_roles TEXT,
      standard_daily_rate REAL NOT NULL DEFAULT 200.0,
      city TEXT NOT NULL DEFAULT 'Curitiba',
      state TEXT NOT NULL DEFAULT 'PR',
      rating REAL DEFAULT 5.0,
      total_jobs INTEGER DEFAULT 0,
      punctuality_score INTEGER DEFAULT 100,
      availability TEXT DEFAULT 'DISPONIVEL', -- DISPONIVEL, EM_JOB, INDISPONIVEL
      status TEXT DEFAULT 'ATIVO', -- ATIVO, EM_ANALISE, BLOQUEADO
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS freelance_shifts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL, -- TX-2026-0001
      operation_name TEXT NOT NULL, -- Operação de Referência (ex: Montagem Corporativa Curitiba, Operação Turnê PR)
      cost_center TEXT NOT NULL DEFAULT 'Operações & Logística',
      job_date TEXT NOT NULL,
      work_shift TEXT NOT NULL, -- '08:00 - 18:00', '18:00 - 04:00'
      location TEXT NOT NULL,
      requester_manager TEXT NOT NULL,
      freelancer_id TEXT REFERENCES freelancers(id),
      freelancer_name TEXT NOT NULL,
      freelancer_cpf TEXT,
      freelancer_pix TEXT,
      role_title TEXT NOT NULL,
      base_fee REAL NOT NULL,
      allowance_food REAL DEFAULT 0.0,
      allowance_transport REAL DEFAULT 0.0,
      overtime_amount REAL DEFAULT 0.0,
      reimbursement_amount REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMADO', -- ABERTA, AGUARDANDO_APROVACAO, CONVOCADO, CONFIRMADO, PRESENTE, FALTA, REALIZADA, AGUARDANDO_PAGAMENTO, PAGO
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

    -- PACOTE 6: FINANCEIRO, COMPRAS E CONTROLADORIA ENTERPRISE
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES bank_accounts(id),
      type TEXT NOT NULL, -- CREDITO, DEBITO
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_date TEXT NOT NULL,
      description TEXT NOT NULL,
      reference_type TEXT DEFAULT 'MANUAL', -- TITULO, TAXA, FISCAL, TRANSF, MANUAL
      reference_id TEXT,
      reconciled INTEGER DEFAULT 0,
      reconciled_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bank_reconciliations (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES bank_accounts(id),
      period TEXT NOT NULL,
      statement_balance REAL NOT NULL,
      system_balance REAL NOT NULL,
      difference REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONCILIADO', -- CONCILIADO, DIVERGENTE, PENDENTE
      reconciled_by TEXT NOT NULL,
      reconciled_at TEXT DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
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
      priority TEXT NOT NULL DEFAULT 'MEDIA', -- BAIXA, MEDIA, ALTA, URGENTE
      status TEXT NOT NULL DEFAULT 'SOLICITADO', -- SOLICITADO, EM_COTACAO, COTADO, APROVADO, PEDIDO_GERADO, REJEITADO
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

    CREATE TABLE IF NOT EXISTS cost_center_budgets (
      id TEXT PRIMARY KEY,
      cost_center TEXT NOT NULL,
      fiscal_year INTEGER NOT NULL DEFAULT 2026,
      category TEXT NOT NULL,
      planned_amount REAL NOT NULL,
      committed_amount REAL NOT NULL DEFAULT 0,
      realized_amount REAL NOT NULL DEFAULT 0,
      alert_threshold_percent REAL DEFAULT 85.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financial_closings (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL, -- '2026-10'
      module TEXT NOT NULL, -- 'TESOURARIA', 'CONTAS_PAGAR', 'COMPRAS', 'CONTABIL', 'GERAL'
      status TEXT NOT NULL DEFAULT 'ABERTO', -- 'ABERTO', 'CONCILIADO', 'BLOQUEADO'
      closed_by TEXT,
      closed_at TEXT,
      checklist_json TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrações seguras de colunas em tabelas existentes
  try { db.exec(`ALTER TABLE financial_records ADD COLUMN origin_type TEXT DEFAULT 'AVULSO'`); } catch {}
  try { db.exec(`ALTER TABLE financial_records ADD COLUMN origin_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE financial_records ADD COLUMN bank_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE financial_records ADD COLUMN bank_name TEXT`); } catch {}

  seedInitialData();
}

// 2. SEED DOS DADOS CORPORATIVOS INICIAIS
export function seedInitialData() {
  const companyCheck = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
  if (companyCheck.count === 0) {
    // Empresas
    db.prepare(`
      INSERT INTO companies (id, code, trade_name, legal_name, document_number, is_holding)
      VALUES
        ('comp-1', 'SEEK-CORP', 'SEEK Corporativo Matriz', 'SEEK Gestão Integrada & Participações S.A.', '08.123.456/0001-90', 1),
        ('comp-2', 'SEEK-SP', 'SEEK São Paulo', 'SEEK Soluções Corporativas São Paulo Ltda.', '08.123.456/0002-71', 0),
        ('comp-3', 'SEEK-RJ', 'SEEK Rio de Janeiro', 'SEEK Serviços Administrativos Rio de Janeiro Ltda.', '08.123.456/0003-52', 0)
    `).run();

    // Filiais
    db.prepare(`
      INSERT INTO branches (id, company_id, code, name, city, state, is_headquarter)
      VALUES
        ('branch-1', 'comp-1', 'FIL-01', 'Curitiba (Sede / Matriz)', 'Curitiba', 'PR', 1),
        ('branch-2', 'comp-1', 'FIL-02', 'Curitiba (Hub Operacional & Datacenter)', 'Curitiba', 'PR', 0),
        ('branch-3', 'comp-2', 'FIL-03', 'São Paulo (Faria Lima / Corporativo)', 'São Paulo', 'SP', 0),
        ('branch-4', 'comp-3', 'FIL-04', 'Rio de Janeiro (Porto Maravilha)', 'Rio de Janeiro', 'RJ', 0)
    `).run();

    // Departamentos
    db.prepare(`
      INSERT INTO departments (id, company_id, code, name, budget_limit)
      VALUES
        ('dep-1', 'comp-1', 'FIN', 'Financeiro & Controladoria', 250000),
        ('dep-2', 'comp-1', 'COM', 'Comercial & Novos Negócios', 200000),
        ('dep-3', 'comp-1', 'OPE', 'Operações & Logística Corporativa', 350000),
        ('dep-4', 'comp-1', 'TI', 'Tecnologia da Informação & Nuvem', 300000),
        ('dep-5', 'comp-1', 'RH', 'Recursos Humanos & DP', 180000),
        ('dep-6', 'comp-1', 'CMP', 'Compras & Suprimentos', 150000),
        ('dep-7', 'comp-1', 'JUR', 'Jurídico & Compliance', 120000)
    `).run();

    // Centros de Custo
    db.prepare(`
      INSERT INTO cost_centers (id, company_id, code, name)
      VALUES
        ('cc-1', 'comp-1', '1.01.001', 'Operações & Serviços Corporativos'),
        ('cc-2', 'comp-1', '1.01.002', 'Tecnologia & Infraestrutura Cloud'),
        ('cc-3', 'comp-1', '1.02.001', 'Comercial & Novos Negócios B2B'),
        ('cc-4', 'comp-1', '1.03.001', 'Administrativo & Recursos Humanos')
    `).run();

    // Parâmetros Corporativos
    db.prepare(`
      INSERT INTO corporate_parameters (key, value, description)
      VALUES
        ('APPROVAL_TIER_1_LIMIT', '15000', 'Teto monetário de alçada para Gestor Departamental'),
        ('APPROVAL_TIER_2_LIMIT', '50000', 'Teto monetário de alçada para Gerência Financeira'),
        ('MFA_REQUIRED_LEVELS', 'ADMIN_GERAL,DIRETORIA,FINANCEIRO', 'Papéis obrigatórios com autenticação em 2 fatores'),
        ('AUDIT_RETENTION_DAYS', '1825', 'Prazo mínimo de retenção de logs de auditoria (5 anos)')
    `).run();
  }

  // 3. SEED DOS 13 PERFIS OFICIAIS & CREDENCIAIS DE TESTE
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCheck.count === 0) {
    const passwordHash = bcrypt.hashSync('Seek@2026', 10);

    const userStmt = db.prepare(`
      INSERT INTO users (id, company_id, email, registration_number, password, full_name, role_level, role_title, department, approval_limit, accessible_modules)
      VALUES (@id, @company_id, @email, @registration_number, @password, @full_name, @role_level, @role_title, @department, @approval_limit, @accessible_modules)
    `);

    const usersToInsert = [
      {
        id: 'user-admin',
        company_id: 'comp-1',
        email: 'admin@seek.local',
        registration_number: 'MAT-0001',
        password: passwordHash,
        full_name: 'Administrador Geral SEEK',
        role_level: 'ADMIN_GERAL',
        role_title: 'Administrador Geral',
        department: 'Tecnologia & Governança',
        approval_limit: 1000000,
        accessible_modules: '*'
      },
      {
        id: 'user-diretoria',
        company_id: 'comp-1',
        email: 'diretoria@seek.local',
        registration_number: 'MAT-0002',
        password: passwordHash,
        full_name: 'Roberto Vianna Guimarães',
        role_level: 'DIRETORIA',
        role_title: 'Diretor Presidente / C-Level',
        department: 'Diretoria Executiva',
        approval_limit: 500000,
        accessible_modules: 'inicio,crm,finance,accounting,fiscal,purchasing,suppliers,inventory,assets,hr,payroll,projects,operations,contracts,legal,service-desk,documents,governance,reports,admin'
      },
      {
        id: 'user-gestor',
        company_id: 'comp-1',
        email: 'gestor@seek.local',
        registration_number: 'MAT-0015',
        password: passwordHash,
        full_name: 'Eduardo Martins Fontes',
        role_level: 'GESTOR',
        role_title: 'Gestor Departamental',
        department: 'Operações & Logística',
        approval_limit: 50000,
        accessible_modules: 'inicio,purchasing,suppliers,inventory,assets,projects,operations,service-desk,documents,reports'
      },
      {
        id: 'user-financeiro',
        company_id: 'comp-1',
        email: 'financeiro@seek.local',
        registration_number: 'MAT-0045',
        password: passwordHash,
        full_name: 'Helena Silveira Ramos',
        role_level: 'FINANCEIRO',
        role_title: 'Gerente Financeira',
        department: 'Financeiro',
        approval_limit: 75000,
        accessible_modules: 'inicio,finance,purchasing,contracts,service-desk,documents,reports'
      },
      {
        id: 'user-contabilidade',
        company_id: 'comp-1',
        email: 'contabilidade@seek.local',
        registration_number: 'MAT-0062',
        password: passwordHash,
        full_name: 'Valter Siqueira Neto',
        role_level: 'CONTABILIDADE',
        role_title: 'Contador Geral',
        department: 'Contabilidade & Controladoria',
        approval_limit: 25000,
        accessible_modules: 'inicio,accounting,finance,fiscal,documents,reports'
      },
      {
        id: 'user-fiscal',
        company_id: 'comp-1',
        email: 'fiscal@seek.local',
        registration_number: 'MAT-0071',
        password: passwordHash,
        full_name: 'Renata Albuquerque',
        role_level: 'FISCAL',
        role_title: 'Especialista Tributária',
        department: 'Fiscal & Impostos',
        approval_limit: 20000,
        accessible_modules: 'inicio,fiscal,accounting,finance,documents,reports'
      },
      {
        id: 'user-comercial',
        company_id: 'comp-1',
        email: 'comercial@seek.local',
        registration_number: 'MAT-0130',
        password: passwordHash,
        full_name: 'Lucas Bertolli Costa',
        role_level: 'COMERCIAL',
        role_title: 'Líder Comercial & CRM',
        department: 'Comercial',
        approval_limit: 25000,
        accessible_modules: 'inicio,crm,contracts,service-desk,documents,reports'
      },
      {
        id: 'user-rh',
        company_id: 'comp-1',
        email: 'rh@seek.local',
        registration_number: 'MAT-0088',
        password: passwordHash,
        full_name: 'Camila Duarte',
        role_level: 'RH',
        role_title: 'Gerente de RH & DP',
        department: 'Recursos Humanos',
        approval_limit: 30000,
        accessible_modules: 'inicio,hr,payroll,service-desk,documents,reports'
      },
      {
        id: 'user-compras',
        company_id: 'comp-1',
        email: 'compras@seek.local',
        registration_number: 'MAT-0112',
        password: passwordHash,
        full_name: 'Mariana Fontes Prado',
        role_level: 'COMPRAS',
        role_title: 'Gestora de Compras',
        department: 'Compras',
        approval_limit: 30000,
        accessible_modules: 'inicio,purchasing,suppliers,inventory,assets,contracts,service-desk,documents'
      },
      {
        id: 'user-juridico',
        company_id: 'comp-1',
        email: 'juridico@seek.local',
        registration_number: 'MAT-0033',
        password: passwordHash,
        full_name: 'Dr. Fernando Araripe',
        role_level: 'JURIDICO',
        role_title: 'Diretor Jurídico',
        department: 'Jurídico',
        approval_limit: 100000,
        accessible_modules: 'inicio,contracts,legal,governance,documents,service-desk,reports'
      },
      {
        id: 'user-ti',
        company_id: 'comp-1',
        email: 'ti@seek.local',
        registration_number: 'MAT-0050',
        password: passwordHash,
        full_name: 'Alexandre Magno',
        role_level: 'TI',
        role_title: 'Coordenador de TI & Redes',
        department: 'Tecnologia da Informação',
        approval_limit: 35000,
        accessible_modules: 'inicio,service-desk,documents,admin,reports'
      },
      {
        id: 'user-auditoria',
        company_id: 'comp-1',
        email: 'auditoria@seek.local',
        registration_number: 'MAT-0005',
        password: passwordHash,
        full_name: 'Juliana Pires',
        role_level: 'AUDITORIA',
        role_title: 'Auditora Interna & Compliance',
        department: 'Governança & Riscos',
        approval_limit: 50000,
        accessible_modules: 'inicio,governance,documents,reports,admin'
      },
      {
        id: 'user-colaborador',
        company_id: 'comp-1',
        email: 'colaborador@seek.local',
        registration_number: 'MAT-0164',
        password: passwordHash,
        full_name: 'Beatriz Castro Lima',
        role_level: 'COLABORADOR',
        role_title: 'Analista Operacional Pleno',
        department: 'Operações & Logística',
        approval_limit: 1500,
        accessible_modules: 'inicio,service-desk,documents'
      }
    ];

    for (const u of usersToInsert) {
      userStmt.run(u);
    }
  }

  // 4. SEED DE PARCEIROS / FORNECEDORES
  const partnersCheck = db.prepare('SELECT COUNT(*) as count FROM business_partners').get() as { count: number };
  if (partnersCheck.count === 0) {
    db.prepare(`
      INSERT INTO business_partners (id, company_id, type, legal_name, trade_name, document_number, category, contact_name, email, city, state, rating, sla_percent)
      VALUES
        ('part-1', 'comp-1', 'FORNECEDOR', 'Cisco Systems Brasil Ltda.', 'Cisco Redes & Conectividade', '01.234.567/0001-89', 'Equipamentos de Rede', 'Marcos Silva', 'contato@cisco.com.br', 'Porto Alegre', 'RS', 5, 98.5),
        ('part-2', 'comp-1', 'FORNECEDOR', 'Kalunga Comércio & Indústria Gráfica S.A.', 'Kalunga Suprimentos', '02.345.678/0001-90', 'Suprimentos Corporativos', 'Cláudia Peixoto', 'corporativo@kalunga.com.br', 'São Paulo', 'SP', 4, 96.0),
        ('part-3', 'comp-1', 'FORNECEDOR', 'Dell Computadores do Brasil Ltda.', 'Dell Brasil', '72.381.189/0001-10', 'Equipamentos de TI', 'Rodrigo Mendes', 'corporativo@dell.com.br', 'Eldorado do Sul', 'RS', 5, 99.2),
        ('part-4', 'comp-1', 'FORNECEDOR', 'Equinix Brasil Soluções de TI', 'Equinix Datacenter', '04.567.890/0001-12', 'Infraestrutura Cloud & Hosting', 'Patricia Meirelles', 'noc@equinix.com.br', 'Barueri', 'SP', 5, 99.9),
        ('part-5', 'comp-1', 'CLIENTE', 'Grupo Votorantim Participações S.A.', 'Grupo Votorantim', '12.987.654/0001-33', 'Serviços Corporativos B2B', 'Felipe Massaferro', 'corporativo@votorantim.com.br', 'São Paulo', 'SP', 5, 100.0),
        ('part-6', 'comp-1', 'CLIENTE', 'Suzano Papel & Celulose S.A.', 'Suzano S.A.', '15.432.109/0001-55', 'Indústria & Manufatura', 'Sueli Gusmão', 'diretoria@suzano.com.br', 'Curitiba', 'PR', 5, 100.0)
    `).run();
  }

  // 5. SEED DE CRM, FINANCEIRO, CONTRATOS, APROVAÇÕES
  const crmCheck = db.prepare('SELECT COUNT(*) as count FROM crm_deals').get() as { count: number };
  if (crmCheck.count === 0) {
    db.prepare(`
      INSERT INTO crm_deals (id, company_id, client_name, title, value, stage, probability, owner_name, expected_close_date)
      VALUES
        ('crm-1', 'comp-1', 'Grupo Votorantim Participações', 'Contrato Corporativo de Gestão de Infraestrutura & Facilities', 650000.00, 'NEGOCIACAO', 80, 'Lucas Bertolli Costa', '2026-10-28'),
        ('crm-2', 'comp-1', 'Suzano S.A.', 'Implantação de Plataforma Integrada de Operações ERP', 380000.00, 'PROPOSTA', 60, 'Lucas Bertolli Costa', '2026-11-05'),
        ('crm-3', 'comp-1', 'Banco Safra S.A.', 'Renovação Licenciamento Corporativo SEEK Enterprise', 240000.00, 'CLIENTE', 100, 'Lucas Bertolli Costa', '2026-10-01'),
        ('crm-4', 'comp-1', 'Klabin S.A.', 'Consultoria e Mapeamento de Processos Administrativos', 410000.00, 'QUALIFICACAO', 40, 'Lucas Bertolli Costa', '2026-11-20'),
        ('crm-5', 'comp-1', 'Gerdau S.A.', 'Módulo Integrado de Suprimentos & Almoxarifado', 520000.00, 'LEAD', 20, 'Lucas Bertolli Costa', '2026-12-15')
    `).run();

    db.prepare(`
      INSERT INTO financial_records (id, company_id, code, type, title, entity_name, cost_center, category, amount, due_date, status, payment_method)
      VALUES
        ('fin-01', 'comp-1', 'CP-2026-1044', 'PAGAR', 'Licenciamento de Datacenter & Servidores Dedicados', 'Equinix Brasil Soluções de TI', 'Tecnologia & Infraestrutura Cloud', 'Infraestrutura Tecnológica', 34800.00, '2026-10-10', 'CONFIRMADO', 'Boleto Bancário'),
        ('fin-02', 'comp-1', 'CR-2026-0941', 'RECEBER', 'Faturamento Mensal Contrato de Gestão Corporativa', 'Grupo Votorantim Participações', 'Operações & Serviços Corporativos', 'Receita Operacional Bruta', 185600.00, '2026-10-12', 'PREVISTO', 'PIX Cobrança'),
        ('fin-03', 'comp-1', 'CP-2026-1045', 'PAGAR', 'Fornecimento Trimestral de Suprimentos Corporativos', 'Kalunga Suprimentos', 'Operações & Serviços Corporativos', 'Insumos Administrativos', 12450.00, '2026-10-15', 'PREVISTO', 'TED Bancária'),
        ('fin-04', 'comp-1', 'CR-2026-0942', 'RECEBER', 'Faturamento Mensal Licenciamento Corporativo SEEK', 'Suzano S.A.', 'Operações & Serviços Corporativos', 'Receita Recorrente SaaS', 45000.00, '2026-10-20', 'CONFIRMADO', 'Boleto Registrado'),
        ('fin-05', 'comp-1', 'CP-2026-1046', 'PAGAR', 'Folha de Pagamento Consolidada + Encargos FGTS/INSS', 'Colaboradores SEEK Matriz', 'Administrativo & Recursos Humanos', 'Despesas com Pessoal', 289400.00, '2026-10-05', 'PAGO', 'Folha Automática Itaú')
    `).run();

    db.prepare(`
      INSERT INTO bank_accounts (id, bank_name, bank_code, agency, account_number, current_balance)
      VALUES
        ('bank-1', 'Banco Bradesco S.A.', '237', '1204', '45890-1', 1250000.00),
        ('bank-2', 'Banco Itaú Unibanco S.A.', '341', '0842', '98120-7', 590500.00)
    `).run();

    db.prepare(`
      INSERT INTO purchase_orders (id, code, title, department, requester_name, supplier_name, total_amount, status, required_date)
      VALUES
        ('po-01', 'OC-2026-0042', '10 Switches Gerenciáveis 48 Portas Gigabit Cisco', 'Tecnologia da Informação & Nuvem', 'Beatriz Castro Lima', 'Cisco Systems Brasil Ltda.', 18450.00, 'PENDENTE_APROVACAO', '2026-10-25'),
        ('po-02', 'OC-2026-0041', 'Lote de Cartuchos de Toner & Resmas Sulfite A4', 'Operações & Logística Corporativa', 'Mariana Fontes Prado', 'Kalunga Comércio & Indústria Gráfica S.A.', 12450.00, 'APROVADO', '2026-10-18'),
        ('po-03', 'OC-2026-0040', '5 Laptops Dell Latitude i7 para Equipe Comercial SP', 'Tecnologia da Informação & Nuvem', 'Eduardo Martins', 'Dell Computadores do Brasil Ltda.', 26500.00, 'RECEBIDO', '2026-10-15')
    `).run();

    db.prepare(`
      INSERT INTO contracts (id, contract_number, party_name, type, monthly_value, start_date, end_date, days_remaining, readjustment_index, status)
      VALUES
        ('ct-01', 'CT-2024-0089', 'Grupo Votorantim Participações S.A.', 'CLIENTE', 85000.00, '2024-11-01', '2026-11-01', 27, 'IPCA', 'VENCENDO'),
        ('ct-02', 'CT-2025-0142', 'Equinix Brasil Soluções de TI', 'FORNECEDOR', 38000.00, '2025-01-15', '2027-01-15', 467, 'FIXO', 'VIGENTE'),
        ('ct-03', 'CT-2023-0056', 'Suzano S.A.', 'CLIENTE', 32000.00, '2023-08-01', '2026-12-31', 87, 'IGP-M', 'VIGENTE')
    `).run();

    db.prepare(`
      INSERT INTO approvals (id, company_id, entity_type, title, description, department, requester_name, requester_role, amount, status, priority, current_step, total_steps)
      VALUES
        ('app-01', 'comp-1', 'COMPRA', 'Aquisição de Switches de Rede Gerenciáveis Cisco', 'Equipamentos para expansão do datacenter e conectividade das filiais.', 'Tecnologia da Informação & Nuvem', 'Beatriz Castro Lima', 'Analista de Infraestrutura', 18450.00, 'PENDENTE', 'ALTA', 2, 3),
        ('app-02', 'comp-1', 'CONTRATO', 'Renovação Contrato Master Infraestrutura Cloud AWS', 'Acordo corporativo anual com reserva de instâncias e SLA de 99.99%.', 'Tecnologia da Informação & Nuvem', 'Eduardo Martins', 'Tech Lead Infraestrutura', 142000.00, 'PENDENTE', 'CRITICA', 2, 2)
    `).run();

    db.prepare(`
      INSERT INTO approval_steps (id, approval_id, step_number, label, required_level, decider_name, decision_date, status, comment)
      VALUES
        ('step-1', 'app-01', 1, 'Aprovação do Gestor do Departamento (Compras)', 'GESTOR', 'Mariana Fontes Prado', '2026-10-04 16:10', 'APROVADO', 'Cotação validada com 3 fornecedores. Menor preço.'),
        ('step-2', 'app-01', 2, 'Alçada Financeira & Orçamento', 'FINANCEIRO', NULL, NULL, 'PENDENTE', NULL),
        ('step-3', 'app-01', 3, 'Alçada de Diretoria Executiva (> R$ 15.000)', 'DIRETORIA', NULL, NULL, 'PENDENTE', NULL),
        ('step-4', 'app-02', 1, 'Validação Técnica e Jurídica', 'JURIDICO', 'Dr. Fernando Araripe', '2026-10-03 17:45', 'APROVADO', 'Minuta analisada e validada.'),
        ('step-5', 'app-02', 2, 'Alçada Diretoria Executiva (> R$ 50.000)', 'DIRETORIA', NULL, NULL, 'PENDENTE', NULL)
    `).run();

    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, module, entity, description)
      VALUES
        ('aud-01', '2026-10-05 16:20:12', 'Administrador Geral SEEK', 'Administrador Geral', 'APPROVE', 'Financeiro', 'Orçamento Q4', 'Aprovado teto orçamentário para expansão Filial SP no valor de R$ 450.000,00'),
        ('aud-02', '2026-10-05 15:45:00', 'Mariana Fontes Prado', 'Gestora de Compras', 'CREATE', 'Compras', 'OC-2026-0042', 'Criada ordem de compra para 12 switches Cisco Catalyst e submetida ao fluxo de alçadas'),
        ('aud-03', '2026-10-05 14:10:30', 'Lucas Bertolli Costa', 'Líder Comercial & CRM', 'UPDATE', 'CRM & Comercial', 'Grupo Votorantim S.A.', 'Avançou estágio de Proposta para Negociação (R$ 650.000,00)')
    `).run();
  }

  // 6. SEED PACOTE 4: RH, PONTO, PATRIMÔNIO, ESTOQUE, PROJETOS, SERVICE DESK, GED, GOVERNANÇA, NOTIFICAÇÕES
  const empCheck = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
  if (empCheck.count === 0) {
    // Colaboradores
    db.prepare(`
      INSERT INTO employees (id, company_id, registration_number, full_name, job_title, department, branch, regime, admission_date, salary, vacation_balance_days, bank_hours_balance, manager_name)
      VALUES
        ('emp-01', 'comp-1', 'MAT-0001', 'Administrador Geral', 'Administrador Geral', 'Tecnologia & Governança', 'Curitiba (Matriz)', 'CLT', '2021-03-01', 28500.00, 30, 0, 'Conselho de Administração'),
        ('emp-02', 'comp-1', 'MAT-0002', 'Roberto Vianna Guimarães', 'Diretor Presidente / C-Level', 'Diretoria Executiva', 'Curitiba (Matriz)', 'CLT', '2020-01-15', 38000.00, 20, 0, 'Conselho de Administração'),
        ('emp-03', 'comp-1', 'MAT-0015', 'Eduardo Martins Fontes', 'Gestor de Operações & TI', 'Operações & Logística', 'Curitiba (Matriz)', 'CLT', '2022-04-10', 14500.00, 15, 12.5, 'Roberto Vianna Guimarães'),
        ('emp-04', 'comp-1', 'MAT-0045', 'Helena Silveira Ramos', 'Gerente Financeira', 'Financeiro & Controladoria', 'Curitiba (Matriz)', 'CLT', '2022-08-01', 16000.00, 22, -2.0, 'Roberto Vianna Guimarães'),
        ('emp-05', 'comp-1', 'MAT-0130', 'Lucas Bertolli Costa', 'Líder Comercial & CRM', 'Comercial & CRM', 'São Paulo (Faria Lima)', 'PJ', '2023-01-10', 17500.00, 0, 0, 'Roberto Vianna Guimarães'),
        ('emp-06', 'comp-1', 'MAT-0088', 'Camila Duarte', 'Gerente de RH & DP', 'Recursos Humanos & DP', 'Curitiba (Matriz)', 'CLT', '2022-11-15', 13800.00, 18, 4.0, 'Roberto Vianna Guimarães'),
        ('emp-07', 'comp-1', 'MAT-0164', 'Beatriz Castro Lima', 'Analista Operacional Pleno', 'Operações & Logística', 'Curitiba (Matriz)', 'CLT', '2023-06-01', 5800.00, 25, 8.5, 'Eduardo Martins Fontes')
    `).run();

    // Espelho de Ponto
    db.prepare(`
      INSERT INTO time_records (id, employee_id, date, clock_in, clock_out_lunch, clock_in_lunch, clock_out, total_hours, balance_minutes, status)
      VALUES
        ('ponto-01', 'emp-07', '2026-10-01', '08:58', '12:05', '13:02', '18:15', 8.25, 15, 'NORMAL'),
        ('ponto-02', 'emp-07', '2026-10-02', '09:02', '12:00', '13:00', '18:30', 8.50, 30, 'NORMAL'),
        ('ponto-03', 'emp-07', '2026-10-05', '08:55', '12:00', '13:05', '18:00', 8.00, 0, 'NORMAL')
    `).run();

    // Patrimônio & Ativos
    db.prepare(`
      INSERT INTO assets (id, tag_number, description, category, location, responsible_name, acquisition_cost, current_book_value, custodian_signed, status)
      VALUES
        ('ast-01', 'PAT-2024-0012', 'Servidor Rack Dell PowerEdge R750xs Dual Xeon', 'TI', 'Datacenter Curitiba Matriz', 'Alexandre Magno (TI)', 45800.00, 32060.00, 1, 'ATIVO'),
        ('ast-02', 'PAT-2025-0089', 'Lote de 20 Monitores Dell UltraSharp 27 4K', 'TI', 'Hub Operacional Curitiba', 'Beatriz Castro Lima', 48900.00, 41565.00, 1, 'ATIVO'),
        ('ast-03', 'PAT-2026-0045', 'MacBook Pro 16 M3 Max 36GB para Líder Comercial', 'TI', 'Filial São Paulo (Faria Lima)', 'Lucas Bertolli Costa', 24500.00, 22050.00, 1, 'ATIVO'),
        ('ast-04', 'PAT-2023-0104', 'Mobiliário Estações de Trabalho Open Space (12 posições)', 'MOBILIARIO', 'Sede Curitiba 3º Andar', 'Camila Duarte (RH)', 18000.00, 10800.00, 1, 'ATIVO')
    `).run();

    // Estoque & Almoxarifado
    db.prepare(`
      INSERT INTO inventory_items (id, code, name, category, current_stock, min_stock, unit, unit_cost, location, status)
      VALUES
        ('inv-01', 'MAT-TON-01', 'Cartuchos de Toner HP LaserJet Enterprise (Cx 5 un)', 'Insumos de Impressão', 450, 100, 'CX', 120.00, 'Curitiba Almoxarifado A', 'NORMAL'),
        ('inv-02', 'MAT-SUL-02', 'Caixas de Papel Sulfite A4 75g (10 resmas)', 'Papelaria & Escritório', 850, 200, 'CX', 145.00, 'Curitiba Almoxarifado A', 'NORMAL'),
        ('inv-03', 'MAT-HD-03', 'Discos Rígidos Enterprise SAS 4TB para Storage', 'Infraestrutura & Peças', 18, 25, 'UN', 780.00, 'Curitiba Almoxarifado B', 'BAIXO'),
        ('inv-04', 'MAT-CRD-04', 'Cordões e Crachás Corporativos com Presilha', 'Identificação Funcional', 1200, 300, 'UN', 4.50, 'Curitiba Almoxarifado A', 'NORMAL')
    `).run();

    // Projetos Estratégicos
    db.prepare(`
      INSERT INTO projects (id, code, name, department, leader_name, progress, budget, spent, deadline, status)
      VALUES
        ('prj-01', 'PRJ-2026-01', 'Implantação da Plataforma Integrada SEEK V1', 'Tecnologia & Operações', 'Eduardo Martins Fontes', 90, 150000.00, 124500.00, '2026-11-15', 'EM_ANDAMENTO'),
        ('prj-02', 'PRJ-2026-02', 'Expansão Operacional Filial São Paulo (Faria Lima)', 'Diretoria & Comercial', 'Lucas Bertolli Costa', 65, 450000.00, 298000.00, '2026-12-30', 'EM_ANDAMENTO'),
        ('prj-03', 'PRJ-2026-03', 'Migração de Datacenter e Consolidação Cloud Híbrida', 'Tecnologia da Informação & Nuvem', 'Eduardo Martins Fontes', 95, 80000.00, 78500.00, '2026-10-20', 'EM_ANDAMENTO')
    `).run();

    // Tarefas de Projetos
    db.prepare(`
      INSERT INTO project_tasks (id, project_id, title, assignee_name, due_date, priority, status, hours_estimated, hours_spent)
      VALUES
        ('tsk-01', 'prj-01', 'Validação das 13 Alçadas de Segurança no Core SQLite', 'Alexandre Magno', '2026-10-10', 'ALTA', 'CONCLUIDA', 16, 14),
        ('tsk-02', 'prj-01', 'Treinamento de Gestores nos Módulos de Compras e Contratos', 'Camila Duarte', '2026-10-18', 'MEDIA', 'EM_ANDAMENTO', 20, 8),
        ('tsk-03', 'prj-02', 'Contratação e Onboarding da Equipe Comercial SP', 'Camila Duarte', '2026-10-25', 'ALTA', 'EM_ANDAMENTO', 40, 28),
        ('tsk-04', 'prj-03', 'Homologação e Instalação dos Switches Cisco na Matriz', 'Eduardo Martins Fontes', '2026-10-14', 'CRITICA', 'A_FAZER', 24, 0)
    `).run();

    // Service Desk Interno
    db.prepare(`
      INSERT INTO tickets (id, code, title, department, status, priority, sla_hours_remaining, requester_name, assigned_to)
      VALUES
        ('tkt-01', 'CH-2026-0882', 'Configuração de VPN e Certificado Digital A1 Filial SP', 'TI', 'EM_ATENDIMENTO', 'ALTA', 6, 'Lucas Bertolli Costa', 'Alexandre Magno'),
        ('tkt-02', 'CH-2026-0883', 'Solicitação de Declaração de Rendimentos e Ponto 2026', 'RH', 'ABERTO', 'MEDIA', 22, 'Beatriz Castro Lima', 'Camila Duarte'),
        ('tkt-03', 'CH-2026-0884', 'Revisão de Minuta de Aditivo Contratual Grupo Votorantim', 'Jurídico', 'EM_ATENDIMENTO', 'CRITICA', 3, 'Lucas Bertolli Costa', 'Dr. Fernando Araripe'),
        ('tkt-04', 'CH-2026-0885', 'Liberação de Orçamento para Expansão de Armazenamento Storage', 'Financeiro', 'RESOLVIDO', 'ALTA', 0, 'Mariana Fontes Prado', 'Helena Silveira Ramos')
    `).run();

    // GED Corporativo
    db.prepare(`
      INSERT INTO documents (id, code, title, category, department, version, file_size, access_level, status)
      VALUES
        ('doc-01', 'DOC-POL-001', 'Política Geral de Governança, Alçadas e Aprovações SEEK', 'POLITICA', 'Diretoria & Compliance', 'v2.1', '1.8 MB', 'CORPORATIVO', 'VIGENTE'),
        ('doc-02', 'DOC-LGPD-004', 'Manual de Boas Práticas e Proteção de Dados (LGPD)', 'POLITICA', 'Jurídico & TI', 'v1.4', '2.4 MB', 'CORPORATIVO', 'VIGENTE'),
        ('doc-03', 'DOC-SOC-012', 'Estatuto Social Consolidado SEEK Corporativo S.A.', 'ATA', 'Jurídico', 'v3.0', '4.2 MB', 'RESTRITO', 'VIGENTE'),
        ('doc-04', 'DOC-RH-008', 'Acordo Coletivo de Trabalho e Banco de Horas 2026/2027', 'TERMO', 'Recursos Humanos', 'v1.0', '950 KB', 'COLABORADORES', 'VIGENTE')
    `).run();

    // Governança & Riscos
    db.prepare(`
      INSERT INTO risks_compliance (id, code, category, title, description, probability, impact, risk_level, mitigation_plan, status)
      VALUES
        ('rsk-01', 'RSK-LGPD-01', 'LGPD', 'Vazamento ou incidente de dados corporativos e cadastrais', 'Incidentes de segurança ou acessos indevidos a dados corporativos.', 'BAIXA', 'ALTO', 'ALTO', 'Anonimização de dados, logs de acesso auditados e criptografia de ponta a ponta.', 'MONITORADO'),
        ('rsk-02', 'RSK-OPE-02', 'OPERACIONAL', 'Indisponibilidade temporária de link dedicado de dados', 'Falha de rota de operadora de telecomunicações no datacenter.', 'MEDIA', 'ALTO', 'CRITICO', 'Links redundantes BGP de fibra óptica com operadoras distintas.', 'MONITORADO'),
        ('rsk-03', 'RSK-FIN-03', 'FINANCEIRO', 'Inadimplência em contratos corporativos de clientes', 'Risco de crédito em recebíveis de contratos B2B.', 'BAIXA', 'MEDIO', 'MEDIO', 'Garantias contratuais, caução e régua preventiva de cobrança.', 'MITIGADO')
    `).run();

    // Notificações Iniciais
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_route, read)
      VALUES
        ('notif-01', 'user-admin', 'Ordem de Compra OC-2026-0042 aguardando alçada', 'Aquisição de equipamentos de rede requer validação financeira e diretoria.', 'APROVACAO', 'approvals', 0),
        ('notif-02', 'user-admin', 'Contrato CT-2024-0089 (Grupo Votorantim) vencendo em 27 dias', 'Janela de negociação do índice IPCA aberta.', 'ALERTA', 'contracts', 0),
        ('notif-03', 'user-admin', 'Chamado CH-2026-0884 com SLA crítico (3 horas)', 'Revisão jurídica de minuta contratual.', 'PRAZO', 'service-desk', 0),
        ('notif-04', 'user-admin', 'SEEK V1 Hiper Pacote 4 implantado com sucesso', 'Todos os módulos empresariais ativos e integrados.', 'INFO', 'inicio', 0)
    `).run();
  }

  // 7. SEED PACOTE 5: PLANO DE CONTAS, PARTIDAS DOBRADAS, COMPETÊNCIAS, IMPOSTOS, NOTAS FISCAIS
  const coaCheck = db.prepare('SELECT COUNT(*) as count FROM chart_of_accounts').get() as { count: number };
  if (coaCheck.count === 0) {
    // Plano de Contas
    db.prepare(`
      INSERT INTO chart_of_accounts (id, company_id, code, name, type, nature, level, parent_code, balance)
      VALUES
        -- 1. ATIVO
        ('coa-1', 'comp-1', '1', 'ATIVO TOTAL', 'SINTETICA', 'DEVEDORA', 1, NULL, 2210800.00),
        ('coa-11', 'comp-1', '1.01', 'ATIVO CIRCULANTE', 'SINTETICA', 'DEVEDORA', 2, '1', 2120600.00),
        ('coa-111', 'comp-1', '1.01.01', 'Disponibilidades Imediatas', 'SINTETICA', 'DEVEDORA', 3, '1.01', 1840500.00),
        ('coa-1111', 'comp-1', '1.01.01.001', 'Banco Bradesco C/C Matriz', 'ANALITICA', 'DEVEDORA', 4, '1.01.01', 1250000.00),
        ('coa-1112', 'comp-1', '1.01.01.002', 'Banco Itaú C/C Operações', 'ANALITICA', 'DEVEDORA', 4, '1.01.01', 590500.00),
        ('coa-112', 'comp-1', '1.01.02', 'Clientes e Contas a Receber', 'SINTETICA', 'DEVEDORA', 3, '1.01', 230600.00),
        ('coa-1121', 'comp-1', '1.01.02.001', 'Clientes Corporativos Nacionais', 'ANALITICA', 'DEVEDORA', 4, '1.01.02', 230600.00),
        ('coa-113', 'comp-1', '1.01.03', 'Almoxarifado e Estoque de Suprimentos', 'SINTETICA', 'DEVEDORA', 3, '1.01', 49500.00),
        ('coa-1131', 'comp-1', '1.01.03.001', 'Estoque de Insumos e Materiais de TI', 'ANALITICA', 'DEVEDORA', 4, '1.01.03', 49500.00),
        ('coa-12', 'comp-1', '1.02', 'ATIVO NÃO CIRCULANTE', 'SINTETICA', 'DEVEDORA', 2, '1', 90200.00),
        ('coa-121', 'comp-1', '1.02.01', 'Imobilizado Corporativo', 'SINTETICA', 'DEVEDORA', 3, '1.02', 90200.00),
        ('coa-1211', 'comp-1', '1.02.01.001', 'Servidores, Switches e Equipamentos TI', 'ANALITICA', 'DEVEDORA', 4, '1.02.01', 94700.00),
        ('coa-1212', 'comp-1', '1.02.01.002', 'Mobiliário e Instalações Prediais', 'ANALITICA', 'DEVEDORA', 4, '1.02.01', 18000.00),
        ('coa-1213', 'comp-1', '1.02.01.003', '(-) Depreciação Acumulada Imobilizado', 'ANALITICA', 'CREDORA', 4, '1.02.01', 22500.00),

        -- 2. PASSIVO
        ('coa-2', 'comp-1', '2', 'PASSIVO E PATRIMÔNIO LÍQUIDO', 'SINTETICA', 'CREDORA', 1, NULL, 2210800.00),
        ('coa-21', 'comp-1', '2.01', 'PASSIVO CIRCULANTE', 'SINTETICA', 'CREDORA', 2, '2', 374600.00),
        ('coa-211', 'comp-1', '2.01.01', 'Fornecedores a Pagar', 'SINTETICA', 'CREDORA', 3, '2.01', 47250.00),
        ('coa-2111', 'comp-1', '2.01.01.001', 'Fornecedores Nacionais - TI & Redes', 'ANALITICA', 'CREDORA', 4, '2.01.01', 47250.00),
        ('coa-212', 'comp-1', '2.01.02', 'Obrigações Trabalhistas e Sociais', 'SINTETICA', 'CREDORA', 3, '2.01', 275900.00),
        ('coa-2121', 'comp-1', '2.01.02.001', 'Salários e Ordenados a Pagar', 'ANALITICA', 'CREDORA', 4, '2.01.02', 201500.00),
        ('coa-2122', 'comp-1', '2.01.02.002', 'Encargos FGTS e Previdenciários INSS', 'ANALITICA', 'CREDORA', 4, '2.01.02', 74400.00),
        ('coa-213', 'comp-1', '2.01.03', 'Obrigações Fiscais e Tributárias', 'SINTETICA', 'CREDORA', 3, '2.01', 51450.00),
        ('coa-2131', 'comp-1', '2.01.03.001', 'Impostos Federais a Recolher (PIS/COFINS/CSLL/IRPJ)', 'ANALITICA', 'CREDORA', 4, '2.01.03', 38650.00),
        ('coa-2132', 'comp-1', '2.01.03.002', 'ISS Municipal Retido a Recolher', 'ANALITICA', 'CREDORA', 4, '2.01.03', 12800.00),
        ('coa-22', 'comp-1', '2.02', 'PATRIMÔNIO LÍQUIDO', 'SINTETICA', 'CREDORA', 2, '2', 1836200.00),
        ('coa-221', 'comp-1', '2.02.01', 'Capital Social Subscrito e Integralizado', 'ANALITICA', 'CREDORA', 3, '2.02', 1200000.00),
        ('coa-222', 'comp-1', '2.02.02', 'Lucros Acumulados / Reserva de Lucros', 'ANALITICA', 'CREDORA', 3, '2.02', 294480.00),

        -- 3. RECEITAS
        ('coa-3', 'comp-1', '3', 'RECEITAS OPERACIONAIS', 'SINTETICA', 'CREDORA', 1, NULL, 620000.00),
        ('coa-31', 'comp-1', '3.01', 'RECEITA OPERACIONAL BRUTA', 'SINTETICA', 'CREDORA', 2, '3', 620000.00),
        ('coa-311', 'comp-1', '3.01.01.001', 'Receita de Gestão Integrada de TI & Facilities', 'ANALITICA', 'CREDORA', 3, '3.01', 380000.00),
        ('coa-312', 'comp-1', '3.01.01.002', 'Receita de Licenciamento de Software SaaS SEEK', 'ANALITICA', 'CREDORA', 3, '3.01', 240000.00),
        ('coa-32', 'comp-1', '3.02', 'DEDUÇÕES DA RECEITA BRUTA', 'SINTETICA', 'DEVEDORA', 2, '3', 41230.00),
        ('coa-321', 'comp-1', '3.02.01.001', '(-) PIS e COFINS sobre Serviços', 'ANALITICA', 'DEVEDORA', 3, '3.02', 22630.00),
        ('coa-322', 'comp-1', '3.02.01.002', '(-) ISSQN sobre Serviços Faturados', 'ANALITICA', 'DEVEDORA', 3, '3.02', 18600.00),

        -- 4. CUSTOS E DESPESAS
        ('coa-4', 'comp-1', '4', 'CUSTOS E DESPESAS OPERACIONAIS', 'SINTETICA', 'DEVEDORA', 1, NULL, 237050.00),
        ('coa-41', 'comp-1', '4.01', 'CUSTOS DOS SERVIÇOS PRESTADOS', 'SINTETICA', 'DEVEDORA', 2, '4', 47250.00),
        ('coa-411', 'comp-1', '4.01.01.001', 'Custos de Datacenter, Nuvem e Telecom', 'ANALITICA', 'DEVEDORA', 3, '4.01', 34800.00),
        ('coa-412', 'comp-1', '4.01.01.002', 'Custos de Suprimentos e Peças Operacionais', 'ANALITICA', 'DEVEDORA', 3, '4.01', 12450.00),
        ('coa-42', 'comp-1', '4.02', 'DESPESAS ADMINISTRATIVAS E GERAIS', 'SINTETICA', 'DEVEDORA', 2, '4', 189800.00),
        ('coa-421', 'comp-1', '4.02.01.001', 'Despesas com Pessoal e Benefícios Corporativos', 'ANALITICA', 'DEVEDORA', 3, '4.02', 164000.00),
        ('coa-422', 'comp-1', '4.02.01.002', 'Despesas com Facilities, Energia e Escritório', 'ANALITICA', 'DEVEDORA', 3, '4.02', 21600.00),
        ('coa-423', 'comp-1', '4.02.01.003', 'Depreciação de Ativos do Exercício', 'ANALITICA', 'DEVEDORA', 3, '4.02', 4200.00)
    `).run();

    // Partidas Dobradas (Livro Diário)
    db.prepare(`
      INSERT INTO accounting_entries (id, code, date, period, description, debit_account_code, credit_account_code, amount, cost_center, origin_type, origin_id, created_by)
      VALUES
        ('entry-01', 'LAN-2026-0001', '2026-10-01', '2026-10', 'Reconhecimento de receita contratual Grupo Votorantim', '1.01.02.001', '3.01.01.001', 185600.00, 'Operações & Serviços Corporativos', 'FINANCEIRO', 'fin-02', 'Valter Siqueira Neto'),
        ('entry-02', 'LAN-2026-0002', '2026-10-01', '2026-10', 'Reconhecimento de licenciamento SaaS Suzano S.A.', '1.01.02.001', '3.01.01.002', 45000.00, 'Tecnologia & Infraestrutura Cloud', 'FINANCEIRO', 'fin-04', 'Valter Siqueira Neto'),
        ('entry-03', 'LAN-2026-0003', '2026-10-02', '2026-10', 'Apropriação de despesa de Datacenter Equinix Brasil', '4.01.01.001', '2.01.01.001', 34800.00, 'Tecnologia & Infraestrutura Cloud', 'COMPRAS', 'po-01', 'Valter Siqueira Neto'),
        ('entry-04', 'LAN-2026-0004', '2026-10-05', '2026-10', 'Pagamento consolidado folha salarial e encargos Matriz', '2.01.02.001', '1.01.01.001', 289400.00, 'Administrativo & Recursos Humanos', 'FOLHA', 'fin-05', 'Helena Silveira Ramos'),
        ('entry-05', 'LAN-2026-0005', '2026-10-05', '2026-10', 'Apropriação mensal de depreciação acelerada de switches e servidores', '4.02.01.003', '1.02.01.003', 4200.00, 'Tecnologia & Infraestrutura Cloud', 'DEPRECIACAO', 'ast-01', 'Valter Siqueira Neto'),
        ('entry-06', 'LAN-2026-0006', '2026-10-05', '2026-10', 'Aquisição e ativação no imobilizado de 10 switches Cisco Catalyst', '1.02.01.001', '2.01.01.001', 18450.00, 'Tecnologia & Infraestrutura Cloud', 'COMPRAS', 'po-01', 'Valter Siqueira Neto')
    `).run();

    // Competências Contábeis
    db.prepare(`
      INSERT INTO accounting_periods (id, period, status, closed_by, closed_at, net_result)
      VALUES
        ('per-01', '2026-08', 'BLOQUEADO', 'Juliana Pires (Auditoria)', '2026-09-05 18:00', 312400.00),
        ('per-02', '2026-09', 'FECHADO', 'Valter Siqueira Neto (Contador)', '2026-10-04 17:30', 341720.00),
        ('per-03', '2026-10', 'ABERTO', NULL, NULL, 0.0)
    `).run();

    // Obrigações Tributárias
    db.prepare(`
      INSERT INTO tax_obligations (id, code, tax_type, period, base_amount, rate_percent, tax_amount, due_date, status, payment_date)
      VALUES
        ('tax-01', 'OBF-2026-01', 'ISS', '2026-09', 230600.00, 5.0, 11530.00, '2026-10-10', 'PENDENTE', NULL),
        ('tax-02', 'OBF-2026-02', 'PIS', '2026-09', 230600.00, 0.65, 1498.90, '2026-10-20', 'PENDENTE', NULL),
        ('tax-03', 'OBF-2026-03', 'COFINS', '2026-09', 230600.00, 3.0, 6918.00, '2026-10-20', 'PENDENTE', NULL),
        ('tax-04', 'OBF-2026-04', 'IRPJ', '2026-09', 230600.00, 1.5, 3459.00, '2026-10-20', 'PENDENTE', NULL),
        ('tax-05', 'OBF-2026-05', 'CSLL', '2026-09', 230600.00, 1.0, 2306.00, '2026-10-20', 'PENDENTE', NULL),
        ('tax-06', 'OBF-2026-06', 'INSS', '2026-09', 289400.00, 20.0, 57880.00, '2026-10-15', 'PENDENTE', NULL),
        ('tax-07', 'OBF-2026-07', 'FGTS', '2026-09', 289400.00, 8.0, 23152.00, '2026-10-07', 'PAGO', '2026-10-05 14:20')
    `).run();

    // Notas Fiscais (NFS-e / NF-e)
    db.prepare(`
      INSERT INTO fiscal_invoices (id, number, series, type, entity_name, document_number, total_amount, iss_amount, pis_amount, cofins_amount, irrf_amount, csll_amount, net_amount, issue_date, status, xml_key)
      VALUES
        ('nfe-01', 'NFS-2026-0145', '1', 'EMITIDA', 'Grupo Votorantim Participações S.A.', '12.987.654/0001-33', 185600.00, 9280.00, 1206.40, 5568.00, 2784.00, 1856.00, 164905.60, '2026-10-01', 'AUTORIZADA', '41261008123456000190550010000001451000185600'),
        ('nfe-02', 'NFS-2026-0146', '1', 'EMITIDA', 'Suzano S.A.', '15.432.109/0001-55', 45000.00, 2250.00, 292.50, 1350.00, 675.00, 450.00, 39982.50, '2026-10-01', 'AUTORIZADA', '41261008123456000190550010000001461000045000'),
        ('nfe-03', 'NFE-2026-8812', '1', 'RECEBIDA', 'Equinix Brasil Soluções de TI', '04.567.890/0001-12', 34800.00, 0.0, 0.0, 0.0, 0.0, 0.0, 34800.00, '2026-10-02', 'AUTORIZADA', '35261004567890000112550010000088121000034800'),
        ('nfe-04', 'NFE-2026-9904', '1', 'RECEBIDA', 'Cisco Systems Brasil Ltda.', '01.234.567/0001-89', 18450.00, 0.0, 0.0, 0.0, 0.0, 0.0, 18450.00, '2026-10-04', 'AUTORIZADA', '43261001234567000189550010000099041000018450')
    `).run();
  }

  // 8. SEED RH: BANCO DE FREELANCERS & CENTRAL DE TAXAS
  const freelCheck = db.prepare('SELECT COUNT(*) as count FROM freelancers').get() as { count: number };
  if (freelCheck.count === 0) {
    db.prepare(`
      INSERT INTO freelancers (id, full_name, cpf, rg, phone, email, pix_key, pix_type, bank_name, agency, account_number, primary_role, secondary_roles, standard_daily_rate, city, state, rating, total_jobs, punctuality_score, availability, status, notes)
      VALUES
        ('freel-01', 'Thiago Alcantara Ribeiro', '089.452.199-01', '10.892.411-2', '(41) 99871-2041', 'thiago.rib@gmail.com', '089.452.199-01', 'CPF', 'Nubank', '0001', '124908-1', 'Carregador / Roadie', 'Montagem, Carga Pesada', 220.00, 'Curitiba', 'PR', 4.9, 18, 100, 'DISPONIVEL', 'ATIVO', 'Profissional com NR-35 e excelente histórico de pontualidade.'),
        ('freel-02', 'Larissa Mendes Castro', '045.789.321-12', '12.441.902-8', '(41) 98744-1122', 'larissa.mendes@pix.me', 'larissa.mendes@pix.me', 'EMAIL', 'Banco Inter', '0001', '55120-9', 'Recepcionista / Credenciamento', 'Atendimento B2B, Recepção VIP', 200.00, 'Curitiba', 'PR', 5.0, 24, 100, 'DISPONIVEL', 'ATIVO', 'Fluente em inglês e espanhol, ótima postura institucional.'),
        ('freel-03', 'Marcos Vinicius Portela', '067.123.890-44', '09.312.654-1', '(41) 99123-4567', '06712389044', '06712389044', 'CPF', 'Banco Itaú', '0842', '41209-4', 'Montador Estrutural', 'Estruturas Box Truss, Palco', 280.00, 'Curitiba', 'PR', 4.7, 12, 95, 'DISPONIVEL', 'ATIVO', 'Experiência comprovada em montagem de estruturas pesadas.'),
        ('freel-04', 'Julio Cesar Antunes', '033.444.555-88', '11.870.321-9', '(41) 99655-4433', '41996554433', '41996554433', 'TELEFONE', 'Banco Bradesco', '1204', '89104-2', 'Técnico de Som / Luz', 'Operador de Mesa Digital, Iluminação DMX', 350.00, 'Curitiba', 'PR', 4.8, 15, 96, 'EM_JOB', 'ATIVO', 'Especialista em mesas digitais Yamaha e consoles DMX.'),
        ('freel-05', 'Patricia Nogueira Santos', '012.345.678-99', '14.209.811-0', '(41) 98888-7711', 'patricia.taxas@gmail.com', 'patricia.taxas@gmail.com', 'EMAIL', 'Banco Santander', '3102', '10944-8', 'Operador de Bar / Caixa', 'Controle de Estoque, Caixa Rápido', 200.00, 'Curitiba', 'PR', 4.9, 29, 98, 'DISPONIVEL', 'ATIVO', 'Agilidade com POS e fechamento de caixa sem divergências.'),
        ('freel-06', 'Lucas Gabriel Silveira', '054.321.987-65', '13.109.845-7', '(41) 99222-3344', '05432198765', '05432198765', 'CPF', 'Caixa Econômica', '0341', '001290-8', 'Limpeza Operacional', 'Apoio de Almoxarifado, Limpeza Técnica', 180.00, 'Curitiba', 'PR', 4.6, 9, 92, 'DISPONIVEL', 'ATIVO', 'Comprometido e ágil nas tarefas de conservação e apoio.')
    `).run();

    db.prepare(`
      INSERT INTO freelance_shifts (id, code, operation_name, cost_center, job_date, work_shift, location, requester_manager, freelancer_id, freelancer_name, freelancer_cpf, freelancer_pix, role_title, base_fee, allowance_food, allowance_transport, overtime_amount, reimbursement_amount, total_amount, status, hours_worked, performance_rating, validator_name, validation_notes, closed_at, paid_at)
      VALUES
        ('taxa-01', 'TX-2026-0001', 'Operação Logística Hub Curitiba', 'Operações & Logística Corporativa', '2026-10-01', '08:00 - 18:00', 'Hub Operacional Curitiba - Portão B', 'Eduardo Martins Fontes', 'freel-01', 'Thiago Alcantara Ribeiro', '089.452.199-01', '089.452.199-01', 'Carregador / Roadie', 220.00, 30.00, 0.00, 0.00, 0.00, 250.00, 'PAGO', 10.0, 5, 'Eduardo Martins Fontes', 'Excelente atuação na carga e descarga dos racks de rede.', '2026-10-01 19:00', '2026-10-02 10:15'),
        ('taxa-02', 'TX-2026-0002', 'Credenciamento Corporativo Filial SP', 'Administrativo & Recursos Humanos', '2026-10-04', '09:00 - 18:00', 'Sede Faria Lima - Pavilhão Recepção', 'Camila Duarte', 'freel-02', 'Larissa Mendes Castro', '045.789.321-12', 'larissa.mendes@pix.me', 'Recepcionista / Credenciamento', 200.00, 0.00, 40.00, 0.00, 0.00, 240.00, 'AGUARDANDO_PAGAMENTO', 9.0, 5, 'Camila Duarte', 'Conferência de presença validada. Enviar PIX para o financeiro.', '2026-10-04 18:30', NULL),
        ('taxa-03', 'TX-2026-0003', 'Montagem Estrutural Expotrade', 'Operações & Logística Corporativa', '2026-10-05', '07:00 - 17:00', 'Expotrade Pinhais - Pavilhão A', 'Eduardo Martins Fontes', 'freel-03', 'Marcos Vinicius Portela', '067.123.890-44', '06712389044', 'Montador Estrutural', 280.00, 30.00, 25.00, 0.00, 0.00, 335.00, 'REALIZADA', 10.0, 5, 'Eduardo Martins Fontes', 'Montagem concluída no prazo. Aguarda fechamento formal do RH.', '2026-10-05 17:45', NULL),
        ('taxa-04', 'TX-2026-0004', 'Instalação Audiovisual Sala de Convenções', 'Tecnologia da Informação & Nuvem', '2026-10-07', '13:00 - 22:00', 'Datacenter Curitiba - Auditório Matriz', 'Eduardo Martins Fontes', 'freel-04', 'Julio Cesar Antunes', '033.444.555-88', '41996554433', 'Técnico de Som / Luz', 350.00, 30.00, 0.00, 0.00, 0.00, 380.00, 'CONFIRMADO', 0.0, 5, NULL, 'Profissional confirmado para a escala de amanhã.', NULL, NULL),
        ('taxa-05', 'TX-2026-0005', 'Apoio de Almoxarifado e Carga', 'Operações & Logística Corporativa', '2026-10-08', '08:00 - 17:00', 'Curitiba Almoxarifado A', 'Mariana Fontes Prado', 'freel-06', 'Lucas Gabriel Silveira', '054.321.987-65', '05432198765', 'Limpeza Operacional', 180.00, 25.00, 20.00, 0.00, 0.00, 225.00, 'CONVOCADO', 0.0, 5, NULL, 'Aguardando confirmação de presença pelo profissional.', NULL, NULL),
        ('taxa-06', 'TX-2026-0006', 'Descarregamento Lote Servidores Dell', 'Operações & Logística Corporativa', '2026-10-09', '08:00 - 17:00', 'Datacenter Curitiba Matriz', 'Eduardo Martins Fontes', NULL, 'Pendente de Alocação', NULL, NULL, 'Carregador / Roadie', 220.00, 30.00, 0.00, 0.00, 0.00, 250.00, 'ABERTA', 0.0, 5, NULL, 'Vaga aberta aguardando seleção de profissional do banco de talentos.', NULL, NULL),
        ('taxa-07', 'TX-2026-0007', 'Suporte Presencial Feira B2B SP', 'Administrativo & Recursos Humanos', '2026-10-02', '09:00 - 18:00', 'São Paulo (Faria Lima)', 'Lucas Bertolli Costa', 'freel-05', 'Patricia Nogueira Santos', '012.345.678-99', 'patricia.taxas@gmail.com', 'Operador de Bar / Caixa', 200.00, 0.00, 0.00, 0.00, 0.00, 200.00, 'FALTA', 0.0, 1, 'Lucas Bertolli Costa', 'Profissional informou imprevisto de saúde de última hora. Substituição rápida acionada.', '2026-10-02 10:00', NULL)
    `).run();
  }

  // 9. SEED PACOTE 6: BANCOS, CONCILIAÇÃO, COTAÇÕES (3 FORNECEDORES), ORÇAMENTO E FECHAMENTO
  const btxCheck = db.prepare('SELECT COUNT(*) as count FROM bank_transactions').get() as { count: number };
  if (btxCheck.count === 0) {
    db.prepare(`
      INSERT INTO bank_transactions (id, account_id, type, category, amount, transaction_date, description, reference_type, reference_id, reconciled, reconciled_at)
      VALUES
        ('btx-01', 'bank-1', 'CREDITO', 'Receita de Clientes', 185600.00, '2026-10-02', 'TED Recebida - Grupo Votorantim Participações', 'TITULO', 'CR-2026-0941', 1, '2026-10-02 17:30:00'),
        ('btx-02', 'bank-1', 'DEBITO', 'Infraestrutura Datacenter', 34800.00, '2026-10-03', 'Pagamento Boleto - Equinix Brasil Soluções', 'TITULO', 'CP-2026-1044', 1, '2026-10-03 16:45:00'),
        ('btx-03', 'bank-2', 'DEBITO', 'Folha de Pagamento', 289400.00, '2026-10-05', 'Débito em Lote - Folha de Pagamento Colaboradores', 'TITULO', 'CP-2026-1046', 1, '2026-10-05 18:00:00'),
        ('btx-04', 'bank-1', 'DEBITO', 'Taxas Freelancers RH', 250.00, '2026-10-02', 'PIX Transferência - Thiago Alcantara Ribeiro (TX-2026-0001)', 'TAXA', 'TX-2026-0001', 1, '2026-10-02 10:20:00'),
        ('btx-05', 'bank-2', 'CREDITO', 'Receita SaaS SEEK', 45000.00, '2026-10-04', 'Liquidação Cobrança Registrada - Suzano S.A.', 'TITULO', 'CR-2026-0942', 0, NULL),
        ('btx-06', 'bank-1', 'DEBITO', 'Fornecedores Suprimentos', 12450.00, '2026-10-05', 'TED Emitida - Kalunga Comércio Gráfica', 'TITULO', 'CP-2026-1045', 0, NULL)
    `).run();

    db.prepare(`
      INSERT INTO bank_reconciliations (id, account_id, period, statement_balance, system_balance, difference, status, reconciled_by, notes)
      VALUES
        ('rec-01', 'bank-1', '2026-09', 1100000.00, 1100000.00, 0.00, 'CONCILIADO', 'Administrador Geral SEEK', 'Conciliação mensal de Setembro finalizada com 100% de conferência bancária.'),
        ('rec-02', 'bank-2', '2026-09', 835000.00, 835000.00, 0.00, 'CONCILIADO', 'Administrador Geral SEEK', 'Conta Itaú conciliada sem pendências no período.'),
        ('rec-03', 'bank-1', '2026-10', 1250000.00, 1250000.00, 0.00, 'CONCILIADO', 'Administrador Geral SEEK', 'Conciliação diária de Outubro em dia.')
    `).run();

    // Requisições de Compra Enterprise
    db.prepare(`
      INSERT INTO purchase_requisitions (id, code, requester_name, department, cost_center, description, justification, total_estimated, priority, status, required_date)
      VALUES
        ('req-01', 'REQ-2026-0101', 'Beatriz Castro Lima', 'Tecnologia da Informação & Nuvem', 'Tecnologia & Infraestrutura Cloud', 'Aquisição de 10 Switches Gerenciáveis 48 Portas Gigabit', 'Expansão de portas de rede e conexão entre racks de servidores no datacenter.', 20000.00, 'ALTA', 'COTADO', '2026-10-25'),
        ('req-02', 'REQ-2026-0102', 'Eduardo Martins Fontes', 'Tecnologia da Informação & Nuvem', 'Tecnologia & Infraestrutura Cloud', 'Aquisição de 5 Laptops Dell Latitude Core i7 para Equipe Comercial', 'Renovação e entrega de equipamentos de mobilidade para novos consultores B2B.', 45000.00, 'MEDIA', 'COTADO', '2026-10-30'),
        ('req-03', 'REQ-2026-0103', 'Mariana Fontes Prado', 'Operações & Logística Corporativa', 'Operações & Serviços Corporativos', 'Fornecimento Anual de Materiais de Escritório e Almoxarifado', 'Reposição de estoque trimestral de papelaria, suprimentos de TI e insumos corporativos.', 15000.00, 'BAIXA', 'APROVADO', '2026-10-20')
    `).run();

    // Mapa Comparativo de Cotações (3 Fornecedores Homologados por Requisição)
    db.prepare(`
      INSERT INTO purchase_quotations (id, requisition_id, supplier_id, supplier_name, supplier_cnpj, unit_price, quantity, total_price, delivery_days, payment_terms, proposal_number, rating, selected, notes)
      VALUES
        -- Requisição 01 (Switches) - Vencedor Cisco
        ('quot-01', 'req-01', 'part-1', 'Cisco Systems Brasil Ltda.', '01.234.567/0001-89', 1845.00, 10, 18450.00, 5, '30 dias Boleto Bancário', 'PROP-CS-9912', 5.0, 1, 'Melhor custo-benefício, compatibilidade direta com a infraestrutura atual e 36 meses de garantia.'),
        ('quot-02', 'req-01', 'part-3', 'Dell Networking Solutions', '72.381.189/0001-10', 2120.00, 10, 21200.00, 12, '15/30/45 dias Boleto', 'PROP-DL-4481', 4.8, 0, 'Preço 14.9% superior ao primeiro colocado. Prazo de entrega estendido.'),
        ('quot-03', 'req-01', NULL, 'HPE Aruba Networks Brasil', '02.991.222/0001-44', 2350.00, 10, 23500.00, 15, '28 dias Boleto Bancário', 'PROP-AR-8802', 4.5, 0, 'Maior valor unitário e prazo de entrega mais longo.'),

        -- Requisição 02 (Laptops) - Vencedor Dell
        ('quot-04', 'req-02', 'part-3', 'Dell Computadores do Brasil Ltda.', '72.381.189/0001-10', 5300.00, 5, 26500.00, 7, '30 dias Faturado', 'PROP-DL-7719', 4.9, 1, 'Melhor proposta com suporte ProSupport 3 anos no local e entrega rápida.'),
        ('quot-05', 'req-02', NULL, 'Lenovo Enterprise Brasil', '11.456.789/0001-20', 5800.00, 5, 29000.00, 14, '28 dias Faturado', 'PROP-LN-3301', 4.6, 0, 'Configuração equivalente, porém com custo total R$ 2.500,00 superior.'),
        ('quot-06', 'req-02', NULL, 'HP Enterprise Brasil', '33.882.119/0001-08', 6100.00, 5, 30500.00, 20, '30 dias Boleto', 'PROP-HP-1092', 4.4, 0, 'Prazo de entrega inviável para as necessidades do projeto.')
    `).run();

    // Matriz Orçamentária por Centro de Custo (Orçado × Comprometido × Realizado)
    db.prepare(`
      INSERT INTO cost_center_budgets (id, cost_center, fiscal_year, category, planned_amount, committed_amount, realized_amount, alert_threshold_percent)
      VALUES
        ('bud-01', 'Operações & Serviços Corporativos', 2026, 'Custos Operacionais & Insumos', 850000.00, 125000.00, 490000.00, 85.0),
        ('bud-02', 'Tecnologia & Infraestrutura Cloud', 2026, 'Datacenter, SaaS & Licenças', 620000.00, 85000.00, 380000.00, 85.0),
        ('bud-03', 'Comercial & Novos Negócios B2B', 2026, 'Comissões, Viagens & Feiras Corporativas', 400000.00, 32000.00, 210000.00, 80.0),
        ('bud-04', 'Administrativo & Recursos Humanos', 2026, 'Folha, Encargos & Facilities', 550000.00, 45000.00, 365000.00, 90.0)
    `).run();

    // Fechamento Mensal / Competência com Checklist
    db.prepare(`
      INSERT INTO financial_closings (id, period, module, status, closed_by, closed_at, checklist_json, notes)
      VALUES
        ('close-01', '2026-09', 'GERAL', 'BLOQUEADO', 'Administrador Geral SEEK', '2026-10-02 18:00:00',
         '{"extratos_conciliados":true,"contas_pagar_baixadas":true,"tributos_apurados":true,"folha_fechada":true,"balancete_verificado":true}',
         'Competência de Setembro/2026 encerrada e bloqueada para novas movimentações pela Controladoria.'),
        ('close-02', '2026-10', 'GERAL', 'ABERTO', NULL, NULL,
         '{"extratos_conciliados":true,"contas_pagar_baixadas":false,"tributos_apurados":true,"folha_fechada":false,"balancete_verificado":false}',
         'Competência de Outubro/2026 em andamento. Aguardando finalização do ciclo mensal.')
    `).run();
  }
}

// Inicializa o banco automaticamente ao importar
initializeDatabase();

// 7. HELPER PARA AUDITORIA IMUTÁVEL
export function logAudit(userName: string, userRole: string, action: string, module: string, entity: string, description: string, ip: string = '189.44.120.10') {
  const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, module, entity, description, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, now, userName, userRole, action, module, entity, description, ip);
}
