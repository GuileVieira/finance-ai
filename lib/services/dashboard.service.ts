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
import { eq, and, gte, lte, desc, sum, count, avg, sql, not, ilike } from 'drizzle-orm';
import { Transaction } from '@/lib/db/schema';
import { getFinancialExclusionClause } from './financial-exclusion';

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
        console.log('🏦 Filtro accountId (UUID) =', filters.accountId);
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      } else {
        console.log('🏦 Filtro bankName (do accountId) =', filters.accountId);
        whereConditions.push(eq(accounts.bankName, filters.accountId));
      }
    }

    if (filters.bankName && filters.bankName !== 'all') {
      console.log('🏦 Filtro bankName =', filters.bankName);
      whereConditions.push(eq(accounts.bankName, filters.bankName));
    }

    if (filters.companyId && filters.companyId !== 'all') {
      console.log('🏢 Filtro companyId =', filters.companyId);
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
        console.log('🎯 DashboardService.getMetrics chamado com filtros:', cleanFilters);

        // Proteção contra datas absurdas
        if (cleanFilters.startDate) {
          const startYear = parseInt(cleanFilters.startDate.split('-')[0]);
          if (startYear < 2000 || startYear > 2100) {
            console.error('❌ Data inicial inválida:', cleanFilters.startDate);
            throw new Error('Data inicial inválida');
          }
        }

        if (cleanFilters.endDate) {
          const endYear = parseInt(cleanFilters.endDate.split('-')[0]);
          if (endYear < 2000 || endYear > 2100) {
            console.error('❌ Data final inválida:', cleanFilters.endDate);
            throw new Error('Data final inválida');
          }
        }

        this.checkDatabaseConnection();

        // Construir where clause
        const whereConditions = [];
        console.log('📋 Constru condições where...');

        if (cleanFilters.startDate) {
          console.log('📅 Adicionando filtro startDate >=', cleanFilters.startDate);
          whereConditions.push(sql`combined_transactions.transaction_date >= ${cleanFilters.startDate}`);
        }

        if (cleanFilters.endDate) {
          console.log('📅 Adicionando filtro endDate <=', cleanFilters.endDate);
          whereConditions.push(sql`combined_transactions.transaction_date <= ${cleanFilters.endDate}`);
        }

        // Usar função auxiliar para filtros de conta/banco
        if (cleanFilters.accountId && cleanFilters.accountId !== 'all') {
          if (this.isUUID(cleanFilters.accountId)) {
            whereConditions.push(sql`combined_transactions.account_id = ${cleanFilters.accountId}`);
          } else {
            whereConditions.push(eq(accounts.bankName, cleanFilters.accountId));
          }
        }

        if (cleanFilters.bankName && cleanFilters.bankName !== 'all') {
          whereConditions.push(eq(accounts.bankName, cleanFilters.bankName));
        }

        if (cleanFilters.companyId && cleanFilters.companyId !== 'all') {
          whereConditions.push(eq(accounts.companyId, cleanFilters.companyId));
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
        console.log('🔍 WhereClause final:', whereClause ? `${whereConditions.length} condições` : 'sem filtros');

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
        console.error('Error getting dashboard metrics:', error);
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
        const whereConditions = [];

        if (cleanFilters.startDate) {
          whereConditions.push(sql`combined_transactions.transaction_date >= ${cleanFilters.startDate}`);
        }

        if (cleanFilters.endDate) {
          whereConditions.push(sql`combined_transactions.transaction_date <= ${cleanFilters.endDate}`);
        }

        // Filtros de conta/empresa
        if (cleanFilters.accountId && cleanFilters.accountId !== 'all') {
          if (this.isUUID(cleanFilters.accountId)) {
            whereConditions.push(sql`combined_transactions.account_id = ${cleanFilters.accountId}`);
          } else {
            whereConditions.push(eq(accounts.bankName, cleanFilters.accountId));
          }
        }
        if (cleanFilters.companyId && cleanFilters.companyId !== 'all') {
          whereConditions.push(eq(accounts.companyId, cleanFilters.companyId));
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

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
        console.error('Error getting category summary:', error);
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
        const whereConditions = [];

        if (cleanFilters.startDate) {
          whereConditions.push(sql`combined_transactions.transaction_date >= ${cleanFilters.startDate}`);
        }

        if (cleanFilters.endDate) {
          whereConditions.push(sql`combined_transactions.transaction_date <= ${cleanFilters.endDate}`);
        }

        // Filtros de conta/empresa
        if (cleanFilters.accountId && cleanFilters.accountId !== 'all') {
          if (this.isUUID(cleanFilters.accountId)) {
            whereConditions.push(sql`combined_transactions.account_id = ${cleanFilters.accountId}`);
          } else {
            whereConditions.push(eq(accounts.bankName, cleanFilters.accountId));
          }
        }
        if (cleanFilters.companyId && cleanFilters.companyId !== 'all') {
          whereConditions.push(eq(accounts.companyId, cleanFilters.companyId));
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

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

        // Calcular saldo cumulativo
        let runningBalance = 0;
        return dailyData.map((day: any) => {
          runningBalance += (day.income || 0) - (day.expenses || 0);
          return {
            date: day.date,
            income: day.income || 0,
            expenses: day.expenses || 0,
            balance: runningBalance,
            transactions: day.transactions || 0,
          };
        });

      } catch (error) {
        console.error('Error getting trend data:', error);
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
   * Buscar top despesas
   */
  static async getTopExpenses(filters: DashboardFilters = {}, limit: number = 10, tx: any = db): Promise<TopExpense[]> {
    const { userId, ...cleanFilters } = filters;
    const execute = async (innerTx: any) => {
      try {
        this.checkDatabaseConnection();
        const whereConditions: any[] = [
          sql`combined_transactions.type_to_sum = 'debit'` // Apenas despesas
        ];

        if (cleanFilters.startDate) {
          whereConditions.push(sql`combined_transactions.transaction_date >= ${cleanFilters.startDate}`);
        }

        if (cleanFilters.endDate) {
          whereConditions.push(sql`combined_transactions.transaction_date <= ${cleanFilters.endDate}`);
        }

        // Filtros de conta/empresa
        if (cleanFilters.accountId && cleanFilters.accountId !== 'all') {
          if (this.isUUID(cleanFilters.accountId)) {
            whereConditions.push(sql`combined_transactions.account_id = ${cleanFilters.accountId}`);
          } else {
            whereConditions.push(eq(accounts.bankName, cleanFilters.accountId));
          }
        }
        if (cleanFilters.companyId && cleanFilters.companyId !== 'all') {
          whereConditions.push(eq(accounts.companyId, cleanFilters.companyId));
        }

        const whereClause = and(...whereConditions);

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
        console.error('Error getting top expenses:', error);
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
        const whereConditions = [];

        if (cleanFilters.startDate) {
          whereConditions.push(sql`combined_transactions.transaction_date >= ${cleanFilters.startDate}`);
        }

        if (cleanFilters.endDate) {
          whereConditions.push(sql`combined_transactions.transaction_date <= ${cleanFilters.endDate}`);
        }

        // Filtros de conta/empresa
        if (cleanFilters.accountId && cleanFilters.accountId !== 'all') {
          if (this.isUUID(cleanFilters.accountId)) {
            whereConditions.push(sql`combined_transactions.account_id = ${cleanFilters.accountId}`);
          } else {
            whereConditions.push(eq(accounts.bankName, cleanFilters.accountId));
          }
        }
        if (cleanFilters.companyId && cleanFilters.companyId !== 'all') {
          whereConditions.push(eq(accounts.companyId, cleanFilters.companyId));
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

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
          const anyTx = transaction as any;
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
            uploadId: transaction.uploadId || null,
            rawDescription: anyTx.rawDescription || transaction.description,
            categorizationSource: anyTx.categorizationSource || 'ai',
            ruleId: anyTx.ruleId || null,
            createdAt: anyTx.createdAt ? new Date(anyTx.createdAt) : new Date(),
            updatedAt: anyTx.updatedAt ? new Date(anyTx.updatedAt) : new Date(),
            categoryName: transaction.categoryName
              ? this.capitalizeText(transaction.categoryName)
              : 'Sem Categoria'
          };
        }) as unknown as Transaction[];

      } catch (error) {
        console.error('Error getting recent transactions:', error);
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
        console.error('Error getting dashboard data:', error);
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

      console.log('📊 Calculando comparações com mês anterior...');

      // Calcular datas do mês anterior
      const currentDate = new Date(filters.endDate);
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      const previousStartDate = previousMonthStart.toISOString().split('T')[0];
      const previousEndDate = previousMonthEnd.toISOString().split('T')[0];

      console.log(`📅 Comparando: ${filters.startDate} até ${filters.endDate} vs ${previousStartDate} até ${previousEndDate}`);

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
            ...accountConditions.map(c => {
               // accountConditions might refer to transactions.accountId, need to fix
               if (c && (c as any).left && (c as any).left.name === 'account_id') {
                 return sql`combined_transactions.account_id = ${(c as any).right}`;
               }
               return c;
            })
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
            ...accountConditions.map(c => {
               if (c && (c as any).left && (c as any).left.name === 'account_id') {
                 return sql`combined_transactions.account_id = ${(c as any).right}`;
               }
               return c;
            })
          )
        );

      const currentMetrics = currentMetricsResult[0];
      const previousMetrics = previousMetricsResult[0];

      console.log('📈 Métricas atuais:', currentMetrics);
      console.log('📉 Métricas anteriores:', previousMetrics);

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

      console.log('📊 Comparações calculadas:', comparisons);
      return comparisons;

    } catch (error) {
      console.error('Error calculating comparisons:', error);
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