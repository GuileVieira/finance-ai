import { Ofx } from 'ofx-data-extractor';
import { blobToString, bufferToString } from 'ofx-data-extractor';
import { fixJsonProblems } from 'ofx-data-extractor';
import { formatDate } from 'ofx-data-extractor';
import type { IExtractor } from 'ofx-data-extractor';
import type { CustomExtractor } from 'ofx-data-extractor';
import type { OfxResponse, OfxStructure } from 'ofx-data-extractor';
import type { BankTransactionList } from 'ofx-data-extractor';
import { Reader } from 'ofx-data-extractor';
import { OfxExtractor } from 'ofx-data-extractor';
import { Extractor } from 'ofx-data-extractor';
import type { MetaData, ExtractorConfig, DateResponse } from 'ofx-data-extractor';

export interface ParsedTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  checkNumber?: string;
  referenceNumber?: string;
  memo: string;
  name?: string;
  raw: any;
}

export interface ParsedOFX {
  type: 'BANK' | 'CREDIT_CARD';
  headers: any;
  transactions: ParsedTransaction[];
  accountInfo: {
    bankId: string;
    branchId: string;
    accountId: string;
    accountType: string;
    currency: string;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
  balance: {
    amount: number;
    date: Date;
  };
}

export class OFXParserService {
  async parseFile(file: File): Promise<ParsedOFX> {
    try {
      // Ler conteúdo do arquivo
      const data = await file.text();
      const ofx = new Ofx(data);

      // Obter informações básicas
      const type = ofx.getType();
      const headers = ofx.getHeaders();

      // Obter transações baseado no tipo
      const rawTransactions = type === 'BANK'
        ? ofx.getBankTransferList()
        : ofx.getCreditCardTransferList();

      // Obter informações da conta
      const content = ofx.getContent();
      const accountInfo = this.extractAccountInfo(content, type);

      // Obter período do extrato
      const period = this.extractPeriod(content);

      // Obter saldo final
      const balance = this.extractBalance(content);

      // Normalizar transações
      const transactions = this.normalizeTransactions(rawTransactions);

      return {
        type,
        headers,
        transactions,
        accountInfo,
        period,
        balance
      };

    } catch (error) {
      console.error('Erro ao parsear OFX:', error);
      throw new Error(`Falha ao processar arquivo OFX: ${error.message}`);
    }
  }

  async parseFromString(ofxString: string): Promise<ParsedOFX> {
    try {
      const ofx = new Ofx(ofxString);

      // Obter informações básicas
      const type = ofx.getType();
      const headers = ofx.getHeaders();

      // Obter transações baseado no tipo
      const rawTransactions = type === 'BANK'
        ? ofx.getBankTransferList()
        : ofx.getCreditCardTransferList();

      // Obter informações da conta
      const content = ofx.getContent();
      const accountInfo = this.extractAccountInfo(content, type);

      // Obter período do extrato
      const period = this.extractPeriod(content);

      // Obter saldo final
      const balance = this.extractBalance(content);

      // Normalizar transações
      const transactions = this.normalizeTransactions(rawTransactions);

      return {
        type,
        headers,
        transactions,
        accountInfo,
        period,
        balance
      };

    } catch (error) {
      console.error('Erro ao parsear OFX:', error);
      throw new Error(`Falha ao processar OFX: ${error.message}`);
    }
  }

  private extractAccountInfo(content: any, type: string) {
    if (type === 'BANK') {
      const stmtrs = content?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
      if (stmtrs?.BANKACCTFROM) {
        const acct = stmtrs.BANKACCTFROM;
        return {
          bankId: acct.BANKID || '',
          branchId: acct.BRANCHID || '',
          accountId: acct.ACCTID || '',
          accountType: acct.ACCTTYPE || '',
          currency: stmtrs.CURDEF || 'BRL'
        };
      }
    }

    return {
      bankId: '',
      branchId: '',
      accountId: '',
      accountType: '',
      currency: 'BRL'
    };
  }

  private extractPeriod(content: any) {
    const bankTranList = content?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST;
    if (bankTranList?.DTSTART && bankTranList?.DTEND) {
      return {
        startDate: new Date(bankTranList.DTSTART),
        endDate: new Date(bankTranList.DTEND)
      };
    }

    return {
      startDate: new Date(),
      endDate: new Date()
    };
  }

  private extractBalance(content: any) {
    const ledgerBal = content?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.LEDGERBAL;
    if (ledgerBal) {
      return {
        amount: parseFloat(ledgerBal.BALAMT || '0'),
        date: new Date(ledgerBal.DTASOF)
      };
    }

    return {
      amount: 0,
      date: new Date()
    };
  }

  private normalizeTransactions(rawTransactions: any[]): ParsedTransaction[] {
    if (!Array.isArray(rawTransactions)) {
      return [];
    }

    return rawTransactions.map(tx => ({
      id: tx.FITID || '',
      date: new Date(tx.DTPOSTED),
      description: this.cleanDescription(tx.MEMO || tx.NAME || ''),
      amount: parseFloat(tx.TRNAMT || '0'),
      type: this.getTransactionType(tx.TRNTYPE, tx.TRNAMT),
      checkNumber: tx.CHECKNUM,
      referenceNumber: tx.REFNUM,
      memo: tx.MEMO || '',
      name: tx.NAME || '',
      raw: tx // Dados originais para referência
    }));
  }

  private getTransactionType(trnType: string, amount: number): 'credit' | 'debit' {
    // Se o amount for negativo, é débito
    if (amount < 0) return 'debit';

    // Se o amount for positivo, é crédito
    if (amount > 0) return 'credit';

    // Se o amount for zero (raro), verificar pelo TRNTYPE
    return trnType === 'CREDIT' ? 'credit' : 'debit';
  }

  private cleanDescription(description: string): string {
    if (!description) return '';

    return description
      // Remover aspas duplas do MEMO
      .replace(/^"|"$/g, '')
      // Limpar espaços extras
      .trim();
  }

  // Método para análise de dados do OFX
  analyzeOFXData(parsedOFX: ParsedOFX) {
    const { transactions } = parsedOFX;

    const analysis = {
      totalTransactions: transactions.length,
      credits: transactions.filter(t => t.type === 'credit'),
      debits: transactions.filter(t => t.type === 'debit'),
      totalCredits: transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0),
      totalDebits: Math.abs(
        transactions
          .filter(t => t.type === 'debit')
          .reduce((sum, t) => sum + t.amount, 0)
      ),
      netBalance: 0,
      averageTransaction: 0,
      frequentDestinations: this.getFrequentDestinations(transactions),
      dateRange: {
        earliest: transactions.length > 0 ? transactions[0].date : new Date(),
        latest: transactions.length > 0 ? transactions[transactions.length - 1].date : new Date()
      }
    };

    analysis.netBalance = analysis.totalCredits - analysis.totalDebits;
    analysis.averageTransaction = transactions.length > 0
      ? analysis.netBalance / transactions.length
      : 0;

    return analysis;
  }

  private getFrequentDestinations(transactions: ParsedTransaction[]) {
    const destinations: { [key: string]: number } = {};

    transactions.forEach(tx => {
      const dest = tx.name || tx.description.split(' ')[0];
      destinations[dest] = (destinations[dest] || 0) + 1;
    });

    return Object.entries(destinations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }
}