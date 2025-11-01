import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts } from '@/lib/db/schema';
import { DREStatement, DRECategory } from '@/lib/types';
import { eq, and, gte, lte, sum, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export interface DREFilters {
  period?: string;
  companyId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

export default class DREService {
  /**
   * Obter período anterior para comparação
   */
  static getPreviousPeriod(period: string): string {
    if (!period || period === 'current') {
      // Se for "current", assume mês atual
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return previousMonth.toISOString().slice(0, 7); // YYYY-MM
    }

    // Formato YYYY-MM
    const [year, month] = period.split('-').map(Number);
    const previousDate = new Date(year, month - 2, 1); // month-2 porque mês em JS é 0-indexed
    return previousDate.toISOString().slice(0, 7);
  }

  /**
   * Converter período para datas
   */
  static convertPeriodToDates(period: string): { startDate: string; endDate: string } {
    if (!period || period === 'current') {
      // Mês atual
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      return { startDate, endDate };
    }

    // Formato YYYY-MM
    const [year, month] = period.split('-').map(Number);
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

    return { startDate, endDate };
  }

  /**
   * Buscar dados de DRE do banco
   */
  static async getDREStatement(filters: DREFilters = {}): Promise<DREStatement> {
    try {
      // Converter filtros
      const { startDate, endDate } = this.convertPeriodToDates(filters.period || 'current');

      const whereConditions = [];

      if (startDate) {
        whereConditions.push(gte(transactions.transactionDate, startDate));
      }

      if (endDate) {
        whereConditions.push(lte(transactions.transactionDate, endDate));
      }

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Buscar totais por categoria
      const categoryData = await db
        .select({
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          categoryType: categories.type,
          colorHex: categories.colorHex,
          icon: categories.icon,
          totalAmount: sum(sql`ABS(${transactions.amount})`).mapWith(Number),
          incomeAmount: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number),
          expenseAmount: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
          transactionCount: count(transactions.id).mapWith(Number),
          creditCount: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN 1 ELSE 0 END`).mapWith(Number),
          debitCount: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN 1 ELSE 0 END`).mapWith(Number),
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(whereClause)
        .groupBy(transactions.categoryId, categories.name, categories.type, categories.colorHex, categories.icon)
        .orderBy(sql`SUM(ABS(${transactions.amount})) DESC`); // Ordenar por valor total

      // Processar categorias
      const categorizedData = categoryData.filter(cat => cat.categoryId);

      const dreCategories: DRECategory[] = categorizedData
        .map(cat => {
          const revenueAmount = cat.incomeAmount || 0;
          const expenseAmount = cat.expenseAmount || 0;
          const resolvedType = (cat.categoryType as 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational' | undefined)
            || (revenueAmount >= expenseAmount ? 'revenue' : 'variable_cost');
          const actualValue = resolvedType === 'revenue' ? revenueAmount : expenseAmount;

          return {
            id: cat.categoryId!,
            name: cat.categoryName || 'Sem Categoria',
            type: resolvedType,
            budget: 0, // TODO: Implementar orçamento
            actual: actualValue,
            variance: 0, // TODO: Calcular variação vs orçamento
            percentage: 0, // Será calculado depois
            color: cat.colorHex || '#6366F1',
            icon: cat.icon || '📊',
            subcategories: [], // TODO: Implementar subcategorias
            growthRate: 0, // TODO: Calcular taxa de crescimento
            transactions: cat.transactionCount || 0,
          };
        });

      const uncategorizedData = categoryData.filter(cat => !cat.categoryId);

      const uncategorizedRevenue = uncategorizedData.reduce((sumValue, cat) => sumValue + (cat.incomeAmount || 0), 0);
      const uncategorizedExpenses = uncategorizedData.reduce((sumValue, cat) => sumValue + (cat.expenseAmount || 0), 0);
      const uncategorizedRevenueTransactions = uncategorizedData.reduce((sumValue, cat) => sumValue + (cat.creditCount || 0), 0);
      const uncategorizedExpenseTransactions = uncategorizedData.reduce((sumValue, cat) => sumValue + (cat.debitCount || 0), 0);

      if (uncategorizedRevenue > 0) {
        dreCategories.push({
          id: 'uncategorized-revenue',
          name: 'Receitas não categorizadas',
          type: 'revenue',
          budget: 0,
          actual: uncategorizedRevenue,
          variance: 0,
          percentage: 0,
          color: '#0EA5E9',
          icon: '📁',
          subcategories: [],
          growthRate: 0,
          transactions: uncategorizedRevenueTransactions,
        });
      }

      if (uncategorizedExpenses > 0) {
        dreCategories.push({
          id: 'uncategorized-expense',
          name: 'Despesas não categorizadas',
          type: 'variable_cost',
          budget: 0,
          actual: uncategorizedExpenses,
          variance: 0,
          percentage: 0,
          color: '#A855F7',
          icon: '📁',
          subcategories: [],
          growthRate: 0,
          transactions: uncategorizedExpenseTransactions,
        });
      }

      // Calcular totais gerais
      const totalRevenue = dreCategories
        .filter(cat => cat.type === 'revenue')
        .reduce((sum, cat) => sum + cat.actual, 0);

      const totalVariableCosts = dreCategories
        .filter(cat => cat.type === 'variable_cost')
        .reduce((sum, cat) => sum + cat.actual, 0);

      const totalFixedCosts = dreCategories
        .filter(cat => cat.type === 'fixed_cost')
        .reduce((sum, cat) => sum + cat.actual, 0);

      const totalNonOperational = dreCategories
        .filter(cat => cat.type === 'non_operational')
        .reduce((sum, cat) => sum + cat.actual, 0);

      const totalExpenses = totalVariableCosts + totalFixedCosts + totalNonOperational;
      const operatingIncome = totalRevenue - totalVariableCosts - totalFixedCosts;
      const netIncome = operatingIncome - totalNonOperational;

      // Calcular percentuais
      dreCategories.forEach(cat => {
        if (cat.type === 'revenue' && totalRevenue > 0) {
          cat.percentage = (cat.actual / totalRevenue) * 100;
        } else if (cat.type !== 'revenue' && totalRevenue > 0) {
          cat.percentage = (cat.actual / totalRevenue) * 100;
        }
      });

      // Calcular margem de contribuição
      const contributionMargin = totalRevenue - totalVariableCosts;
      const contributionMarginPercentage = totalRevenue > 0
        ? (contributionMargin / totalRevenue) * 100
        : 0;

      // Obter período formatado
      const periodLabel = this.formatPeriodLabel(filters.period || 'current');

      // Mapear categorias para o formato esperado pelo componente
      const mappedCategories = dreCategories.map(cat => ({
        name: cat.name,
        value: cat.actual,
        percentage: cat.percentage,
        color: cat.color,
        icon: cat.icon,
        transactions: cat.transactions || 0,
        drilldown: [] // TODO: Implementar drilldown com transações
      }));

      // Separar categorias por tipo para detalhamento
      const revenueCategories = dreCategories.filter(cat => cat.type === 'revenue').map(cat => ({
        name: cat.name,
        value: cat.actual,
        percentage: cat.percentage,
        color: cat.color,
        icon: cat.icon,
        transactions: cat.transactions || 0,
        drilldown: []
      }));
      const variableCostCategories = dreCategories.filter(cat => cat.type === 'variable_cost').map(cat => ({
        name: cat.name,
        value: cat.actual,
        percentage: cat.percentage,
        color: cat.color,
        icon: cat.icon,
        transactions: cat.transactions || 0,
        drilldown: []
      }));
      const fixedCostCategories = dreCategories.filter(cat => cat.type === 'fixed_cost').map(cat => ({
        name: cat.name,
        value: cat.actual,
        percentage: cat.percentage,
        color: cat.color,
        icon: cat.icon,
        transactions: cat.transactions || 0,
        drilldown: []
      }));
      const nonOperationalCategories = dreCategories.filter(cat => cat.type === 'non_operational').map(cat => ({
        name: cat.name,
        value: cat.actual,
        percentage: cat.percentage,
        color: cat.color,
        icon: cat.icon,
        transactions: cat.transactions || 0,
        drilldown: []
      }));

      return {
        period: periodLabel,

        // Estrutura esperada pelo componente
        grossRevenue: totalRevenue,
        netRevenue: totalRevenue, // Simplificado - não há deduções no momento
        taxes: 0, // TODO: Implementar cálculo de impostos
        financialCosts: 0, // TODO: Implementar cálculo de custos financeiros
        variableCosts: totalVariableCosts,
        fixedCosts: totalFixedCosts,
        contributionMargin: {
          value: contributionMargin,
          percentage: contributionMarginPercentage
        },
        operationalResult: operatingIncome,
        nonOperationalExpenses: totalNonOperational,
        nonOperational: {
          revenue: 0, // TODO: Separar receitas não operacionais
          expenses: totalNonOperational,
          netResult: -totalNonOperational
        },
        netResult: netIncome,

        // Categorias mapeadas
        categories: mappedCategories,

        // Detalhamento por linha (opcional, para drilldown)
        lineDetails: {
          grossRevenue: revenueCategories.map(cat => ({
            label: cat.name,
            value: cat.value,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          taxes: [],
          financialCosts: [],
          variableCosts: variableCostCategories.map(cat => ({
            label: cat.name,
            value: cat.value,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          fixedCosts: fixedCostCategories.map(cat => ({
            label: cat.name,
            value: cat.value,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          nonOperationalRevenue: [],
          nonOperationalExpenses: nonOperationalCategories.map(cat => ({
            label: cat.name,
            value: cat.value,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          }))
        },

        // Manter compatibilidade com estrutura anterior
        totalRevenue,
        totalVariableCosts,
        totalFixedCosts,
        totalNonOperational,
        totalExpenses,
        operatingIncome,
        netIncome,
        generatedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error generating DRE statement:', error);
      throw new Error('Failed to generate DRE statement');
    }
  }

  /**
   * Format period label for display
   */
  private static formatPeriodLabel(period: string): string {
    if (!period || period === 'current') {
      const now = new Date();
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    }

    // Formato YYYY-MM
    const [year, month] = period.split('-').map(Number);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[month - 1]} ${year}`;
  }

  /**
   * Comparar períodos
   */
  static async comparePeriods(
    currentPeriod: string,
    previousPeriod: string,
    filters: Omit<DREFilters, 'period'> = {}
  ): Promise<{
    current: DREStatement;
    previous: DREStatement;
    variance: {
      revenue: number;
      expenses: number;
      netIncome: number;
      revenuePercent: number;
      expensesPercent: number;
      netIncomePercent: number;
    };
  }> {
    const [currentData, previousData] = await Promise.all([
      this.getDREStatement({ ...filters, period: currentPeriod }),
      this.getDREStatement({ ...filters, period: previousPeriod })
    ]);

    const revenueVariance = currentData.totalRevenue - previousData.totalRevenue;
    const expensesVariance = currentData.totalExpenses - previousData.totalExpenses;
    const netIncomeVariance = currentData.netIncome - previousData.netIncome;

    const revenuePercent = previousData.totalRevenue > 0
      ? (revenueVariance / previousData.totalRevenue) * 100
      : 0;

    const expensesPercent = previousData.totalExpenses > 0
      ? (expensesVariance / previousData.totalExpenses) * 100
      : 0;

    const netIncomePercent = previousData.netIncome !== 0
      ? (netIncomeVariance / Math.abs(previousData.netIncome)) * 100
      : 0;

    return {
      current: currentData,
      previous: previousData,
      variance: {
        revenue: revenueVariance,
        expenses: expensesVariance,
        netIncome: netIncomeVariance,
        revenuePercent,
        expensesPercent,
        netIncomePercent
      }
    };
  }
}
