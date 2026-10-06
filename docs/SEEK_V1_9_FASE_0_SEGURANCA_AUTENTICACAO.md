# SEEK V1.9 — Fase 0: Segurança, Autenticação Real, Sessões e ABAC

**Data de Validação:** 06/10/2026  
**Ambiente Oficial:** [https://seek-xi.vercel.app](https://seek-xi.vercel.app)  
**Status dos Testes:** 28 Aprovados / 0 Falhas (`npm run server:test`)

---

## 1. Visão Geral da Fase 0 (0.1, 0.2 e 0.3)

A **Fase 0** do SEEK V1.9 consolida a infraestrutura de segurança do ERP corporativo, substituindo a antiga camada demonstrativa por uma arquitetura de segurança enterprise:

1. **Tokens de Acesso de Curta Duração (JWT 15m):**
   - Assinatura criptográfica HMAC-SHA256 (RFC 7519).
   - Validade restrita a 15 minutos com payload enriquecido (`id`, `sessionId`, `email`, `roleLevel`, `approvalLimitAmount`, `companyId`, `branchId`).
2. **Refresh Tokens Rotativos Seguros (7 Dias):**
   - Hashes SHA-256 persistidos em banco de dados (`user_sessions`).
   - Rotação atômica a cada renovação: o refresh token antigo é invalidado imediatamente após o uso.
3. **Sessões Ativas e Revogação Imediata:**
   - O middleware `authenticateToken` valida o estado `is_revoked` da sessão em tempo real.
   - Endpoints para encerramento de sessão individual (`POST /api/auth/logout`), encerramento de todas as sessões do usuário (`POST /api/auth/logout-all`) e revogação administrativa (`DELETE /api/auth/sessions/:sessionId`).
4. **Política Corporativa de Senhas de Alta Entropia:**
   - Mínimo de 8 caracteres.
   - Exigência de pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.
5. **Histórico de Senhas (Anti-Reutilização):**
   - Bloqueio estrito da reutilização das últimas 3 senhas corporativas cadastradas em `password_history`.
6. **Recuperação Segura com Token Único (30 Minutos):**
   - Tokens de uso único (SHA-256) em `password_resets` com expiração de 30 minutos.
   - Ao concluir a redefinição, todas as sessões ativas do usuário são revogadas preventivamente.
7. **Autenticação em Dois Fatores (MFA / TOTP RFC 6238):**
   - Segredo criptográfico e validação baseada em tempo compatível com autenticadores padrão.
8. **ABAC Multidimensional (Alçadas & Contexto Multiempresa):**
   - Verificação em tempo real de limites de aprovação em compras, títulos e workflows.
   - Extração e propagação de `x-company-id` e `x-branch-id`.
9. **Rastreabilidade Universal com Correlation ID (`x-correlation-id`):**
   - Middleware global injeta e propaga `x-correlation-id` em todas as requisições HTTP e eventos da trilha de auditoria imutável.
10. **Painel de Administração e Gestão de Sessões:**
    - Aba "Sessões & Segurança Corporativa" no `AdminModule.tsx` para visualização e revogação instantânea de acessos.

---

## 2. Bateria de Testes Automatizados (28 Testes Aprovados)

O script `server/src/test_auth_fase0.ts` atesta com 100% de sucesso os seguintes controles de segurança:

- [x] Usuário `admin@seek.local` cadastrado no banco corporativo.
- [x] Senha corporativa validada via hash bcrypt (10 rounds).
- [x] Senha incorreta estritamente rejeitada pelo bcrypt.
- [x] JWT estruturado em 3 segmentos (Header.Payload.Signature).
- [x] JWT verificado e decodificado com integridade e `sessionId`.
- [x] Token assinado com chave espúria estritamente rejeitado.
- [x] Perfil COLABORADOR sem privilégios de `ADMIN_GERAL` (RBAC).
- [x] Perfil COLABORADOR sem permissão ao módulo Financeiro (RBAC).
- [x] COLABORADOR com alçada R$ 0,00 impedido de aprovar R$ 50.000,00 (ABAC).
- [x] DIRETORIA com alçada R$ 150.000,00 autorizada a aprovar R$ 50.000,00 (ABAC).
- [x] Novo evento registrado na trilha de auditoria imutável.
- [x] Trilha de auditoria persistiu corretamente o `correlation_id`.
- [x] Senha com menos de 8 caracteres rejeitada.
- [x] Senha sem letra maiúscula rejeitada.
- [x] Senha sem letra minúscula rejeitada.
- [x] Senha sem número rejeitada.
- [x] Senha sem caractere especial rejeitada.
- [x] Senha corporativa válida (`SeekCorp#2026`) aceita com sucesso.
- [x] Detecção de reutilização de senha do histórico das últimas 3 executada com sucesso.
- [x] Nova senha não constante no histórico aceita para atualização.
- [x] Sessão corporativa criada como ativa (`is_revoked = 0`).
- [x] Sessão revogada no servidor com sucesso (`is_revoked = 1`).
- [x] Refresh token rotacionado e atualizado atomicamente.
- [x] Token seguro de redefinição de senha gerado com validade de 30m.
- [x] Reutilização de token de recuperação de senha impedida (uso único estrito).
- [x] Código TOTP de 6 dígitos gerado conforme RFC 6238.
- [x] Código TOTP verificado e validado com sucesso.
- [x] Código TOTP inválido rejeitado.
