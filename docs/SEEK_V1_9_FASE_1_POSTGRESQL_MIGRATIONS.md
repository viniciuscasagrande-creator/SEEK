# SEEK V1.9 — Fase 1: PostgreSQL + Migrations

**Data de Validação:** 06/10/2026  
**Ambiente Oficial de Produção:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)  
**Status dos Testes:** 15 Aprovados / 0 Falhas (`npm run server:test:fase1`) + 38 Testes de Segurança (`npm run server:test`)

---

## 1. Visão Geral da Fase 1

A **Fase 1** estabelece a infraestrutura de banco de dados relacional corporativo do **SEEK ERP**, introduzindo um motor de migrations versionadas e arquitetura **Dual-Engine** compatível com **SQLite WAL** (desenvolvimento local ágil e offline) e **PostgreSQL** (produção, staging, Supabase, Neon, AWS RDS):

1. **Catálogo de Migrations Determinísticas:** 6 arquivos SQL versionados (`server/migrations/*.sql`) cobrindo 100% das entidades corporativas do sistema.
2. **Tabela de Rastreabilidade (`schema_migrations`):** Armazena a versão, nome do arquivo, data de execução e hash criptográfico SHA-256 de cada migration aplicada.
3. **Idempotência Comprovada:** O motor verifica as versões já persistidas e não reaplica migrations existentes.
4. **Motor de Transações Atômicas (`runTransaction`):** Suporte nativo a blocos transacionais com `COMMIT` e `ROLLBACK` automático em caso de exceções no SQLite e no PostgreSQL.
5. **Tradução Automática de Dialetos SQL:** A função `formatSqlForEngine` traduz dinamicamente placeholders de parâmetros entre `?` (SQLite) e `$1, $2, ...` (PostgreSQL).
6. **API de Monitoramento do Banco (`GET /api/core/database`):** Retorna o motor ativo, status de conectividade e histórico de migrations aplicadas.

---

## 2. Mapa dos Arquivos de Migrations (`server/migrations/`)

| Migration | Domínio Corporativo | Principais Tabelas Criadas |
| :--- | :--- | :--- |
| `001_core_and_identity.sql` | Core, Identity & Estrutura Multiempresa | `schema_migrations`, `companies`, `branches`, `departments`, `cost_centers`, `corporate_parameters`, `users` |
| `002_finance_and_control.sql` | Financeiro, Tesouraria & Conciliação | `bank_accounts`, `financial_records`, `bank_transactions`, `bank_reconciliations`, `cost_center_budgets`, `financial_closings` |
| `003_accounting_and_fiscal.sql` | Contabilidade Enterprise & Fiscal | `chart_of_accounts`, `accounting_entries` (partidas dobradas), `accounting_periods`, `tax_obligations` |
| `004_operations_and_crm.sql` | CRM, Compras & Contratos | `business_partners`, `crm_*`, `purchase_requisitions`, `purchase_quotations`, `purchase_orders`, `contracts` |
| `005_hr_inventory_projects_governance.sql` | RH/Taxas, Patrimônio, Projetos & Governança | `employees`, `time_records`, `freelance_shifts`, `assets`, `inventory_*`, `projects`, `project_tasks`, `tickets`, `documents`, `document_signatures`, `risks_compliance`, `notifications`, `planejamento_*`, `seguranca_*`, `integracoes_*` |
| `006_security_hardening_fase0.sql` | Hardening Fase 0, Sessões & Workflows | `audit_logs` (com `correlation_id`), `user_sessions`, `password_history`, `password_resets`, `approvals`, `approval_steps` |

---

## 3. Como Executar as Migrations

### Modo Desenvolvimento Local (SQLite WAL)
```bash
npm run server:migrate
```

### Modo Produção (PostgreSQL)
Configure a variável de ambiente `DATABASE_URL` ou `POSTGRES_URL` no `.env`:
```env
DATABASE_URL=postgresql://postgres:senha@localhost:5432/seek_erp?sslmode=prefer
DB_TYPE=postgres
```
E execute a migration:
```bash
npm run server:migrate
```

---

## 4. Bateria de Testes Automatizados (15 Testes Aprovados)

O script `server/src/test_fase1_db.ts` atesta com 100% de sucesso os seguintes controles de banco:

- [x] Tabela `schema_migrations` criada e operacional.
- [x] Total de migrations aplicadas no banco (6/6 confirmadas).
- [x] Migration 001 (Core & Identity) confirmada no banco.
- [x] Migration 002 (Financeiro & Tesouraria) confirmada no banco.
- [x] Migration 003 (Contabilidade & Fiscal) confirmada no banco.
- [x] Migration 004 (Operações & CRM) confirmada no banco.
- [x] Migration 005 (RH, Estoque & Governança) confirmada no banco.
- [x] Migration 006 (Segurança Hardening Fase 0) confirmada no banco.
- [x] Idempotência do motor: segunda execução não reaplica migrations existentes.
- [x] Dialeto SQLite preserva parâmetros posicionais (`?`).
- [x] Dialeto PostgreSQL converte parâmetros para (`$1, $2, $3`).
- [x] Motor de banco de dados detectado dinamicamente.
- [x] Transação atômica concluída e comitada com sucesso.
- [x] Rollback atômico: dados provisórios descartados após exceção na transação.
- [x] Integridade relacional: todas as 17 tabelas corporativas essenciais presentes.

---

## 5. Próximo Passo: Fase 2 — Repositories & Services

Com a camada de banco relacional e migrations consolidada, a arquitetura está pronta para a **Fase 2: Services & Repositories Pattern**, desacoplando as rotas HTTP de consultas SQL diretas e centralizando a lógica de domínio corporativo em serviços reutilizáveis e testáveis.
