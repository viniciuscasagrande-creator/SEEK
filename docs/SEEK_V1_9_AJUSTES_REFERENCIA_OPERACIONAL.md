# SEEK V1.9 — Ajustes por referência operacional

Este pacote usa as telas de referência fornecidas apenas como inspiração de organização funcional. A identidade visual e o escopo do SEEK foram preservados.

## Alterações realizadas
- Menu Financeiro preservado no padrão fixo + accordion e acrescido de **Configurações Financeiras**.
- **Conciliação Bancária** ganhou tela dedicada com seleção de conta, indicadores, leitura/pré-visualização de OFX, movimentações e histórico.
- **Configurações Financeiras** ganhou central própria com Contas Bancárias, Categorias, Centros de Custo, Formas de Pagamento e regras de contraparte.
- **Central de Relatórios** reorganizada por área, com busca, filtro por categoria e exportação CSV básica.
- Tesouraria, Contas a Pagar/Receber, DRE e Fechamento existentes foram preservados.

## Limite proposital desta entrega
A leitura OFX desta fase é uma pré-conferência no frontend. O arquivo não é gravado automaticamente no banco: a persistência definitiva deve ser implementada no backend com validação, idempotência por FITID, transação, RBAC/ABAC e auditoria, respeitando o Hardening V1.9.

Não foram adicionadas funções de ticketing, venda de ingressos, QR Code ou portaria.
