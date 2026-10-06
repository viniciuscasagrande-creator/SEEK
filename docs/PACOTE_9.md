# SEEK V1 — Hiper Pacote 9: CRM & Comercial Corporativo

## 📌 Visão Geral do Pacote 9

O **Hiper Pacote 9** aprofunda a gestão de clientes corporativos (B2B), contas estratégicas e novas oportunidades de receita da organização, mantendo integração estrita com o Financeiro e o módulo de Contratos.

> [!IMPORTANT]
> **Regra Fundamental de Escopo:** O SEEK permanece estritamente um ERP/CRM corporativo interno. Não há nenhuma rotina voltada para bilheteria, emissão de ingressos, controle de portaria ou eventos comerciais.
>
> 🌐 **Acesso Oficial:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)

---

## 🏛️ Entregas e Funcionalidades

1. **Gestão de Empresas e Contatos B2B:**
   - Cadastro detalhado de clientes (`crm_empresas`), contatos-chave (`crm_contatos`), porte corporativo, setor de atuação e histórico institucional.

2. **Pipeline de Oportunidades & Funil Comercial:**
   - Estágios de negociação: `PROSPECCAO` $\rightarrow$ `QUALIFICACAO` $\rightarrow$ `PROPOSTA` $\rightarrow$ `NEGOCIACAO` $\rightarrow$ `GANHO` / `PERDIDO`.
   - Cálculo de probabilidade de fechamento e valor ponderado do pipeline.

3. **Propostas Comerciais & Atividades:**
   - Propostas vinculadas a oportunidades com numeração formal e controle de validade (`crm_propostas`).
   - Agenda e histórico de reuniões, apresentações executivas e follow-ups comerciais (`crm_atividades`).

4. **Integração Automática com Contratos & Financeiro:**
   - Ao avançar uma oportunidade para `GANHO`, o SEEK Core dispara a criação da minuta contratual no módulo Jurídico e programa a previsão de receita recorrente no Contas a Receber.
