# SEEK V1.9 — Core Transacional Financeiro Fase 3

## Objetivo
Conectar a tela de Conciliação Bancária ao backend transacional criado na Fase 2, sem criar novos módulos.

## Fluxo implementado na interface
1. Seleção da conta bancária.
2. Seleção e pré-visualização do arquivo OFX.
3. Envio do conteúdo ao endpoint `/finance/ofx/import`.
4. Persistência/idempotência no backend (arquivo + FITID).
5. Consulta do extrato OFX persistido por status.
6. Consulta de sugestões de matching.
7. Conciliação item a item contra o ledger interno.
8. Registro de divergência com motivo.
9. Atualização dos indicadores de pendentes, conciliados e divergentes.
10. Consulta separada do ledger interno e histórico de conciliações.

## Regra preservada
O frontend não baixa títulos e não cria lançamentos contábeis durante a importação OFX. O OFX representa a fonte bancária externa. A liquidação financeira continua sendo a origem do movimento interno e do reflexo contábil; a conciliação apenas comprova a correspondência entre os dois lados.

## APIs frontend adicionadas
- `importOfx`
- `getOfxStatement`
- `getOfxSuggestions`
- `reconcileOfx`
- `markOfxDivergence`
- `getRealizedCashFlow`

## Gate seguinte
Validar instalação/build/teste E2E em ambiente com dependências disponíveis e, depois, fechar a visualização de DRE/Fluxo de Caixa e auditoria na própria interface para comprovar o ciclo inteiro.
