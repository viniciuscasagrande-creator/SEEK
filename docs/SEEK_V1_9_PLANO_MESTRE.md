# SEEK V1.9 — Plano Mestre de Hardening & Enterprise Foundation

## 📌 Documento Executivo e Técnico de Controle da Evolução

Este documento formaliza as diretrizes, prioridades e critérios de aceite para transformar a base atual do **SEEK** em um ERP corporativo eficaz, seguro, transacional, auditável e sustentável, preservando integralmente os módulos já desenvolvidos.

* **Produto:** SEEK — Gestão Corporativa Integrada (Enterprise ERP & CRM)
* **Versão-Alvo:** V1.9 — Hardening & Enterprise Foundation
* **Objetivo:** Consolidar e tornar operacional a base existente antes de ampliar funcionalidades
* **Regra de Escopo:** ERP/CRM corporativo interno; Freelance / Taxas permanece exclusivamente em RH
* **Ambiente Oficial:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)

---

## 🎯 1. Diretriz Principal

O SEEK não será avaliado pela quantidade de menus ou telas. A eficácia do ERP será medida por **processos completos, persistência real, segurança no backend, consistência transacional, rastreabilidade e facilidade de trabalho para o usuário**.

* **Não reconstruir o SEEK do zero:** A base construída possui excelente amplitude funcional e deve ser aproveitada.
* **Não criar novos módulos antes da estabilização da fundação:** Os pacotes 12 a 15 permanecem congelados em roadmap até o V1.9 atingir os gates de produção.
* **Não substituir persistência real por estado local da interface:** Nenhuma operação que altere dados pode depender unicamente de `setState` ou mock local.
* **Não confiar no frontend para autenticação, autorização ou isolamento de dados:** O backend é o guardião inviolável da segurança.
* **Preservar os módulos existentes e corrigi-los progressivamente:** Alinhar tudo sob uma arquitetura única de domínio e serviços.
* **Toda interface visível permanece em português do Brasil.**

---

## ⚖️ 2. Critérios de um ERP Eficaz

1. **Funcional:** Cadastrar, alterar, aprovar, executar, consultar e fechar operações realmente persistindo no banco de dados.
2. **Seguro:** Identidade, sessão, permissões, alçadas e escopo corporativo validados rigorosamente no backend.
3. **Integrado:** Módulos compartilham o mesmo Core e processos geram efeitos consistentes e automáticos entre áreas.
4. **Confiável:** Erro de API nunca pode ser apresentado como lista vazia ou falso sucesso ao usuário.
5. **Auditável:** Operações críticas registram usuário, contexto, valores anteriores/novos (`old_value` / `new_value`) e correlação.
6. **Transacional:** Operações financeiras/contábeis críticas são atômicas (`BEGIN TRANSACTION ... COMMIT`) e suportam rollback integral.
7. **Operável:** O usuário enxerga em sua Central de Trabalho pendências, tarefas, alertas, aprovações e próximos passos.
8. **Sustentável:** Arquitetura modular, testes automatizados, migrations versionadas, logs estruturados e CI/CD.

---

## 🚨 3. Bloqueadores Críticos (Fase 0 — Segurança)

| Prioridade | Problema / Risco | Correção Obrigatória | Critério de Aceite | Status |
| :--- | :--- | :--- | :--- | :---: |
| **P0** | **Autenticação local e bypass de senha** | Remover bypass e senhas mestras; login validado exclusivamente pelo backend com hash `bcrypt`. | Credencial inválida retorna `401`; nenhuma senha fixa de bypass funciona; frontend só autentica com JWT válido da API. | ✅ **Implementado** (Commit `80d2c25`) |
| **P0** | **Token de sessão não seguro** | Implementar token JWT assinado (RFC 7519) com chave `JWT_SECRET` e expiração formal de 8h. | Todas as rotas protegidas rejeitam token ausente, inválido, expirado ou forjado. | ✅ **Implementado** (Commit `80d2c25`) |
| **P0** | **APIs corporativas abertas** | Adicionar middleware central `authenticateToken` em todas as rotas privadas do Express. | Chamada direta sem Bearer token retorna `401 Unauthorized`. | ✅ **Implementado** (Commit `80d2c25`) |
| **P0** | **RBAC apenas de interface** | Mover decisão de autorização para o backend via `requireModule` e `requireRole`. | Usuário sem acesso ao módulo recebe `403 Forbidden` mesmo chamando o endpoint diretamente. | ✅ **Implementado** (Commit `80d2c25`) |
| **P0** | **LGPD e PII em texto puro** | Mascarar CPF, PIX e contas bancárias para perfis sem alçada explícita de RH/Diretoria. | Dados sensíveis são ofuscados (`***.456.789-**`) e consultas de PII geram log `READ_LGPD`. | ✅ **Implementado** (Commit `80d2c25`) |
| **P0** | **IP fictício em auditoria** | Substituir o IP fixo de fallback por IP real da requisição ou `127.0.0.1` / `unknown`. | Nenhum log novo contém IP simulado. | ✅ **Implementado** (Commit `80d2c25`) |
| **P0** | **Multiempresa inconsistente** | Derivar contexto corporativo do token JWT do usuário e validar permissões por filial/empresa. | Nenhuma consulta retorna registros de empresa fora do escopo autorizado do usuário. | 🔄 **Em andamento** |

---

## 🏛️ 4. Fundação de Dados e Backend (Fase 1)

* **PostgreSQL como Banco Definitivo:** Migrar o backend para PostgreSQL em produção (Render, Railway, Fly ou Neon), mantendo SQLite para desenvolvimento local e homologação offline.
* **Migrations Versionadas:** Eliminar `db.ts` monolítico e substituir por pasta estruturada `database/migrations/` (ex: `001_initial_schema.sql`, `002_finance_core.sql`).
* **Arquitetura em Camadas:**
  * `controllers/`: Recebimento de requisições HTTP e validação de schema.
  * `services/`: Regras de negócio, cálculos contábeis e orquestração de domínio.
  * `repositories/`: Acesso direto ao banco de dados e consultas SQL parametrizadas.
* **Validação de Payloads com Zod:** Validação estrita na borda da API para evitar tipos incorretos ou campos malformados.
* **Versionamento de API:** Padronização dos endpoints corporativos sob `/api/v1/...`.
* **Tratamento Centralizado de Erros:** Não mascarar falhas de infraestrutura como dados vazios; exibir estados claros de erro.

---

## 💳 5. Transações e Integridade do Core ERP (Fase 3)

Toda operação crítica deve obedecer à cadeia estrita:

```text
UI → API → Service → Transaction (BEGIN) → Database → Audit/Event → Commit → UI Refresh
```

* **Pagamento de Título Financeiro:** Título marcado como `PAGO` + redução do saldo na conta corrente bancária + inserção do extrato bancário + baixa da obrigação na origem (Compras/Taxa) + partida contábil dobrada (`Débito = Crédito`) + registro na auditoria imutável. Tudo em **transação atômica única** com rollback em caso de falha.
* **Compras & Suprimentos:** Fluxo `Solicitação → Cotação → Aprovação → Pedido → Recebimento → Contas a Pagar → Contabilidade` como transição de domínio real, não simples alteração visual de status.
* **Contabilidade Central:** Nenhum módulo grava lançamentos contábeis soltos; todas as partidas passam pelo `AccountingService`.

---

## 🛡️ 6. Trilha de Auditoria Imutável

Registro mínimo obrigatório para operações críticas:

* `timestamp`: Data e hora precisa em UTC (ISO 8601).
* `user_id`: Identificador único do colaborador autenticado.
* `company_id` / `branch_id`: Contexto de empresa e filial da operação.
* `module` / `entity` / `entity_id`: Módulo e entidade afetada (ex: `Financeiro`, `Título`, `CP-1029`).
* `action`: Tipo de ação (`LOGIN`, `CREATE`, `UPDATE`, `APPROVE`, `PAY`, `DELETE`, `READ_LGPD`).
* `old_value` / `new_value`: Snapshot dos dados antes e depois da modificação (permite reconstituir histórico).
* `ip` / `user_agent`: Origem da requisição.
* `correlation_id`: Identificador para rastreamento ponta a ponta da cadeia de chamadas.

---

## 💻 7. Frontend e Arquitetura de Aplicação (Fase 2)

* **Central de Trabalho (`MyWorkstation`):** Evoluir o painel principal para responder primeiro **"O que preciso fazer agora?"**:
  * Aprovações pendentes agrupadas por urgência e alçada.
  * Vencimentos financeiros, tributários e contratuais dos próximos 7 dias.
  * Tarefas prioritárias do colaborador.
  * Alertas críticos e notificações corporativas.
* **Design System SEEK:**
  * Padronização de tokens de cores (Navy `#1E3A8A`, Royal `#2563EB`, Slate `#0F172A`).
  * Escala tipográfica formal: H1 (24px), H2 (20px), H3 (16px), Body (14px), Caption (12px). Evitar 10px em textos operacionais.
  * Componentes reutilizáveis: `SeekCard`, `SeekMetricCard`, `SeekTable`, `SeekFilterBar`, `SeekStatus`, `SeekDrawer`, `SeekModal`.
* **Sidebar em 3 Níveis:** Agrupamento lógico (`Início`, `Gestão`, `Relacionamento`, `Estratégia`, `Administração`) com navegação hierárquica contextual, reduzindo poluição visual.
* **Context Bar & Breadcrumbs:** Barra de contexto exibindo empresa, filial, rota ativa e botão de ação principal.
* **Command Center Unificado (`Ctrl + K`):** Busca global integrada conectando módulos, ações rápidas e assistência contextual do SEEK IA.
* **Code Splitting com `React.lazy()`:** Carregamento sob demanda de cada módulo corporativo para reduzir o bundle inicial.

---

## 👥 8. RH → Freelance & Central de Taxas (Regra Congelada)

O módulo permanece estritamente posicionado dentro de **Recursos Humanos / Departamento Pessoal**:

$$\text{Necessidade} \rightarrow \text{Aprovação} \rightarrow \text{Convocação} \rightarrow \text{Confirmação} \rightarrow \text{Trabalho/Presença} \rightarrow \text{Fechamento da Taxa} \rightarrow \text{Financeiro} \rightarrow \text{Pagamento}$$

* Atende exclusivamente a prestadores de serviços temporários e diárias operacionais corporativas.
* **O SEEK não incorpora e nunca incorporará:** bilheteria, emissão de ingressos, controle de catracas/portaria, QR Code de acesso de público ou gestão comercial de eventos.

---

## 🧪 9. Matriz de Testes Obrigatórios

* **Autenticação:** Login válido, credencial incorreta (`401`), token expirado, token adulterado e logout com revogação.
* **RBAC / ABAC:** Usuário financeiro bloqueado no RH; usuário sem alçada impedido de aprovar compras acima de seu teto; tentativa de forjar autorização via API rejeitada com `403`.
* **Multiempresa:** Garantia de que dados da Empresa A nunca vazam em consultas da Empresa B.
* **Contabilidade:** Validação matemática estrita de partidas dobradas ($\sum \text{Débitos} = \sum \text{Créditos}$).
* **Financeiro:** Liquidação transacional com baixa simultânea de saldo bancário e extrato.
* **Auditoria:** Registro de `old_value` e `new_value` em todas as alterações sensíveis.

---

## 🚫 10. O Que NÃO Fazer Agora

* ❌ Não criar novos pacotes funcionais (12 a 15) enquanto o V1.9 não for concluído.
* ❌ Não criar novos módulos ou telas por iniciativa própria.
* ❌ Não manter duas fontes concorrentes de schema (`schema.sql` vs `db.ts`).
* ❌ Não colocar regra de negócio crítica apenas no React.
* ❌ Não considerar botão ou tela como funcionalidade entregue sem persistência real e testes.
* ❌ Não introduzir dark mode antes de consolidar o Design System claro.
* ❌ Não desviar o foco do ERP corporativo interno.

---

## 📅 11. Plano de Execução Congelado (Fases 0 a 6)

```text
Fase 0: Segurança & Autenticação (P0) [EM ANDAMENTO / PARCIALMENTE ENTREGUE]
   ↓
Fase 1: Fundação Técnica (PostgreSQL, Migrations, Repositories, Services, Transações, Zod, API v1)
   ↓
Fase 2: Frontend & Design System (Central de Trabalho, SeekTable, Sidebar Hierárquica, Router, Lazy)
   ↓
Fase 3: Core ERP Transacional (Financeiro, Contabilidade, Fiscal, Compras, Workflow Backend)
   ↓
Fase 4: Módulos Operacionais (RH/Taxas, Estoque, Contratos, Projetos, Service Desk, CRM)
   ↓
Fase 5: Enterprise (MFA, SSO, GED com Object Storage, Assinaturas Digitais, Jobs, BI Analítico)
   ↓
Fase 6: SEEK IA Corporativo (RAG com permissões, guardrails de alçada, auditoria total)
```

---

## 🏁 12. Definição de Pronto (Definition of Done — DoD)

Uma funcionalidade só poderá ser marcada como concluída quando satisfizer todos os 9 critérios:

1. **Persistência Real:** Dados salvos e alterados no banco de dados, sem mocks silenciosos.
2. **Segurança Ativa:** Autenticação JWT e autorização RBAC/ABAC aplicadas no backend.
3. **Escopo Corporativo:** Respeito absoluto a empresa, filial, centro de custo e alçada.
4. **Validação de Entrada:** Payload validado por schema antes de atingir os serviços.
5. **Tratamento de Erros:** Exceções tratadas com códigos HTTP adequados e UI informativa.
6. **Auditoria:** Operação registrada na trilha com contexto do usuário e valores afetados.
7. **Testes Automatizados:** Teste de unidade ou integração cobrindo a regra de negócio.
8. **Atualização da Interface:** UI sincronizada com a resposta confirmada do servidor.
9. **Integração de Reflexos:** Impactos em outros módulos (ex: Compras → Financeiro → Contabilidade) executados com sucesso.

---

🌐 **Acesso Oficial em Produção:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)
