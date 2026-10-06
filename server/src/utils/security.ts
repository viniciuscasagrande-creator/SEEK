// SEEK Core — Utilitários de Segurança, Governança, SoD e Proteção de Dados (LGPD)
import { TokenPayload } from '../middleware/auth.js';

/**
 * Mascaramento de CPF ou CNPJ para conformidade com a LGPD e principio do menor privilegio
 * Exemplo CPF: 123.456.789-00 -> ***.456.***-00
 * Exemplo CNPJ: 08.123.456/0001-90 -> 08.***.*** / 0001-**
 */
export function maskDocumentNumber(doc: string | null | undefined): string {
  if (!doc) return '***';
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) {
    // CPF
    return `***.${clean.substring(3, 6)}.***-${clean.substring(9, 11)}`;
  } else if (clean.length === 14) {
    // CNPJ
    return `${clean.substring(0, 2)}.***.***/${clean.substring(8, 12)}-**`;
  }
  return doc.length > 4 ? `***${doc.substring(doc.length - 4)}` : '****';
}

/**
 * Mascaramento de dados bancários (agência e conta)
 * Ex: Ag 1234 / CC 56789-0 -> Ag 1234 / CC ****9-0
 */
export function maskBankAccount(accountNumber: string | null | undefined): string {
  if (!accountNumber) return '****';
  if (accountNumber.length <= 4) return '****';
  const visible = accountNumber.substring(accountNumber.length - 3);
  return `****${visible}`;
}

/**
 * Mascaramento de remuneração / salários (LGPD - Dados Pessoais Sensíveis)
 */
export function maskSalary(salary: number): string {
  return 'R$ •••••,••';
}

/**
 * Verificação de Segregação de Funções (SoD - Separation of Duties)
 * Impede que o solicitante aprove ou libere a própria solicitação/ordem (conflito de interesse)
 */
export function checkSeparationOfDuties(
  requesterName: string | null | undefined,
  currentUser?: TokenPayload
): { isViolated: boolean; reason?: string } {
  if (!currentUser || !requesterName) {
    return { isViolated: false };
  }

  const cleanReq = requesterName.trim().toLowerCase();
  const cleanUser = currentUser.fullName.trim().toLowerCase();
  const cleanEmail = currentUser.email.trim().toLowerCase();

  // Autoaprovação direta por nome completo ou e-mail
  if (cleanReq === cleanUser || (cleanEmail && cleanReq.includes(cleanEmail))) {
    return {
      isViolated: true,
      reason: `Violação de Segregação de Funções (SoD): o colaborador ${currentUser.fullName} não pode deliberar sobre a aprovação da sua própria solicitação.`
    };
  }

  return { isViolated: false };
}

/**
 * Verifica se o perfil do usuário possui privilégios de acesso a dados corporativos confidenciais
 */
export function isPrivilegedRole(
  roleLevel?: string,
  allowedRoles: string[] = ['ADMIN_GERAL', 'DIRETORIA', 'RH', 'FINANCEIRO']
): boolean {
  if (!roleLevel) return false;
  return allowedRoles.includes(roleLevel);
}
