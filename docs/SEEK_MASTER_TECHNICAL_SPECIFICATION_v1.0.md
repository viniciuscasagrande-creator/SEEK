# SEEK --- MASTER TECHNICAL SPECIFICATION v1.0

**Documento-base de arquitetura e desenvolvimento**\
**Data:** 06/10/2026\
**Status:** Baseline arquitetural

## 1. Objetivo

O SEEK será uma plataforma empresarial modular, multi-tenant e orientada
a processos, combinando ERP, operações, dados, integrações e
inteligência artificial.

A vertical especializada inicial será a DiskIngressos, contemplando
eventos, ingressos, PDV, pagamentos, produtores, repasses, antifraude,
SAC e marketing.

## 2. Arquitetura

A recomendação é iniciar como **Modular Monolith**, com fronteiras
rígidas entre domínios e possibilidade de extração futura de serviços.

Camadas:

``` text
Presentation
    ↓
API / Application
    ↓
Domain
    ↓
Infrastructure
    ↓
PostgreSQL / Redis / Object Storage
```

## 3. Stack

### Frontend

-   React
-   TypeScript
-   Vite
-   React Router
-   TanStack Query
-   Tailwind
-   Design System
-   React Hook Form
-   Zod

### Backend

-   Node.js
-   TypeScript
-   NestJS ou Express estruturado
-   Zod
-   OpenAPI
-   JWT/OAuth
-   RBAC/ABAC

### Dados

-   PostgreSQL
-   Redis
-   Object Storage
-   Data Warehouse em fase posterior

### Infraestrutura

-   Docker
-   CI/CD
-   observabilidade
-   backup
-   disaster recovery

## 4. Estrutura do projeto

``` text
seek/
├── apps/
│   ├── web/
│   ├── api/
│   ├── worker/
│   └── producer-portal/
├── modules/
│   ├── identity/
│   ├── tenants/
│   ├── master-data/
│   ├── finance/
│   ├── accounting/
│   ├── fiscal/
│   ├── sales/
│   ├── procurement/
│   ├── inventory/
│   ├── crm/
│   ├── people/
│   ├── projects/
│   ├── contracts/
│   ├── service/
│   ├── marketing/
│   ├── events/
│   ├── payments/
│   ├── settlement/
│   ├── fraud/
│   └── intelligence/
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   ├── database/
│   ├── auth/
│   ├── audit/
│   ├── workflow/
│   ├── rules/
│   ├── integrations/
│   └── observability/
├── infrastructure/
├── docs/
├── docker/
├── scripts/
└── tests/
```

## 5. Core

O CORE deve existir antes dos grandes módulos de negócio.

### Identity

Usuários, perfis, roles, permissões, sessões, MFA, SSO, OAuth, API Keys
e dispositivos.

### Multi-Tenant

``` text
Tenant
 └── Group
      ├── Company
      │    ├── Branch
      │    └── Branch
      └── Company
```

Toda entidade relevante deverá possuir `tenant_id`. O backend nunca
deverá confiar no tenant informado pelo frontend.

### RBAC + ABAC

Formato:

``` text
module.resource.action
```

Exemplos:

``` text
finance.accounts_payable.read
finance.accounts_payable.approve
payments.refunds.approve
events.tickets.issue
```

Aplicar escopo por tenant, grupo, empresa, filial, usuário ou recurso.

### Auditoria

Registrar:

``` text
actor
tenant
action
entity
before
after
IP
user agent
request ID
correlation ID
timestamp
```

## 6. Master Data Management

Fonte única para:

-   pessoas;
-   clientes;
-   fornecedores;
-   empresas;
-   produtores;
-   produtos;
-   serviços;
-   locais;
-   contas;
-   centros de custo;
-   eventos.

Recursos: deduplicação, merge, bloqueio, validação, histórico e
qualidade de dados.

## 7. Configuração

Toda configuração importante deve ser versionada e possuir vigência.

Exemplos:

-   regras financeiras;
-   regras fiscais;
-   descontos;
-   comissões;
-   aprovações;
-   repasses;
-   segurança;
-   integrações.

## 8. Financeiro

Módulos:

-   contas a pagar;
-   contas a receber;
-   tesouraria;
-   bancos;
-   caixa;
-   pagamentos;
-   cobranças;
-   conciliação;
-   fluxo de caixa.

Fluxo:

``` text
Documento
 ↓
Lançamento
 ↓
Aprovação
 ↓
Título
 ↓
Pagamento
 ↓
Baixa
 ↓
Conciliação
 ↓
Contabilidade
```

Operações financeiras críticas devem usar transações de banco.

## 9. Contabilidade

Módulos:

-   plano de contas;
-   lançamentos;
-   diário;
-   razão;
-   centros de custo;
-   dimensões;
-   DRE;
-   balanço;
-   balancete;
-   fechamento;
-   consolidação.

Aplicar partidas dobradas e impedir edição direta de lançamentos
contabilizados; correções devem ocorrer por estorno/ajuste.

## 10. Fiscal

Preparar para:

-   NF-e;
-   NFS-e;
-   NFC-e;
-   CT-e;
-   tributos;
-   retenções;
-   apurações;
-   obrigações.

Regras fiscais devem possuir versão e vigência.

## 11. Workflow Engine

``` text
Trigger
 ↓
Condition
 ↓
Rule
 ↓
Action
 ↓
Approval
 ↓
Notification
```

Entidades:

-   workflows;
-   workflow_versions;
-   workflow_instances;
-   workflow_steps;
-   workflow_actions;
-   workflow_conditions;
-   workflow_approvals.

Workflows são versionados.

## 12. Rules Engine

Separar regras de workflow.

Exemplos:

-   desconto;
-   comissão;
-   imposto;
-   aprovação;
-   crédito;
-   repasse;
-   preço;
-   acesso.

Toda regra possui versão, status e vigência.

## 13. Event Bus

Eventos internos:

``` text
UserCreated
OrderCreated
PaymentAuthorized
PaymentCaptured
PaymentRefunded
TicketIssued
TicketCancelled
EventCreated
CheckinCompleted
SettlementCreated
ContractSigned
InvoiceCreated
```

Cada evento deve ter `event_id`, `event_type`, `tenant_id`,
`aggregate_id`, timestamp e `correlation_id`.

## 14. Idempotência

Obrigatória em:

-   pagamentos;
-   captura;
-   estorno;
-   emissão de ingresso;
-   repasses;
-   webhooks;
-   integrações financeiras.

Usar `Idempotency-Key`.

## 15. API

Base:

``` text
/api/v1
```

Exemplos:

``` text
GET  /api/v1/events
POST /api/v1/events
GET  /api/v1/events/:id
PATCH /api/v1/events/:id

POST /api/v1/payments
POST /api/v1/payments/:id/refund

GET  /api/v1/settlements
POST /api/v1/settlements/:id/approve
```

API deve possuir paginação, filtros, validação, erros padronizados,
correlation ID e OpenAPI.

## 16. Integrações

Criar Integration Hub com:

-   credenciais;
-   webhooks;
-   logs;
-   retry;
-   backoff;
-   dead-letter;
-   health check;
-   reprocessamento.

## 17. DiskIngressos

Vertical especializada:

``` text
DiskIngressos
├── Events
├── Tickets
├── POS
├── Payments
├── Gateway
├── Fraud
├── Settlement
├── Producers
├── SAC
├── Marketing
└── Analytics
```

### Fluxo de venda

``` text
Customer
 ↓
Cart
 ↓
Order
 ↓
Payment
 ↓
Fraud
 ↓
Ticket Issue
 ↓
Notification
 ↓
Accounting
 ↓
Settlement
```

### Settlement

``` text
Gross Sales
 - Gateway Fees
 - Platform Fees
 - Taxes
 - Commissions
 - Other Costs
 = Net Producer Amount
```

Cada repasse deve guardar os itens que originaram o valor.

### POS

Pontos previstos:

-   Shopping Mueller;
-   Teatro Positivo;
-   Teatro Guaíra;
-   Teatro Fernanda Montenegro;
-   Família Pave.

Fluxo:

``` text
Terminal
 ↓
Operator
 ↓
Cash Session
 ↓
Sales
 ↓
Refunds
 ↓
Closing
 ↓
Reconciliation
```

## 18. Portal do produtor

``` text
Dashboard
Eventos
Vendas
Ingressos
Financeiro
Repasses
Marketing
Analytics
Contratos
Documentos
SAC
```

O backend deve determinar o escopo permitido pela sessão.

## 19. Observabilidade

Toda requisição deve carregar:

``` text
request_id
correlation_id
tenant_id
user_id
```

Monitorar API, banco, Redis, filas, integrações, pagamentos e jobs.

Endpoints:

``` text
/health
/health/live
/health/ready
```

## 20. Filas

Usar workers para:

-   e-mail;
-   WhatsApp;
-   relatórios;
-   webhooks;
-   conciliação;
-   importações;
-   notificações;
-   IA;
-   tarefas demoradas.

## 21. Segurança

Obrigatório:

-   Helmet;
-   CORS restritivo;
-   rate limiting;
-   validação;
-   sanitização;
-   secrets fora do código;
-   criptografia de dados sensíveis;
-   MFA;
-   rotação de tokens;
-   logs de segurança.

## 22. LGPD

Criar:

``` text
consents
privacy_requests
data_processing_records
retention_policies
anonymization_jobs
```

Suportar acesso, exportação, correção, anonimização, exclusão quando
aplicável, retenção e consentimento.

## 23. Documentos

Armazenar arquivos em Object Storage. O banco mantém metadados, versões,
checksum, proprietário e tenant.

## 24. Feature Flags

Permitir ativação por:

-   global;
-   tenant;
-   empresa;
-   usuário;
-   plano;
-   ambiente.

## 25. SaaS Billing

Fase futura:

``` text
plans
subscriptions
subscription_items
usage_records
invoices
billing_cycles
addons
```

Métricas de consumo: usuários, transações, eventos, armazenamento, API e
IA.

## 26. BI

KPIs:

-   Receita;
-   GMV;
-   Receita líquida;
-   Margem;
-   EBITDA;
-   Fluxo de caixa;
-   Pedidos;
-   Conversão;
-   Ticket médio;
-   Estornos;
-   Chargebacks;
-   Repasses.

Para DiskIngressos:

-   vendas por evento;
-   produtor;
-   canal;
-   PDV;
-   ticket médio;
-   ocupação;
-   conversão;
-   cancelamentos;
-   estornos;
-   repasses.

## 27. Data Warehouse

``` text
PostgreSQL
 ↓
ETL / ELT
 ↓
Data Warehouse
 ↓
Semantic Layer
 ↓
BI / AI
```

Consultas analíticas pesadas não devem comprometer o banco transacional.

## 28. SEEK AI

Fluxo:

``` text
User
 ↓
Permissions
 ↓
Tenant
 ↓
Data Access Policy
 ↓
Agent
 ↓
Tools
 ↓
Answer / Action
```

Agentes:

-   Finance;
-   Accounting;
-   Fiscal;
-   Sales;
-   Event;
-   Fraud;
-   Audit;
-   Executive.

Ações irreversíveis exigem aprovação conforme política.

## 29. Knowledge Center

Base para IA contendo:

-   manuais;
-   políticas;
-   procedimentos;
-   contratos;
-   documentos;
-   FAQs;
-   treinamentos.

Respeitar tenant, empresa, tipo, versão, vigência e nível de acesso.

## 30. Digital Twin

Fase avançada para simulação de cenários:

``` text
Premissa
 ↓
Modelo
 ↓
Impacto financeiro
 ↓
Impacto operacional
 ↓
Cenários
 ↓
Recomendação
```

## 31. Testes

### Unitários

Domínio, regras e cálculos.

### Integração

Banco, APIs, filas e integrações.

### E2E

Processos completos.

Exemplo:

``` text
Criar evento
 ↓
Criar lote
 ↓
Comprar
 ↓
Pagar
 ↓
Emitir
 ↓
Check-in
 ↓
Estornar
 ↓
Conciliar
 ↓
Repassar
```

## 32. Ambientes

``` text
LOCAL
 ↓
DEV
 ↓
HML
 ↓
STAGING
 ↓
PROD
```

Produção nunca compartilha banco com desenvolvimento.

## 33. CI/CD

``` text
Push
 ↓
Lint
 ↓
Typecheck
 ↓
Unit Tests
 ↓
Integration Tests
 ↓
Build
 ↓
Security Scan
 ↓
HML
 ↓
E2E
 ↓
Approval
 ↓
Production
```

## 34. Backup e DR

Definir RPO e RTO, backup, retenção, cópia externa, teste de restauração
e plano de recuperação.

## 35. Definition of Done

Uma funcionalidade só está pronta quando possui:

-   frontend;
-   backend;
-   validação;
-   permissões;
-   auditoria;
-   testes;
-   documentação;
-   logs;
-   tratamento de erro;
-   migration;
-   revisão.

## 36. Roadmap

### P0 --- Fundação

PostgreSQL, migrations, Identity, Tenant, RBAC/ABAC, Audit, MDM, Config,
API, Observabilidade e Segurança.

### P1 --- ERP

Financeiro, Contábil, Fiscal, Compras, Estoque, Vendas, CRM, Contratos,
Projetos e Service Desk.

### P2 --- Plataforma

Workflow, Rules, Automation, Integration Hub, Conciliação, Settlement,
BI, Portal do produtor, Mobile e Knowledge.

### P3 --- Inteligência

SEEK AI, Agents, Forecast, Fraud AI, Process Mining, Digital Twin,
Marketplace e SaaS Billing.

## 37. Sprint 01

``` text
PostgreSQL
Migrations
Environment/Config
Auth
Tenant
Users
Roles
Permissions
Audit
Error Handling
Logging
Health Checks
API Versioning
Docker
CI básico
```

## 38. Sprint 02

``` text
Master Data
Companies
Branches
Cost Centers
Bank Accounts
Documents
Notifications
Feature Flags
```

## 39. Sprint 03

``` text
Accounts Payable
Accounts Receivable
Cash
Bank Transactions
Payment
Reconciliation
```

# 40. Prompt mestre para Gemini/VS Code

Você está desenvolvendo o SEEK, uma plataforma empresarial modular,
multi-tenant e orientada a processos.

Respeite rigorosamente:

-   arquitetura modular;
-   multi-tenancy;
-   RBAC/ABAC;
-   auditoria;
-   migrations;
-   validação;
-   testes;
-   API versionada;
-   idempotência;
-   segurança;
-   observabilidade;
-   separação entre domínio e interface.

Antes de implementar:

1.  analisar a arquitetura existente;
2.  identificar o módulo responsável;
3.  verificar entidades;
4.  verificar permissões;
5.  verificar APIs;
6.  verificar migrations;
7.  verificar testes;
8.  propor alterações;
9.  implementar sem duplicar responsabilidades;
10. executar testes e typecheck.

Nunca colocar regra de negócio crítica diretamente em componentes React.

Nunca confiar em tenant, empresa, produtor ou permissões enviados pelo
frontend.

Operações financeiras, fiscais, contábeis, pagamentos e repasses exigem
transação, autorização, auditoria, idempotência e testes.

Não substituir arquitetura existente por uma solução simplificada apenas
para concluir rapidamente.

# 41. Critério final de sucesso

O SEEK estará preparado para escala quando for possível:

``` text
Criar tenant
 ↓
Criar empresa
 ↓
Criar usuários
 ↓
Definir permissões
 ↓
Ativar módulos
 ↓
Configurar regras
 ↓
Operar financeiro
 ↓
Auditar operações
 ↓
Integrar sistemas
 ↓
Gerar BI
 ↓
Utilizar IA
```

sem alterar o núcleo da plataforma.

# 42. Visão final

``` text
SEEK
├── CORE
│   ├── Identity
│   ├── Tenant
│   ├── Security
│   ├── Audit
│   ├── MDM
│   └── Config
│
├── PLATFORM
│   ├── Workflow
│   ├── Rules
│   ├── Automation
│   ├── API
│   └── Integrations
│
├── BUSINESS
│   ├── Finance
│   ├── Accounting
│   ├── Fiscal
│   ├── Sales
│   ├── CRM
│   ├── Procurement
│   ├── Inventory
│   ├── HR
│   ├── Projects
│   ├── Contracts
│   └── Service
│
├── DISKINGRESSOS
│   ├── Events
│   ├── Tickets
│   ├── POS
│   ├── Gateway
│   ├── Fraud
│   ├── Settlement
│   ├── Producer
│   └── Marketing
│
├── INTELLIGENCE
│   ├── BI
│   ├── Data Warehouse
│   ├── Forecast
│   └── Analytics
│
└── AI
    ├── Copilot
    ├── Agents
    ├── Anomaly Detection
    └── Digital Twin
```

**Regra arquitetural central:** não desenvolver o SEEK tela por tela.
Desenvolver Core → domínio → API → regras → persistência → auditoria →
testes → interface.
