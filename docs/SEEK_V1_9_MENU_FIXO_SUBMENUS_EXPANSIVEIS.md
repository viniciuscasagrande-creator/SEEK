# SEEK V1.9 — Menu Fixo e Submenus Expansíveis

## Alteração Aplicada

- **Sidebar principal fixa:** no desktop, o menu lateral permanece visível e acessível durante toda a navegação.
- **Áreas corporativas fixas:** Início, Gestão, Relacionamento, Estratégia e Administração.
- **Submenus expansíveis/retráteis:** módulos possuem subitens organizados e acessíveis em um clique.
- **Comportamento accordion:** ao abrir um módulo, o anterior é recolhido automaticamente, evitando poluição visual.
- **Destaque ativo:** módulo pai e submenu selecionados ficam visualmente destacados.
- **Preservação de estado:** o módulo ativo no accordion é preservado no `localStorage` (`seek_accordion_module`).
- **Breadcrumb dinâmico:** exibe a hierarquia `SEEK / Módulo / Submenu`.
- **Desktop recolhido:** exibe rail de ícones com flyout popover flutuante ao passar o mouse.
- **Mobile e Tablet:** transforma-se em gaveta lateral (drawer) com backdrop escuro e fechamento suave.
- **Regras e telas preservadas:** Financeiro, Contabilidade, Fiscal, Compras, Estoque, CRM, Projetos e RH / Freelance-Taxas continuam íntegros com suas regras de negócio.

## Arquitetura de Navegação em 3 Níveis

1. **Nível 1 (Áreas Corporativas):** Início, Gestão, Relacionamento, Estratégia, Administração.
2. **Nível 2 (Módulos & Submenus na Sidebar):** navegação direta entre as operações principais do módulo.
3. **Nível 3 (Abas e Filtros Contextuais na Tela):** sub-operações e abas internas gerenciadas diretamente pelo componente da tela (`initialTab`), sem aprofundar a sidebar em mais níveis.

## Escopo Preservado

O SEEK permanece estritamente como ERP/CRM corporativo interno:

- `RH → Freelance / Taxas` permanece sob a gestão de Recursos Humanos e Departamento Pessoal para alocação temporária e fechamento de pagamentos.
- Zero bilheteria, venda de ingressos, controle de acesso público por QR Code ou portaria.

## Validação e Qualidade

- **Frontend:** compilação via Vite + TypeScript (`npm run build`) validada sem erros.
- **Backend:** compilação TypeScript (`npm run server:build`) e sintaxe Node.js validadas.
- **Deploy Contínuo:** sincronizado com o link oficial em produção [seek-xi.vercel.app](https://seek-xi.vercel.app).
