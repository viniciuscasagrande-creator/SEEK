# SEEK V1.9 — Core Transacional Financeiro Fase 4

## Objetivo
Fechar a comprovação visual e técnica do fluxo financeiro já congelado, sem abrir módulos novos.

## Entrega
- Endpoint `/api/finance/trace/:recordId` consolida evidências do mesmo título.
- Respeita o contexto de empresa do usuário autenticado.
- Retorna etapas: Título, Pagamento, Banco, OFX, Conciliação, Contabilidade e Auditoria.
- Tela `Fluxo de Caixa & DRE Gerencial` ganhou painel de comprovação ponta a ponta.
- Seleção de um título real e visualização de cada evidência vinculada.
- Fluxo de Caixa Realizado vem do backend.
- Auditoria financeira recente vem do backend.
- DRE não usa mais valores demonstrativos de fallback na interface.
- Nenhum novo módulo ou menu foi criado.

## Gate
Uma operação só aparece como “Ciclo transacional comprovado” quando todas as etapas retornadas pelo backend estiverem concluídas.

## Próximo passo
Executar validação limpa, corrigir eventuais erros de build/testes e endurecer o fechamento mensal para bloquear períodos com pendências de conciliação/contabilidade.
