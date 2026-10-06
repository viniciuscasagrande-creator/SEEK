# SEEK V1.9 — Core Transacional Financeiro Fase 2

Escopo congelado: concluir o fluxo financeiro ponta a ponta, sem novos módulos.

## Implementado
- Persistência de importações OFX.
- SHA-256 do arquivo para bloquear reimportação integral.
- Idempotência por `account_id + FITID`.
- Extrato OFX separado do ledger interno.
- Matching por conta, natureza, valor, proximidade de data e descrição.
- Conciliação item a item e atômica.
- Divergência com motivo obrigatório.
- Auditoria de importação, conciliação e divergência.
- Fluxo de caixa realizado usando somente títulos efetivamente pagos/recebidos.
- Remoção de fallback demonstrativo principal da DRE para receita/custos.
- Teste E2E: despesa R$ 5.000 → pagamento → banco → OFX → matching → conciliação → contabilidade → auditoria.

## Regra
O arquivo OFX não cria nem baixa título financeiro. Ele representa o extrato bancário externo e é conciliado contra a movimentação interna criada pela liquidação. Isso evita dupla contabilização.

## Próximo gate
Executar build/teste em ambiente limpo e conectar a tela de Conciliação Bancária a estes endpoints, sem criar lógica paralela no frontend.
