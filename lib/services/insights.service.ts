import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts } from '@/lib/db/schema';
import type { Insight } from '@/lib/types';
import { eq, and, gte, lte, sum, count, avg, desc, isNotNull, ne } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export interface AccuracyStats {
  averageAccuracy: number;
  totalCategorized: number;
  totalTransactions: number;
}

export interface CategoryStats {
  activeCategories: number;
  usedCategories: number;
  totalCategories: number;
}

export interface TopCategoryInfo {
  categoryName: string;
  percentage: number;
  type: string;
}

export interface SimpleInsightsResponse {
  insights: string[];
  isEmpty: boolean;
  emptyMessage?: string;
  stats?: {
    accuracy: AccuracyStats;
    categories: CategoryStats;
    topCategory?: TopCategoryInfo;
  };
}

export interface InsightsFilters {
  period?: string;
  category?: string;
  type?: 'alert' | 'recommendation' | 'positive' | 'trend';
  companyId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

export default class InsightsService {
  /**
   * Converter período para datas
   */
  static convertPeriodToDates(period: string): { startDate: string; endDate: string } {
    const now = new Date();
    
    if (!period || period === 'current') {
      // Mês atual
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      return { startDate, endDate };
    }

    if (period === 'all') {
      // Últimos 12 meses como default para "todos" ou todo o histórico
      // Para simplificar, pegamos desde o início do ano passado
      const year = now.getFullYear() - 1;
      return { 
        startDate: `${year}-01-01`, 
        endDate: `${now.getFullYear()}-12-31` 
      };
    }

    // Formato YYYY-MM
    try {
      const [year, month] = period.split('-').map(Number);
      if (!year || !month) throw new Error('Invalid format');
      
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      return { startDate, endDate };
    } catch (e) {
      // Fallback para mês atual
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      return { startDate, endDate };
    }
  }

  /**
   * Gerar insights financeiros baseados nos dados
   */
  static async getFinancialInsights(filters: InsightsFilters = {}): Promise<{
    insights: Insight[];
    total: number;
    period: string;
  }> {
    try {
      const { startDate, endDate } = this.convertPeriodToDates(filters.period || 'current');

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

      const whereClause = and(...whereConditions);

      // Buscar dados para análise
      const analysisData = await this.getAnalysisData(whereClause, filters);

      // Gerar insights baseados na análise
      const insights = await this.generateInsights(analysisData, filters);

      // Filtrar insights se necessário
      let filteredInsights = insights;
      if (filters.category) {
        filteredInsights = insights.filter(insight =>
          insight.category?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }

      if (filters.type) {
        filteredInsights = filteredInsights.filter(insight =>
          insight.type === filters.type
        );
      }

      // Ordenar por impacto
      filteredInsights.sort((a, b) => {
        const impactOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      });

      return {
        insights: filteredInsights,
        total: filteredInsights.length,
        period: this.formatPeriodLabel(filters.period || 'current')
      };

    } catch (error) {
      console.error('Error generating financial insights:', error);
      throw new Error('Failed to generate financial insights');
    }
  }

  /**
   * Buscar dados para análise
   */
  private static async getAnalysisData(whereClause: any, filters?: InsightsFilters) {
    // Métricas gerais
    const metrics = await db
      .select({
        totalIncome: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number),
        totalExpenses: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
        transactionCount: count(transactions.id).mapWith(Number),
        avgTransaction: avg(sql`ABS(${transactions.amount})`).mapWith(Number),
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(whereClause);

    // Análise por categoria
    const categoryAnalysis = await db
      .select({
        categoryName: categories.name,
        categoryType: categories.type,
        totalAmount: sum(sql`ABS(${transactions.amount})`).mapWith(Number),
        transactionCount: count(transactions.id).mapWith(Number),
        avgAmount: avg(sql`ABS(${transactions.amount})`).mapWith(Number),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(whereClause)
      .groupBy(categories.name, categories.type)
      .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`))
      .limit(10);

    // Maiores despesas
    const topExpenses = await db
      .select({
        description: transactions.description,
        amount: transactions.amount,
        category: categories.name,
        date: transactions.transactionDate,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(whereClause, eq(transactions.type, 'debit')))
      .orderBy(desc(sql`ABS(${transactions.amount})`))
      .limit(5);

    // Tendências (comparação com período anterior)
    const trends = await this.getTrendData(filters);

    return {
      metrics: metrics[0] || {
        totalIncome: 0,
        totalExpenses: 0,
        transactionCount: 0,
        avgTransaction: 0,
      },
      categoryAnalysis,
      topExpenses,
      trends
    };
  }

  /**
   * Gerar insights baseados nos dados
   */
  private static async generateInsights(data: any, filters: InsightsFilters): Promise<Insight[]> {
    const insights: Insight[] = [];
    const { metrics, categoryAnalysis, topExpenses, trends } = data;

    // Insight 1: Saúde financeira geral
    const profitMarginRaw = metrics.totalIncome > 0
      ? ((metrics.totalIncome - metrics.totalExpenses) / metrics.totalIncome) * 100
      : 0;

    // Limitar margem de lucro a -100% mínimo (você não pode perder mais de 100% do que ganhou)
    const profitMargin = Math.max(-100, profitMarginRaw);

    if (metrics.totalIncome > 0 && profitMargin < 10) {
      insights.push({
        id: 'profit-margin-low',
        type: 'alert',
        title: 'Margem de Lucro Baixa',
        description: `Sua margem de lucro é de ${profitMargin.toFixed(1)}%. Considere revisar custos ou aumentar receitas.`,
        impact: 'high',
        category: 'Rentabilidade',
        actionable: true,
        suggestions: [
          'Analise categorias de despesa com maior impacto',
          'Negocie melhores condições com fornecedores',
          'Revise precificação de produtos/serviços'
        ],
        createdAt: new Date().toISOString()
      });
    } else if (metrics.totalIncome > 0 && profitMargin > 30) {
      insights.push({
        id: 'profit-margin-good',
        type: 'positive',
        title: 'Excelente Margem de Lucro',
        description: `Sua margem de lucro de ${profitMargin.toFixed(1)}% está muito saudável!`,
        impact: 'medium',
        category: 'Rentabilidade',
        actionable: false,
        suggestions: [
          'Considere investir o excedente',
          'Avaliar oportunidades de expansão'
        ],
        createdAt: new Date().toISOString()
      });
    }

    // Insight 2: Análise de categorias
    if (categoryAnalysis.length > 0) {
      const topCategory = categoryAnalysis[0];

      // Calcular percentual correto: despesas da categoria / total de despesas
      const categoryPercentage = metrics.totalExpenses > 0
        ? (topCategory.totalAmount / metrics.totalExpenses) * 100
        : 0;

      if (categoryPercentage > 40 && topCategory.categoryType !== 'revenue') {
        insights.push({
          id: 'category-concentration',
          type: 'alert',
          title: 'Alta Concentração em Categoria',
          description: `${topCategory.categoryName} representa ${categoryPercentage.toFixed(1)}% dos seus gastos.`,
          impact: 'medium',
          category: 'Custos',
          actionable: true,
          suggestions: [
            `Analise detalhadamente os gastos com ${topCategory.categoryName}`,
            'Busque alternativas mais econômicas',
            'Considere reduzir frequência desses gastos'
          ],
          createdAt: new Date().toISOString()
        });
      }
    }

    // Insight 3: Tamanho médio das transações
    if (metrics.avgTransaction > 0) {
      if (metrics.avgTransaction > 5000) {
        insights.push({
          id: 'high-avg-transaction',
          type: 'trend',
          title: 'Transações de Alto Valor',
          description: `O valor médio das suas transações é R$ ${metrics.avgTransaction.toFixed(2)}.`,
          impact: 'low',
          category: 'Padrões',
          actionable: false,
          suggestions: [
            'Monitore grandes transações de perto',
            'Considere quebrar grandes pagamentos'
          ],
          createdAt: new Date().toISOString()
        });
      }
    }

    // Insight 4: Frequência de transações
    if (metrics.transactionCount > 0) {
      const dailyAvg = metrics.transactionCount / 30; // Assumindo mês de 30 dias
      if (dailyAvg > 10) {
        insights.push({
          id: 'high-frequency',
          type: 'recommendation',
          title: 'Alta Frequência de Transações',
          description: `Você faz em média ${dailyAvg.toFixed(1)} transações por dia.`,
          impact: 'low',
          category: 'Padrões',
          actionable: true,
          suggestions: [
            'Considere agrupar despesas similares',
            'Automatize pagamentos recorrentes',
            'Revise assinaturas e serviços'
          ],
          createdAt: new Date().toISOString()
        });
      }
    }

    // Insight 5: Tendências
    if (trends.growthRate !== undefined && trends.growthRate !== 0) {
      if (trends.growthRate > 20) {
        insights.push({
          id: 'high-growth',
          type: 'positive',
          title: 'Forte Crescimento',
          description: `Suas receitas cresceram ${trends.growthRate.toFixed(1)}% em relação ao período anterior.`,
          impact: 'high',
          category: 'Crescimento',
          actionable: false,
          suggestions: [
            'Mantenha o foco nas estratégias atuais',
            'Avalie escalabilidade dos processos'
          ],
          createdAt: new Date().toISOString()
        });
      } else if (trends.growthRate < -10) {
        insights.push({
          id: 'declining-revenue',
          type: 'alert',
          title: 'Queda nas Receitas',
          description: `Suas receitas caíram ${Math.abs(trends.growthRate).toFixed(1)}% em relação ao período anterior.`,
          impact: 'high',
          category: 'Crescimento',
          actionable: true,
          suggestions: [
            'Investigue causas da queda',
            'Foque em recuperação de clientes',
            'Revise estratégias de marketing/vendas'
          ],
          createdAt: new Date().toISOString()
        });
      }
    }

    // Insight 6: Maiores despesas
    if (topExpenses.length > 0) {
      const topExpense = topExpenses[0];
      insights.push({
        id: 'top-expense',
        type: 'trend',
        title: 'Maior Despesa do Período',
        description: `Sua maior despesa foi "${topExpense.description}" no valor de R$ ${Math.abs(Number(topExpense.amount)).toFixed(2)}.`,
        impact: 'low',
        category: 'Despesas',
        actionable: false,
        suggestions: [
          'Monitore este tipo de despesa',
          'Busque otimizar quando possível'
        ],
        createdAt: new Date().toISOString()
      });
    }

    // Insight 7: Recomendação geral
    if (metrics.totalIncome > 0 && metrics.totalExpenses > 0) {
      const efficiency = (metrics.totalIncome / metrics.totalExpenses) * 100;
      if (efficiency > 150) {
        insights.push({
          id: 'efficient-management',
          type: 'positive',
          title: 'Gestão Eficiente',
          description: 'Sua gestão financeira está muito eficiente com excelente controle dos custos.',
          impact: 'medium',
          category: 'Gestão',
          actionable: false,
          suggestions: [
            'Continue com as práticas atuais',
            'Compartilhe conhecimento com equipe'
          ],
          createdAt: new Date().toISOString()
        });
      } else if (efficiency < 110) {
        insights.push({
          id: 'inefficient-management',
          type: 'recommendation',
          title: 'Oportunidade de Otimização',
          description: 'Há espaço para melhorar a eficiência na gestão financeira.',
          impact: 'medium',
          category: 'Gestão',
          actionable: true,
          suggestions: [
            'Implemente controle orçamentário',
            'Revise processos de aprovação',
            'Estabeleça metas de redução de custos'
          ],
          createdAt: new Date().toISOString()
        });
      }
    }

    return insights;
  }

  /**
   * Obter dados de tendência
   */
  private static async getTrendData(filters: InsightsFilters = {}) {
    try {
      // Se não tiver período definido ou for 'all', não faz sentido calcular tendência mês a mês
      if (!filters.period || filters.period === 'all') {
        return { growthRate: 0, periodOverPeriod: 0 };
      }

      const currentPeriod = this.convertPeriodToDates(filters.period);
      
      // Calcular período anterior (mês anterior)
      const currentDate = new Date(currentPeriod.startDate);
      const prevDate = new Date(currentDate);
      prevDate.setMonth(currentDate.getMonth() - 1);
      
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      const prevPeriodStr = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
      const prevPeriod = this.convertPeriodToDates(prevPeriodStr);

      // Filtros base comuns
      const baseConditions: any[] = [];
      if (filters.accountId && filters.accountId !== 'all') {
        baseConditions.push(eq(transactions.accountId, filters.accountId));
      }
      if (filters.companyId && filters.companyId !== 'all') {
        baseConditions.push(eq(accounts.companyId, filters.companyId));
      }

      // Receita Atual
      const currentConditions = [
        ...baseConditions,
        gte(transactions.transactionDate, currentPeriod.startDate),
        lte(transactions.transactionDate, currentPeriod.endDate),
        eq(transactions.type, 'credit')
      ];

      const currentIncomeResult = await db
        .select({ total: sum(transactions.amount).mapWith(Number) })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(...currentConditions));
      
      const currentIncome = currentIncomeResult[0]?.total || 0;

      // Receita Anterior
      const prevConditions = [
        ...baseConditions,
        gte(transactions.transactionDate, prevPeriod.startDate),
        lte(transactions.transactionDate, prevPeriod.endDate),
        eq(transactions.type, 'credit')
      ];

      const prevIncomeResult = await db
        .select({ total: sum(transactions.amount).mapWith(Number) })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(...prevConditions));
      
      const prevIncome = prevIncomeResult[0]?.total || 0;

      // Calcular crescimento
      let growthRate = 0;
      if (prevIncome > 0) {
        growthRate = ((currentIncome - prevIncome) / prevIncome) * 100;
      } else if (currentIncome > 0) {
        growthRate = 100; // Crescimento infinito (de 0 para algo)
      }

      return {
        growthRate,
        periodOverPeriod: growthRate // Usando o mesmo valor por enquanto
      };
    } catch (error) {
      console.error('Error getting trend data:', error);
      return { growthRate: 0, periodOverPeriod: 0 };
    }
  }

  /**
   * Format period label
   */
  private static formatPeriodLabel(period: string): string {
    if (!period || period === 'current') {
      const now = new Date();
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    }

    if (period === 'all') return 'Todo o Período';

    try {
      const [year, month] = period.split('-').map(Number);
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return `${months[month - 1]} ${year}`;
    } catch {
      return period;
    }
  }

  /**
   * Calcular taxa de acurácia real baseado no campo confidence das transações
   */
  static async getAccuracyRate(filters: InsightsFilters = {}): Promise<AccuracyStats> {
    try {
      const whereConditions: Parameters<typeof and>[0][] = [];

      if (filters.period && filters.period !== 'all') {
        const { startDate, endDate } = this.convertPeriodToDates(filters.period);
        whereConditions.push(gte(transactions.transactionDate, startDate));
        whereConditions.push(lte(transactions.transactionDate, endDate));
      }

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      // Total de transações
      const totalResult = await db
        .select({ count: count(transactions.id).mapWith(Number) })
        .from(transactions)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const totalTransactions = totalResult[0]?.count || 0;

      // Transações categorizadas com confidence > 0
      const categorizedConditions = [
        ...whereConditions,
        isNotNull(transactions.categoryId),
        sql`${transactions.confidence} > 0`
      ];

      const categorizedResult = await db
        .select({
          count: count(transactions.id).mapWith(Number),
          avgConfidence: avg(transactions.confidence).mapWith(Number)
        })
        .from(transactions)
        .where(and(...categorizedConditions));

      const totalCategorized = categorizedResult[0]?.count || 0;
      const averageAccuracy = categorizedResult[0]?.avgConfidence || 0;

      return {
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        totalCategorized,
        totalTransactions
      };
    } catch (error) {
      console.error('Error getting accuracy rate:', error);
      return { averageAccuracy: 0, totalCategorized: 0, totalTransactions: 0 };
    }
  }

  /**
   * Obter estatísticas de categorias
   */
  static async getCategoryStats(filters: InsightsFilters = {}): Promise<CategoryStats> {
    try {
      const companyConditions: Parameters<typeof and>[0][] = [];

      if (filters.companyId && filters.companyId !== 'all') {
        companyConditions.push(eq(categories.companyId, filters.companyId));
      }

      // Total de categorias
      const totalResult = await db
        .select({ count: count(categories.id).mapWith(Number) })
        .from(categories)
        .where(companyConditions.length > 0 ? and(...companyConditions) : undefined);

      // Categorias ativas
      const activeResult = await db
        .select({ count: count(categories.id).mapWith(Number) })
        .from(categories)
        .where(and(
          ...(companyConditions.length > 0 ? companyConditions : []),
          eq(categories.active, true)
        ));

      // Categorias em uso (que têm transações)
      const transactionConditions: Parameters<typeof and>[0][] = [];

      if (filters.period && filters.period !== 'all') {
        const { startDate, endDate } = this.convertPeriodToDates(filters.period);
        transactionConditions.push(gte(transactions.transactionDate, startDate));
        transactionConditions.push(lte(transactions.transactionDate, endDate));
      }

      if (filters.accountId && filters.accountId !== 'all') {
        transactionConditions.push(eq(transactions.accountId, filters.accountId));
      }

      const usedResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${transactions.categoryId})`.mapWith(Number) })
        .from(transactions)
        .where(and(
          isNotNull(transactions.categoryId),
          ...(transactionConditions.length > 0 ? transactionConditions : [])
        ));

      return {
        totalCategories: totalResult[0]?.count || 0,
        activeCategories: activeResult[0]?.count || 0,
        usedCategories: usedResult[0]?.count || 0
      };
    } catch (error) {
      console.error('Error getting category stats:', error);
      return { totalCategories: 0, activeCategories: 0, usedCategories: 0 };
    }
  }

  /**
   * Obter categoria principal de custos
   */
  static async getTopCategoryPercentage(filters: InsightsFilters = {}): Promise<TopCategoryInfo | null> {
    try {
      const whereConditions: Parameters<typeof and>[0][] = [
        eq(transactions.type, 'debit'),
        isNotNull(transactions.categoryId)
      ];

      if (filters.period && filters.period !== 'all') {
        const { startDate, endDate } = this.convertPeriodToDates(filters.period);
        whereConditions.push(gte(transactions.transactionDate, startDate));
        whereConditions.push(lte(transactions.transactionDate, endDate));
      }

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      // Total de despesas
      const totalExpensesResult = await db
        .select({ total: sum(sql`ABS(${transactions.amount})`).mapWith(Number) })
        .from(transactions)
        .where(and(...whereConditions));

      const totalExpenses = totalExpensesResult[0]?.total || 0;

      if (totalExpenses === 0) return null;

      // Top categoria por valor
      const topCategoryResult = await db
        .select({
          categoryName: categories.name,
          categoryType: categories.type,
          totalAmount: sum(sql`ABS(${transactions.amount})`).mapWith(Number)
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(...whereConditions))
        .groupBy(categories.name, categories.type)
        .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`))
        .limit(1);

      if (topCategoryResult.length === 0 || !topCategoryResult[0].categoryName) {
        return null;
      }

      const percentage = (topCategoryResult[0].totalAmount / totalExpenses) * 100;

      return {
        categoryName: topCategoryResult[0].categoryName,
        percentage: Math.round(percentage * 10) / 10,
        type: topCategoryResult[0].categoryType || 'unknown'
      };
    } catch (error) {
      console.error('Error getting top category:', error);
      return null;
    }
  }

  /**
   * Gerar insights simples para dashboard (formato string)
   */
  static async getSimpleInsights(filters: InsightsFilters = {}): Promise<SimpleInsightsResponse> {
    try {
      // Verificar se há dados e gerar insights estendidos
      let extendedInsights: Insight[] = [];
      
      if (filters.period && filters.period !== 'all') {
        try {
          const { startDate, endDate } = this.convertPeriodToDates(filters.period);
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

          const analysisData = await this.getAnalysisData(and(...whereConditions), filters);
          extendedInsights = await this.generateInsights(analysisData, filters);
        } catch (err) {
          console.warn('Failed to generate extended insights for simple view', err);
        }
      }

      const accuracy = await this.getAccuracyRate(filters);

      if (accuracy.totalTransactions === 0) {
        return {
          insights: [],
          isEmpty: true,
          emptyMessage: 'Importe transações para ver insights financeiros personalizados'
        };
      }

      const categoryStats = await this.getCategoryStats(filters);
      const topCategory = await this.getTopCategoryPercentage(filters);

      const insights: string[] = [];

      // Priorizar insights gerados (Alertas e Oportunidades)
      extendedInsights.forEach(insight => {
        // Adicionar emoji baseado no tipo
        const prefix = insight.type === 'alert' ? '⚠️ ' : 
                       insight.type === 'positive' ? '✅ ' : '💡 ';
        insights.push(`${prefix}${insight.title}: ${insight.description}`);
      });

      // Se tivermos poucos insights gerados, complementar com os básicos
      if (insights.length < 5) {
        // Insight 1: Acurácia da categorização
        if (accuracy.totalCategorized > 0) {
          insights.push(`🎯 ${accuracy.averageAccuracy.toFixed(0)}% de acurácia na categorização automática`);
        }

        // Insight 2: Categorias em uso
        if (categoryStats.usedCategories > 0) {
          insights.push(`📂 Categorias financeiras: ${categoryStats.usedCategories}/${categoryStats.activeCategories} em uso`);
        }

        // Insight 3: Categoria principal de custos
        if (topCategory) {
          const typeLabel = this.getCategoryTypeLabel(topCategory.type);
          insights.push(`💰 ${topCategory.categoryName} representa ${topCategory.percentage}% ${typeLabel}`);
        }
      }

      // Limitar a 5 insights para não poluir a UI
      const limitedInsights = insights.slice(0, 5);

      return {
        insights: limitedInsights,
        isEmpty: limitedInsights.length === 0,
        emptyMessage: limitedInsights.length === 0 ? 'Categorize transações para ver insights' : undefined,
        stats: {
          accuracy,
          categories: categoryStats,
          topCategory: topCategory || undefined
        }
      };
    } catch (error) {
      console.error('Error generating simple insights:', error);
      return {
        insights: [],
        isEmpty: true,
        emptyMessage: 'Erro ao gerar insights'
      };
    }
  }

  /**
   * Converter tipo de categoria para label legível
   */
  private static getCategoryTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'fixed_cost': 'dos custos fixos',
      'variable_cost': 'dos custos variáveis',
      'non_operating': 'das despesas não operacionais',
      'revenue': 'das receitas'
    };
    return labels[type] || 'dos custos';
  }
}