import { db } from '@/lib/db/drizzle';
import { transactions, accounts, categories, transactionSplits } from '@/lib/db/schema';
import { CashFlowReport, CashFlowDay } from '@/lib/types';
import { eq, and, gte, lte, lt, sum, count, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getFinancialExclusionClause } from './financial-exclusion';

export interface CashFlowFilters {
  period?: string;
  days?: number;
  startDate?: string;
  endDate?: string;
  companyId?: string;
  accountId?: string;
}

export default class CashFlowService {
  /**
   * Converter filtros para datas
   */
  static convertFiltersToDates(filters: CashFlowFilters): { startDate: string; endDate: string } {
    if (filters.startDate && filters.endDate) {
      return { startDate: filters.startDate, endDate: filters.endDate };
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (filters.period === 'current') {
      // Mês atual
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (filters.period === 'last_7_days') {
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    } else if (filters.period === 'last_15_days') {
      startDate = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
    } else if (filters.period === 'last_30_days') {
      startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    } else if (filters.period === 'last_90_days') {
      startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    } else if (filters.period === 'last_180_days') {
      startDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    } else if (filters.period === 'all') {
      // Buscar desde 2 anos atrás até hoje
      startDate = new Date(now.getFullYear() - 2, 0, 1);
    } else if (filters.period && /^\d{4}-\d{2}$/.test(filters.period)) {
      // Formato YYYY-MM (validado com regex)
      const [year, month] = filters.period.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else if (filters.days) {
      // Últimos N dias
      startDate = new Date(now.getTime() - (filters.days * 24 * 60 * 60 * 1000));
    } else {
      // Padrão: últimos 30 dias
      startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Buscar relatório de fluxo de caixa
   */
  static async getCashFlowReport(filters: CashFlowFilters = {}): Promise<CashFlowReport> {
    try {
      const { startDate, endDate } = this.convertFiltersToDates(filters);

      // Buscar saldo inicial (último saldo antes do período)
      const openingBalance = await this.getOpeningBalance(filters, startDate);

      const whereConditions = [
        sql`combined_transactions.transaction_date >= ${startDate}`,
        sql`combined_transactions.transaction_date <= ${endDate}`
      ];

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(sql`combined_transactions.account_id = ${filters.accountId}`);
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(sql`(combined_transactions.company_id = ${filters.companyId} OR accounts.company_id = ${filters.companyId})`);
      }

      const whereClause = and(...whereConditions, getFinancialExclusionClause());

      // Buscar transações individuais para calcular fluxo diário
      const allTransactions = await db!
        .select({
          date: sql<string>`transaction_date`,
          type: sql<'credit' | 'debit'>`type_to_sum`,
          amount: sql<number>`amount_to_sum`,
        })
        .from(sql`(
          -- Transações que NÃO possuem desmembramentos
          SELECT 
            t.id as transaction_id,
            t.amount as amount_to_sum,
            t.type as type_to_sum,
            t.transaction_date,
            t.account_id,
            t.company_id
          FROM ${transactions} t
          WHERE t.id NOT IN (SELECT transaction_id FROM ${transactionSplits})
          
          UNION ALL
          
          -- Desmembramentos individuais
          SELECT 
            ts.transaction_id,
            ts.amount as amount_to_sum,
            t.type as type_to_sum,
            t.transaction_date,
            t.account_id,
            t.company_id
          FROM ${transactionSplits} ts
          JOIN ${transactions} t ON ts.transaction_id = t.id
        ) as combined_transactions`)
        .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
        .where(whereClause || undefined)
        .orderBy(sql`combined_transactions.transaction_date`);

      // Agrupar transações por dia e calcular totais
      const dailyMap = new Map<string, {
        income: number;
        expenses: number;
        transactions: number;
      }>();

      for (const transaction of allTransactions) {
        const date = transaction.date;
        const isIncome = transaction.type === 'credit';
        const amount = Number(transaction.amount) || 0;

        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            income: 0,
            expenses: 0,
            transactions: 0,
          });
        }

        const dayData = dailyMap.get(date)!;
        dayData.transactions++;

        if (isIncome) {
          dayData.income += amount;
        } else {
          dayData.expenses += Math.abs(amount);
        }
      }

      // Converter para array e ordenar por data
      const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          income: data.income,
          expenses: data.expenses,
          transactions: data.transactions,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Processar dados diários com cálculo correto de saldos
      let runningBalance = openingBalance;
      const cashFlowDays: CashFlowDay[] = [];

      for (let i = 0; i < dailyData.length; i++) {
        const day = dailyData[i];
        const income = day.income || 0;
        const expenses = day.expenses || 0;
        const netCashFlow = income - expenses;

        const openingBalanceForDay = runningBalance;
        runningBalance += netCashFlow;

        cashFlowDays.push({
          date: day.date,
          openingBalance: openingBalanceForDay,
          income,
          expenses,
          netCashFlow,
          closingBalance: runningBalance,
          transactions: day.transactions || 0,
        });
      }

      // Calcular totais do período
      const totalIncome = cashFlowDays.reduce((sum, day) => sum + day.income, 0);
      const totalExpenses = cashFlowDays.reduce((sum, day) => sum + day.expenses, 0);
      const netCashFlow = totalIncome - totalExpenses;

      const firstDay = cashFlowDays[0];
      const lastDay = cashFlowDays[cashFlowDays.length - 1];

      const periodOpeningBalance = firstDay?.openingBalance || openingBalance;
      const closingBalance = lastDay?.closingBalance || openingBalance;

      // Encontrar melhor e pior dia
      const bestDay = cashFlowDays.reduce((best, current) =>
        current.netCashFlow > best.netCashFlow ? current : best
        , cashFlowDays[0] || { netCashFlow: 0, date: '' });

      const worstDay = cashFlowDays.reduce((worst, current) =>
        current.netCashFlow < worst.netCashFlow ? current : worst
        , cashFlowDays[0] || { netCashFlow: 0, date: '' });

      // Formatar período
      const periodLabel = this.formatPeriodLabel(startDate, endDate);

      // Calcular número REAL de dias no período (não apenas dias com transações)
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const daysInPeriod = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        period: periodLabel,
        openingBalance: periodOpeningBalance,
        closingBalance,
        totalIncome,
        totalExpenses,
        netCashFlow,
        // CORREÇÃO: média diária usa TODOS os dias do período, não apenas dias com transações
        averageDailyIncome: daysInPeriod > 0 ? totalIncome / daysInPeriod : 0,
        averageDailyExpenses: daysInPeriod > 0 ? totalExpenses / daysInPeriod : 0,
        cashFlowDays,
        bestDay: {
          date: bestDay.date,
          amount: bestDay.netCashFlow
        },
        worstDay: {
          date: worstDay.date,
          amount: worstDay.netCashFlow
        },
        generatedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error generating cash flow report:', error);
      throw new Error('Failed to generate cash flow report');
    }
  }

  /**
   * Format period label for display
   */
  private static formatPeriodLabel(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      // Mesmo mês
      return `${months[start.getMonth()]} ${start.getFullYear()}`;
    } else if (start.getFullYear() === end.getFullYear()) {
      // Mesmo ano
      return `${months[start.getMonth()]} a ${months[end.getMonth()]} ${start.getFullYear()}`;
    } else {
      // Anos diferentes
      return `${months[start.getMonth()]} ${start.getFullYear()} a ${months[end.getMonth()]} ${end.getFullYear()}`;
    }
  }

  /**
   * Projetar fluxo de caixa para próximos dias
   */
  static async projectCashFlow(
    filters: CashFlowFilters = {},
    projectionDays: number = 30
  ): Promise<{
    projections: Array<{
      date: string;
      projectedIncome: number;
      projectedExpenses: number;
      projectedBalance: number;
    }>;
    assumptions: string[];
  }> {
    try {
      // Buscar dados históricos para calcular médias
      const { startDate, endDate } = this.convertFiltersToDates({
        ...filters,
        days: 90 // Últimos 90 dias para projeção
      });

      const whereConditions = [
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      ];

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = and(...whereConditions, getFinancialExclusionClause());

      // Calcular médias diárias
      const result = await db!
        .select({
          totalIncome: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number),
          totalExpenses: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
          distinctDays: count(sql`DISTINCT ${transactions.transactionDate}`).mapWith(Number),
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(whereClause || undefined);

      const data = result[0];
      const avgIncome = data?.distinctDays ? (data.totalIncome || 0) / data.distinctDays : 0;
      const avgExpenses = data?.distinctDays ? (data.totalExpenses || 0) / data.distinctDays : 0;



      // Buscar saldo atual
      const currentBalance = await this.getCurrentBalance(filters);

      // Gerar projeções
      const projections = [];
      let projectedBalance = currentBalance;

      for (let i = 1; i <= projectionDays; i++) {
        const projectionDate = new Date();
        projectionDate.setDate(projectionDate.getDate() + i);

        projectedBalance += (avgIncome - avgExpenses);

        projections.push({
          date: projectionDate.toISOString().split('T')[0],
          projectedIncome: avgIncome,
          projectedExpenses: avgExpenses,
          projectedBalance,
        });
      }

      return {
        projections,
        assumptions: [
          `Baseado na média dos últimos 90 dias`,
          `Receita média diária: R$ ${avgIncome.toFixed(2)}`,
          `Despesa média diária: R$ ${avgExpenses.toFixed(2)}`,
          'Não considera sazonalidade ou eventos excepcionais'
        ]
      };

    } catch (error) {
      console.error('Error projecting cash flow:', error);
      throw new Error('Failed to project cash flow');
    }
  }

  /**
   * Obter saldo inicial do período
   */
  private static async getOpeningBalance(filters: CashFlowFilters, startDate: string): Promise<number> {
    try {
      const whereConditions = [
        lt(transactions.transactionDate, startDate)
      ];

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = and(...whereConditions, getFinancialExclusionClause());

      const latestBalance = await db!
        .select({
          balance: transactions.balanceAfter
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(whereClause || undefined)
        .orderBy(desc(transactions.transactionDate))
        .limit(1);

      return latestBalance[0]?.balance ? Number(latestBalance[0].balance) : 0;

    } catch (error) {
      console.error('Error getting opening balance:', error);
      return 0;
    }
  }

  /**
   * Obter saldo atual
   */
  private static async getCurrentBalance(filters: CashFlowFilters = {}): Promise<number> {
    try {
      const whereConditions = [];

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = whereConditions.length > 0
        ? and(...whereConditions, getFinancialExclusionClause())
        : getFinancialExclusionClause();

      const latestBalance = await db!
        .select({
          balance: transactions.balanceAfter
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(whereClause || undefined)
        .orderBy(desc(transactions.transactionDate))
        .limit(1);

      return latestBalance[0]?.balance ? Number(latestBalance[0].balance) : 0;

    } catch (error) {
      console.error('Error getting current balance:', error);
      return 0;
    }
  }
}