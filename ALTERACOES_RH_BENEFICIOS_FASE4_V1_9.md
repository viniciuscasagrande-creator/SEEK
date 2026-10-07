# SEEK V1.9 — RH Benefícios Fase 4

## Escopo congelado
Esta fase permanece exclusivamente em **RH → Benefícios**, cobrindo **VT, VA, VR e Auxílio Combustível**. Nenhum novo módulo foi criado e o menu permanece inalterado.

## Entregas

### 1. Conferência por competência
- Nova aba **Conferência** dentro de Benefícios (`COLABORADORES`, `CONFERENCIA`, `FECHAMENTO`, `PEDIDOS`, `OPERADORAS`, `AFASTAMENTOS`).
- Relação nominal por colaborador e benefício.
- Exibe operadora, dias elegíveis, dias úteis, valor final e situação de conferência.
- Indicadores de total, conferidos, pendentes, críticos e atenções.
- Ação para marcar itens sem divergência como conferidos (`confirmClearBenefitConference`).

### 2. Pendências e divergências automáticas
O backend verifica antes do fechamento:
- Benefício sem operadora/fornecedor (`SEM_OPERADORA`, nível `CRITICO`);
- Operadora não cadastrada ou inativa para o tipo de benefício (`OPERADORA_NAO_CADASTRADA`, nível `CRITICO`);
- Valor final inválido/zerado quando há dias elegíveis (`VALOR_INVALIDO`, nível `CRITICO`);
- Colaborador sem dias elegíveis na competência (`SEM_DIAS_ELEGIVEIS`, nível `ATENCAO`).

Pendências críticas ou itens não conferidos bloqueiam o fechamento formal.

### 3. Aprovação e bloqueio do fechamento
- Fechamento passa a nascer em **AGUARDANDO_APROVACAO**.
- Somente uma competência integralmente conferida pode ser aprovada.
- Aprovação grava responsável (`approved_by`), data/hora (`approved_at`) e bloqueio da competência (`locked_at`).
- Pedidos só podem seguir ao Financeiro depois da aprovação do RH.

### 4. Arquivo por operadora
- Cada pedido de compra gera CSV nominal com UTF-8 BOM (`\ufeff`) por operadora/benefício.
- Arquivo contém: `Matrícula/ID;Colaborador;Departamento;Benefício;Operadora;Dias elegíveis;Dias úteis;Valor`.
- Geração fica registrada em histórico de auditoria de arquivos (`benefit_operator_files`).

### 5. Retorno da operadora
- Endpoint e modal/ação de interface para registrar os valores processados pela operadora por colaborador.
- O SEEK compara solicitado vs. processado.
- Diferença $\ge 0.01$ gera status de item **DIVERGENCIA** e valor da divergência (`divergence_amount`).
- Lote é atualizado para status **DIVERGENCIA** ou **PROCESSADO_OPERADORA**.
- Retorno sem diferença segue para **AGUARDANDO_CREDITO**.

### 6. Confirmação de crédito/disponibilização
- O RH confirma que o benefício foi efetivamente disponibilizado aos colaboradores.
- Bloqueia confirmação se houver divergências abertas no lote.
- Lote e itens passam para **CREDITADO** com registro em `credit_confirmed_at`.
- Quando todos os pedidos da competência forem creditados, o fechamento passa para **CONCLUIDO**.

## Banco de dados
Migration adicionada: `015_hr_benefits_conference_operator_files.sql`.

Estruturas novas:
- `benefit_conferences` (com índice `idx_benefit_conferences_period`)
- `benefit_operator_files` (com índice `idx_benefit_operator_files_batch`)

Campos adicionais em:
- `benefit_orders`: `approved_by`, `approved_at`, `locked_at`
- `benefit_order_items`: `conference_status`, `operator_processed_amount`, `divergence_amount`, `divergence_reason`, `credit_status`, `credit_confirmed_at`
- `benefit_purchase_batches`: `operator_file_name`, `operator_sent_at`, `operator_returned_at`, `credit_confirmed_at`

O banco SQLite incluído no projeto foi migrado até a versão **015**.

## Validação e Qualidade
- **Build Frontend (`npm run build`)**: 100% aprovado, sem erros TypeScript ou Vite (`✓ built in 507ms`).
- **Build Backend (`npm run server:build`)**: 100% aprovado (`tsc` com 0 erros).
- **Testes Automatizados**:
  - `npm run server:test:benefits-core`: 100% aprovado.
  - `npm run server:test:benefits-e2e`: 100% aprovado.
  - `npm run server:test:benefits-fase2`: 100% aprovado.
  - `npm run server:test:benefits-fase3`: 100% aprovado.
  - `npm run server:test:benefits-fase4`: 100% aprovado.
