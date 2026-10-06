# SEEK — Gestão Corporativa Integrada (Enterprise ERP & CRM)

Plataforma Corporativa Integrada de Gestão Multiempresa, Multifilial e Governança.

🌐 **Acesso Oficial em Produção:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)

---

> [!IMPORTANT]
> **Regra Fundamental de Escopo:** O **SEEK é estritamente um ERP/CRM corporativo interno**. Não incorpora nenhuma funcionalidade de bilheteria, emissão/venda de ingressos, controle de portaria ou gestão comercial de eventos. Todas as rotinas de prestadores temporários residem em **RH → Freelance / Taxas**, atendendo a operações internas e administrativas.

---

## 🏛️ A Cadeia Evolutiva do SEEK

```text
SEEK Core → RH/DP → Freelance/Taxas → Financeiro → Controladoria → Compras → Patrimônio → Estoque → Contratos → Jurídico → Projetos → Service Desk → Governança → BI
```

### 📦 Visão Consolidada dos Pacotes

1. **SEEK Core (Pacote 1):** Multiempresa, multifilial, organograma, centros de custo, RBAC com 13 perfis oficiais, autenticação segura, trilha de auditoria imutável e barramento de notificações.
2. **Operações Administrativas & Workflows (Pacote 2):** Central de aprovações com alçadas, motor de estados, agenda corporativa integrada e minha estação de trabalho (*MyWorkstation*).
3. **CRM & Novos Negócios B2B (Pacote 3):** Funil comercial B2B, gestão de contas-chave, oportunidades, propostas e geração automática de minutas contratuais no ganho.
4. **Administração Empresarial (Pacote 4):**
   - **RH/DP:** Banco de talentos, cargos, colaboradores, folha de ponto digital, banco de horas e solicitações de férias/ausências.
   - **Patrimônio & Estoque:** Ativos imobilizados, depreciação linear (Classe 1.03), inventário e almoxarifado de insumos.
   - **Projetos & Tarefas:** Portfólio de iniciativas corporativas com quadro Kanban e estimativa de esforço.
   - **Service Desk:** Filas de atendimento multidepartamental (TI, RH, Financeiro, Jurídico) com controle estrito de SLA.
   - **GED & Documentos:** Repositório institucional com controle de versão e assinatura digital.
   - **Governança & Riscos (GRC):** Matriz de riscos corporativos $5 \times 5$, planos de mitigação e políticas institucionais.
5. **RH → Freelance & Central de Taxas (Pacote 4.1):**
   - Banco de prestadores cadastrados (especialidade, avaliação e chave PIX).
   - Fluxo ponta a ponta:
     $$\text{Necessidade} \rightarrow \text{Aprovação} \rightarrow \text{Convocação} \rightarrow \text{Presença} \rightarrow \text{Fechamento} \rightarrow \text{Contas a Pagar} \rightarrow \text{Contabilização} \rightarrow \text{Pagamento}$$
6. **Contabilidade Avançada & Fiscal (Pacote 5):**
   - Plano de Contas Hierárquico (COA - 4 Níveis), Livro Diário com motor de partidas dobradas (`Débito = Crédito`), Balancete de Verificação em tempo real e Demonstrações Financeiras.
   - Apuração de tributos federais e municipais (ISS, PIS, COFINS, IRPJ, CSLL, INSS, FGTS), simulador de retenções na fonte e calendário fiscal.
7. **Financeiro, Compras & Controladoria Enterprise (Pacote 6):**
   - **Tesouraria & Bancos:** Contas correntes empresariais (Bradesco, Itaú), extrato em tempo real e conciliação bancária matemática de extratos OFX.
   - **Hub de Contas a Pagar/Receber:** Absorção automática de compras faturadas (`PO`), taxas fechadas (`TAXA`), tributos (`FISCAL`) e contratos corporativos.
   - **Compras & Procurement:** Solicitação de Compras (SC), Mapa Comparativo com 3 fornecedores homologados e cálculo automático de saving, alçadas de governança (Tiers 1, 2 e 3) e recebimento físico/fiscal com geração imediata do título no Contas a Pagar.
   - **Controladoria & Orçamento (Budgeting):** Matriz Orçado × Comprometido × Realizado por centro de custo e DRE Gerencial consolidado (EBITDA).
   - **Fechamento de Competência:** Trava operacional formal (*Period Lock*) com checklist auditado.
8. **Patrimônio, Contratos & Jurídico (Pacote 7):**
   - Ciclo patrimonial, tombamento, depreciação linear (Classe 1.03), termos de responsabilidade, estoque de insumos, contratos corporativos, reajustes automáticos (IPCA/IGP-M) e procurações jurídicas.
9. **Projetos, Service Desk, Governança & BI (Pacote 8):**
   - Portfólio de projetos, Kanban de tarefas, Service Desk multidepartamental com SLA, base de conhecimento (POPs) e matriz de riscos corporativos (GRC).
10. **CRM & Comercial Corporativo (Pacote 9):**
    - Empresas e contatos B2B (`crm_empresas`, `crm_contatos`), pipeline com cálculo de probabilidade ponderada, propostas formais e agenda de atividades executivas.
11. **Planejamento, Metas e Gestão Executiva (Pacote 10):**
    - Ciclos estratégicos plurianuais, OKRs corporativos e metas mensuráveis (`planejamento_metas`), modelagem de cenários macroeconômicos e acompanhamento de desvios.
12. **Administração, Segurança, Auditoria e Integrações (Pacote 11):**
    - Matriz granular RBAC/ABAC por perfil e módulo, políticas corporativas com controle de versão, catálogo de integrações (SEFAZ, Open Banking, Vercel) e barramento de webhooks assíncronos.

### 🔮 Roadmap das Próximas Fases

- **Pacote 12:** Gestão Documental Avançada & Assinaturas Digitais
- **Pacote 13:** Automação Corporativa & Workflows Enterprise
- **Pacote 14:** Central Executiva & BI Avançado
- **Pacote 15:** SEEK IA — Assistente Corporativo com RAG Interno e Permissões Seguras

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos

- Node.js v18+ instalado
- NPM ou Yarn

### 1. Instalação das Dependências

```bash
# Na raiz (Frontend Vite + React 19)
npm install

# No backend (Servidor Express + SQLite)
npm --prefix server install
```

### 2. Execução em Modo Desenvolvimento

```bash
# Executa o frontend Vite (Porta 5173)
npm run dev

# Em outro terminal, executa a API Backend (Porta 3001)
npm run server:dev
```

### 3. Build de Produção

```bash
# Build do Frontend (Vite)
npm run build

# Build do Backend (TypeScript)
npm run server:build
```

---

## 🔐 Segurança, Autenticação JWT e Perfis RBAC

O backend do SEEK utiliza tokens **JWT (JSON Web Token — RFC 7519)** com algoritmo HMAC SHA-256 e validação de alçadas RBAC em nível de rota no servidor Express.

As credenciais do ambiente de homologação local utilizam hashes criptográficos `bcrypt`. Em produção, a chave secreta é injetada via variável de ambiente `JWT_SECRET`.

| Perfil / Papel | E-mail de Acesso | Alçada de Aprovação | Módulos Liberados |
| :--- | :--- | :---: | :---: |
| **Administrador Geral** | `admin@seek.local` | R$ 1.000.000,00 | Todos (`*`) |
| **Diretor Presidente / C-Level** | `diretoria@seek.local` | R$ 500.000,00 | Governança, Dashboard, BI, Executivo |
| **Diretor Financeiro & Controladoria** | `marcos.financeiro@seek.local` | R$ 250.000,00 | Financeiro, Contabilidade, Fiscal, Compras, Governança |
| **Líder Comercial & CRM** | `lucas.comercial@seek.local` | R$ 50.000,00 | CRM, Contratos, Documentos |
| **Gerente de Recursos Humanos & DP** | `camila.rh@seek.local` | R$ 40.000,00 | RH, Ponto, Freelance / Taxas, Benefícios |
| **Gestora de Compras & Suprimentos** | `mariana.compras@seek.local` | R$ 50.000,00 | Compras, Cotações, Fornecedores, Estoque |
| **Tech Lead & Datacenter** | `eduardo.ti@seek.local` | R$ 30.000,00 | TI, Projetos, Service Desk, Datacenter |
| **Auditor de Conformidade & GRC** | `auditoria@seek.local` | R$ 0,00 | Auditoria, Logs, Políticas, GRC |

---

## 🌐 Deploy em Produção (Vercel)

- **Link Oficial:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)
- Roteamento SPA configurado via `vercel.json` com fallback para `index.html`.
- Suporte a variável de ambiente `VITE_API_URL` para orquestração da API Backend.
