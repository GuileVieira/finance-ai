import { createLogger } from '@/lib/logger';

const log = createLogger('ofx-parser');

// Interface para transação OFX
export interface OFXTransaction {
  id?: string;
  type: 'debit' | 'credit';
  amount: number;
  date: string;
  description: string;
  memo?: string;
  balance?: number;
  fitid?: string;
  bankAccount?: string;
  checkNumber?: string;
}

// Interface para informações do banco
export interface OFXBankInfo {
  bankId?: string;
  bankName?: string;
  accountId?: string;
  accountType?: string;
  accountNumber?: string;
  branchId?: string;
}

// Interface para saldo do extrato (LEDGERBAL)
export interface OFXBalance {
  amount: number;
  asOfDate?: string;
}

// Interface para resultado do parser
export interface OFXParseResult {
  success: boolean;
  transactions: OFXTransaction[];
  bankInfo?: OFXBankInfo;
  balance?: OFXBalance;
  startDate?: string;
  endDate?: string;
  error?: string;
}

// Função principal para parse de arquivo OFX
export async function parseOFXFile(ofxContent: string): Promise<OFXParseResult> {
  try {
    log.info('Iniciando parser OFX');

    // Limpar e normalizar o conteúdo
    let content = ofxContent.trim();

    // Remover cabeçalhos e linhas problemáticas
    content = content
      .replace(/<OFX>/gi, '')
      .replace(/<\/OFX>/gi, '')
      .replace(/<SIGNONMSGSRSV1>/gi, '')
      .replace(/<\/SIGNONMSGSRSV1>/gi, '')
      .replace(/\r?\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();

    log.debug('Conteúdo OFX limpo e normalizado');

    // Extrair informações do banco
    const bankInfo = extractBankInfo(content);
    log.info({ bankInfo }, 'Informações do banco extraídas');

    // Extrair saldo (LEDGERBAL)
    const balance = extractLedgerBalance(content);
    if (balance) {
      log.info({ amount: balance.amount, asOfDate: balance.asOfDate }, 'LEDGERBAL extraído');
    } else {
      log.warn('LEDGERBAL não encontrado no arquivo OFX');
    }

    // Extrair transações
    const transactions = extractTransactions(content);
    log.info({ count: transactions.length }, 'Transações extraídas');

    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        error: 'Nenhuma transação encontrada no arquivo OFX'
      };
    }

    // Ordenar transações por data
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calcular datas início e fim
    const startDate = transactions[0]?.date;
    const endDate = transactions[transactions.length - 1]?.date;

    log.info({ startDate, endDate }, 'Período do extrato');

    return {
      success: true,
      transactions,
      bankInfo,
      balance: balance || undefined,
      startDate,
      endDate
    };

  } catch (error) {
    log.error({ err: error }, 'Erro no parser OFX');
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Erro desconhecido no parser OFX'
    };
  }
}

// Mapeamento FID → Nome do banco
const BANK_FID_MAP: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '104': 'Caixa Econômica Federal',
  '237': 'Bradesco',
  '341': 'Itaú Unibanco',
  '422': 'Banco Safra',
  '077': 'Banco Inter',
  '260': 'Nu Pagamentos (Nubank)',
  '336': 'Banco C6',
  '212': 'Banco Original'
};

// Extrair informações do banco
function extractBankInfo(content: string): OFXBankInfo {
  const bankInfo: OFXBankInfo = {};

  // Regex para extrair informações bancárias
  const patterns = {
    bankId: /<BANKID>([^<]+)/gi,
    // Buscar <ORG> dentro de <FI> para pegar nome do banco
    org: /<FI>[\s\S]*?<ORG>([^<]+)/gi,
    // Buscar <FID> para código do banco
    fid: /<FI>[\s\S]*?<FID>([^<]+)/gi,
    accountId: /<ACCTID>([^<]+)/gi,
    accountType: /<ACCTTYPE>([^<]+)/gi,
    branchId: /<BRANCHID>([^<]+)/gi
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = pattern.exec(content);
    if (match && match[1]) {
      if (key === 'org') {
        bankInfo.bankName = match[1].trim();
      } else if (key === 'fid') {
        const fid = match[1].trim();
        // Se encontrou FID, usar mapeamento para nome amigável
        const mappedName = BANK_FID_MAP[fid];
        if (mappedName && !bankInfo.bankName) {
          bankInfo.bankName = mappedName;
        }
        // Guardar FID como bankId se não tiver
        if (!bankInfo.bankId) {
          bankInfo.bankId = fid;
        }
      } else {
        bankInfo[key as keyof OFXBankInfo] = match[1].trim();
      }
    }
  }

  // Limpar nome do banco
  if (bankInfo.bankName) {
    bankInfo.bankName = cleanBankName(bankInfo.bankName);
  }

  log.debug({ name: bankInfo.bankName, fid: bankInfo.bankId }, 'Banco identificado');

  return bankInfo;
}

// Extrair BALAMT e DTASOF de um bloco de saldo OFX
function parseBalanceBlock(block: string): OFXBalance | null {
  const amountRegex = /<BALAMT>([^<]+)/gi;
  const amountMatch = amountRegex.exec(block);

  if (!amountMatch || !amountMatch[1]) {
    return null;
  }

  const amount = parseFloat(amountMatch[1].trim().replace(',', '.'));
  if (isNaN(amount)) {
    return null;
  }

  const dateRegex = /<DTASOF>([^<]+)/gi;
  const dateMatch = dateRegex.exec(block);
  const asOfDate = dateMatch?.[1] ? parseOFXDate(dateMatch[1].trim()) : undefined;

  return { amount, asOfDate };
}

// Extrair saldo do conteúdo OFX (LEDGERBAL prioritário, AVAILBAL como fallback)
function extractLedgerBalance(content: string): OFXBalance | null {
  // 1. Tentar LEDGERBAL (saldo contábil — obrigatório na spec, presente em todos os bancos BR testados)
  const ledgerBalRegex = /<LEDGERBAL>([\s\S]*?)(?:<\/LEDGERBAL>|<(?:AVAILBAL|BANKMSGSRSV1|\/STMTRS))/gi;
  const ledgerMatch = ledgerBalRegex.exec(content);

  if (ledgerMatch) {
    const result = parseBalanceBlock(ledgerMatch[1]);
    if (result) {
      log.debug('Saldo extraído de LEDGERBAL');
      return result;
    }
  }

  // 2. Fallback: AVAILBAL (saldo disponível — alguns bancos podem enviar apenas este)
  const availBalRegex = /<AVAILBAL>([\s\S]*?)(?:<\/AVAILBAL>|<(?:BANKMSGSRSV1|\/STMTRS))/gi;
  const availMatch = availBalRegex.exec(content);

  if (availMatch) {
    const result = parseBalanceBlock(availMatch[1]);
    if (result) {
      log.info('Saldo extraído de AVAILBAL (fallback)');
      return result;
    }
  }

  return null;
}

// Extrair transações do conteúdo OFX
function extractTransactions(content: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];

  // Procurar por blocos de transações
  const transactionRegex = /<STMTTRN>([^]*?)<\/STMTTRN>/gi;
  const matches = content.match(transactionRegex);

  if (!matches) {
    log.warn('Nenhum bloco de transação encontrado');
    return transactions;
  }

  log.debug({ count: matches.length }, 'Blocos de transação encontrados');

  for (const match of matches) {
    try {
      const transaction = parseTransactionBlock(match);
      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      log.warn({ err: error }, 'Erro ao processar bloco de transação');
    }
  }

  return transactions;
}

// Parse de um bloco individual de transação
function parseTransactionBlock(block: string): OFXTransaction | null {
  const transaction: OFXTransaction = {
    type: 'debit',
    amount: 0,
    date: '',
    description: ''
  };

  // Regex para extrair campos da transação
  const patterns = {
    trntype: /<TRNTYPE>([^<]+)/gi,
    dtposted: /<DTPOSTED>([^<]+)/gi,
    trnamt: /<TRNAMT>([^<]+)/gi,
    fitid: /<FITID>([^<]+)/gi,
    memo: /<MEMO>([^<]+)/gi,
    name: /<NAME>([^<]+)/gi,
    checknum: /<CHECKNUM>([^<]+)/gi
  };

  // Extrair valores
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = pattern.exec(block);
    if (match && match[1]) {
      const value = match[1].trim();

      switch (key) {
        case 'trntype':
          transaction.type = value.toLowerCase() === 'credit' ? 'credit' : 'debit';
          break;
        case 'dtposted':
          transaction.date = parseOFXDate(value);
          break;
        case 'trnamt':
          transaction.amount = parseFloat(value.replace(',', '.'));
          break;
        case 'fitid':
          transaction.fitid = value;
          break;
        case 'memo':
          transaction.memo = cleanText(value);
          break;
        case 'name':
          transaction.description = cleanText(value);
          break;
        case 'checknum':
          transaction.checkNumber = value;
          break;
      }
    }
  }

  // Se não tiver descrição, usar o memo
  if (!transaction.description && transaction.memo) {
    transaction.description = transaction.memo;
  }

  // Se ainda não tiver descrição, criar uma genérica
  if (!transaction.description) {
    transaction.description = `${transaction.type === 'credit' ? 'Crédito' : 'Débito'} - ${transaction.date}`;
  }

  // Criar ID se não tiver
  if (!transaction.id) {
    transaction.id = `${transaction.date}_${Math.abs(transaction.amount)}_${transaction.description.substring(0, 20)}`;
  }

  // Validar transação
  if (!transaction.date || isNaN(transaction.amount) || !transaction.description) {
    log.warn({ transaction }, 'Transação inválida ignorada');
    return null;
  }

  return transaction;
}

// Parse de data no formato OFX (YYYYMMDDHHMMSS)
function parseOFXDate(dateString: string): string {
  // Remove timezone e formata
  const cleanDate = dateString.replace(/\[.*?\]/g, '').trim();

  try {
    // Formato esperado: YYYYMMDDHHMMSS
    if (cleanDate.length >= 14) {
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      const hour = cleanDate.substring(8, 10);
      const minute = cleanDate.substring(10, 12);

      return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
    }

    // Formato alternativo: YYYYMMDD
    if (cleanDate.length >= 8) {
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);

      return `${year}-${month}-${day}T00:00:00.000Z`;
    }

    throw new Error(`Formato de data não reconhecido: ${dateString}`);
  } catch (error) {
    log.warn({ dateString, err: error }, 'Erro ao parsear data');
    return new Date().toISOString();
  }
}

// Limpar nome do banco
function cleanBankName(bankName: string): string {
  return bankName
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Limpar texto de transação
function cleanText(text: string): string {
  if (!text) return '';

  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remover caracteres de controle
    .replace(/\s+/g, ' ') // Normalizar espaços
    .trim();
}

// Validação de transação
export function validateTransaction(transaction: OFXTransaction): boolean {
  return !!(
    transaction.description &&
    transaction.date &&
    !isNaN(transaction.amount) &&
    transaction.amount !== 0
  );
}

// Classificar tipo de transação
export function getTransactionType(amount: number): 'credit' | 'debit' {
  return amount > 0 ? 'credit' : 'debit';
}

// Formatar valor para exibição
export function formatAmount(amount: number): string {
  const formatted = Math.abs(amount).toFixed(2);
  return amount > 0 ? `+R$ ${formatted}` : `-R$ ${formatted}`;
}
