-- ==============================================================================
-- SEEK — Gestão Corporativa Integrada (ERP + CRM + Gestão Administrativa)
-- Esquema de Banco de Dados Oficial DDL (PostgreSQL 14+)
-- Hiper Pacote 2 Operacional: Core, 13 Perfis RBAC, Workflows, CRM, Finanças e Auditoria
-- ==============================================================================

-- 1. EXTENSÕES & DOMÍNIOS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. EMPRESAS E FILIAIS (MULTIEMPRESA NATIVO)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(30) UNIQUE NOT NULL,
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(160) NOT NULL,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    inscricao_estadual VARCHAR(30),
    inscricao_municipal VARCHAR(30),
    is_holding BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS filiais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(140) NOT NULL,
    cnpj VARCHAR(20) NOT NULL,
    cidade VARCHAR(80) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    is_matriz BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS departamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    filial_id UUID REFERENCES filiais(id) ON DELETE SET NULL,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    gestor_id UUID,
    teto_orcamentario NUMERIC(14,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS centros_custo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    departamento_id UUID REFERENCES departamentos(id) ON DELETE SET NULL,
    codigo VARCHAR(30) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(empresa_id, codigo)
);

-- 3. USUÁRIOS, COLABORADORES E PERFIS (RBAC DINÂMICO)
CREATE TYPE role_level_enum AS ENUM (
    'ADMIN_GERAL', 'DIRETORIA', 'GESTOR', 'FINANCEIRO', 'CONTABILIDADE',
    'FISCAL', 'COMERCIAL', 'RH', 'COMPRAS', 'JURIDICO', 'TI', 'AUDITORIA', 'COLABORADOR'
);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    email VARCHAR(180) UNIQUE NOT NULL,
    matricula VARCHAR(30) UNIQUE,
    senha_hash TEXT NOT NULL,
    nome_completo VARCHAR(160) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    role_level role_level_enum NOT NULL DEFAULT 'COLABORADOR',
    limite_alcada NUMERIC(14,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
    departamento_id UUID NOT NULL REFERENCES departamentos(id),
    matricula VARCHAR(30) UNIQUE NOT NULL,
    nome_completo VARCHAR(160) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    data_admissao DATE NOT NULL,
    salario_base NUMERIC(14,2) NOT NULL,
    saldo_ferias_dias INT DEFAULT 30,
    saldo_banco_horas NUMERIC(8,2) DEFAULT 0,
    regime VARCHAR(20) DEFAULT 'CLT',
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sessoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PARCEIROS DE NEGÓCIOS UNIFICADOS (CLIENTES + FORNECEDORES)
CREATE TYPE partner_type_enum AS ENUM ('CLIENTE', 'FORNECEDOR', 'PARCEIRO', 'AMBOS');

CREATE TABLE IF NOT EXISTS parceiros_negocios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    tipo partner_type_enum DEFAULT 'CLIENTE',
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(160),
    cnpj_cpf VARCHAR(20) NOT NULL,
    email VARCHAR(160),
    telefone VARCHAR(30),
    cidade VARCHAR(80),
    estado VARCHAR(2),
    score_sla INT DEFAULT 5,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empresa_id, cnpj_cpf)
);

-- 5. MOTOR CENTRAL DE WORKFLOWS & ALÇADAS
CREATE TYPE workflow_entity_enum AS ENUM (
    'COMPRA', 'PAGAMENTO', 'CONTRATO', 'FERIAS', 'REEMBOLSO', 'DESCONTO_COMERCIAL'
);

CREATE TYPE approval_status_enum AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO');

CREATE TABLE IF NOT EXISTS regras_alcadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    tipo_entidade workflow_entity_enum NOT NULL,
    valor_minimo NUMERIC(14,2) DEFAULT 0,
    valor_maximo NUMERIC(14,2),
    role_necessario role_level_enum NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    ordem INT DEFAULT 1,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS solicitacoes_aprovacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    tipo_entidade workflow_entity_enum NOT NULL,
    entidade_id UUID,
    solicitante_id UUID NOT NULL REFERENCES usuarios(id),
    titulo VARCHAR(220) NOT NULL,
    descricao TEXT,
    valor NUMERIC(14,2),
    status approval_status_enum DEFAULT 'PENDENTE',
    etapa_atual INT DEFAULT 1,
    prioridade VARCHAR(20) DEFAULT 'MEDIA',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etapas_aprovacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitacao_id UUID NOT NULL REFERENCES solicitacoes_aprovacao(id) ON DELETE CASCADE,
    numero_etapa INT NOT NULL,
    rotulo VARCHAR(160) NOT NULL,
    role_requerido role_level_enum NOT NULL,
    decisor_id UUID REFERENCES usuarios(id),
    status approval_status_enum DEFAULT 'PENDENTE',
    data_decisao TIMESTAMP WITH TIME ZONE,
    justificativa TEXT
);

-- 6. FINANCEIRO (CONTAS A PAGAR, RECEBER E BANCOS)
CREATE TABLE IF NOT EXISTS contas_bancarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filial_id UUID NOT NULL REFERENCES filiais(id),
    banco_nome VARCHAR(80) NOT NULL,
    banco_codigo VARCHAR(10) NOT NULL,
    agencia VARCHAR(20) NOT NULL,
    conta_numero VARCHAR(30) NOT NULL,
    saldo_atual NUMERIC(14,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    parceiro_id UUID REFERENCES parceiros_negocios(id),
    centro_custo_id UUID REFERENCES centros_custo(id),
    conta_bancaria_id UUID REFERENCES contas_bancarias(id),
    codigo VARCHAR(40) UNIQUE NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('PAGAR', 'RECEBER')),
    titulo VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    valor NUMERIC(14,2) NOT NULL,
    valor_pago NUMERIC(14,2),
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'PREVISTO',
    metodo_pagamento VARCHAR(50),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CRM & COMERCIAL OPERACIONAL
CREATE TYPE deal_stage_enum AS ENUM (
    'LEAD', 'QUALIFICACAO', 'OPORTUNIDADE', 'PROPOSTA', 'NEGOCIACAO', 'APROVACAO', 'CONTRATO', 'CLIENTE'
);

CREATE TABLE IF NOT EXISTS crm_oportunidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parceiro_id UUID NOT NULL REFERENCES parceiros_negocios(id),
    titulo VARCHAR(220) NOT NULL,
    valor NUMERIC(14,2) NOT NULL,
    estagio deal_stage_enum DEFAULT 'LEAD',
    probabilidade INT DEFAULT 20,
    responsavel_nome VARCHAR(140) NOT NULL,
    data_fechamento_prevista DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CONTRATOS E SERVICE DESK
CREATE TABLE IF NOT EXISTS contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    parceiro_id UUID NOT NULL REFERENCES parceiros_negocios(id),
    numero_contrato VARCHAR(50) UNIQUE NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    valor_mensal NUMERIC(14,2) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    indice_reajuste VARCHAR(20) DEFAULT 'IPCA',
    status VARCHAR(20) DEFAULT 'VIGENTE'
);

CREATE TABLE IF NOT EXISTS chamados_service_desk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    departamento_id UUID NOT NULL REFERENCES departamentos(id),
    criador_id UUID NOT NULL REFERENCES usuarios(id),
    responsavel_id UUID REFERENCES usuarios(id),
    numero VARCHAR(40) UNIQUE NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    prioridade VARCHAR(20) DEFAULT 'MEDIA',
    status VARCHAR(20) DEFAULT 'ABERTO',
    prazo_sla TIMESTAMP WITH TIME ZONE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TRILHA UNIVERSAL DE AUDITORIA (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS auditoria_universal (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id),
    usuario_id UUID REFERENCES usuarios(id),
    usuario_nome VARCHAR(160),
    usuario_cargo VARCHAR(100),
    modulo VARCHAR(80) NOT NULL,
    acao VARCHAR(40) NOT NULL,
    entidade VARCHAR(100) NOT NULL,
    entidade_id VARCHAR(100),
    ip_origem VARCHAR(45),
    detalhes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auditoria_empresa_modulo ON auditoria_universal(empresa_id, modulo, criado_em);
