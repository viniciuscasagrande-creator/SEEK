// SEEK Backend — Banco de Dados Local Persistente (SQLite / PostgreSQL Ready)
// Hiper Pacote 3: Gestão Corporativa Integrada (13 Perfis RBAC, Workflows, Compras, Contratos, CRM, Financeiro, Auditoria)

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

// 1. INICIALIZAÇÃO DAS TABELAS DO SEEK CORE
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
      status TEXT NOT NULL DEFAULT 'PENDENTE_APROVACAO', -- COTACAO, PENDENTE_APROVACAO, APROVADO, RECEBIDO, REJEITADO
      required_date TEXT,
      items_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      contract_number TEXT UNIQUE NOT NULL,
      party_name TEXT NOT NULL,
      type TEXT NOT NULL, -- CLIENTE, FORNECEDOR, PRESTADOR, LOCACAO
      monthly_value REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_remaining INTEGER,
      readjustment_index TEXT DEFAULT 'IPCA',
      status TEXT NOT NULL DEFAULT 'VIGENTE', -- VIGENTE, VENCENDO, RENOVADO, RESCINDIDO
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
      status TEXT NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, APROVADO, REJEITADO
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
      action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN
      module TEXT NOT NULL,
      entity TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT DEFAULT '189.44.120.10'
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

  // 5. SEED DE DADOS OPERACIONAIS (CRM, FINANCEIRO, CONTRATOS, APROVAÇÕES)
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
}

// Inicializa o banco automaticamente ao importar
initializeDatabase();

// 6. HELPER PARA AUDITORIA IMUTÁVEL
export function logAudit(userName: string, userRole: string, action: string, module: string, entity: string, description: string, ip: string = '189.44.120.10') {
  const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, module, entity, description, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, now, userName, userRole, action, module, entity, description, ip);
}
