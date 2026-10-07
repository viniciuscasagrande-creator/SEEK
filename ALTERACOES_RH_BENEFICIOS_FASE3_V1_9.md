# SEEK V1.9 — RH Benefícios Fase 3

## Escopo congelado
Esta evolução permanece exclusivamente em **RH → Benefícios**. Não adiciona novos módulos nem abre frentes funcionais fora do bloco já aprovado.

Benefícios tratados nesta fase:
- VT — Vale-Transporte
- VA — Vale-Alimentação
- VR — Vale-Refeição
- Auxílio Combustível

## Evoluções implementadas

### 1. Navegação interna da área de Benefícios
A área foi organizada em abas operacionais:
- Colaboradores
- Fechamento
- Pedidos de compra
- Operadoras
- Afastamentos

A relação nominal continua sendo o ponto central do RH, mostrando os benefícios e custos por colaborador.

### 2. Operadoras e fornecedores
Foi criado cadastro próprio de operadoras/fornecedores por tipo de benefício, com:
- nome;
- documento;
- benefício atendido;
- contato;
- forma de pagamento;
- dia padrão de vencimento;
- situação ativa/inativa.

Os cadastros iniciais de demonstração acompanham os nomes já usados na base do SEEK.

### 3. Ajustes manuais por competência
O RH agora pode registrar ajustes excepcionais por colaborador e benefício:
- crédito;
- desconto;
- valor;
- motivo obrigatório;
- competência;
- usuário responsável.

O ajuste entra na memória de cálculo antes do fechamento e fica auditável.

### 4. Memória de cálculo ampliada
A prévia do fechamento mostra:
- dias úteis da competência;
- dias elegíveis;
- desconto por admissão;
- desconto por férias;
- desconto por afastamento;
- ajuste manual da competência;
- custo final da empresa.

### 5. Pedidos de compra por operadora
Ao fechar uma competência, o SEEK cria automaticamente pedidos agrupados por:
- operadora/fornecedor;
- tipo de benefício;
- quantidade de colaboradores;
- valor total.

Exemplo:
`VA → Operadora X → 58 colaboradores → R$ XX.XXX,XX`

Isso evita tratar o fechamento mensal como uma única compra genérica.

### 6. Integração Financeira por pedido
Cada pedido de compra pode ser enviado individualmente ao Financeiro. O título financeiro mantém:
- operadora como favorecido;
- benefício;
- competência;
- valor;
- origem `BENEFICIO_COMPRA`;
- vínculo com o pedido do RH.

Quando o Financeiro liquida o título, o pedido é marcado como **PAGO**. Quando todos os pedidos de uma competência forem pagos, o fechamento de benefícios também passa para **PAGO**.

### 7. Prevenções
- Pedido sem operadora definida não pode ser enviado ao Financeiro.
- O fechamento continua único por empresa/competência.
- Cada pedido de compra é único por fechamento + operadora + benefício.
- O envio financeiro agregado antigo é bloqueado quando existem pedidos de compra por operadora, evitando duplicidade.

## Banco de dados
Migration adicionada:
`014_hr_benefits_purchases_and_providers.sql`

Novas estruturas:
- `benefit_providers`
- `benefit_adjustments`
- `benefit_purchase_batches`

Campos adicionais em `benefit_order_items`:
- `adjustment_amount`
- `final_company_cost`

## Validação
- Migração 014 aplicada com proteção e retrocompatibilidade com bases preexistentes.
- Suíte completa de testes automatizados:
  - `npm --prefix server run test:benefits-core`: 100% OK
  - `npm --prefix server run test:benefits-e2e`: 100% OK
  - `npm --prefix server run test:benefits-fase2`: 100% OK
  - `npm --prefix server run test:benefits-fase3`: 100% OK
- Compilação de backend e frontend (`npm run server:build` e `npm run build`): 100% OK, 0 erros.
