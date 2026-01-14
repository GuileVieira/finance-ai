import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts, companies } from '@/lib/db/schema';
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
        conditions.push(eq(transactions.accountId, filters.accountId));
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
   * Verificar se o banco de dados está disponível
   */
  private static checkDatabaseConnection(): void {
    if (!db) {
      throw new Error('Banco de dados não está disponível. Verifique a configuração do DATABASE_URL.');
    }
  }

  /**
   * Buscar métricas principais do dashboard
   */
  static async getMetrics(filters: DashboardFilters = {}): Promise<DashboardMetrics> {
    try {
      console.log('🎯 DashboardService.getMetrics chamado com filtros:', filters);

      // Proteção contra datas absurdas
      if (filters.startDate) {
        const startYear = parseInt(filters.startDate.split('-')[0]);
        if (startYear < 2000 || startYear > 2100) {
          console.error('❌ Data inicial inválida:', filters.startDate);
          throw new Error('Data inicial inválida');
        }
      }

      if (filters.endDate) {
        const endYear = parseInt(filters.endDate.split('-')[0]);
        if (endYear < 2000 || endYear > 2100) {
          console.error('❌ Data final inválida:', filters.endDate);
          throw new Error('Data final inválida');
        }
      }

      this.checkDatabaseConnection();

      // Construir where clause
      const whereConditions = [];
      console.log('📋 Constru condições where...');

      if (filters.startDate) {
        console.log('📅 Adicionando filtro startDate >=', filters.startDate);
        whereConditions.push(gte(transactions.transactionDate, filters.startDate));
      }

      if (filters.endDate) {
        console.log('📅 Adicionando filtro endDate <=', filters.endDate);
        whereConditions.push(lte(transactions.transactionDate, filters.endDate));
      }

      // Usar função auxiliar para filtros de conta/banco
      this.addAccountFilters(whereConditions, filters);

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      console.log('🔍 WhereClause final:', whereClause ? `${whereConditions.length} condições` : 'sem filtros');

      // Métricas principais
      const metricsResult = await db
        .select({
          totalIncome: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number),
          totalExpenses: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
          transactionCount: count(transactions.id).mapWith(Number),
          incomeCount: count(sql`CASE WHEN ${transactions.type} = 'credit' THEN 1 END`).mapWith(Number),
          expenseCount: count(sql`CASE WHEN ${transactions.type} = 'debit' THEN 1 END`).mapWith(Number),
          averageTicket: avg(sql`ABS(${transactions.amount})`).mapWith(Number),
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            whereClause,
            not(ilike(categories.name, 'Saldo Inicial'))
          )
        );

      const metrics = metricsResult[0];

      // Calcular saldo e taxa de crescimento
      const netBalance = (metrics.totalIncome || 0) - (metrics.totalExpenses || 0);

      // Buscar comparações com o período anterior
      const comparisons = await this.calculateAllComparisons(filters);

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
  }

  /**
   * Buscar resumo de categorias
   */
  static async getCategorySummary(filters: DashboardFilters = {}): Promise<CategorySummary[]> {
    try {
      this.checkDatabaseConnection();
      const whereConditions = [];

      if (filters.startDate) {
        whereConditions.push(gte(transactions.transactionDate, filters.startDate));
      }

      if (filters.endDate) {
        whereConditions.push(lte(transactions.transactionDate, filters.endDate));
      }

      // Usar função auxiliar para filtros de conta/banco
      this.addAccountFilters(whereConditions, filters);

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Buscar totais por categoria
      const categoryTotals = await db
        .select({
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          categoryType: categories.type,
          colorHex: categories.colorHex,
          icon: categories.icon,
          totalAmount: sum(sql`ABS(${transactions.amount})`).mapWith(Number),
          transactionCount: count(transactions.id).mapWith(Number),
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            whereClause,
            not(ilike(categories.name, 'Saldo Inicial'))
          )
        )
        .groupBy(transactions.categoryId, categories.name, categories.type, categories.colorHex, categories.icon)
      // Removendo ORDER BY para evitar erro de GROUP BY
      // .orderBy(desc(sql`ABS(${transactions.amount})`));

      // Calcular total geral para porcentagens
      const totalAmount = categoryTotals.reduce((sum, cat) => sum + (cat.totalAmount || 0), 0);

      // Formatar resultado e ordenar por totalAmount (maior primeiro)
      return categoryTotals
        .filter(cat => cat.categoryId) // Remover categorias nulas
        .map(cat => ({
          id: cat.categoryId!,
          name: cat.categoryName || 'Sem Categoria',
          type: cat.categoryType || 'unknown',
          totalAmount: cat.totalAmount || 0,
          transactionCount: cat.transactionCount || 0,
          percentage: totalAmount > 0 ? (cat.totalAmount || 0) / totalAmount * 100 : 0,
          color: cat.colorHex || '#6366F1',
          icon: cat.icon || '📊',
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount); // Ordenar por valor total (maior primeiro)

    } catch (error) {
      console.error('Error getting category summary:', error);
      throw new Error('Failed to fetch category summary');
    }
  }

  /**
   * Buscar dados de tendência para gráficos
   */
  static async getTrendData(filters: DashboardFilters = {}): Promise<TrendData[]> {
    try {
      this.checkDatabaseConnection();
      const whereConditions = [];

      if (filters.startDate) {
        whereConditions.push(gte(transactions.transactionDate, filters.startDate));
      }

      if (filters.endDate) {
        whereConditions.push(lte(transactions.transactionDate, filters.endDate));
      }

      // Usar função auxiliar para filtros de conta/banco
      this.addAccountFilters(whereConditions, filters);

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Agrupar por dia
      const dailyData = await db
        .select({
          date: transactions.transactionDate,
          income: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number),
          expenses: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
          transactions: count(transactions.id).mapWith(Number),
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            whereClause,
            not(ilike(categories.name, 'Saldo Inicial'))
          )
        )
        .groupBy(transactions.transactionDate)
        .orderBy(transactions.transactionDate);

      // Calcular saldo cumulativo
      let runningBalance = 0;
      return dailyData.map(day => {
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
  }

  /**
   * Buscar top despesas
   */
  static async getTopExpenses(filters: DashboardFilters = {}, limit: number = 10): Promise<TopExpense[]> {
    try {
      this.checkDatabaseConnection();
      const whereConditions = [
        eq(transactions.type, 'debit') // Apenas despesas
      ];

      if (filters.startDate) {
        whereConditions.push(gte(transactions.transactionDate, filters.startDate));
      }

      if (filters.endDate) {
        whereConditions.push(lte(transactions.transactionDate, filters.endDate));
      }

      // Usar função auxiliar para filtros de conta/banco
      this.addAccountFilters(whereConditions, filters);

      const whereClause = and(...whereConditions);

      const topExpenses = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          category: categories.name,
          date: transactions.transactionDate,
          accountName: accounts.bankName,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            whereClause,
            not(ilike(categories.name, 'Saldo Inicial'))
          )
        )
        .orderBy(desc(sql`ABS(${transactions.amount})`))
        .limit(limit);

      return topExpenses.map(expense => ({
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
  }

  /**
   * Buscar transações recentes
   */
  static async getRecentTransactions(filters: DashboardFilters = {}, limit: number = 10): Promise<Transaction[]> {
    try {
      this.checkDatabaseConnection();
      const whereConditions = [];

      if (filters.startDate) {
        whereConditions.push(gte(transactions.transactionDate, filters.startDate));
      }

      if (filters.endDate) {
        whereConditions.push(lte(transactions.transactionDate, filters.endDate));
      }

      // Usar função auxiliar para filtros de conta/banco
      this.addAccountFilters(whereConditions, filters);

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const recentTransactions = await db
        .select({
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
          // Adicionar campos da categoria
          categoryName: categories.name,
          categoryType: categories.type,
          categoryColor: categories.colorHex,
          categoryIcon: categories.icon
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            whereClause,
            not(ilike(categories.name, 'Saldo Inicial'))
          )
        )
        .orderBy(desc(transactions.transactionDate))
        .limit(limit);

      // Adicionar campos necessários para satisfazer o tipo Transaction
      return recentTransactions.map(transaction => {
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
  }

  /**
   * Buscar dados completos do dashboard
   */
  static async getDashboardData(filters: DashboardFilters = {}): Promise<DashboardData> {
    try {
      // Buscar todos os dados em paralelo
      const [metrics, categorySummary, trendData, topExpenses, recentTransactions] = await Promise.all([
        this.getMetrics(filters),
        this.getCategorySummary(filters),
        this.getTrendData(filters),
        this.getTopExpenses(filters),
        this.getRecentTransactions(filters)
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
  }

  /**
   * Calcular comparações com o mês anterior usando SQL direto (sem recursão)
   */
  private static async calculateAllComparisons(filters: DashboardFilters): Promise<{
    growthRate: number;
    expensesGrowthRate: number;
    balanceGrowthRate: number;
    transactionsGrowthRate: number;
  }> {
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
      const currentMetricsResult = await db
        .select({
          totalIncome: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number),
          totalExpenses: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
          transactionCount: count(transactions.id).mapWith(Number),
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            gte(transactions.transactionDate, filters.startDate!),
            lte(transactions.transactionDate, filters.endDate!),
            not(ilike(categories.name, 'Saldo Inicial')),
            ...accountConditions
          )
        );

      // Mês anterior - SQL direto
      const previousMetricsResult = await db
        .select({
          totalIncome: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number),
          totalExpenses: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
          transactionCount: count(transactions.id).mapWith(Number),
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            gte(transactions.transactionDate, previousStartDate),
            lte(transactions.transactionDate, previousEndDate),
            not(ilike(categories.name, 'Saldo Inicial')),
            ...accountConditions
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
  }

  /**
   * Calcular taxa de crescimento comparando com período anterior
   */
  private static async calculateGrowthRate(filters: DashboardFilters): Promise<number> {
    const comparisons = await this.calculateAllComparisons(filters);
    return comparisons.growthRate;
  }
}