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
import { eq, and, gte, lte, desc, sum, count, avg, sql } from 'drizzle-orm';
import { Transaction } from '@/lib/db/schema';

export default class DashboardService {
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
      this.checkDatabaseConnection();
      // Construir where clause
      const whereConditions = [];

      if (filters.startDate) {
        whereConditions.push(gte(transactions.transactionDate, filters.startDate));
      }

      if (filters.endDate) {
        whereConditions.push(lte(transactions.transactionDate, filters.endDate));
      }

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

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
        .where(whereClause);

      const metrics = metricsResult[0];

      // Calcular saldo e taxa de crescimento
      const netBalance = (metrics.totalIncome || 0) - (metrics.totalExpenses || 0);

      // Buscar dados do período anterior para calcular crescimento
      const growthRate = await this.calculateGrowthRate(filters);

      // Converter valores de centavos para reais se necessário
      const convertFromCents = (value: number | null | undefined): number => {
        if (!value) return 0;
        // Se o valor for maior que 1000 e não tiver casas decimais, provavelmente está em centavos
        if (value > 1000 && Number.isInteger(value)) {
          return value / 100;
        }
        return value;
      };

      return {
        totalIncome: convertFromCents(metrics.totalIncome),
        totalExpenses: convertFromCents(metrics.totalExpenses),
        netBalance: convertFromCents(netBalance),
        transactionCount: metrics.transactionCount || 0,
        incomeCount: metrics.incomeCount || 0,
        expenseCount: metrics.expenseCount || 0,
        averageTicket: convertFromCents(metrics.averageTicket),
        growthRate
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

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

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
        .where(whereClause)
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

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

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
        .where(whereClause)
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

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = and(...whereConditions);

      const topExpenses = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          category: categories.name,
          date: transactions.transactionDate,
          accountName: accounts.name,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(whereClause)
        .orderBy(desc(sql`ABS(${transactions.amount})`))
        .limit(limit);

      return topExpenses.map(expense => ({
        id: expense.id,
        description: expense.description || 'Sem Descrição',
        amount: Math.abs(Number(expense.amount) || 0),
        category: expense.category || 'Sem Categoria',
        date: expense.date,
        accountName: expense.accountName || 'Não Identificado',
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

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const recentTransactions = await db
        .select()
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(whereClause)
        .orderBy(desc(transactions.transactionDate))
        .limit(limit);

      return recentTransactions.map(t => t.transactions) as Transaction[];

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
   * Calcular taxa de crescimento comparando com período anterior
   */
  private static async calculateGrowthRate(filters: DashboardFilters): Promise<number> {
    try {
      // Para simplificar, vamos calcular comparando com o mesmo período do mês anterior
      // Em uma implementação completa, você faria uma comparação mais sofisticada

      if (!filters.startDate || !filters.endDate) {
        return 0; // Não há como calcular sem período definido
      }

      const currentDate = new Date(filters.endDate);
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      const previousFilters = {
        ...filters,
        startDate: previousMonthStart.toISOString().split('T')[0],
        endDate: previousMonthEnd.toISOString().split('T')[0],
      };

      const previousMetrics = await this.getMetrics(previousFilters);
      const currentMetrics = await this.getMetrics(filters);

      if (previousMetrics.totalIncome === 0) {
        return 0; // Evitar divisão por zero
      }

      return ((currentMetrics.totalIncome - previousMetrics.totalIncome) / previousMetrics.totalIncome) * 100;

    } catch (error) {
      console.error('Error calculating growth rate:', error);
      return 0;
    }
  }
}