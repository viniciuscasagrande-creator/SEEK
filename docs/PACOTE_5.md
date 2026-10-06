# SEEK V1 — Hiper Pacote 5: Contabilidade Avançada, Fiscal & Fechamento Contábil

## 📌 Visão Geral do Pacote 5

O **Hiper Pacote 5** consolida o SEEK como uma plataforma corporativa integrada de padrão **Enterprise ERP + CRM + Gestão Administrativa**, entregando a camada contábil e tributária completa, com partidas dobradas, apuração de impostos, conciliação matemática e trava de competências.

---

## 🏛️ 1. Módulo de Contabilidade Avançada (`AccountingModule`)

Localizado na rota e visão `contabilidade` (`/accounting`):

1. **Plano de Contas Hierárquico (COA - 4 Níveis):**
   - Classes estruturadas:
     - `1. ATIVO` (Circulante, Não Circulante, Disponibilidades, Clientes, Almoxarifado, Imobilizado e Depreciação Acumulada).
     - `2. PASSIVO & PATRIMÔNIO LÍQUIDO` (Passivo Circulante, Fornecedores, Encargos/Folha, Tributos a Recolher, Capital Social e Lucros Acumulados).
     - `3. RECEITAS OPERACIONAIS` (Receita de Serviços, Receita Recorrente SaaS SEEK, Deduções de PIS/COFINS e ISSQN).
     - `4. CUSTOS E DESPESAS OPERACIONAIS` (Custos de Datacenter/Nuvem, Insumos, Despesas com Pessoal, Facilities e Depreciação).
   - Classificação entre contas Sintéticas (agrupadoras) e Analíticas (recebedoras de lançamentos).
   - Criação de novas contas analíticas com auditoria contábil imediata.

2. **Livro Diário & Motor de Partidas Dobradas (Double-Entry Bookkeeping):**
   - Validação contábil estrita: cada lançamento exige conta de Débito, conta de Crédito e valor idêntico (`Débito = Crédito`).
   - Código único cronológico por competência (`LAN-2026-XXXX`).
   - Transação atômica em banco de dados: atualiza simultaneamente o Livro Diário e os saldos das contas envolvidas respeitando a natureza (DEVEDORA ou CREDORA).
   - Trilha de auditoria com usuário, papel, data e IP.

3. **Balancete de Verificação (Trial Balance):**
   - Listagem consolidada de todas as contas analíticas abertas.
   - Cálculo automático e conferência de igualdade:
     $$\sum \text{Débitos} = \sum \text{Créditos} = \text{R\$\ 2.511.580,00}$$
   - Indicador visual e badge de auditoria: `Equilibrado (Diferença: R$ 0,00)`.

4. **Demonstrações Financeiras & DRE Contábil Gerencial:**
   - **DRE:** Receita Bruta $\rightarrow$ (-) Deduções $\rightarrow$ Receita Líquida $\rightarrow$ Margem Bruta $\rightarrow$ EBITDA $\rightarrow$ EBIT/Lucro Líquido do Exercício (R$ 341.720,00).
   - **Balanço Patrimonial:** Ativo Total = R$ 2.210.800,00 | Passivo + PL = R$ 2.210.800,00 (`Equilíbrio Ativo = Passivo`).

5. **Fechamento Mensal de Competência (Period Locking):**
   - Controle de status das competências: `ABERTO`, `FECHADO` e `BLOQUEADO`.
   - Trava de segurança: impede novos lançamentos manuais ou automáticos em períodos bloqueados pela Auditoria ou Controladoria.

---

## ⚖️ 2. Módulo Fiscal & Tributário (`FiscalModule`)

Localizado na rota e visão `fiscal` (`/fiscal`):

1. **Apuração & Painel de Obrigações Tributárias:**
   - Controle das guias e tributos: **ISS**, **PIS**, **COFINS**, **IRPJ**, **CSLL**, **INSS** e **FGTS**.
   - Acompanhamento de vencimentos, competências de apuração, bases de cálculo e status (`PENDENTE`, `PAGO`).
   - Indicadores de total pendente e total liquidado no mês.

2. **Calculadora Interativa de Retenções na Fonte:**
   - Simulação instantânea de retenções federais e municipais sobre serviços:
     - ISS: 5,00% (configurável)
     - PIS: 0,65%
     - COFINS: 3,00%
     - IRPJ: 1,50%
     - CSLL: 1,00%
     - Alíquota Efetiva Retida: 11,15%
   - Exibição do valor bruto, total de retenções e valor líquido a pagar/receber.

3. **Liquidação e Baixa Integrada de Guias:**
   - Botão de recolhimento direto de obrigações tributárias.
   - Ao baixar uma guia:
     - Atualiza status para `PAGO` com carimbo de data/hora.
     - Gera lançamento contábil automático por partidas dobradas no Livro Diário (baixa de Passivo Fiscal contra Banco Bradesco C/C).
     - Registra evento imutável na trilha de auditoria corporativa.

4. **Calendário de Compliance Fiscal & SPED:**
   - Controle de entregas de obrigações principais e acessórias:
     - DARF Consolidado (RFB)
     - ISSQN Próprio & Retido (SMFI Curitiba)
     - DCTFWeb & Transmissão EFD-Reinf
     - Guia Previdenciária INSS & FGTS Digital
     - EFD-Contribuições (PIS/COFINS Bloco A/C/M)
   - Status de conformidade e badges de criticidade/urgência.

5. **Emissão e Consulta de Documentos Fiscais (NFS-e / NF-e):**
   - Consulta de notas emitidas e recebidas com chave de acesso de 44 dígitos.
   - Modal de emissão de NFS-e com cálculo automático em tempo real de retenções tributárias, persistência em banco e auditoria.

---

## 🔐 3. Credenciais Mestres de Teste

- **URL da Aplicação Web:** `http://localhost:5173/` e `http://192.168.30.105:5173/`
- **URL da API Backend:** `http://localhost:3001/api` e `http://192.168.30.105:3001/api`
- **Usuário Administrador Geral:** `admin@seek.local` / `Seek@2026`
- **Usuário Contador Geral:** `contabilidade@seek.local` / `Seek@2026`
- **Usuário Fiscal & Impostos:** `fiscal@seek.local` / `Seek@2026`
- **Usuário Gerente Financeira:** `financeiro@seek.local` / `Seek@2026`
- **Usuário Líder Comercial:** `comercial@seek.local` / `Seek@2026`
