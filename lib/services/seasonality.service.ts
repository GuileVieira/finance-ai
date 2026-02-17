import { db } from '@/lib/db/drizzle';
import { transactions, accounts } from '@/lib/db/schema';
import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';
import type { Insight, SeasonalityData, InsightThresholds } from '@/lib/types';
import { DEFAULT_THRESHOLDS } from './threshold.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('seasonality');

interface SeasonalityFilters {
  companyId?: string;
  accountId?: string;
  period?: string; // YYYY-MM
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default class SeasonalityService {
  /**
   * Obter dados de sazonalidade para o período atual
   */
  static async getSeasonalityData(
    filters: SeasonalityFilters,
    thresholds: InsightThresholds = DEFAULT_THRESHOLDS
  ): Promise<SeasonalityData | null> {
    try {
      const now = new Date();
      let targetYear: number;
      let targetMonth: number;

      if (filters.period && filters.period !== 'current' && filters.period !== 'all') {
        const [year, month] = filters.period.split('-').map(Number);
        targetYear = year;
        targetMonth = month;
      } else {
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1;
      }

      // Buscar dados do período atual
      const currentData = await this.getMonthData(targetYear, targetMonth, filters);

      // Buscar dados do mesmo mês do ano passado
      const sameMonthLastYear = await this.getMonthData(targetYear - 1, targetMonth, filters);

      // Buscar média histórica deste mês (últimos 2-3 anos)
      const historicalData = await this.getHistoricalMonthAverage(targetMonth, filters, 3);

      if (currentData.totalExpenses === 0 && historicalData.average === 0) {
        return null;
      }

      const variance = currentData.totalExpenses - historicalData.average;
      const variancePercent = historicalData.average > 0
        ? (variance / historicalData.average) * 100
        : 0;

      const sameMonthLastYearVariance = sameMonthLastYear.totalExpenses > 0
        ? ((currentData.totalExpenses - sameMonthLastYear.totalExpenses) / sameMonthLastYear.totalExpenses) * 100
        : undefined;

      // Determinar se é pico ou baixa sazonal
      const isSeasonalPeak = variancePercent > thresholds.seasonality.varianceThreshold * 100;
      const isSeasonalLow = variancePercent < -thresholds.seasonality.varianceThreshold * 100;

      return {
        month: targetMonth,
        monthName: MONTH_NAMES[targetMonth - 1],
        historicalAverage: historicalData.average,
        currentValue: currentData.totalExpenses,
        variance,
        variancePercent,
        isSeasonalPeak,
        isSeasonalLow,
        sameMonthLastYear: sameMonthLastYear.totalExpenses || undefined,
        sameMonthLastYearVariance
      };
    } catch (error) {
      log.error({ err: error }, 'Error getting seasonality data');
      return null;
    }
  }

  /**
   * Gerar insights de sazonalidade
   */
  static async generateSeasonalityInsights(
    filters: SeasonalityFilters,
    thresholds: InsightThresholds = DEFAULT_THRESHOLDS
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      const seasonalityData = await this.getSeasonalityData(filters, thresholds);

      if (!seasonalityData) {
        return insights;
      }

      // Insight 1: Comparação com mesmo mês do ano passado
      if (seasonalityData.sameMonthLastYearVariance !== undefined) {
        const variance = seasonalityData.sameMonthLastYearVariance;

        if (Math.abs(variance) > thresholds.seasonality.varianceThreshold * 100) {
          if (variance > 0) {
            insights.push({
              id: `seasonality-yoy-increase-${seasonalityData.month}`,
              type: 'alert',
              title: 'Despesas Acima do Ano Passado',
              description: `Despesas ${variance.toFixed(0)}% acima do mesmo período do ano passado (${seasonalityData.monthName}).`,
              impact: variance > 50 ? 'high' : 'medium',
              category: 'Sazonalidade',
              value: seasonalityData.currentValue,
              comparison: `${seasonalityData.monthName} ${new Date().getFullYear() - 1}: R$ ${seasonalityData.sameMonthLastYear?.toLocaleString('pt-BR')}`,
              actionable: true,
              suggestions: [
                'Investigue os principais aumentos de custo',
                'Compare categorias específicas entre os períodos',
                'Verifique se há despesas extraordinárias'
              ],
              createdAt: new Date().toISOString()
            });
          } else {
            insights.push({
              id: `seasonality-yoy-decrease-${seasonalityData.month}`,
              type: 'positive',
              title: 'Despesas Menores que Ano Passado',
              description: `Despesas ${Math.abs(variance).toFixed(0)}% abaixo do mesmo período do ano passado.`,
              impact: 'medium',
              category: 'Sazonalidade',
              value: seasonalityData.currentValue,
              comparison: `${seasonalityData.monthName} ${new Date().getFullYear() - 1}: R$ ${seasonalityData.sameMonthLastYear?.toLocaleString('pt-BR')}`,
              actionable: false,
              suggestions: [
                'Mantenha as práticas que reduziram custos',
                'Documente as mudanças que geraram economia'
              ],
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // Insight 2: Padrão sazonal histórico
      if (seasonalityData.isSeasonalPeak) {
        insights.push({
          id: `seasonality-peak-${seasonalityData.month}`,
          type: 'trend',
          title: `${seasonalityData.monthName} é Mês de Pico`,
          description: `${seasonalityData.monthName} historicamente tem despesas ${seasonalityData.variancePercent.toFixed(0)}% acima da média. Prepare-se para maior necessidade de caixa.`,
          impact: 'medium',
          category: 'Sazonalidade',
          value: seasonalityData.currentValue,
          comparison: `Média histórica: R$ ${seasonalityData.historicalAverage.toLocaleString('pt-BR')}`,
          actionable: true,
          suggestions: [
            'Reserve capital extra para este período',
            'Negocie prazos maiores com fornecedores',
            'Antecipe recebíveis se possível'
          ],
          createdAt: new Date().toISOString()
        });
      }

      if (seasonalityData.isSeasonalLow) {
        insights.push({
          id: `seasonality-low-${seasonalityData.month}`,
          type: 'positive',
          title: `${seasonalityData.monthName} é Mês de Baixa`,
          description: `${seasonalityData.monthName} historicamente tem despesas ${Math.abs(seasonalityData.variancePercent).toFixed(0)}% abaixo da média. Bom momento para reservas.`,
          impact: 'low',
          category: 'Sazonalidade',
          value: seasonalityData.currentValue,
          comparison: `Média histórica: R$ ${seasonalityData.historicalAverage.toLocaleString('pt-BR')}`,
          actionable: true,
          suggestions: [
            'Aproveite para construir reservas',
            'Considere investimentos de curto prazo',
            'Planeje despesas maiores para este período'
          ],
          createdAt: new Date().toISOString()
        });
      }

      // Insight 3: Alerta de próximo mês de pico
      const nextMonthPeak = await this.checkNextMonthPeak(filters, thresholds);
      if (nextMonthPeak) {
        insights.push(nextMonthPeak);
      }

      return insights;
    } catch (error) {
      log.error({ err: error }, 'Error generating seasonality insights');
      return insights;
    }
  }

  /**
   * Obter dados de um mês específico
   */
  private static async getMonthData(
    year: number,
    month: number,
    filters: SeasonalityFilters
  ): Promise<{ totalExpenses: number; totalIncome: number }> {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

      const whereConditions: Parameters<typeof and>[0][] = [
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      ];

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const result = await db
        .select({
          totalExpenses: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
          totalIncome: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number)
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(...whereConditions));

      return {
        totalExpenses: result[0]?.totalExpenses || 0,
        totalIncome: result[0]?.totalIncome || 0
      };
    } catch (error) {
      log.error({ err: error }, 'Error getting month data');
      return { totalExpenses: 0, totalIncome: 0 };
    }
  }

  /**
   * Obter média histórica de um mês específico
   */
  private static async getHistoricalMonthAverage(
    month: number,
    filters: SeasonalityFilters,
    yearsBack: number = 3
  ): Promise<{ average: number; dataPoints: number }> {
    try {
      const currentYear = new Date().getFullYear();
      let totalExpenses = 0;
      let dataPoints = 0;

      for (let i = 1; i <= yearsBack; i++) {
        const year = currentYear - i;
        const data = await this.getMonthData(year, month, filters);

        if (data.totalExpenses > 0) {
          totalExpenses += data.totalExpenses;
          dataPoints++;
        }
      }

      return {
        average: dataPoints > 0 ? totalExpenses / dataPoints : 0,
        dataPoints
      };
    } catch (error) {
      log.error({ err: error }, 'Error getting historical average');
      return { average: 0, dataPoints: 0 };
    }
  }

  /**
   * Verificar se o próximo mês é historicamente um mês de pico
   */
  private static async checkNextMonthPeak(
    filters: SeasonalityFilters,
    thresholds: InsightThresholds
  ): Promise<Insight | null> {
    try {
      const now = new Date();
      const nextMonth = now.getMonth() + 2; // +1 para 1-indexed, +1 para próximo mês
      const nextMonthAdjusted = nextMonth > 12 ? 1 : nextMonth;

      const historicalData = await this.getHistoricalMonthAverage(nextMonthAdjusted, filters, 3);

      if (historicalData.dataPoints < 2) {
        return null; // Dados insuficientes
      }

      // Comparar com média geral
      const allMonthsAverage = await this.getOverallMonthlyAverage(filters);

      if (allMonthsAverage === 0) {
        return null;
      }

      const variance = ((historicalData.average - allMonthsAverage) / allMonthsAverage) * 100;

      if (variance > thresholds.seasonality.varianceThreshold * 100) {
        return {
          id: `seasonality-upcoming-peak-${nextMonthAdjusted}`,
          type: 'recommendation',
          title: `Prepare-se: ${MONTH_NAMES[nextMonthAdjusted - 1]} Vem Aí`,
          description: `${MONTH_NAMES[nextMonthAdjusted - 1]} historicamente tem despesas ${variance.toFixed(0)}% acima da média. Planeje seu caixa.`,
          impact: 'medium',
          category: 'Sazonalidade',
          value: historicalData.average,
          comparison: `Média mensal geral: R$ ${allMonthsAverage.toLocaleString('pt-BR')}`,
          actionable: true,
          suggestions: [
            `Reserve R$ ${(historicalData.average - allMonthsAverage).toLocaleString('pt-BR')} extra`,
            'Antecipe negociações com fornecedores',
            'Revise despesas não essenciais'
          ],
          createdAt: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      log.error({ err: error }, 'Error checking next month peak');
      return null;
    }
  }

  /**
   * Obter média mensal geral (todos os meses)
   */
  private static async getOverallMonthlyAverage(filters: SeasonalityFilters): Promise<number> {
    try {
      let totalExpenses = 0;
      let months = 0;

      // Últimos 12 meses
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);

        const data = await this.getMonthData(
          date.getFullYear(),
          date.getMonth() + 1,
          filters
        );

        if (data.totalExpenses > 0) {
          totalExpenses += data.totalExpenses;
          months++;
        }
      }

      return months > 0 ? totalExpenses / months : 0;
    } catch (error) {
      log.error({ err: error }, 'Error getting overall monthly average');
      return 0;
    }
  }
}
