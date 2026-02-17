import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts, companies, transactionSplits } from '@/lib/db/schema';
import {
  DashboardFilters,
  DashboardData,
  DashboardMetrics,
  CategorySummary,
  TrendData,
  TopExpense
} from '@/lib/api/dashboard';
import { eq, and, gte, lte, lt, desc, sum, count, avg, sql, not, ilike } from 'drizzle-orm';
import { Transaction } from '@/lib/db/schema';
import { getFinancialExclusionClause } from './financial-exclusion';
import { createLogger } from '@/lib/logger';

const log = createLogger('dashboard');

export default class DashboardService {
  /**
   * Função utilitária para capitalizar texto (Title Case)
   * Transforma "OUTRAS DESPESAS NOP" em "Outras Despesas Nop"
   */
  private static capitalizeText(text: string): string {
    if (!text) return text;

    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Verifica se uma string é um UUID válido
   */
  private static isUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  /**
   * Adiciona condições de filtro de conta/banco ao array de whereConditions
   */
  private static addAccountFilters(
    whereConditions: ReturnType<typeof eq>[],
    filters: DashboardFilters
  ): void {
    if (filters.accountId && filters.accountId !== 'all') {
      if (this.isUUID(filters.accountId)) {
        log.info({ accountId: filters.accountId }, 'Filtro accountId (UUID)');
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      } else {
        log.info({ bankName: filters.accountId }, 'Filtro bankName (do accountId)');
        whereConditions.push(eq(accounts.bankName, filters.accountId));
      }
    }

    if (filters.bankName && filters.bankName !== 'all') {
      log.info({ bankName: filters.bankName }, 'Filtro bankName');
      whereConditions.push(eq(accounts.bankName, filters.bankName));
    }

    if (filters.companyId && filters.companyId !== 'all') {
      log.info({ companyId: filters.companyId }, 'Filtro companyId');
      whereConditions.push(eq(accounts.companyId, filters.companyId));
    }
  }

  /**
   * Retorna condições de filtro de conta/banco para uso inline
   */
  private static getAccountFilterConditions(filters: DashboardFilters): (ReturnType<typeof eq> | undefined)[] {
    const conditions: (ReturnType<typeof eq> | undefined)[] = [];

    if (filters.accountId && filters.accountId !== 'all') {
      if (this.isUUID(filters.accountId)) {
        conditions.push(sql`combined_transactions.account_id = ${filters.accountId}` as any);
      } else {
        conditions.push(eq(accounts.bankName, filters.accountId));
      }
    }

    if (filters.bankName && filters.bankName !== 'all') {
      conditions.push(eq(accounts.bankName, filters.bankName));
    }

    if (filters.companyId && filters.companyId !== 'all') {
      conditions.push(eq(accounts.companyId, filters.companyId));
    }

    return conditions;
  }

  /**
   * Retorna todas as condições de filtro formatadas para o subquery combined_transactions
   */
  private static getCombinedWhereConditions(filters: DashboardFilters): any[] {
    const conditions: any[] = [];

    if (filters.startDate) {
      conditions.push(sql`combined_transactions.transaction_date >= ${filters.startDate}`);
    }

    if (filters.endDate) {
      conditions.push(sql`combined_transactions.transaction_date <= ${filters.endDate}`);
    }

    // Filtros de conta/banco/empresa
    if (filters.accountId && filters.accountId !== 'all') {
      if (this.isUUID(filters.accountId)) {
        conditions.push(sql`combined_transactions.account_id = ${filters.accountId}`);
      } else {
        conditions.push(eq(accounts.bankName, filters.accountId));
      }
    }

    if (filters.bankName && filters.bankName !== 'all') {
      conditions.push(eq(accounts.bankName, filters.bankName));
    }

    if (filters.companyId && filters.companyId !== 'all') {
      conditions.push(eq(accounts.companyId, filters.companyId));
    }

    return conditions;
  }

  /**
   * Verifica se o banco de dados está disponível
   */
  private static checkDatabaseConnection(): void {
    if (!db) {
      throw new Error('Banco de dados não está disponível. Verifique a configuração do DATABASE_URL.');
    }
  }

  /**
   * Helper para obter a query de transações combinadas (normais + splits)
   */
  private static getCombinedTransactionsSubquery() {
    return sql`(
      -- Transações que NÃO possuem desmembramentos
      SELECT 
        t.id as transaction_id,
        t.category_id as category_id,
        t.amount as amount_to_sum,
        t.type as type_to_sum,
        t.transaction_date,
        t.account_id,
        t.description
      FROM ${transactions} t
      WHERE t.id NOT IN (SELECT transaction_id FROM ${transactionSplits})
      
      UNION ALL
      
      -- Desmembramentos individuais
      SELECT 
        ts.transaction_id,
        ts.category_id,
        ts.amount as amount_to_sum,
        t.type as type_to_sum,
        t.transaction_date,
        t.account_id,
        COALESCE(ts.description, t.description) as description
      FROM ${transactionSplits} ts
      JOIN ${transactions} t ON ts.transaction_id = t.id
    ) as combined_transactions`;
  }

  /**
   * Buscar métricas principais do dashboard
   */
  static async getMetrics(filters: DashboardFilters = {}, tx: any = db): Promise<DashboardMetrics> {
    const { userId, ...cleanFilters } = filters;
    const execute = async (innerTx: any) => {
      try {
        log.info({ filters: cleanFilters }, 'DashboardService.getMetrics chamado');

        // Proteção contra datas absurdas
        if (cleanFilters.startDate) {
          const startYear = parseInt(cleanFilters.startDate.split('-')[0]);
          if (startYear < 2000 || startYear > 2100) {
            log.error({ startDate: cleanFilters.startDate }, 'Data inicial invalida');
            throw new Error('Data inicial inválida');
          }
        }

        if (cleanFilters.endDate) {
          const endYear = parseInt(cleanFilters.endDate.split('-')[0]);
          if (endYear < 2000 || endYear > 2100) {
            log.error({ endDate: cleanFilters.endDate }, 'Data final invalida');
            throw new Error('Data final inválida');
          }
        }

        this.checkDatabaseConnection();

        // Construir where clause
        const combinedConditions = this.getCombinedWhereConditions(cleanFilters);
        const whereClause = and(...combinedConditions);
        log.info({ conditionCount: combinedConditions.length, hasFilters: !!whereClause }, 'WhereClause final');

        // Métricas principais
        const metricsResult = await innerTx
          .select({
            totalIncome: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE 0 END`).mapWith(Number),
            totalExpenses: sum(sql`CASE WHEN type_to_sum = 'debit' THEN ABS(amount_to_sum) ELSE 0 END`).mapWith(Number),
            transactionCount: count(sql`transaction_id`).mapWith(Number),
            incomeCount: count(sql`CASE WHEN type_to_sum = 'credit' THEN 1 END`).mapWith(Number),
            expenseCount: count(sql`CASE WHEN type_to_sum = 'debit' THEN 1 END`).mapWith(Number),
            averageTicket: avg(sql`ABS(amount_to_sum)`).mapWith(Number),
          })
          .from(this.getCombinedTransactionsSubquery())
          .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
          .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
          .where(
            and(
              whereClause,
              getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
            )
          );

        const metrics = metricsResult[0];

        // Calcular saldo e taxa de crescimento
        const netBalance = (metrics.totalIncome || 0) - (metrics.totalExpenses || 0);

        // Buscar comparações com o período anterior
        const comparisons = await this.calculateAllComparisons(cleanFilters, userId, innerTx);

        // Garante que o valor tenha no máximo 2 casas decimais
        const formatToTwoDecimals = (value: number | null | undefined): number => {
          if (!value) return 0;
          return Math.round(value * 100) / 100;
        };

        return {
          totalIncome: formatToTwoDecimals(metrics.totalIncome),
          totalExpenses: formatToTwoDecimals(metrics.totalExpenses),
          netBalance: formatToTwoDecimals(netBalance),
          transactionCount: metrics.transactionCount || 0,
          incomeCount: metrics.incomeCount || 0,
          expenseCount: metrics.expenseCount || 0,
          averageTicket: formatToTwoDecimals(metrics.averageTicket),
          growthRate: comparisons.growthRate,
          expensesGrowthRate: comparisons.expensesGrowthRate,
          balanceGrowthRate: comparisons.balanceGrowthRate,
          transactionsGrowthRate: comparisons.transactionsGrowthRate
        };

      } catch (error) {
        log.error({ err: error }, 'Error getting dashboard metrics');
        throw new Error('Failed to fetch dashboard metrics');
      }
    };

    if (userId && tx === db) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(userId, execute);
    }
    return execute(tx);
  }

  /**
   * Buscar resumo de categorias
   */
  static async getCategorySummary(filters: DashboardFilters = {}, tx: any = db): Promise<CategorySummary[]> {
    const { userId, ...cleanFilters } = filters;
    const execute = async (innerTx: any) => {
      try {
        this.checkDatabaseConnection();
        const whereClause = and(...this.getCombinedWhereConditions(cleanFilters));

        // Buscar totais por categoria
        const categoryTotals = await innerTx
          .select({
            categoryId: sql`combined_transactions.category_id`,
            categoryName: categories.name,
            categoryType: categories.type,
            colorHex: categories.colorHex,
            icon: categories.icon,
            totalAmount: sum(sql`ABS(amount_to_sum)`).mapWith(Number),
            transactionCount: count(sql`transaction_id`).mapWith(Number),
          })
          .from(this.getCombinedTransactionsSubquery())
          .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
          .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
          .where(
            and(
              whereClause,
              getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
            )
          )
          .groupBy(sql`combined_transactions.category_id`, categories.name, categories.type, categories.colorHex, categories.icon);
        // Removendo ORDER BY para evitar erro de GROUP BY
        // .orderBy(desc(sql`ABS(${transactions.amount})`));

        // Calcular total geral para porcentagens
        const totalAmount = categoryTotals.reduce((sum: number, cat: any) => sum + (cat.totalAmount || 0), 0);

        // Formatar resultado e ordenar por totalAmount (maior primeiro)
        return categoryTotals
          .filter((cat: any) => cat.categoryId) // Remover categorias nulas
          .map((cat: any) => ({
            id: cat.categoryId!,
            name: cat.categoryName || 'Sem Categoria',
            type: cat.categoryType || 'unknown',
            totalAmount: cat.totalAmount || 0,
            transactionCount: cat.transactionCount || 0,
            percentage: totalAmount > 0 ? (cat.totalAmount || 0) / totalAmount * 100 : 0,
            color: cat.colorHex || '#6366F1',
            icon: cat.icon || '📊',
          }))
          .sort((a: any, b: any) => b.totalAmount - a.totalAmount); // Ordenar por valor total (maior primeiro)

      } catch (error) {
        log.error({ err: error }, 'Error getting category summary');
        throw new Error('Failed to fetch category summary');
      }
    };

    if (userId && tx === db) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(userId, execute);
    }
    return execute(tx);
  }

  /**
   * Buscar dados de tendência para gráficos
   */
  static async getTrendData(filters: DashboardFilters = {}, tx: any = db): Promise<TrendData[]> {
    const { userId, ...cleanFilters } = filters;
    const execute = async (innerTx: any) => {
      try {
        this.checkDatabaseConnection();
        const whereClause = and(...this.getCombinedWhereConditions(cleanFilters));

        // Buscar saldo inicial real (último balance_after antes do período)
        const openingBalance = await this.getOpeningBalanceForTrend(cleanFilters, innerTx);

        // Agrupar por dia
        const dailyData = await innerTx
          .select({
            date: sql`combined_transactions.transaction_date`,
            income: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE 0 END`).mapWith(Number),
            expenses: sum(sql`CASE WHEN type_to_sum = 'debit' THEN ABS(amount_to_sum) ELSE 0 END`).mapWith(Number),
            transactions: count(sql`transaction_id`).mapWith(Number),
          })
          .from(this.getCombinedTransactionsSubquery())
          .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
          .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
          .where(
            and(
              whereClause,
              getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
            )
          )
          .groupBy(sql`combined_transactions.transaction_date`)
          .orderBy(sql`combined_transactions.transaction_date`);

        // Calcular saldo cumulativo partindo do saldo real da conta
        let runningBalance = openingBalance;
        return dailyData.map((day: { date: string; income: number; expenses: number; transactions: number }, index: number) => {
          runningBalance += (day.income || 0) - (day.expenses || 0);
          const result: TrendData = {
            date: day.date,
            income: day.income || 0,
            expenses: day.expenses || 0,
            balance: runningBalance,
            transactions: day.transactions || 0,
          };
          // Incluir openingBalance apenas no primeiro item
          if (index === 0) {
            result.openingBalance = openingBalance;
          }
          return result;
        });

      } catch (error) {
        log.error({ err: error }, 'Error getting trend data');
        throw new Error('Failed to fetch trend data');
      }
    };

    if (userId && tx === db) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(userId, execute);
    }
    return execute(tx);
  }

  /**
   * Buscar saldo inicial para o gráfico de tendências.
   * Retorna o último balance_after de transação anterior ao período filtrado.
   * Quando period=all ou sem filtro de data, retorna 0.
   */
  private static async getOpeningBalanceForTrend(
    filters: Omit<DashboardFilters, 'userId'>,
    tx: typeof db
  ): Promise<number> {
    try {
      // Sem filtro de data = sem saldo inicial (partimos de 0)
      if (!filters.startDate) {
        return 0;
      }

      const whereConditions: ReturnType<typeof eq>[] = [
        lt(transactions.transactionDate, filters.startDate) as ReturnType<typeof eq>,
      ];

      if (filters.accountId && filters.accountId !== 'all') {
        if (this.isUUID(filters.accountId)) {
          whereConditions.push(eq(transactions.accountId, filters.accountId));
        } else {
          whereConditions.push(eq(accounts.bankName, filters.accountId));
        }
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = and(
        ...whereConditions,
        getFinancialExclusionClause()
      );

      const latestBalance = await tx
        .select({
          balance: transactions.balanceAfter,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(whereClause || undefined)
        .orderBy(desc(transactions.transactionDate))
        .limit(1);

      return latestBalance[0]?.balance ? Number(latestBalance[0].balance) : 0;
    } catch (error) {
      log.error({ err: error }, 'Error getting opening balance for trend');
      return 0;
    }
  }

  /**
   * Buscar top despesas
   */
  static async getTopExpenses(filters: DashboardFilters = {}, limit: number = 10, tx: any = db): Promise<TopExpense[]> {
    const { userId, ...cleanFilters } = filters;
    const execute = async (innerTx: any) => {
      try {
        this.checkDatabaseConnection();
        const whereClause = and(
          sql`combined_transactions.type_to_sum = 'debit'`,
          ...this.getCombinedWhereConditions(cleanFilters)
        );

        const topExpenses = await innerTx
          .select({
            id: sql`transaction_id`,
            description: sql`combined_transactions.description`,
            amount: sql`amount_to_sum`,
            category: categories.name,
            date: sql`combined_transactions.transaction_date`,
            accountName: accounts.bankName,
          })
          .from(this.getCombinedTransactionsSubquery())
          .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
          .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
          .where(
            and(
              whereClause,
              getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
            )
          )
          .orderBy(desc(sql`ABS(amount_to_sum)`))
          .limit(limit);

        return topExpenses.map((expense: any) => ({
          id: expense.id,
          description: expense.description || 'Sem Descrição',
          amount: Math.abs(Number(expense.amount) || 0),
          category: expense.category || 'Sem Categoria',
          date: expense.date,
          accountName: expense.accountName || 'Banco Não Identificado',
        }));

      } catch (error) {
        log.error({ err: error }, 'Error getting top expenses');
        throw new Error('Failed to fetch top expenses');
      }
    };

    if (userId && tx === db) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(userId, execute);
    }
    return execute(tx);
  }

  /**
   * Buscar transações recentes
   */
  static async getRecentTransactions(filters: DashboardFilters = {}, limit: number = 10, tx: any = db): Promise<Transaction[]> {
    const { userId, ...cleanFilters } = filters;
    const execute = async (innerTx: any) => {
      try {
        this.checkDatabaseConnection();
        const whereClause = and(...this.getCombinedWhereConditions(cleanFilters));

        const recentTransactions = await innerTx
          .select({
            id: sql`transaction_id`,
            accountId: sql`combined_transactions.account_id`,
            categoryId: sql`combined_transactions.category_id`,
            description: sql`combined_transactions.description`,
            amount: sql`amount_to_sum`,
            type: sql`type_to_sum`,
            transactionDate: sql`combined_transactions.transaction_date`,
            // Adicionar campos da categoria
            categoryName: categories.name,
            categoryType: categories.type,
            categoryColor: categories.colorHex,
            categoryIcon: categories.icon
          })
          .from(this.getCombinedTransactionsSubquery())
          .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
          .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
          .where(
            and(
              whereClause,
              getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
            )
          )
          .orderBy(desc(sql`combined_transactions.transaction_date`))
          .limit(limit);

        // Adicionar campos necessários para satisfazer o tipo Transaction
        return recentTransactions.map((transaction: any) => {
          return {
            id: transaction.id,
            name: transaction.description || 'Sem descrição',
            description: transaction.description || 'Sem descrição',
            memo: null,
            amount: transaction.amount,
            type: transaction.type,
            transactionDate: transaction.transactionDate,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
            uploadId: null,
            rawDescription: transaction.description,
            categorizationSource: 'ai',
            ruleId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            categoryName: transaction.categoryName
              ? this.capitalizeText(transaction.categoryName)
              : 'Sem Categoria'
          } as any;
        });

      } catch (error) {
        log.error({ err: error }, 'Error getting recent transactions');
        throw new Error('Failed to fetch recent transactions');
      }
    };

    if (userId && tx === db) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(userId, execute);
    }
    return execute(tx);
  }

  /**
   * Buscar dados completos do dashboard
   */
  static async getDashboardData(filters: DashboardFilters = {}): Promise<DashboardData> {
    const { userId } = filters;
    const execute = async (tx: any) => {
      try {
        // Buscar todos os dados em paralelo
        const [metrics, categorySummary, trendData, topExpenses, recentTransactions] = await Promise.all([
          this.getMetrics(filters, tx),
          this.getCategorySummary(filters, tx),
          this.getTrendData(filters, tx),
          this.getTopExpenses(filters, 10, tx),
          this.getRecentTransactions(filters, 10, tx)
        ]);

        return {
          metrics,
          categorySummary,
          trendData,
          topExpenses,
          recentTransactions,
        };

      } catch (error) {
        log.error({ err: error }, 'Error getting dashboard data');
        throw new Error('Failed to fetch dashboard data');
      }
    };

    if (userId) {
      const { withUser } = await import('@/lib/db/connection');
      return withUser(userId, execute);
    }
    return execute(db);
  }

  /**
   * Calcular comparações com o mês anterior usando SQL direto (sem recursão)
   */
  private static async calculateAllComparisons(filters: DashboardFilters, userId?: string, tx: any = db): Promise<{
    growthRate: number;
    expensesGrowthRate: number;
    balanceGrowthRate: number;
    transactionsGrowthRate: number;
  }> {
    const execute = async (innerTx: any) => {
      try {
      if (!filters.startDate || !filters.endDate) {
        return {
          growthRate: 0,
          expensesGrowthRate: 0,
          balanceGrowthRate: 0,
          transactionsGrowthRate: 0
        };
      }

      log.info('Calculando comparacoes com mes anterior...');

      // Calcular datas do mês anterior
      const currentDate = new Date(filters.endDate);
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      const previousStartDate = previousMonthStart.toISOString().split('T')[0];
      const previousEndDate = previousMonthEnd.toISOString().split('T')[0];

      log.info({ currentStart: filters.startDate, currentEnd: filters.endDate, previousStart: previousStartDate, previousEnd: previousEndDate }, 'Comparando periodos');

      // Obter condições de filtro de conta/banco
      const accountConditions = this.getAccountFilterConditions(filters);

      // Mês atual - SQL direto sem chamar getMetrics novamente
      const currentMetricsResult = await innerTx
        .select({
          totalIncome: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE 0 END`).mapWith(Number),
          totalExpenses: sum(sql`CASE WHEN type_to_sum = 'debit' THEN ABS(amount_to_sum) ELSE 0 END`).mapWith(Number),
          transactionCount: count(sql`transaction_id`).mapWith(Number),
        })
        .from(this.getCombinedTransactionsSubquery())
        .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
        .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
        .where(
          and(
            sql`combined_transactions.transaction_date >= ${filters.startDate!}`,
            sql`combined_transactions.transaction_date <= ${filters.endDate!}`,
            getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` }),
            ...accountConditions
          )
        );

      // Mês anterior - SQL direto
      const previousMetricsResult = await innerTx
        .select({
          totalIncome: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE 0 END`).mapWith(Number),
          totalExpenses: sum(sql`CASE WHEN type_to_sum = 'debit' THEN ABS(amount_to_sum) ELSE 0 END`).mapWith(Number),
          transactionCount: count(sql`transaction_id`).mapWith(Number),
        })
        .from(this.getCombinedTransactionsSubquery())
        .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
        .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
        .where(
          and(
            sql`combined_transactions.transaction_date >= ${previousStartDate}`,
            sql`combined_transactions.transaction_date <= ${previousEndDate}`,
            getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` }),
            ...accountConditions
          )
        );

      const currentMetrics = currentMetricsResult[0];
      const previousMetrics = previousMetricsResult[0];

      log.info({ currentMetrics }, 'Metricas atuais');
      log.info({ previousMetrics }, 'Metricas anteriores');

      // Função auxiliar para calcular taxa de crescimento
      const calculateGrowth = (current: number, previous: number): number => {
        if (!previous || previous === 0) return 0;
        const growth = ((current - previous) / previous) * 100;
        // Manter 2 casas decimais sem arredondamento excessivo
        return Math.round(growth * 100) / 100;
      };

      const currentBalance = (currentMetrics.totalIncome || 0) - (currentMetrics.totalExpenses || 0);
      const previousBalance = (previousMetrics.totalIncome || 0) - (previousMetrics.totalExpenses || 0);

      const comparisons = {
        growthRate: calculateGrowth(currentMetrics.totalIncome || 0, previousMetrics.totalIncome || 0),
        expensesGrowthRate: calculateGrowth(currentMetrics.totalExpenses || 0, previousMetrics.totalExpenses || 0),
        balanceGrowthRate: calculateGrowth(currentBalance, previousBalance),
        transactionsGrowthRate: calculateGrowth(currentMetrics.transactionCount || 0, previousMetrics.transactionCount || 0)
      };

      log.info({ comparisons }, 'Comparacoes calculadas');
      return comparisons;

    } catch (error) {
      log.error({ err: error }, 'Error calculating comparisons');
      return {
        growthRate: 0,
        expensesGrowthRate: 0,
        balanceGrowthRate: 0,
        transactionsGrowthRate: 0
      };
    }
  };

  if (userId && tx === db) {
    const { withUser } = await import('@/lib/db/connection');
    return withUser(userId, execute);
  }
  return execute(tx);
}

  /**
   * Calcular taxa de crescimento comparando com período anterior
   */
  private static async calculateGrowthRate(filters: DashboardFilters): Promise<number> {
    const comparisons = await this.calculateAllComparisons(filters);
    return comparisons.growthRate;
  }
}