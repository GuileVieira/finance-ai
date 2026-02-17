import { db } from '@/lib/db/connection';
import { transactions, accounts, companies, categories, uploads, transactionSplits, type NewTransactionSplit } from '@/lib/db/schema';
import { eq, and, desc, between, gte, lte, sql, not, ilike } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany, getDefaultAccount } from '@/lib/db/init-db';
import { getFinancialExclusionClause } from './financial-exclusion';
import { createLogger } from '@/lib/logger';

const log = createLogger('transactions');

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
  uploadId?: string;
  categoryType?: string;
  userId?: string;
}

export interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  totalCredits: number;
  totalDebits: number;
  totalCreditsValue: number;
  totalDebitsValue: number;
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

  private constructor() { }

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
    const { userId, ...cleanFilters } = filters;

    const execute = async (tx: any) => {
      try {
        await initializeDatabase();

        const page = cleanFilters.page || 1;
        const limit = cleanFilters.limit || 50;
        const offset = (page - 1) * limit;

        log.info({ filters: cleanFilters }, 'Listing transactions');

        // Construir query principal
        let query: any = tx.select({
        id: transactions.id,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        uploadId: transactions.uploadId,
        description: transactions.description,
        name: transactions.name,
        memo: transactions.memo,
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
        uploadOriginalName: uploads.originalName,
        // Adicionar informação de split
        splitCount: sql<number>`(SELECT count(*) FROM ${transactionSplits} WHERE ${transactionSplits.transactionId} = ${transactions.id})`,
        splits: sql<any>`(
          SELECT json_agg(
            json_build_object(
              'id', ${transactionSplits.id},
              'amount', ${transactionSplits.amount},
              'categoryId', ${transactionSplits.categoryId},
              'categoryName', ${categories.name},
              'categoryColor', ${categories.colorHex},
              'description', ${transactionSplits.description}
            )
          )
          FROM ${transactionSplits}
          LEFT JOIN ${categories} ON ${transactionSplits.categoryId} = ${categories.id}
          WHERE ${transactionSplits.transactionId} = ${transactions.id}
        )`
      })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(companies, eq(accounts.companyId, companies.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(uploads, eq(transactions.uploadId, uploads.id));

      // Aplicar filtros
      const conditions = [];

      if (filters.accountId && filters.accountId !== 'all') {
        conditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        conditions.push(eq(accounts.companyId, filters.companyId));
      }

      if (filters.categoryId && filters.categoryId !== 'all') {
        conditions.push(sql`(
          ${transactions.categoryId} = ${filters.categoryId}
          OR EXISTS (
            SELECT 1 FROM ${transactionSplits}
            WHERE ${transactionSplits.transactionId} = ${transactions.id}
            AND ${transactionSplits.categoryId} = ${filters.categoryId}
          )
        )`);
      }

      if (filters.type && (filters.type as string) !== 'all') {
        conditions.push(eq(transactions.type, filters.type));
      }

      if (filters.categoryType && filters.categoryType !== 'all') {
        conditions.push(eq(categories.type, filters.categoryType));
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
          sql`(
            LOWER(${transactions.description}) LIKE ${`%${filters.search.toLowerCase()}%`} 
            OR LOWER(${transactions.rawDescription}) LIKE ${`%${filters.search.toLowerCase()}%`}
            OR EXISTS (
              SELECT 1 FROM ${transactionSplits}
              WHERE ${transactionSplits.transactionId} = ${transactions.id}
              AND LOWER(${transactionSplits.description}) LIKE ${`%${filters.search.toLowerCase()}%`}
            )
          )`
        );
      }

      // Exclude "Saldo" and "Transferência" from the main list view
      conditions.push(getFinancialExclusionClause());

      if (conditions.length > 0) {
        query = query.where(
          conditions.length === 1
            ? conditions[0]
            : and(...conditions)
        );
      }

      // Ordenação e paginação
      query = query
        .orderBy(desc(transactions.transactionDate))
        .limit(limit)
        .offset(offset);

      const transactionsList = await query;

      // Contar total para paginação
      let countQuery: any = tx.select({ count: sql<number>`count(*)` })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id));

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

      log.info({ count: transactionsList.length, total }, 'Transactions found');

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
      log.error({ err: error }, 'Error listing transactions');
      throw error;
    }
  };

  if (userId) {
    const { withUser } = await import('@/lib/db/connection');
    return withUser(userId, execute);
  }
  return execute(db);
}

  /**
   * Obter estatísticas das transações
   */
  async getTransactionStats(filters: TransactionFilters = {}): Promise<TransactionStats> {
    const { userId, ...cleanFilters } = filters;

    const execute = async (tx: any) => {
      try {
        await initializeDatabase();

        log.info({ filters: cleanFilters }, 'Calculating statistics');

        let query: any = tx.select({
        totalTransactions: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(CAST(${transactions.amount} AS NUMERIC))`,
        incomeValue: sql<number>`sum(CASE WHEN CAST(${transactions.amount} AS NUMERIC) > 0 THEN CAST(${transactions.amount} AS NUMERIC) ELSE 0 END)`,
        expensesValue: sql<number>`sum(CASE WHEN CAST(${transactions.amount} AS NUMERIC) < 0 THEN abs(CAST(${transactions.amount} AS NUMERIC)) ELSE 0 END)`,
        incomeCount: sql<number>`count(*) FILTER (WHERE CAST(${transactions.amount} AS NUMERIC) > 0)`,
        expenseCount: sql<number>`count(*) FILTER (WHERE CAST(${transactions.amount} AS NUMERIC) < 0)`
      })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id));

      // Aplicar filtros
      const conditions = [];

      if (cleanFilters.accountId && cleanFilters.accountId !== 'all') {
        conditions.push(eq(transactions.accountId, cleanFilters.accountId));
      }

      if (cleanFilters.companyId && cleanFilters.companyId !== 'all') {
        conditions.push(eq(accounts.companyId, cleanFilters.companyId));
      }

      if (cleanFilters.type && (cleanFilters.type as string) !== 'all') {
        conditions.push(eq(transactions.type, cleanFilters.type));
      }

      if (cleanFilters.categoryType && cleanFilters.categoryType !== 'all') {
        conditions.push(eq(categories.type, cleanFilters.categoryType));
      }

      if (cleanFilters.startDate && cleanFilters.endDate) {
        conditions.push(between(transactions.transactionDate, cleanFilters.startDate, cleanFilters.endDate));
      } else if (cleanFilters.startDate) {
        conditions.push(gte(transactions.transactionDate, cleanFilters.startDate));
      } else if (cleanFilters.endDate) {
        conditions.push(lte(transactions.transactionDate, cleanFilters.endDate));
      }

      if (conditions.length > 0) {
        query = query.where(
          conditions.length === 1
            ? conditions[0]
            : and(...conditions)
        );
      }

      // Exclude "Saldo" and "Transferência" (non-financial) from stats
      query = query.where(getFinancialExclusionClause());

      const [stats] = await query;

      // Obter distribuição por categoria
      let categoryQuery: any = tx.select({
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
      categoryDistribution.forEach((cat: any) => {
        distribution[cat.categoryName || 'Não classificado'] = cat.count;
      });

      // Obter tendência mensal (últimos 6 meses)
      const monthlyTrend = await this.getMonthlyTrend(cleanFilters, tx);

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
      log.error({ err: error }, 'Error calculating statistics');
      throw error;
    }
  };

  if (userId) {
    const { withUser } = await import('@/lib/db/connection');
    return withUser(userId, execute);
  }
  return execute(db);
}

  /**
   * Obter tendência mensal
   */
  private async getMonthlyTrend(filters: TransactionFilters = {}, tx: any = db): Promise<TransactionStats['monthlyTrend']> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Aplicar filtros adicionais
      const conditions = [];

      if (filters.accountId && filters.accountId !== 'all') {
        conditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        conditions.push(eq(accounts.companyId, filters.companyId));
      }

      if (filters.type && (filters.type as string) !== 'all') {
        conditions.push(eq(transactions.type, filters.type));
      }

      // Adicionar filtro de data (6 meses)
      conditions.push(gte(transactions.transactionDate, sixMonthsAgo.toISOString().split('T')[0]));

      let query: any = tx.select({
        month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
        credits: sql<number>`sum(CASE WHEN ${transactions.type} = 'credit' THEN abs(CAST(${transactions.amount} AS NUMERIC)) ELSE 0 END)`,
        debits: sql<number>`sum(CASE WHEN ${transactions.type} = 'debit' THEN abs(CAST(${transactions.amount} AS NUMERIC)) ELSE 0 END)`
      })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id));

      if (conditions.length > 0) {
        // @ts-ignore
        query = query.where(and(...conditions));
      }

      const queryWithGroup = query
        .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

      const results = await queryWithGroup;

      return results.map((item: any) => ({
        month: item.month,
        credits: Number(item.credits),
        debits: Number(item.debits),
        balance: Number(item.credits) - Number(item.debits)
      }));

    } catch (error) {
      log.error({ err: error }, 'Error getting monthly trend');
      return [];
    }
  }

  /**
   * Listar períodos disponíveis com base nas transações cadastradas
   */
  async getAvailablePeriods(filters: TransactionFilters = {}) {
    const { userId, ...cleanFilters } = filters;

    const execute = async (tx: any) => {
      try {
        await initializeDatabase();

        let query: any = tx
          .select({
            period: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
            startDate: sql<string>`min(${transactions.transactionDate})`,
            endDate: sql<string>`max(${transactions.transactionDate})`
          })
          .from(transactions)
          .leftJoin(accounts, eq(transactions.accountId, accounts.id));

        const conditions = [];

        if (cleanFilters.accountId && cleanFilters.accountId !== 'all') {
          conditions.push(eq(transactions.accountId, cleanFilters.accountId));
        }

        if (cleanFilters.companyId && cleanFilters.companyId !== 'all') {
          conditions.push(eq(accounts.companyId, cleanFilters.companyId));
        }

        if (cleanFilters.type && (cleanFilters.type as string) !== 'all') {
          conditions.push(eq(transactions.type, cleanFilters.type));
        }

        if (cleanFilters.startDate && cleanFilters.endDate) {
          conditions.push(between(transactions.transactionDate, cleanFilters.startDate, cleanFilters.endDate));
        } else if (cleanFilters.startDate) {
          conditions.push(gte(transactions.transactionDate, cleanFilters.startDate));
        } else if (cleanFilters.endDate) {
          conditions.push(lte(transactions.transactionDate, cleanFilters.endDate));
        }

        if (conditions.length > 0) {
          query = query.where(
            conditions.length === 1
              ? conditions[0]
              : and(...conditions)
          );
        }

        const results = await query
          .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM') DESC`);

        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        return results.map((result: any) => {
          const [year, month] = result.period.split('-');
          const monthIndex = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
          const label = `${monthNames[monthIndex]}/${year}`;

          return {
            id: result.period,
            label,
            startDate: result.startDate,
            endDate: result.endDate,
            type: 'month' as const,
          };
        });
      } catch (error) {
        log.error({ err: error }, 'Error getting available periods');
        return [];
      }
    };

    if (filters.userId) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(filters.userId, execute);
    }
    return execute(db);
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

  /**
   * Obter desmembramentos (splits) de uma transação
   */
  async getTransactionSplits(transactionId: string, userId?: string) {
    const execute = async (tx: any) => {
      try {
        await initializeDatabase();
        log.info({ transactionId }, 'Fetching splits for transaction');

        const splits = await tx.select({
          id: transactionSplits.id,
          transactionId: transactionSplits.transactionId,
          categoryId: transactionSplits.categoryId,
          amount: transactionSplits.amount,
          description: transactionSplits.description,
          categoryName: categories.name,
          categoryType: categories.type,
        })
        .from(transactionSplits)
        .leftJoin(categories, eq(transactionSplits.categoryId, categories.id))
        .where(eq(transactionSplits.transactionId, transactionId));

        return splits;
      } catch (error) {
        log.error({ err: error, transactionId }, 'Error fetching transaction splits');
        throw error;
      }
    };

    if (userId) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(userId, execute);
    }
    return execute(db);
  }

  /**
   * Atualizar/Definir desmembramentos (splits) de uma transação
   */
  async updateTransactionSplits(transactionId: string, splits: NewTransactionSplit[], userId?: string) {
    const execute = async (tx: any) => {
      try {
        await initializeDatabase();
        log.info({ transactionId }, 'Updating splits for transaction');

        // Executar em transação (tx já é uma transação se vier de withUser)
        // Se tx for db, precisamos abrir uma transação.
        // Drizzle db.transaction dentro de db.transaction é suportado (savespoints).
        
        const updateLogic = async (innerTx: any) => {
          // 1. Remover splits existentes
          await innerTx.delete(transactionSplits).where(eq(transactionSplits.transactionId, transactionId));

          // 2. Inserir novos splits (se houver)
          if (splits.length > 0) {
            await innerTx.insert(transactionSplits).values(splits.map(s => ({
              ...s,
              transactionId, // Garantir que o ID da transação esteja correto
            })));

            // 3. Marcar a transação como categorizada manualmente se houver splits
            await innerTx.update(transactions)
              .set({ 
                manuallyCategorized: true,
                updatedAt: new Date(),
              })
              .where(eq(transactions.id, transactionId));
          }
        };

        if (tx === db) {
          await tx.transaction(updateLogic);
        } else {
          await updateLogic(tx);
        }

        return { success: true };
      } catch (error) {
        log.error({ err: error, transactionId }, 'Error updating transaction splits');
        throw error;
      }
    };

    if (userId) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(userId, execute);
    }
    return execute(db);
  }
}

export default TransactionsService.getInstance();
