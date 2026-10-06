# SEEK V1 — Hiper Pacote 6: Financeiro, Compras e Controladoria Enterprise

## 📌 Visão Geral do Pacote 6
O **Hiper Pacote 6** eleva o **SEEK** ao patamar **Enterprise ERP & Controladoria**, consolidando o ciclo de suprimentos (Procurement), tesouraria multicarteira, conciliação bancária matemática, matriz orçamentária (Budgeting) e demonstrações gerenciais com trava formal de competência (*Period Lock*).

> [!IMPORTANT]
> **Regra Fundamental de Escopo:** O SEEK é estritamente um ERP/CRM corporativo interno. Não há nenhuma funcionalidade voltada para bilheteria, venda de ingressos, controle de portaria ou gestão comercial de eventos.

---

## 🏛️ 1. Compras & Suprimentos (Procurement Enterprise)
Localizado na visão `compras` (`/purchasing`):

1. **Solicitações de Compra (SC):**
   - Registro de necessidades departamentais com código único cronológico (`REQ-2026-XXXX`).
   - Vínculo a departamento, centro de custo, prioridade (`BAIXA`, `MEDIA`, `ALTA`, `URGENTE`) e data limite.
   - Status gerenciados: `SOLICITADO` $\rightarrow$ `EM_COTACAO` $\rightarrow$ `COTADO` $\rightarrow$ `PEDIDO_GERADO`.

2. **Mapa de Cotações com 3 Fornecedores Homologados:**
   - Comparativo lado a lado de **3 fornecedores** para cada solicitação de compra.
   - Detalhamento de preço unitário, quantidade, valor total, prazo de entrega em dias úteis, condições de pagamento e rating/SLA.
   - **Cálculo Automático de Saving:** Apuração do desconto econômico da menor oferta em relação à maior oferta (valor monetário e percentual de economia).
   - **Seleção com 1 Clique:** Seleciona o fornecedor vencedor e gera automaticamente a Ordem de Compra (PO) submetida às alçadas.

3. **Alçadas de Governança SEEK:**
   - **Tier 1 (Gestor Departamental):** Compras de até R$ 15.000,00.
   - **Tier 2 (Gerência Financeira & Orçamento):** Compras de R$ 15.000,01 a R$ 50.000,00.
   - **Tier 3 (Diretoria Executiva / C-Level):** Compras acima de R$ 50.000,00.
   - Ao aprovar uma PO, o valor total é imediatamente provisionado como **Orçamento Comprometido** na Controladoria.

4. **Recebimento Físico/Fiscal & Integração Contas a Pagar:**
   - Registro do número da Nota Fiscal (NF-e/NFS-e).
   - Ao confirmar o recebimento, o SEEK:
     1. Marca a PO como `RECEBIDO`;
     2. Transfere o valor na Matriz Orçamentária de *Comprometido* para *Realizado*;
     3. Cria automaticamente um título a pagar (`CP-2026-XXXX`) no Financeiro com vencimento padrão em 30 dias e origem `PO`.

---

## 💰 2. Tesouraria, Contas a Pagar/Receber & Bancos
Localizado na visão `financeiro` (`/finance`):

1. **Hub Central de Contas a Pagar & Receber:**
   - Visão consolidada com filtros por tipo (`PAGAR` / `RECEBER`), status (`PREVISTO`, `CONFIRMADO`, `PAGO`) e origem:
     - `PO`: Ordens de Compra faturadas do módulo de Compras.
     - `TAXA`: Taxas fechadas de prestadores/freelancers do módulo de RH.
     - `FISCAL`: Obrigações e guias tributárias (ISS, PIS, COFINS, INSS).
     - `CONTRATO`: Faturamento de clientes e contratos corporativos.
     - `AVULSO`: Despesas diretas e despesas administrativas.

2. **Baixa e Liquidação Integrada:**
   - Seleção da conta bancária de saída (Bradesco, Itaú, etc.) e meio de liquidação (PIX, TED, Boleto, Débito em Conta).
   - Atualiza o saldo bancário da conta correspondente e gera automaticamente uma transação de débito/crédito no extrato.
   - Sincroniza o status do registro de origem (`freelance_shifts`, `purchase_orders` ou `tax_obligations`).

3. **Gestão de Contas Bancárias & Conciliação:**
   - Cadastro de contas correntes empresariais com saldo disponível em tempo real.
   - Extrato cronológico com marcação de transações conciliadas e pendentes.
   - **Conciliação Bancária de Extrato:** Compara o saldo final do extrato OFX bancário com o saldo do sistema, apura eventuais divergências e grava o laudo de conciliação com auditoria imutável.

---

## 📊 3. Controladoria & Orçamento Empresarial (Budgeting)
1. **Matriz de Execução Orçamentária:**
   $$\text{Saldo Remanescente} = \text{Orçado} - (\text{Comprometido} + \text{Realizado})$$
   - Acompanhamento por Centro de Custo (`Operações`, `Tecnologia Cloud`, `Comercial B2B`, `Administrativo & RH`).
   - Barra visual de consumo percentual com alerta automático de risco quando atinge o teto configurado (ex.: $\ge 85\%$).

2. **DRE Gerencial Consolidado:**
   - **(+) Receita Bruta:** Faturamento de Contratos Corporativos + Receita Recorrente SaaS SEEK.
   - **(-) Deduções & Tributos:** ISS, PIS e COFINS apurados na competência.
   - **(=) Receita Operacional Líquida.**
   - **(-) Custos Diretos:** Infraestrutura de Nuvem/Datacenter, Insumos de Almoxarifado e Taxas de Operações RH.
   - **(=) Margem Bruta de Contribuição.**
   - **(-) Despesas Gerais Administrativas:** Pessoal, Benefícios, Facilities e TI Interna.
   - **(=) EBITDA Gerencial:** Resultado econômico operacional com margem em tempo real.
   - Breakdown detalhado de receitas e despesas por Centro de Custo.

---

## 🔒 4. Fechamento Mensal / Period Lock
1. **Trava Formal de Competência:**
   - Controle de status das competências mensais (`ABERTO`, `CONCILIADO`, `BLOQUEADO`).
   - Checklist integrado de conformidade:
     - [x] Extratos bancários 100% conciliados;
     - [x] Contas a Pagar e Taxas Freelancers do mês liquidadas;
     - [x] Apuração fiscal encerrada;
     - [x] Balancete contábil em equilíbrio ($\sum \text{Débitos} = \sum \text{Créditos}$).
   - O bloqueio impede lançamentos extemporâneos, garantindo a integridade dos livros contábeis e fiscais perante auditorias.
