# SEEK V1.9 — RH Benefícios — Fase 5

## Escopo congelado
Esta fase continua exclusivamente dentro de **RH → Benefícios**. Nenhum novo módulo foi criado e a barra de navegação principal permanece inalterada.

Benefícios contemplados:
- VT — Vale-Transporte
- VA — Vale-Alimentação
- VR — Vale-Refeição
- Auxílio Combustível

## Objetivo
Transformar os snapshots mensais já gravados pelos fechamentos de benefícios em informação gerencial auditável, sem duplicar histórico e sem usar o cadastro atual para reescrever competências anteriores.

## Entregas

### 1. Histórico mensal por colaborador
Nova aba **Histórico** na Gestão de Benefícios.

Permite selecionar um colaborador e consultar, competência a competência:
- departamento registrado no fechamento;
- tipo de benefício;
- operadora/fornecedor;
- dias úteis e dias elegíveis;
- desconto do colaborador;
- custo da empresa;
- situação do crédito/fechamento.

A origem é `benefit_order_items`, que funciona como fotografia da competência já fechada.

### 2. Relatório de custos
Nova aba **Custos**.

Exibe:
- custo de VT;
- custo de VA;
- custo de VR;
- custo de Auxílio Combustível;
- total da competência;
- quantidade de colaboradores por benefício;
- evolução das últimas competências;
- descontos suportados pelos colaboradores.

### 3. Visão por departamento
Nova aba **Departamentos**.

Para a competência selecionada, mostra:
- quantidade de colaboradores;
- VT;
- VA;
- VR;
- Auxílio Combustível;
- custo total;
- participação percentual do departamento no custo total de benefícios.

### 4. Comparação entre competências
Nova aba **Comparativo**.

A competência selecionada é comparada automaticamente com a competência imediatamente anterior, exibindo:
- valor atual;
- valor anterior;
- diferença em reais;
- variação percentual;
- detalhamento nominal dos colaboradores das duas competências.

### 5. Endpoint de analytics de Benefícios
Adicionado no backend:

`GET /api/hr/benefits/analytics?period=AAAA-MM&comparePeriod=AAAA-MM`

Retorna em uma única consulta operacional:
- totais por benefício;
- custos por departamento;
- evolução mensal;
- histórico por colaborador;
- consolidação mensal por colaborador;
- diretório de colaboradores presentes no histórico;
- comparação entre competências.

### 6. Migration 016
Arquivo:

`server/migrations/016_hr_benefits_analytics_reports.sql`

Inclui índices para consultas históricas e de relatório, sem criar cópia paralela dos dados:
- `idx_benefit_orders_period_status`
- `idx_benefit_order_items_employee_history`
- `idx_benefit_order_items_department_history`
- `idx_benefit_order_items_type_history`

Também inclui compatibilidade para snapshots antigos anteriores à Fase 3, preenchendo `final_company_cost` somente quando a memória de cálculo histórica ainda não existia.

## Regra de integridade histórica
Relatórios de competências encerradas usam os valores persistidos no fechamento e **não recalculam o passado usando o cadastro atual do colaborador**.

Assim, se um benefício, departamento, operadora ou valor for alterado hoje, os fechamentos anteriores permanecem preservados.

## Validação e Qualidade
- **Build Frontend (`npm run build`)**: 100% aprovado (`✓ built in 734ms`), 0 erros.
- **Build Backend (`npm run server:build`)**: 100% aprovado (`tsc` 0 erros).
- **Testes Automatizados (100% de Aprovação)**:
  - `npm run server:test:benefits-core` $\rightarrow$ OK
  - `npm run server:test:benefits-e2e` $\rightarrow$ OK
  - `npm run server:test:benefits-fase2` $\rightarrow$ OK
  - `npm run server:test:benefits-fase3` $\rightarrow$ OK
  - `npm run server:test:benefits-fase4` $\rightarrow$ OK
  - `npm run server:test:benefits-fase5` $\rightarrow$ OK ([test_hr_benefits_fase5.ts](file:///C:/Users/vinad/OneDrive/Desktop/SEEK/server/src/test_hr_benefits_fase5.ts))
  - `npm run server:test:hr` e `npm run server:test:finance` $\rightarrow$ OK
