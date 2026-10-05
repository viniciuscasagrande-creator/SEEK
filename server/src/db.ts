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
  `);

  seedInitialData();
}

// 2. SEED DOS DADOS CORPORATIVOS INICIAIS
function seedInitialData() {
  const companyCheck = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
  if (companyCheck.count === 0) {
    // Empresas
    db.prepare(`
      INSERT INTO companies (id, code, trade_name, legal_name, document_number, is_holding)
      VALUES
        ('comp-1', 'SEEK-CORP', 'DiskIngressos Matriz', 'DiskIngressos Serviços de Bilheteria e Eventos S.A.', '08.123.456/0001-90', 1),
        ('comp-2', 'SEEK-SP', 'DiskIngressos SP', 'DiskIngressos Operações São Paulo Ltda.', '08.123.456/0002-71', 0),
        ('comp-3', 'SEEK-RJ', 'DiskIngressos Rio', 'DiskIngressos Entretenimento Rio de Janeiro Ltda.', '08.123.456/0003-52', 0)
    `).run();

    // Filiais
    db.prepare(`
      INSERT INTO branches (id, company_id, code, name, city, state, is_headquarter)
      VALUES
        ('branch-1', 'comp-1', 'FIL-01', 'Curitiba (Sede / Matriz)', 'Curitiba', 'PR', 1),
        ('branch-2', 'comp-1', 'FIL-02', 'Curitiba (Centro de Distribuição & PDV)', 'Curitiba', 'PR', 0),
        ('branch-3', 'comp-2', 'FIL-03', 'São Paulo (Faria Lima / Operações)', 'São Paulo', 'SP', 0),
        ('branch-4', 'comp-3', 'FIL-04', 'Rio de Janeiro (Barra da Tijuca)', 'Rio de Janeiro', 'RJ', 0)
    `).run();

    // Departamentos
    db.prepare(`
      INSERT INTO departments (id, company_id, code, name, budget_limit)
      VALUES
        ('dep-1', 'comp-1', 'FIN', 'Financeiro & Controladoria', 250000),
        ('dep-2', 'comp-1', 'COM', 'Comercial & CRM', 200000),
        ('dep-3', 'comp-1', 'OPE', 'Operações de Eventos', 350000),
        ('dep-4', 'comp-1', 'TI', 'Tecnologia da Informação', 300000),
        ('dep-5', 'comp-1', 'RH', 'Recursos Humanos & DP', 180000),
        ('dep-6', 'comp-1', 'CMP', 'Compras & Suprimentos', 150000),
        ('dep-7', 'comp-1', 'JUR', 'Jurídico & Contratos', 120000)
    `).run();

    // Centros de Custo
    db.prepare(`
      INSERT INTO cost_centers (id, company_id, code, name)
      VALUES
        ('cc-1', 'comp-1', '1.01.001', 'Operações de Bilheteria & Arenas'),
        ('cc-2', 'comp-1', '1.01.002', 'Tecnologia & Infraestrutura Cloud'),
        ('cc-3', 'comp-1', '1.02.001', 'Comercial & Marketing'),
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
        department: 'Operações de Eventos',
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
        department: 'Operações de Eventos',
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
        ('part-1', 'comp-1', 'FORNECEDOR', 'Digicon Controle de Acesso S.A.', 'Digicon Catracas & Scanners', '01.234.567/0001-89', 'Equipamentos de Acesso', 'Marcos Silva', 'contato@digicon.com.br', 'Porto Alegre', 'RS', 5, 98.5),
        ('part-2', 'comp-1', 'FORNECEDOR', 'Identifica Eventos Brasil Ltda.', 'Identifica Pulseiras RFID', '02.345.678/0001-90', 'Insumos & Credenciamento', 'Cláudia Peixoto', 'vendas@identificaeventos.com.br', 'São Paulo', 'SP', 4, 96.0),
        ('part-3', 'comp-1', 'FORNECEDOR', 'Dell Computadores do Brasil Ltda.', 'Dell Brasil', '72.381.189/0001-10', 'Equipamentos de TI', 'Rodrigo Mendes', 'corporativo@dell.com.br', 'Eldorado do Sul', 'RS', 5, 99.2),
        ('part-4', 'comp-1', 'FORNECEDOR', 'Equinix Brasil Soluções de TI', 'Equinix Datacenter', '04.567.890/0001-12', 'Infraestrutura Cloud & Hosting', 'Patricia Meirelles', 'noc@equinix.com.br', 'Barueri', 'SP', 5, 99.9),
        ('part-5', 'comp-1', 'CLIENTE', 'Allianz Parque Gestão de Arenas', 'Allianz Parque', '12.987.654/0001-33', 'Arenas & Estádios', 'Felipe Massaferro', 'eventos@allianzparque.com.br', 'São Paulo', 'SP', 5, 100.0),
        ('part-6', 'comp-1', 'CLIENTE', 'Teatro Positivo Curitiba Ltda.', 'Teatro Positivo', '15.432.109/0001-55', 'Teatros & Cultura', 'Sueli Gusmão', 'diretoria@teatropositivo.com.br', 'Curitiba', 'PR', 5, 100.0)
    `).run();
  }

  // 5. SEED DE CRM, FINANCEIRO, CONTRATOS, APROVAÇÕES
  const crmCheck = db.prepare('SELECT COUNT(*) as count FROM crm_deals').get() as { count: number };
  if (crmCheck.count === 0) {
    db.prepare(`
      INSERT INTO crm_deals (id, company_id, client_name, title, value, stage, probability, owner_name, expected_close_date)
      VALUES
        ('crm-1', 'comp-1', 'Allianz Parque Eventos', 'Gestão Exclusiva de Bilheteria Turnê Stadium 2027', 650000.00, 'NEGOCIACAO', 80, 'Lucas Bertolli Costa', '2026-10-28'),
        ('crm-2', 'comp-1', 'Festival Lollapalooza Brasil', 'Operação de Controle de Acesso e PDVs Físicos', 380000.00, 'PROPOSTA', 60, 'Lucas Bertolli Costa', '2026-11-05'),
        ('crm-3', 'comp-1', 'Teatro Bradesco SP', 'Renovação Trienal Sistema SEEK Bilheteria', 240000.00, 'CLIENTE', 100, 'Lucas Bertolli Costa', '2026-10-01'),
        ('crm-4', 'comp-1', 'Maracanã Tour & Museu do Futebol', 'Venda de Ingressos Online com Catracas Faciais', 410000.00, 'QUALIFICACAO', 40, 'Lucas Bertolli Costa', '2026-11-20'),
        ('crm-5', 'comp-1', 'Arena do Grêmio', 'Sistema de Acessos e Sócios Torcedores', 520000.00, 'LEAD', 20, 'Lucas Bertolli Costa', '2026-12-15')
    `).run();

    db.prepare(`
      INSERT INTO financial_records (id, company_id, code, type, title, entity_name, cost_center, category, amount, due_date, status, payment_method)
      VALUES
        ('fin-01', 'comp-1', 'CP-2026-1044', 'PAGAR', 'Licenciamento de Datacenter & Servidores Dedicados', 'Equinix Brasil Soluções de TI', 'Tecnologia & Infraestrutura Cloud', 'Infraestrutura Tecnológica', 34800.00, '2026-10-10', 'CONFIRMADO', 'Boleto Bancário'),
        ('fin-02', 'comp-1', 'CR-2026-0941', 'RECEBER', 'Taxa de Conveniência e Bilheteria Festival Curitiba Sounds', 'Live Nation Entretenimento Brasil', 'Operações de Bilheteria & Arenas', 'Receita Operacional Bruta', 185600.00, '2026-10-12', 'PREVISTO', 'PIX Cobrança'),
        ('fin-03', 'comp-1', 'CP-2026-1045', 'PAGAR', 'Fornecimento de Bobinas Térmicas e Pulseiras RFID', 'Gráfica Segurança do Sul Ltda.', 'Operações de Bilheteria & Arenas', 'Custos Diretos de Ingressos', 12450.00, '2026-10-15', 'PREVISTO', 'TED Bancária'),
        ('fin-04', 'comp-1', 'CR-2026-0942', 'RECEBER', 'Faturamento Mensal Teatro Positivo (Contrato Anual)', 'Teatro Positivo Curitiba', 'Operações de Bilheteria & Arenas', 'Receita Recorrente SaaS/Taxa', 45000.00, '2026-10-20', 'CONFIRMADO', 'Boleto Registrado'),
        ('fin-05', 'comp-1', 'CP-2026-1046', 'PAGAR', 'Folha de Pagamento Consolidada + Encargos FGTS/INSS', 'Colaboradores DiskIngressos Matriz', 'Administrativo & Recursos Humanos', 'Despesas com Pessoal', 289400.00, '2026-10-05', 'PAGO', 'Folha Automática Itaú')
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
        ('po-01', 'OC-2026-0042', '15 Catracas Portáteis & Scanners Ópticos', 'Operações de Eventos', 'Beatriz Castro Lima', 'Digicon Controle de Acesso S.A.', 18450.00, 'PENDENTE_APROVACAO', '2026-10-25'),
        ('po-02', 'OC-2026-0041', '50.000 Pulseiras Tyvek com Chip RFID', 'Operações de Eventos', 'Mariana Fontes Prado', 'Identifica Eventos Brasil Ltda.', 32000.00, 'APROVADO', '2026-10-18'),
        ('po-03', 'OC-2026-0040', '5 Laptops Dell Latitude i7 para Equipe Comercial SP', 'Tecnologia da Informação', 'Eduardo Martins', 'Dell Computadores do Brasil Ltda.', 26500.00, 'RECEBIDO', '2026-10-15')
    `).run();

    db.prepare(`
      INSERT INTO contracts (id, contract_number, party_name, type, monthly_value, start_date, end_date, days_remaining, readjustment_index, status)
      VALUES
        ('ct-01', 'CT-2024-0089', 'Allianz Parque Gestão de Arenas', 'CLIENTE', 85000.00, '2024-11-01', '2026-11-01', 27, 'IPCA', 'VENCENDO'),
        ('ct-02', 'CT-2025-0142', 'Equinix Brasil Soluções de TI', 'FORNECEDOR', 38000.00, '2025-01-15', '2027-01-15', 467, 'FIXO', 'VIGENTE'),
        ('ct-03', 'CT-2023-0056', 'Teatro Positivo Curitiba Ltda.', 'CLIENTE', 32000.00, '2023-08-01', '2026-12-31', 87, 'IGP-M', 'VIGENTE')
    `).run();

    db.prepare(`
      INSERT INTO approvals (id, company_id, entity_type, title, description, department, requester_name, requester_role, amount, status, priority, current_step, total_steps)
      VALUES
        ('app-01', 'comp-1', 'COMPRA', 'Aquisição de 15 Leitores Biométricos e Catracas Portáteis', 'Equipamentos para grandes festivais com validação facial e NFC.', 'Operações de Eventos', 'Beatriz Castro Lima', 'Analista Operacional Pleno', 18450.00, 'PENDENTE', 'ALTA', 2, 3),
        ('app-02', 'comp-1', 'CONTRATO', 'Renovação Contrato Master Infraestrutura Cloud AWS', 'Acordo corporativo anual com reserva de instâncias e SLA de 99.99%.', 'Tecnologia da Informação', 'Eduardo Martins', 'Tech Lead Infraestrutura', 142000.00, 'PENDENTE', 'CRITICA', 2, 2)
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
        ('aud-02', '2026-10-05 15:45:00', 'Mariana Fontes Prado', 'Gestora de Compras', 'CREATE', 'Compras', 'OC-2026-0042', 'Criada ordem de compra para 15 catracas e submetida ao fluxo de alçadas'),
        ('aud-03', '2026-10-05 14:10:30', 'Lucas Bertolli Costa', 'Líder Comercial & CRM', 'UPDATE', 'CRM & Comercial', 'Allianz Parque Stadium', 'Avançou estágio de Proposta para Negociação (R$ 650.000,00)')
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
        ('emp-03', 'comp-1', 'MAT-0015', 'Eduardo Martins Fontes', 'Gestor de Operações & TI', 'Operações de Eventos', 'Curitiba (Matriz)', 'CLT', '2022-04-10', 14500.00, 15, 12.5, 'Roberto Vianna Guimarães'),
        ('emp-04', 'comp-1', 'MAT-0045', 'Helena Silveira Ramos', 'Gerente Financeira', 'Financeiro & Controladoria', 'Curitiba (Matriz)', 'CLT', '2022-08-01', 16000.00, 22, -2.0, 'Roberto Vianna Guimarães'),
        ('emp-05', 'comp-1', 'MAT-0130', 'Lucas Bertolli Costa', 'Líder Comercial & CRM', 'Comercial & CRM', 'São Paulo (Faria Lima)', 'PJ', '2023-01-10', 17500.00, 0, 0, 'Roberto Vianna Guimarães'),
        ('emp-06', 'comp-1', 'MAT-0088', 'Camila Duarte', 'Gerente de RH & DP', 'Recursos Humanos & DP', 'Curitiba (Matriz)', 'CLT', '2022-11-15', 13800.00, 18, 4.0, 'Roberto Vianna Guimarães'),
        ('emp-07', 'comp-1', 'MAT-0164', 'Beatriz Castro Lima', 'Analista Operacional Pleno', 'Operações de Eventos', 'Curitiba (Matriz)', 'CLT', '2023-06-01', 5800.00, 25, 8.5, 'Eduardo Martins Fontes')
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
        ('ast-02', 'PAT-2025-0089', 'Lote de 20 Catracas Eletrônicas Portáteis Digicon', 'EQUIPAMENTO', 'Galpão de Eventos Curitiba', 'Beatriz Castro Lima', 48900.00, 41565.00, 1, 'ATIVO'),
        ('ast-03', 'PAT-2026-0045', 'MacBook Pro 16 M3 Max 36GB para Líder Comercial', 'TI', 'Filial São Paulo (Faria Lima)', 'Lucas Bertolli Costa', 24500.00, 22050.00, 1, 'ATIVO'),
        ('ast-04', 'PAT-2023-0104', 'Mobiliário Estações de Trabalho Open Space (12 posições)', 'MOBILIARIO', 'Sede Curitiba 3º Andar', 'Camila Duarte (RH)', 18000.00, 10800.00, 1, 'ATIVO')
    `).run();

    // Estoque & Almoxarifado
    db.prepare(`
      INSERT INTO inventory_items (id, code, name, category, current_stock, min_stock, unit, unit_cost, location, status)
      VALUES
        ('inv-01', 'MAT-BOB-01', 'Bobinas Térmicas Ticket 80x40mm (Caixa 30 un)', 'Insumos de Bilheteria', 450, 100, 'CX', 120.00, 'Curitiba Almoxarifado A', 'NORMAL'),
        ('inv-02', 'MAT-RFID-02', 'Pulseiras Tyvek com Chip RFID NTAG213 Homologado', 'Insumos de Controle', 85000, 20000, 'UN', 0.65, 'Curitiba Almoxarifado A', 'NORMAL'),
        ('inv-03', 'MAT-SCN-03', 'Scanners Ópticos Manuais QR Code / Barcode USB', 'Equipamentos Portáteis', 18, 25, 'UN', 340.00, 'Curitiba Almoxarifado B', 'BAIXO'),
        ('inv-04', 'MAT-CRD-04', 'Cordões e Crachás VIP com Presilha Jacaré', 'Credenciamento', 12000, 3000, 'UN', 1.80, 'Curitiba Almoxarifado A', 'NORMAL')
    `).run();

    // Projetos Estratégicos
    db.prepare(`
      INSERT INTO projects (id, code, name, department, leader_name, progress, budget, spent, deadline, status)
      VALUES
        ('prj-01', 'PRJ-2026-01', 'Implantação da Plataforma Integrada SEEK V1', 'Tecnologia & Operações', 'Eduardo Martins Fontes', 90, 150000.00, 124500.00, '2026-11-15', 'EM_ANDAMENTO'),
        ('prj-02', 'PRJ-2026-02', 'Expansão Operacional Filial São Paulo (Faria Lima)', 'Diretoria & Comercial', 'Lucas Bertolli Costa', 65, 450000.00, 298000.00, '2026-12-30', 'EM_ANDAMENTO'),
        ('prj-03', 'PRJ-2026-03', 'Operação de Bilheteria & Acessos Festival Curitiba Sounds', 'Operações de Eventos', 'Beatriz Castro Lima', 95, 80000.00, 78500.00, '2026-10-20', 'EM_ANDAMENTO')
    `).run();

    // Tarefas de Projetos
    db.prepare(`
      INSERT INTO project_tasks (id, project_id, title, assignee_name, due_date, priority, status, hours_estimated, hours_spent)
      VALUES
        ('tsk-01', 'prj-01', 'Validação das 13 Alçadas de Segurança no Core SQLite', 'Alexandre Magno', '2026-10-10', 'ALTA', 'CONCLUIDA', 16, 14),
        ('tsk-02', 'prj-01', 'Treinamento de Gestores nos Módulos de Compras e Contratos', 'Camila Duarte', '2026-10-18', 'MEDIA', 'EM_ANDAMENTO', 20, 8),
        ('tsk-03', 'prj-02', 'Contratação e Onboarding da Equipe Comercial SP', 'Camila Duarte', '2026-10-25', 'ALTA', 'EM_ANDAMENTO', 40, 28),
        ('tsk-04', 'prj-03', 'Homologação e Carga das 45 Catracas Faciais na Arena', 'Beatriz Castro Lima', '2026-10-14', 'CRITICA', 'A_FAZER', 24, 0)
    `).run();

    // Service Desk Interno
    db.prepare(`
      INSERT INTO tickets (id, code, title, department, status, priority, sla_hours_remaining, requester_name, assigned_to)
      VALUES
        ('tkt-01', 'CH-2026-0882', 'Configuração de VPN e Certificado Digital A1 Filial SP', 'TI', 'EM_ATENDIMENTO', 'ALTA', 6, 'Lucas Bertolli Costa', 'Alexandre Magno'),
        ('tkt-02', 'CH-2026-0883', 'Solicitação de Declaração de Rendimentos e Ponto 2026', 'RH', 'ABERTO', 'MEDIA', 22, 'Beatriz Castro Lima', 'Camila Duarte'),
        ('tkt-03', 'CH-2026-0884', 'Revisão de Minuta de Aditivo Contratual Allianz Parque', 'Jurídico', 'EM_ATENDIMENTO', 'CRITICA', 3, 'Lucas Bertolli Costa', 'Dr. Fernando Araripe'),
        ('tkt-04', 'CH-2026-0885', 'Liberação de Orçamento Emergencial para Pulseiras RFID', 'Financeiro', 'RESOLVIDO', 'ALTA', 0, 'Mariana Fontes Prado', 'Helena Silveira Ramos')
    `).run();

    // GED Corporativo
    db.prepare(`
      INSERT INTO documents (id, code, title, category, department, version, file_size, access_level, status)
      VALUES
        ('doc-01', 'DOC-POL-001', 'Política Geral de Governança, Alçadas e Aprovações SEEK', 'POLITICA', 'Diretoria & Compliance', 'v2.1', '1.8 MB', 'CORPORATIVO', 'VIGENTE'),
        ('doc-02', 'DOC-LGPD-004', 'Manual de Boas Práticas e Proteção de Dados (LGPD)', 'POLITICA', 'Jurídico & TI', 'v1.4', '2.4 MB', 'CORPORATIVO', 'VIGENTE'),
        ('doc-03', 'DOC-SOC-012', 'Estatuto Social Consolidado DiskIngressos S.A.', 'ATA', 'Jurídico', 'v3.0', '4.2 MB', 'RESTRITO', 'VIGENTE'),
        ('doc-04', 'DOC-RH-008', 'Acordo Coletivo de Trabalho e Banco de Horas 2026/2027', 'TERMO', 'Recursos Humanos', 'v1.0', '950 KB', 'COLABORADORES', 'VIGENTE')
    `).run();

    // Governança & Riscos
    db.prepare(`
      INSERT INTO risks_compliance (id, code, category, title, description, probability, impact, risk_level, mitigation_plan, status)
      VALUES
        ('rsk-01', 'RSK-LGPD-01', 'LGPD', 'Vazamento acidental de dados de compradores de ingressos', 'Incidentes de segurança ou acessos indevidos a dados de clientes.', 'BAIXA', 'ALTO', 'ALTO', 'Anonimização de CPF, logs de acesso auditados e criptografia de ponta a ponta.', 'MONITORADO'),
        ('rsk-02', 'RSK-OPE-02', 'OPERACIONAL', 'Queda de link de internet durante validação em festivais', 'Instabilidade de conexão em locais abertos de grandes eventos.', 'MEDIA', 'ALTO', 'CRITICO', 'Scanners operam em modo offline com sincronização assíncrona local por Wi-Fi redundante.', 'MONITORADO'),
        ('rsk-03', 'RSK-FIN-03', 'FINANCEIRO', 'Inadimplência de taxa de bilheteria de promotores terceiros', 'Risco de crédito em repasses de borderô final de eventos.', 'BAIXA', 'MEDIO', 'MEDIO', 'Retenção automática no split bancário antes do repasse final do evento.', 'MITIGADO')
    `).run();

    // Notificações Iniciais
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_route, read)
      VALUES
        ('notif-01', 'user-admin', 'Ordem de Compra OC-2026-0042 aguardando alçada', 'Aquisição de 15 catracas requer validação financeira e diretoria.', 'APROVACAO', 'approvals', 0),
        ('notif-02', 'user-admin', 'Contrato CT-2024-0089 (Allianz Parque) vencendo em 27 dias', 'Janela de negociação do índice IPCA aberta.', 'ALERTA', 'contracts', 0),
        ('notif-03', 'user-admin', 'Chamado CH-2026-0884 com SLA crítico (3 horas)', 'Revisão jurídica de minuta contratual.', 'PRAZO', 'service-desk', 0),
        ('notif-04', 'user-admin', 'SEEK V1 Hiper Pacote 4 implantado com sucesso', 'Todos os módulos empresariais ativos e integrados.', 'INFO', 'inicio', 0)
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
