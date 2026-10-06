# SEEK V1.9 — Fase 2: Core Multiempresa/Multifilial, Services & Repositories Pattern

**Plataforma Corporativa Homologada:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)  
**Versão:** 1.9.0 — Fase 2  
**Status dos Testes Automatizados:** 39 Aprovados / 0 Falhas (92 testes totais nas Fases 0, 1 e 2)

---

## 1. Visão Geral da Arquitetura

Na **Fase 2 do SEEK V1.9**, o backend corporativo foi desacoplado de consultas SQL diretas em controladores HTTP através da introdução formal dos padrões arquiteturais **Repository Pattern** (Acesso e Persistência de Dados) e **Domain Service Pattern** (Regras de Negócio e Governança Corporativa).

```text
  ┌────────────────────────────────────────────────────────┐
  │                 Controladores HTTP (Express)            │
  │     core.routes.ts, auth.routes.ts, finance.routes.ts   │
  │     workflow.routes.ts, purchasing.routes.ts            │
  └───────────────────────────┬────────────────────────────┘
                              │ Delegação de Casos de Uso
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Camada de Serviços (Services)          │
  │  AuthService, CompanyService, FinanceService,          │
  │  WorkflowService, PurchasingService                    │
  │  (Multi-tenant, SoD, ABAC, Alçadas, LGPD, Regras)      │
  └───────────────────────────┬────────────────────────────┘
                              │ Consultas e Persistência
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │             Camada de Repositórios (Repositories)      │
  │  UserRepository, CompanyRepository, FinanceRepository, │
  │  WorkflowRepository, PurchasingRepository              │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │            Dual-Engine Database (SQLite WAL / PG)      │
  │            Transações Atômicas e Migrations            │
  └────────────────────────────────────────────────────────┘
```

---

## 2. Repositórios de Domínio (`server/src/repositories/`)

Os repositórios encapsulam todas as operações de banco de dados, garantindo isolamento relacional, tipagem forte e prevenção contra SQL Injection:

| Repositório | Arquivo | Entidades e Tabelas Gerenciadas |
| :--- | :--- | :--- |
| **`UserRepository`** | [`user.repository.ts`](file:///C:/Users/vinad/OneDrive/Desktop/SEEK/server/src/repositories/user.repository.ts) | `users`, `user_sessions`, `password_history`, `password_resets` |
| **`CompanyRepository`** | [`company.repository.ts`](file:///C:/Users/vinad/OneDrive/Desktop/SEEK/server/src/repositories/company.repository.ts) | `companies`, `branches`, `departments`, `cost_centers`, `corporate_parameters`, `business_partners` |
| **`FinanceRepository`** | [`finance.repository.ts`](file:///C:/Users/vinad/OneDrive/Desktop/SEEK/server/src/repositories/finance.repository.ts) | `financial_records`, `bank_accounts`, `bank_transactions`, `cost_center_budgets`, `financial_closings`, `bank_reconciliations` |
| **`WorkflowRepository`** | [`workflow.repository.ts`](file:///C:/Users/vinad/OneDrive/Desktop/SEEK/server/src/repositories/workflow.repository.ts) | `approvals`, `approval_steps`, `audit_logs` |
| **`PurchasingRepository`** | [`purchasing.repository.ts`](file:///C:/Users/vinad/OneDrive/Desktop/SEEK/server/src/repositories/purchasing.repository.ts) | `purchase_requisitions`, `purchase_quotations`, `purchase_orders` |

---

## 3. Serviços de Domínio (`server/src/services/`)

A camada de serviços centraliza toda a lógica de negócio corporativa, segregação de funções, alçadas e isolamento de tenants:

### 3.1 `CompanyService` & Motor Multiempresa / Multifilial
- **`resolveTenantScope(user, requestedCompanyId, requestedBranchId)`**: Resolve o escopo de atuação do usuário:
  - `holding`: Usuários da Holding Matriz (`comp-1`) ou perfis executivos (`ADMIN_GERAL`, `DIRETORIA`, `AUDITORIA`) possuem livre trânsito entre empresas e filiais (`canAccessAllCompanies = true`).
  - `todas_filiais`: Usuários autorizados a navegar por todas as filiais da sua empresa.
  - `propria_empresa` / `propria_filial`: Usuários operacionais restritos ao seu CNPJ e filial de alocação com bloqueio estrito contra travessia indevida de dados.
- **`validateTenantAccess(user, targetCompanyId)`**: Validação de autorização tenant para operações sensíveis.
- **`getCompanyHierarchy(companyId)`**: Retorna a árvore organizacional completa (empresa, filiais, departamentos e centros de custo).
- **`validateDepartmentBudget(companyId, departmentCode, amount)`**: Valida se uma solicitação respeita o teto orçamentário do departamento.
- **`getPartnersWithMasking(user, companyId)`**: Aplicação automática das políticas de privacidade da LGPD, mascarando CPF e CNPJ de parceiros de negócios para perfis não autorizados.

### 3.2 `AuthService`
- **`login(credentials)`**: Validação de hash bcrypt, verificação de MFA/TOTP (RFC 6238), atualização de `last_login_at`, registro na trilha de auditoria e emissão de JWT de 15 minutos e Refresh Token rotativo de 7 dias.
- **`rotateToken(refreshToken)`**: Rotação criptográfica do Refresh Token com invalidação do anterior e emissão de novo par de tokens.
- **`revokeSession(sessionId)`** / **`revokeAllSessions(userId)`**: Revogação instantânea de sessões com reflexo em tempo real no middleware.
- **`changePassword(userId, currentPass, newPass)`**: Validação estrita de política forte (mínimo 8 caracteres, maiúsculas, minúsculas, números e caracteres especiais) e histórico impeditivo das últimas 3 senhas.

### 3.3 `WorkflowService`
- **`getApprovals(filters)`**: Consulta alçadas detalhadas por tenant e departamento com status de steps.
- **`createApproval(data, user)`**: Criação de solicitação multinível de aprovação com steps dinâmicos conforme política orçamentária.
- **`decideApproval(params)`**:
  - **SoD (Segregação de Funções)**: Bloqueia tentativa de autoaprovação pelo solicitante com HTTP 403 e registro de evento `VIOLACAO_SOD` na auditoria corporativa.
  - **ABAC (Alçadas Monetárias)**: Validação do teto financeiro do aprovador.
  - **Atualização em Cascata**: Ao atingir aprovação no último passo, reflete automaticamente o status aprovado no documento de origem (`purchase_orders` ou `financial_records`).

### 3.4 `FinanceService`
- **`getRecords(filters)`**: Listagem de títulos a pagar e a receber com suporte a múltiplos filtros e escopo multiempresa.
- **`createRecord(data, user)`**: Criação determinística de títulos `CP-` (Contas a Pagar) ou `CR-` (Contas a Receber).
- **`liquidateRecord(id, options, user)`**: Baixa de título com verificação de alçada de liquidação, débito/crédito na conta bancária indicada e geração de movimentação no extrato (`bank_transactions`) vinculada à origem (`TAXA`, `PO`, `FISCAL`).
- **`getDashboardKpis(companyId)`**: Cálculo em tempo real de saldo em caixa, despesas pagas/pendentes, receitas pagas/pendentes e posição líquida consolidada.

### 3.5 `PurchasingService`
- **`getRequisitions()`** / **`getRequisitionDetails(id)`**: Gestão do ciclo de compras e mapa comparativo de cotações com múltiplos fornecedores.
- **`addQuotation(requisitionId, data)`**: Cadastro de propostas de fornecedores calculando valor total e prazos de entrega.
- **`selectQuotation(quotationId, user)`**: Seleção de proposta vencedora no mapa de cotações com transição de status para `COTADO`.
- **`approveOrder(orderId, user)`**: Validação de SoD e alçada ABAC na aprovação de ordens de compra, com criação automática do respectivo título a pagar em Contas a Pagar (`origin_type = 'PO'`).

---

## 4. Bateria de Testes Automatizados da Fase 2 (`server/src/test_fase2_services.ts`)

A suíte executou **39 verificações determinísticas** cobrindo:
1. Isolação e consultas de dados via Repositories (`User`, `Company`, `Finance`, `Workflow`, `Purchasing`).
2. Resolução de escopos de tenant (`holding`, `propria_filial`, `propria_empresa`, `todas_filiais`).
3. Bloqueio de acesso entre empresas para colaboradores não-privilegiados.
4. Mascaramento LGPD dinâmico por perfil.
5. Ciclo de sessões, login, rotação de refresh token e revogação.
6. SoD em Workflow (bloqueio de autoaprovação do colaborador Carlos Eduardo Nogueira).
7. SoD em Compras (bloqueio de autoaprovação de ordem de compra).
8. Liquidação financeira com movimentação atômica em conta bancária e extrato.
9. KPIs consolidados do fluxo de caixa e tesouraria.
10. Integração ponta-a-ponta gerando Contas a Pagar a partir de Pedido de Compra aprovado.

```bash
# Execução da bateria Fase 2
npm run server:test:fase2

# Execução consolidada de todas as Fases
npm run server:test        # Fase 0: 38/38 Aprovados
npm run server:test:fase1  # Fase 1: 15/15 Aprovados
npm run server:test:fase2  # Fase 2: 39/39 Aprovados
# TOTAL CONSOLIDADO: 92/92 TESTES APROVADOS (0 FALHAS)
```

---

## 5. Compatibilidade e Homologação

- **Menu Fixo + Submenus Expansíveis:** 100% preservado e inalterado na interface.
- **11 Módulos Corporativos:** Mantidos íntegros com fallbacks para demonstração e integração ao backend.
- **Build Frontend (`vite build`):** Exit code 0 (1928 módulos transformados).
- **Build Backend (`tsc`):** Exit code 0 (tipagem estrita respeitada).
- **Ambiente de Produção Homologado:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)
