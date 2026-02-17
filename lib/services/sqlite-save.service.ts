import { createLogger } from '@/lib/logger';

const log = createLogger('sqlite-save');

// Interface para transação salva
export interface SavedTransaction {
  id: string;
  fileName: string;
  bankName?: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  confidence: number;
  reasoning?: string;
  source: string;
  memo?: string;
  createdAt: string;
}

// Serviço simples de salvamento em SQLite
export class SQLiteSaveService {
  private static instance: SQLiteSaveService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'financeiro-aldo-db';
  private readonly STORE_NAME = 'transactions';

  private constructor() {}

  public static getInstance(): SQLiteSaveService {
    if (!SQLiteSaveService.instance) {
      SQLiteSaveService.instance = new SQLiteSaveService();
    }
    return SQLiteSaveService.instance;
  }

  // Inicializar o banco de dados
  async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => {
        log.error({ err: request.error }, 'Error opening IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        log.info('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Criar object store se não existir
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id',
            autoIncrement: false
          });

          // Criar índices para busca
          store.createIndex('fileName', 'fileName', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('amount', 'amount', { unique: false });
        }
      };
    });
  }

  // Salvar múltiplas transações
  async saveTransactions(transactions: any[], fileName: string, bankName?: string): Promise<void> {
    await this.initDB();

    if (!this.db) {
      throw new Error('Banco de dados não inicializado');
    }

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    const savedTransactions: SavedTransaction[] = transactions.map(tx => ({
      id: `${tx.id || tx.fitid || ''}_${Date.now()}`,
      fileName,
      bankName,
      date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.amount > 0 ? 'credit' : 'debit',
      category: tx.category || 'Não classificado',
      confidence: tx.confidence || 0,
      reasoning: tx.reasoning,
      source: tx.source || 'unknown',
      memo: tx.memo,
      createdAt: new Date().toISOString()
    }));

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        log.info({ count: savedTransactions.length }, 'Transactions saved successfully');
        resolve();
      };

      transaction.onerror = () => {
        log.error({ err: transaction.error }, 'Error saving transactions');
        reject(transaction.error);
      };

      // Salvar cada transação
      savedTransactions.forEach(savedTx => {
        store.put(savedTx);
      });
    });
  }

  // Obter todas as transações
  async getAllTransactions(): Promise<SavedTransaction[]> {
    await this.initDB();

    if (!this.db) {
      throw new Error('Banco de dados não inicializado');
    }

    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const transactions = request.result || [];
        // Ordenar por data (mais recentes primeiro)
        const sorted = transactions.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        resolve(sorted);
      };

      request.onerror = () => {
        log.error({ err: request.error }, 'Error getting transactions');
        reject(request.error);
      };
    });
  }

  // Obter transações por arquivo
  async getTransactionsByFile(fileName: string): Promise<SavedTransaction[]> {
    await this.initDB();

    if (!this.db) {
      throw new Error('Banco de dados não inicializado');
    }

    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const index = store.index('fileName');
      const request = index.getAll(fileName);

      request.onsuccess = () => {
        const transactions = request.result || [];
        // Ordenar por data
        const sorted = transactions.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        resolve(sorted);
      };

      request.onerror = () => {
        log.error({ err: request.error, fileName }, 'Error getting transactions by file');
        reject(request.error);
      };
    });
  }

  // Obter estatísticas
  async getStatistics(): Promise<{
    totalTransactions: number;
    totalAmount: number;
    categoryDistribution: Record<string, number>;
    averageConfidence: number;
  }> {
    const transactions = await this.getAllTransactions();

    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalAmount: 0,
        categoryDistribution: {},
        averageConfidence: 0
      };
    }

    const categoryDistribution = transactions.reduce((stats, tx) => {
      stats[tx.category] = (stats[tx.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const totalAmount = Math.abs(transactions.reduce((sum, tx) => sum + tx.amount, 0));
    const averageConfidence = transactions.reduce((sum, tx) => sum + tx.confidence, 0) / transactions.length;

    return {
      totalTransactions: transactions.length,
      totalAmount,
      categoryDistribution,
      averageConfidence
    };
  }

  // Limpar todas as transações
  async clearAllTransactions(): Promise<void> {
    await this.initDB();

    if (!this.db) {
      throw new Error('Banco de dados não inicializado');
    }

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        log.info('All transactions cleared');
        resolve();
      };

      request.onerror = () => {
        log.error({ err: request.error }, 'Error clearing transactions');
        reject(request.error);
      };
    });
  }

  // Exportar transações para JSON
  async exportTransactions(): Promise<string> {
    const transactions = await this.getAllTransactions();
    return JSON.stringify(transactions, null, 2);
  }
}