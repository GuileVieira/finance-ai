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

      if (filters.accountId) {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId) {
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
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(whereClause)
        .groupBy(transactions.categoryId, categories.name, categories.type, categories.colorHex, categories.icon)
        .orderBy(sql`ABS(${transactions.amount})`); // Ordenar por valor total

      // Processar categorias
      const dreCategories: DRECategory[] = categoryData
        .filter(cat => cat.categoryId) // Remover categorias nulas
        .map(cat => ({
          id: cat.categoryId!,
          name: cat.categoryName || 'Sem Categoria',
          type: cat.categoryType as 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational',
          budget: 0, // TODO: Implementar orçamento
          actual: cat.totalAmount || 0,
          variance: 0, // TODO: Calcular variação vs orçamento
          percentage: 0, // Será calculado depois
          color: cat.colorHex || '#6366F1',
          icon: cat.icon || '📊',
          subcategories: [], // TODO: Implementar subcategorias
          growthRate: 0, // TODO: Calcular taxa de crescimento
        }));

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

      // Obter período formatado
      const periodLabel = this.formatPeriodLabel(filters.period || 'current');

      return {
        period: periodLabel,
        totalRevenue,
        totalVariableCosts,
        totalFixedCosts,
        totalNonOperational,
        totalExpenses,
        operatingIncome,
        netIncome,
        categories: dreCategories,
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