import { db } from '@/lib/db/drizzle';
import { transactions, accounts, categories } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, isNotNull, ne } from 'drizzle-orm';
import type { Insight, AnomalyData, InsightThresholds } from '@/lib/types';
import { DEFAULT_THRESHOLDS } from './threshold.service';

interface AnomalyFilters {
  companyId?: string;
  accountId?: string;
  period?: string; // YYYY-MM
}

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  mean: number;
  stdDev: number;
  count: number;
}

export default class AnomalyService {
  /**
   * Detectar anomalias em transações
   */
  static async detectAnomalies(
    filters: AnomalyFilters,
    thresholds: InsightThresholds = DEFAULT_THRESHOLDS
  ): Promise<AnomalyData[]> {
    const anomalies: AnomalyData[] = [];

    try {
      // 1. Detectar transações individuais anômalas
      const transactionAnomalies = await this.detectTransactionAnomalies(filters, thresholds);
      anomalies.push(...transactionAnomalies);

      // 2. Detectar picos em categorias
      const categorySpikes = await this.detectCategorySpikes(filters, thresholds);
      anomalies.push(...categorySpikes);

      // Ordenar por severidade
      anomalies.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }

  /**
   * Detectar transações individuais anômalas (Z-score)
   */
  private static async detectTransactionAnomalies(
    filters: AnomalyFilters,
    thresholds: InsightThresholds
  ): Promise<AnomalyData[]> {
    const anomalies: AnomalyData[] = [];

    try {
      // Calcular estatísticas por categoria dos últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const startDate = `${sixMonthsAgo.getFullYear()}-${(sixMonthsAgo.getMonth() + 1).toString().padStart(2, '0')}-01`;

      const whereConditions: Parameters<typeof and>[0][] = [
        eq(transactions.type, 'debit'),
        gte(transactions.transactionDate, startDate),
        isNotNull(transactions.categoryId)
      ];

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      // Calcular média e desvio padrão por categoria
      const categoryStatsResult = await db
        .select({
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          mean: sql<number>`AVG(ABS(${transactions.amount}))`.mapWith(Number),
          stdDev: sql<number>`STDDEV(ABS(${transactions.amount}))`.mapWith(Number),
          count: sql<number>`COUNT(*)`.mapWith(Number)
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(...whereConditions))
        .groupBy(transactions.categoryId, categories.name)
        .having(sql`COUNT(*) >= 5`); // Mínimo de 5 transações para ter estatísticas válidas

      const categoryStats = new Map<string, CategoryStats>();
      for (const stat of categoryStatsResult) {
        if (stat.categoryId && stat.stdDev && stat.stdDev > 0) {
          categoryStats.set(stat.categoryId, {
            categoryId: stat.categoryId,
            categoryName: stat.categoryName || 'Sem categoria',
            mean: stat.mean,
            stdDev: stat.stdDev,
            count: stat.count
          });
        }
      }

      // Buscar transações do período atual
      const now = new Date();
      let periodStart: string;
      let periodEnd: string;

      if (filters.period && filters.period !== 'current' && filters.period !== 'all') {
        const [year, month] = filters.period.split('-').map(Number);
        periodStart = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        periodEnd = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      } else {
        periodStart = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        periodEnd = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${lastDay}`;
      }

      const currentPeriodConditions: Parameters<typeof and>[0][] = [
        eq(transactions.type, 'debit'),
        gte(transactions.transactionDate, periodStart),
        lte(transactions.transactionDate, periodEnd),
        isNotNull(transactions.categoryId)
      ];

      if (filters.accountId && filters.accountId !== 'all') {
        currentPeriodConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        currentPeriodConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const currentTransactions = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          date: transactions.transactionDate,
          categoryId: transactions.categoryId,
          categoryName: categories.name
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(...currentPeriodConditions))
        .orderBy(desc(sql`ABS(${transactions.amount})`));

      // Calcular Z-score para cada transação
      for (const txn of currentTransactions) {
        if (!txn.categoryId) continue;

        const stats = categoryStats.get(txn.categoryId);
        if (!stats) continue;

        const amount = Math.abs(Number(txn.amount));
        const zScore = (amount - stats.mean) / stats.stdDev;

        if (Math.abs(zScore) >= thresholds.anomaly.zScore) {
          const severity = Math.abs(zScore) >= 3 ? 'high' : Math.abs(zScore) >= 2.5 ? 'medium' : 'low';
          const multiplier = (amount / stats.mean).toFixed(1);

          anomalies.push({
            id: `txn-anomaly-${txn.id}`,
            transactionId: txn.id,
            description: txn.description,
            amount,
            date: txn.date,
            category: txn.categoryName || undefined,
            categoryId: txn.categoryId,
            type: 'transaction',
            zScore,
            mean: stats.mean,
            stdDev: stats.stdDev,
            severity,
            message: `Transação ${multiplier}x acima da média da categoria "${txn.categoryName}"`
          });
        }
      }

      // Limitar a top 10 anomalias de transação
      return anomalies.slice(0, 10);
    } catch (error) {
      console.error('Error detecting transaction anomalies:', error);
      return [];
    }
  }

  /**
   * Detectar picos de despesa por categoria
   */
  private static async detectCategorySpikes(
    filters: AnomalyFilters,
    thresholds: InsightThresholds
  ): Promise<AnomalyData[]> {
    const anomalies: AnomalyData[] = [];

    try {
      const now = new Date();

      // Calcular total por categoria nos últimos 6 meses
      const monthlyStats = new Map<string, number[]>();

      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);

        const monthStart = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const monthEnd = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${lastDay}`;

        const whereConditions: Parameters<typeof and>[0][] = [
          eq(transactions.type, 'debit'),
          gte(transactions.transactionDate, monthStart),
          lte(transactions.transactionDate, monthEnd),
          isNotNull(transactions.categoryId)
        ];

        if (filters.accountId && filters.accountId !== 'all') {
          whereConditions.push(eq(transactions.accountId, filters.accountId));
        }

        if (filters.companyId && filters.companyId !== 'all') {
          whereConditions.push(eq(accounts.companyId, filters.companyId));
        }

        const monthlyTotals = await db
          .select({
            categoryId: transactions.categoryId,
            categoryName: categories.name,
            total: sql<number>`SUM(ABS(${transactions.amount}))`.mapWith(Number)
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .leftJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(and(...whereConditions))
          .groupBy(transactions.categoryId, categories.name);

        for (const row of monthlyTotals) {
          if (!row.categoryId) continue;

          const key = `${row.categoryId}|${row.categoryName}`;
          if (!monthlyStats.has(key)) {
            monthlyStats.set(key, []);
          }
          monthlyStats.get(key)!.push(row.total);
        }
      }

      // Analisar cada categoria
      for (const [key, values] of monthlyStats.entries()) {
        if (values.length < 3) continue; // Precisa de histórico

        const [categoryId, categoryName] = key.split('|');
        const currentMonthValue = values[0] || 0;
        const historicalValues = values.slice(1);

        if (historicalValues.length === 0) continue;

        const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
        const variance = historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0 || mean === 0) continue;

        const zScore = (currentMonthValue - mean) / stdDev;

        // Só alertar sobre aumentos significativos (não reduções)
        if (zScore >= thresholds.anomaly.zScore) {
          const percentIncrease = ((currentMonthValue - mean) / mean) * 100;
          const severity = zScore >= 3 ? 'high' : zScore >= 2.5 ? 'medium' : 'low';

          anomalies.push({
            id: `category-spike-${categoryId}`,
            transactionId: categoryId,
            description: `Categoria: ${categoryName}`,
            amount: currentMonthValue,
            date: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`,
            category: categoryName,
            categoryId,
            type: 'category_spike',
            zScore,
            mean,
            stdDev,
            severity,
            message: `Categoria "${categoryName}" teve pico de ${percentIncrease.toFixed(0)}% este mês`
          });
        }
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting category spikes:', error);
      return [];
    }
  }

  /**
   * Gerar insights de anomalias
   */
  static async generateAnomalyInsights(
    filters: AnomalyFilters,
    thresholds: InsightThresholds = DEFAULT_THRESHOLDS
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      const anomalies = await this.detectAnomalies(filters, thresholds);

      if (anomalies.length === 0) {
        return insights;
      }

      // Separar por tipo
      const transactionAnomalies = anomalies.filter(a => a.type === 'transaction');
      const categorySpikes = anomalies.filter(a => a.type === 'category_spike');

      // Insight 1: Transações anômalas de alto impacto
      const highImpactTxns = transactionAnomalies.filter(a => a.severity === 'high');

      for (const anomaly of highImpactTxns.slice(0, 3)) {
        insights.push({
          id: anomaly.id,
          type: 'alert',
          title: 'Transação Atípica Detectada',
          description: `"${anomaly.description.slice(0, 40)}${anomaly.description.length > 40 ? '...' : ''}" de R$ ${anomaly.amount.toLocaleString('pt-BR')} está ${(anomaly.amount / anomaly.mean).toFixed(1)}x acima do normal.`,
          impact: 'high',
          category: 'Anomalias',
          value: anomaly.amount,
          comparison: `Média da categoria: R$ ${anomaly.mean.toLocaleString('pt-BR')}`,
          actionable: true,
          suggestions: [
            'Verifique se esta transação é legítima',
            'Confirme se o valor está correto',
            'Considere se é despesa extraordinária'
          ],
          createdAt: new Date().toISOString()
        });
      }

      // Insight 2: Picos em categorias
      for (const spike of categorySpikes.slice(0, 2)) {
        const percentIncrease = ((spike.amount - spike.mean) / spike.mean) * 100;

        insights.push({
          id: spike.id,
          type: 'alert',
          title: `Pico em ${spike.category}`,
          description: `Gastos com "${spike.category}" estão ${percentIncrease.toFixed(0)}% acima da média histórica este mês.`,
          impact: spike.severity,
          category: 'Anomalias',
          value: spike.amount,
          comparison: `Média mensal: R$ ${spike.mean.toLocaleString('pt-BR')}`,
          actionable: true,
          suggestions: [
            `Analise as transações de ${spike.category} em detalhe`,
            'Identifique a causa do aumento',
            'Verifique se há despesas duplicadas'
          ],
          createdAt: new Date().toISOString()
        });
      }

      // Insight 3: Resumo geral se houver várias anomalias
      if (anomalies.length >= 5) {
        const totalAnomalousAmount = transactionAnomalies
          .slice(0, 10)
          .reduce((sum, a) => sum + a.amount, 0);

        insights.push({
          id: 'anomaly-summary',
          type: 'recommendation',
          title: 'Várias Anomalias Detectadas',
          description: `${anomalies.length} transações/categorias fora do padrão este mês. Recomendamos uma revisão detalhada.`,
          impact: 'medium',
          category: 'Anomalias',
          value: totalAnomalousAmount,
          actionable: true,
          suggestions: [
            'Revise as maiores transações do período',
            'Compare com meses anteriores',
            'Considere criar alertas automáticos'
          ],
          createdAt: new Date().toISOString()
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating anomaly insights:', error);
      return insights;
    }
  }
}
