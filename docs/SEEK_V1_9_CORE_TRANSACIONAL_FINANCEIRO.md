# SEEK V1.9 — Core Transacional Financeiro

Esta entrega muda o critério do projeto: fluxo operacional completo antes de novos módulos.

## Fluxo implementado
1. Criação de título a pagar/receber persistente.
2. Reconhecimento contábil automático por partidas dobradas.
3. Liquidação com bloqueio de duplicidade e validação de alçada/empresa.
4. Validação da conta bancária e saldo para pagamentos.
5. Atualização do título, saldo bancário e extrato dentro da mesma transação SQLite.
6. Movimento bancário nasce pendente de conciliação.
7. Liquidação gera partida contábil automática.
8. Origem (Freelance/Compras/Fiscal) é atualizada no mesmo fluxo quando aplicável.
9. Auditoria registra a liquidação.

## Contabilização padrão inicial
- Título a pagar: D Despesa / C Fornecedores.
- Pagamento: D Fornecedores / C Banco.
- Título a receber: D Clientes / C Receita.
- Recebimento: D Banco / C Clientes.

A parametrização contábil por categoria/conta bancária será evoluída sem criar novos módulos.

## Definition of Done desta vertical
O teste `npm run test:finance` cria uma despesa de R$ 5.000, liquida em conta bancária, confere saldo, movimento bancário, lançamento contábil e bloqueio de segunda liquidação.

## Validação no ambiente de geração
O código foi criado sobre o backup geral mais recente. A instalação npm excedeu o limite do ambiente e deixou dependências incompletas; por isso o TypeScript/build não foi declarado como aprovado. O ZIP foi validado separadamente por integridade.
