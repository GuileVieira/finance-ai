import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts } from '@/lib/db/schema';
import { Insight } from '@/lib/types';
import { eq, and, gte, lte, sum, count, avg, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

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

      if (filters.accountId) {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId) {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = and(...whereConditions);

      // Buscar dados para análise
      const analysisData = await this.getAnalysisData(whereClause);

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
  private static async getAnalysisData(whereClause: any) {
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
      .orderBy(desc(sql`ABS(${transactions.amount})`))
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
    const trends = await this.getTrendData(whereClause);

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
    const profitMargin = metrics.totalIncome > 0
      ? ((metrics.totalIncome - metrics.totalExpenses) / metrics.totalIncome) * 100
      : 0;

    if (profitMargin < 10) {
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
    } else if (profitMargin > 30) {
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
      const categoryPercentage = metrics.totalIncome > 0
        ? (topCategory.totalAmount / metrics.totalIncome) * 100
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
    if (trends.growthRate !== undefined) {
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
  private static async getTrendData(currentWhereClause: any) {
    try {
      // Para simplificar, vamos retornar dados básicos
      // Em uma implementação completa, você compararia com o período anterior
      return {
        growthRate: 0, // Seria calculado comparando com período anterior
        periodOverPeriod: 0
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

    const [year, month] = period.split('-').map(Number);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[month - 1]} ${year}`;
  }
}