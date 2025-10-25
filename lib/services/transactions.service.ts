import { db } from '@/lib/db/connection';
import { transactions, accounts, companies, categories, uploads } from '@/lib/db/schema';
import { eq, and, desc, between, gte, lte, sql } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany, getDefaultAccount } from '@/lib/db/init-db';

export interface TransactionFilters {
  accountId?: string;
  companyId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  type?: 'credit' | 'debit';
  category?: string;
  search?: string;
  verified?: boolean;
}

export interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  totalCredits: number;
  totalDebits: number;
  averageTransaction: number;
  categoryDistribution: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    credits: number;
    debits: number;
    balance: number;
  }>;
}

export class TransactionsService {
  private static instance: TransactionsService;

  private constructor() {}

  public static getInstance(): TransactionsService {
    if (!TransactionsService.instance) {
      TransactionsService.instance = new TransactionsService();
    }
    return TransactionsService.instance;
  }

  /**
   * Listar transações com filtros
   */
  async getTransactions(filters: TransactionFilters & {
    page?: number;
    limit?: number;
  } = {}) {
    try {
      await initializeDatabase();

      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      console.log('📊 [TRANSACTIONS-SERVICE] Listando transações:', filters);

      // Construir query principal
      let query = db.select({
        id: transactions.id,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        uploadId: transactions.uploadId,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        balanceAfter: transactions.balanceAfter,
        rawDescription: transactions.rawDescription,
        metadata: transactions.metadata,
        manuallyCategorized: transactions.manuallyCategorized,
        verified: transactions.verified,
        confidence: transactions.confidence,
        reasoning: transactions.reasoning,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        accountName: accounts.name,
        bankName: accounts.bankName,
        companyName: companies.name,
        categoryName: categories.name,
        categoryType: categories.type,
        categoryColor: categories.colorHex,
        uploadFilename: uploads.filename,
        uploadOriginalName: uploads.originalName
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(companies, eq(accounts.companyId, companies.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(uploads, eq(transactions.uploadId, uploads.id));

      // Aplicar filtros
      const conditions = [];

      if (filters.accountId) {
        conditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId) {
        conditions.push(eq(accounts.companyId, filters.companyId));
      }

      if (filters.categoryId) {
        conditions.push(eq(transactions.categoryId, filters.categoryId));
      }

      if (filters.type) {
        conditions.push(eq(transactions.type, filters.type));
      }

      if (filters.verified !== undefined) {
        conditions.push(eq(transactions.verified, filters.verified));
      }

      if (filters.startDate && filters.endDate) {
        conditions.push(between(transactions.transactionDate, filters.startDate, filters.endDate));
      } else if (filters.startDate) {
        conditions.push(gte(transactions.transactionDate, filters.startDate));
      } else if (filters.endDate) {
        conditions.push(lte(transactions.transactionDate, filters.endDate));
      }

      if (filters.search) {
        conditions.push(
          sql`(LOWER(${transactions.description}) LIKE ${`%${filters.search.toLowerCase()}%`} OR LOWER(${transactions.rawDescription}) LIKE ${`%${filters.search.toLowerCase()}%`})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(
          conditions.length === 1
            ? conditions[0]
            : // @ts-ignore
              conditions.reduce((acc, condition) => acc && condition)
        );
      }

      // Ordenação e paginação
      query = query
        .orderBy(desc(transactions.transactionDate))
        .limit(limit)
        .offset(offset);

      const transactionsList = await query;

      // Contar total para paginação
      let countQuery = db.select({ count: sql<number>`count(*)` })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id));

      if (conditions.length > 0) {
        countQuery = countQuery.where(
          conditions.length === 1
            ? conditions[0]
            : // @ts-ignore
              conditions.reduce((acc, condition) => acc && condition)
        );
      }

      const [countResult] = await countQuery;
      const total = countResult?.count || 0;

      console.log(`✅ Encontradas ${transactionsList.length} transações (total: ${total})`);

      return {
        transactions: transactionsList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      console.error('❌ Erro ao listar transações:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas das transações
   */
  async getTransactionStats(filters: TransactionFilters = {}): Promise<TransactionStats> {
    try {
      await initializeDatabase();

      console.log('📈 [TRANSACTIONS-SERVICE] Calculando estatísticas:', filters);

      let query = db.select({
        totalTransactions: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(CAST(${transactions.amount} AS NUMERIC))`,
        incomeValue: sql<number>`sum(CASE WHEN CAST(${transactions.amount} AS NUMERIC) > 0 THEN CAST(${transactions.amount} AS NUMERIC) ELSE 0 END)`,
        expensesValue: sql<number>`sum(CASE WHEN CAST(${transactions.amount} AS NUMERIC) < 0 THEN abs(CAST(${transactions.amount} AS NUMERIC)) ELSE 0 END)`,
        incomeCount: sql<number>`count(*) FILTER (WHERE CAST(${transactions.amount} AS NUMERIC) > 0)`,
        expenseCount: sql<number>`count(*) FILTER (WHERE CAST(${transactions.amount} AS NUMERIC) < 0)`
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id));

      // Aplicar filtros
      const conditions = [];

      if (filters.accountId) {
        conditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId) {
        conditions.push(eq(accounts.companyId, filters.companyId));
      }

      if (filters.type) {
        conditions.push(eq(transactions.type, filters.type));
      }

      if (filters.startDate && filters.endDate) {
        conditions.push(between(transactions.transactionDate, filters.startDate, filters.endDate));
      } else if (filters.startDate) {
        conditions.push(gte(transactions.transactionDate, filters.startDate));
      } else if (filters.endDate) {
        conditions.push(lte(transactions.transactionDate, filters.endDate));
      }

      if (conditions.length > 0) {
        query = query.where(
          conditions.length === 1
            ? conditions[0]
            : // @ts-ignore
              conditions.reduce((acc, condition) => acc && condition)
        );
      }

      const [stats] = await query;

      // Obter distribuição por categoria
      let categoryQuery = db.select({
        categoryName: categories.name,
        categoryType: categories.type,
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(abs(CAST(${transactions.amount} AS NUMERIC)))`
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id));

      if (conditions.length > 0) {
        categoryQuery = categoryQuery.where(
          conditions.length === 1
            ? conditions[0]
            : // @ts-ignore
              conditions.reduce((acc, condition) => acc && condition)
        );
      }

      categoryQuery = categoryQuery
        .groupBy(categories.id, categories.name, categories.type)
        .orderBy(sql`count(*) DESC`);

      const categoryDistribution = await categoryQuery;

      // Converter para formato esperado
      const distribution: Record<string, number> = {};
      categoryDistribution.forEach(cat => {
        distribution[cat.categoryName || 'Não classificado'] = cat.count;
      });

      // Obter tendência mensal (últimos 6 meses)
      const monthlyTrend = await this.getMonthlyTrend(filters);

      return {
        totalTransactions: stats?.totalTransactions || 0,
        totalAmount: Number(stats?.totalAmount) || 0,
        totalCredits: stats?.incomeCount || 0,
        totalDebits: stats?.expenseCount || 0,
        totalCreditsValue: Number(stats?.incomeValue) || 0,
        totalDebitsValue: Number(stats?.expensesValue) || 0,
        averageTransaction: stats?.totalTransactions ? Number(stats?.totalAmount) / stats.totalTransactions : 0,
        categoryDistribution: distribution,
        monthlyTrend
      };

    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      throw error;
    }
  }

  /**
   * Obter tendência mensal
   */
  private async getMonthlyTrend(filters: TransactionFilters = {}): Promise<TransactionStats['monthlyTrend']> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      let query = db.select({
        month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
        credits: sql<number>`sum(CASE WHEN ${transactions.type} = 'credit' THEN abs(CAST(${transactions.amount} AS NUMERIC)) ELSE 0 END)`,
        debits: sql<number>`sum(CASE WHEN ${transactions.type} = 'debit' THEN abs(CAST(${transactions.amount} AS NUMERIC)) ELSE 0 END)`
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(gte(transactions.transactionDate, sixMonthsAgo.toISOString().split('T')[0]))
      .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

      // Aplicar filtros adicionais
      const conditions = [];

      if (filters.accountId) {
        conditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId) {
        conditions.push(eq(accounts.companyId, filters.companyId));
      }

      if (filters.type) {
        conditions.push(eq(transactions.type, filters.type));
      }

      if (conditions.length > 0) {
        query = query.where(
          conditions.length === 1
            ? conditions[0]
            : // @ts-ignore
              conditions.reduce((acc, condition) => acc && condition)
        );
      }

      const results = await query;

      return results.map(item => ({
        month: item.month,
        credits: Number(item.credits),
        debits: Number(item.debits),
        balance: Number(item.credits) - Number(item.debits)
      }));

    } catch (error) {
      console.error('❌ Erro ao obter tendência mensal:', error);
      return [];
    }
  }

  /**
   * Obter transações por upload
   */
  async getTransactionsByUpload(uploadId: string) {
    return this.getTransactions({ uploadId: uploadId as any });
  }

  /**
   * Obter transações recentes
   */
  async getRecentTransactions(limit = 10) {
    return this.getTransactions({ limit, page: 1 });
  }
}

export default TransactionsService.getInstance();