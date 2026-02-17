import { db } from '@/lib/db/drizzle';
import { transactions, accounts, categories } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, isNotNull } from 'drizzle-orm';
import type { Insight, RecurringExpense, InsightThresholds } from '@/lib/types';
import { DEFAULT_THRESHOLDS } from './threshold.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('recurrence');

interface RecurrenceFilters {
  companyId?: string;
  accountId?: string;
  period?: string; // YYYY-MM
}

export default class RecurrenceService {
  /**
   * Detectar despesas recorrentes
   */
  static async detectRecurringExpenses(
    filters: RecurrenceFilters,
    thresholds: InsightThresholds = DEFAULT_THRESHOLDS
  ): Promise<RecurringExpense[]> {
    try {
      // Buscar transações dos últimos 4 meses
      const now = new Date();
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

      const startDate = `${fourMonthsAgo.getFullYear()}-${(fourMonthsAgo.getMonth() + 1).toString().padStart(2, '0')}-01`;
      const endDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      const whereConditions: Parameters<typeof and>[0][] = [
        eq(transactions.type, 'debit'),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      ];

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(eq(transactions.accountId, filters.accountId));
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const allTransactions = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          date: transactions.transactionDate,
          categoryName: categories.name,
          categoryId: transactions.categoryId
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(...whereConditions))
        .orderBy(desc(transactions.transactionDate));

      // Agrupar por descrição normalizada
      const groupedByDescription = this.groupTransactionsByDescription(allTransactions);

      // Identificar recorrências
      const recurringExpenses: RecurringExpense[] = [];

      for (const [normalizedDesc, txns] of Object.entries(groupedByDescription)) {
        // Precisa de pelo menos 2 ocorrências para ser considerado recorrente
        if (txns.length < 2) continue;

        // Verificar se os valores são similares (dentro da tolerância)
        const values = txns.map(t => Math.abs(Number(t.amount)));
        const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

        // Calcular variância dos valores
        const maxVariance = Math.max(...values.map(v => Math.abs(v - avgValue) / avgValue));

        // Se a variância máxima estiver dentro da tolerância, é recorrente
        if (maxVariance <= thresholds.recurrence.valueTolerance) {
          const currentMonthTxn = txns.find(t => {
            const txnDate = new Date(t.date);
            return txnDate.getMonth() === now.getMonth() &&
                   txnDate.getFullYear() === now.getFullYear();
          });

          const currentValue = currentMonthTxn
            ? Math.abs(Number(currentMonthTxn.amount))
            : 0;

          const variance = currentValue > 0
            ? ((currentValue - avgValue) / avgValue) * 100
            : 0;

          const isAnomaly = Math.abs(variance) > thresholds.recurrence.valueTolerance * 100;

          recurringExpenses.push({
            id: normalizedDesc,
            description: txns[0].description,
            normalizedDescription: normalizedDesc,
            averageValue: avgValue,
            currentValue,
            variance,
            frequency: txns.length,
            lastOccurrence: txns[0].date,
            category: txns[0].categoryName || undefined,
            categoryId: txns[0].categoryId || undefined,
            isAnomaly,
            anomalyReason: isAnomaly
              ? `Valor variou ${variance.toFixed(0)}% em relação à média`
              : undefined
          });
        }
      }

      // Ordenar por valor médio (maiores primeiro)
      recurringExpenses.sort((a, b) => b.averageValue - a.averageValue);

      return recurringExpenses;
    } catch (error) {
      log.error({ err: error }, 'Error detecting recurring expenses');
      return [];
    }
  }

  /**
   * Gerar insights de recorrência
   */
  static async generateRecurrenceInsights(
    filters: RecurrenceFilters,
    thresholds: InsightThresholds = DEFAULT_THRESHOLDS
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      const recurringExpenses = await this.detectRecurringExpenses(filters, thresholds);

      if (recurringExpenses.length === 0) {
        return insights;
      }

      // Insight 1: Resumo de despesas recorrentes
      const totalRecurring = recurringExpenses.reduce((sum, r) => sum + r.averageValue, 0);

      if (recurringExpenses.length >= 3) {
        insights.push({
          id: 'recurrence-summary',
          type: 'trend',
          title: 'Despesas Recorrentes Identificadas',
          description: `${recurringExpenses.length} despesas recorrentes totalizando R$ ${totalRecurring.toLocaleString('pt-BR')}/mês em média.`,
          impact: 'medium',
          category: 'Recorrência',
          value: totalRecurring,
          actionable: true,
          suggestions: [
            'Revise assinaturas e serviços mensais',
            'Negocie melhores condições para contratos fixos',
            'Considere alternativas mais econômicas'
          ],
          createdAt: new Date().toISOString()
        });
      }

      // Insight 2: Despesas recorrentes com variação anormal
      const anomalies = recurringExpenses.filter(r => r.isAnomaly && r.currentValue > 0);

      for (const anomaly of anomalies.slice(0, 3)) { // Limitar a 3 alertas
        const isIncrease = anomaly.variance > 0;

        insights.push({
          id: `recurrence-anomaly-${anomaly.id.slice(0, 8)}`,
          type: isIncrease ? 'alert' : 'positive',
          title: isIncrease ? 'Despesa Recorrente Aumentou' : 'Despesa Recorrente Diminuiu',
          description: `"${anomaly.description.slice(0, 50)}${anomaly.description.length > 50 ? '...' : ''}" ${isIncrease ? 'aumentou' : 'diminuiu'} ${Math.abs(anomaly.variance).toFixed(0)}% este mês.`,
          impact: Math.abs(anomaly.variance) > 30 ? 'high' : 'medium',
          category: 'Recorrência',
          value: anomaly.currentValue,
          comparison: `Média: R$ ${anomaly.averageValue.toLocaleString('pt-BR')}`,
          actionable: isIncrease,
          suggestions: isIncrease
            ? [
                'Verifique se houve mudança no serviço',
                'Confirme se o valor está correto',
                'Considere renegociar o contrato'
              ]
            : [
                'Documente a razão da redução',
                'Avalie se pode manter a economia'
              ],
          createdAt: new Date().toISOString()
        });
      }

      // Insight 3: Despesas que não vieram este mês (possível esquecimento)
      const missingThisMonth = recurringExpenses.filter(r =>
        r.currentValue === 0 &&
        r.frequency >= 3 // Era bem frequente
      );

      for (const missing of missingThisMonth.slice(0, 2)) {
        insights.push({
          id: `recurrence-missing-${missing.id.slice(0, 8)}`,
          type: 'recommendation',
          title: 'Despesa Recorrente Ausente',
          description: `"${missing.description.slice(0, 40)}${missing.description.length > 40 ? '...' : ''}" não apareceu este mês. Verifique se está tudo ok.`,
          impact: 'low',
          category: 'Recorrência',
          value: missing.averageValue,
          comparison: `Apareceu ${missing.frequency} vezes nos últimos 4 meses`,
          actionable: true,
          suggestions: [
            'Verifique se o pagamento foi realizado',
            'Confirme se o serviço ainda está ativo',
            'Se foi cancelado, ótima economia!'
          ],
          createdAt: new Date().toISOString()
        });
      }

      // Insight 4: Nova assinatura detectada
      const newSubscriptions = recurringExpenses.filter(r => r.frequency === 2);

      for (const newSub of newSubscriptions.slice(0, 2)) {
        if (newSub.averageValue > 100) { // Apenas relevantes
          insights.push({
            id: `recurrence-new-${newSub.id.slice(0, 8)}`,
            type: 'trend',
            title: 'Nova Despesa Recorrente',
            description: `"${newSub.description.slice(0, 40)}${newSub.description.length > 40 ? '...' : ''}" apareceu 2 meses seguidos. Valor: R$ ${newSub.averageValue.toLocaleString('pt-BR')}/mês.`,
            impact: 'low',
            category: 'Recorrência',
            value: newSub.averageValue,
            actionable: false,
            suggestions: [
              'Confirme se este gasto está planejado',
              'Avalie o custo-benefício do serviço'
            ],
            createdAt: new Date().toISOString()
          });
        }
      }

      return insights;
    } catch (error) {
      log.error({ err: error }, 'Error generating recurrence insights');
      return insights;
    }
  }

  /**
   * Agrupar transações por descrição normalizada
   */
  private static groupTransactionsByDescription(
    txns: Array<{
      id: string;
      description: string;
      amount: string | number;
      date: string;
      categoryName: string | null;
      categoryId: string | null;
    }>
  ): Record<string, typeof txns> {
    const groups: Record<string, typeof txns> = {};

    for (const txn of txns) {
      const normalized = this.normalizeDescription(txn.description);

      if (!groups[normalized]) {
        groups[normalized] = [];
      }
      groups[normalized].push(txn);
    }

    return groups;
  }

  /**
   * Normalizar descrição para agrupamento
   * Remove números, datas e caracteres especiais para encontrar padrões
   */
  private static normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/\d{2}\/\d{2}(\/\d{2,4})?/g, '') // Remove datas
      .replace(/\d+/g, '') // Remove números
      .replace(/[^\w\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
      .slice(0, 50); // Limita tamanho
  }

  /**
   * Obter total de despesas recorrentes do mês atual
   */
  static async getRecurringTotal(filters: RecurrenceFilters): Promise<number> {
    const recurring = await this.detectRecurringExpenses(filters);
    return recurring.reduce((sum, r) => sum + r.currentValue, 0);
  }
}
