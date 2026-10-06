// SEEK Core — Motor de Leitura e Normalização de Arquivos Bancários OFX (SGML & XML)

export interface OfxParsedTransaction {
  fitid: string;
  type: 'CREDITO' | 'DEBITO';
  amount: number; // Valor absoluto positivo
  rawAmount: number; // Valor com sinal (+ / -)
  postedDate: string; // YYYY-MM-DD
  memo: string;
  checkNumber?: string;
  payee?: string;
}

export interface OfxParsedStatement {
  bankCode?: string;
  accountNumber?: string;
  startDate?: string;
  endDate?: string;
  ledgerBalance?: number;
  transactions: OfxParsedTransaction[];
}

/**
 * Extrai o valor de uma tag OFX, suportando tanto formato SGML (<TAG>valor\n) quanto XML (<TAG>valor</TAG>)
 */
function extractTagValue(content: string, tagName: string): string | null {
  // Tenta formato XML: <TAG>valor</TAG>
  const xmlRegex = new RegExp(`<${tagName}>([^<\\r\\n]+)<\\/${tagName}>`, 'i');
  const xmlMatch = content.match(xmlRegex);
  if (xmlMatch && xmlMatch[1]) {
    return xmlMatch[1].trim();
  }

  // Tenta formato SGML padrão: <TAG>valor (até quebra de linha ou próxima tag)
  const sgmlRegex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i');
  const sgmlMatch = content.match(sgmlRegex);
  if (sgmlMatch && sgmlMatch[1]) {
    return sgmlMatch[1].trim();
  }

  return null;
}

/**
 * Normaliza datas bancárias OFX no padrão YYYY-MM-DD
 * Exemplos aceitos:
 * 20261006120000[-03:EST] -> 2026-10-06
 * 20261006 -> 2026-10-06
 */
function normalizeOfxDate(rawDate?: string | null): string {
  if (!rawDate || rawDate.length < 8) {
    return new Date().toISOString().substring(0, 10);
  }
  const clean = rawDate.replace(/\D/g, '');
  if (clean.length >= 8) {
    const yyyy = clean.substring(0, 4);
    const mm = clean.substring(4, 6);
    const dd = clean.substring(6, 8);
    return `${yyyy}-${mm}-${dd}`;
  }
  return new Date().toISOString().substring(0, 10);
}

/**
 * Parser de arquivos bancários OFX
 */
export function parseOfx(content: string): OfxParsedStatement {
  if (!content || typeof content !== 'string') {
    throw new Error('Conteúdo OFX inválido ou vazio.');
  }

  const bankCode = extractTagValue(content, 'BANKID') || undefined;
  const accountNumber = extractTagValue(content, 'ACCTID') || undefined;
  const rawStartDate = extractTagValue(content, 'DTSTART');
  const rawEndDate = extractTagValue(content, 'DTEND');
  const rawBalAmt = extractTagValue(content, 'BALAMT');

  const startDate = rawStartDate ? normalizeOfxDate(rawStartDate) : undefined;
  const endDate = rawEndDate ? normalizeOfxDate(rawEndDate) : undefined;
  const ledgerBalance = rawBalAmt ? parseFloat(rawBalAmt.replace(',', '.')) : undefined;

  // Extrai blocos <STMTTRN>...</STMTTRN> ou <STMTTRN> até o próximo <STMTTRN>
  const trnBlocks = content.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTRS>|$)/gi) || [];

  const transactions: OfxParsedTransaction[] = [];
  const seenFitids = new Set<string>();

  for (let i = 0; i < trnBlocks.length; i++) {
    const block = trnBlocks[i];
    const fitid = extractTagValue(block, 'FITID') || `OFX-GEN-${Date.now()}-${i + 1}`;
    
    // Evita duplicatas dentro do mesmo arquivo
    if (seenFitids.has(fitid)) {
      continue;
    }
    seenFitids.add(fitid);

    const rawAmtStr = extractTagValue(block, 'TRNAMT') || '0';
    const rawAmount = parseFloat(rawAmtStr.replace(',', '.'));
    const absAmount = Math.abs(rawAmount);

    const trnType = (extractTagValue(block, 'TRNTYPE') || '').toUpperCase();
    const isDebit = rawAmount < 0 || trnType === 'DEBIT' || trnType === 'FEE' || trnType === 'SRVCHG' || trnType === 'PAYMENT';

    const rawDtPosted = extractTagValue(block, 'DTPOSTED');
    const postedDate = normalizeOfxDate(rawDtPosted);

    const memo = extractTagValue(block, 'MEMO');
    const name = extractTagValue(block, 'NAME');
    const checkNumber = extractTagValue(block, 'CHECKNUM') || undefined;

    const description = memo || name || (isDebit ? 'Débito Bancário' : 'Crédito Bancário');

    transactions.push({
      fitid,
      type: isDebit ? 'DEBITO' : 'CREDITO',
      amount: absAmount,
      rawAmount,
      postedDate,
      memo: description,
      checkNumber,
      payee: name || undefined
    });
  }

  return {
    bankCode,
    accountNumber,
    startDate,
    endDate,
    ledgerBalance,
    transactions
  };
}
