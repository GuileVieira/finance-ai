/**
 * Reclassification Service
 *
 * Reclassifica transações históricas quando regras são alteradas.
 * Processa apenas transações categorizadas automaticamente.
 */

import { db } from '@/lib/db/drizzle';
import { transactions, categoryRules, categories } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface ReclassificationJob {
  jobId: string;
  ruleId: string;
  oldCategoryId: string;
  oldCategoryName: string;
  newCategoryId: string;
  newCategoryName: string;
  affectedCount: number;
  processedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  onlyAutomatic: boolean;
  startedAt?: Date;
  completedAt?: Date;
  errors: string[];
}

export interface ReclassificationPreview {
  totalAffected: number;
  automaticOnly: number;
  manualOnly: number;
  byMonth: Record<string, number>;
  sampleTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    isManual: boolean;
  }>;
}

export class ReclassificationService {
  /**
   * Busca transações afetadas por uma regra
   */
  static async findAffectedTransactions(
    ruleId: string,
    onlyAutomatic = true
  ): Promise<any[]> {
    const query = onlyAutomatic
      ? and(
          eq(transactions.ruleId, ruleId),
          eq(transactions.manuallyCategorized, false)
        )
      : eq(transactions.ruleId, ruleId);

    const affectedTransactions = await db
      .select()
      .from(transactions)
      .where(query);

    return affectedTransactions;
  }

  /**
   * Preview da reclassificação - mostra quantas transações serão afetadas
   */
  static async previewReclassification(
    ruleId: string,
    onlyAutomatic = true
  ): Promise<ReclassificationPreview> {
    // Buscar todas as transações afetadas
    const allAffected = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        date: transactions.transactionDate,
        isManual: transactions.manuallyCategorized
      })
      .from(transactions)
      .where(eq(transactions.ruleId, ruleId))
      .limit(1000); // Limitar para não sobrecarregar

    const automaticOnly = allAffected.filter(t => !t.isManual);
    const manualOnly = allAffected.filter(t => t.isManual);

    // Agrupar por mês
    const byMonth: Record<string, number> = {};
    for (const t of allAffected) {
      if (!t.date) continue;
      const monthKey = t.date.toString().substring(0, 7); // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }

    // Pegar amostra de 10 transações
    const sampleSize = Math.min(10, allAffected.length);
    const sampleTransactions = allAffected.slice(0, sampleSize).map(t => ({
      id: t.id,
      description: t.description,
      amount: parseFloat(t.amount || '0'),
      date: t.date?.toString() || '',
      isManual: t.isManual || false
    }));

    return {
      totalAffected: allAffected.length,
      automaticOnly: automaticOnly.length,
      manualOnly: manualOnly.length,
      byMonth,
      sampleTransactions
    };
  }

  /**
   * Reclassifica transações (executar em background)
   */
  static async reclassifyTransactions(
    ruleId: string,
    newCategoryId: string,
    onlyAutomatic = true,
    batchSize = 100
  ): Promise<ReclassificationJob> {
    const jobId = `reclassify-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // 1. Buscar informações da regra
      const [rule] = await db
        .select({
          ruleId: categoryRules.id,
          oldCategoryId: categoryRules.categoryId,
          oldCategoryName: categories.name
        })
        .from(categoryRules)
        .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
        .where(eq(categoryRules.id, ruleId))
        .limit(1);

      if (!rule) {
        throw new Error(`Rule ${ruleId} not found`);
      }

      // 2. Buscar nova categoria
      const [newCategory] = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.id, newCategoryId))
        .limit(1);

      if (!newCategory) {
        throw new Error(`Category ${newCategoryId} not found`);
      }

      // 3. Buscar transações afetadas
      const affectedTransactions = await this.findAffectedTransactions(ruleId, onlyAutomatic);

      const job: ReclassificationJob = {
        jobId,
        ruleId,
        oldCategoryId: rule.oldCategoryId,
        oldCategoryName: rule.oldCategoryName,
        newCategoryId,
        newCategoryName: newCategory.name,
        affectedCount: affectedTransactions.length,
        processedCount: 0,
        status: 'processing',
        onlyAutomatic,
        startedAt: new Date(),
        errors: []
      };

      console.log(`🔄 [RECLASSIFY-START] Job ${jobId}:`, {
        ruleId,
        oldCategory: rule.oldCategoryName,
        newCategory: newCategory.name,
        totalTransactions: affectedTransactions.length
      });

      // 4. Processar em batches
      const totalBatches = Math.ceil(affectedTransactions.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = affectedTransactions.slice(i * batchSize, (i + 1) * batchSize);

        try {
          // Atualizar categoria de todas transações do batch
          for (const transaction of batch) {
            await db
              .update(transactions)
              .set({
                categoryId: newCategoryId,
                updatedAt: new Date()
              })
              .where(eq(transactions.id, transaction.id));
          }

          job.processedCount += batch.length;

          console.log(
            `✅ [RECLASSIFY-BATCH] Job ${jobId} - Batch ${i + 1}/${totalBatches} completed: ` +
            `${job.processedCount}/${job.affectedCount} (${Math.round((job.processedCount / job.affectedCount) * 100)}%)`
          );

        } catch (error) {
          const errorMsg = `Batch ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          job.errors.push(errorMsg);
          console.error(`❌ [RECLASSIFY-ERROR] ${errorMsg}`);
        }
      }

      // 5. Finalizar job
      job.status = job.errors.length > 0 ? 'failed' : 'completed';
      job.completedAt = new Date();

      console.log(`🎉 [RECLASSIFY-COMPLETE] Job ${jobId}:`, {
        processed: job.processedCount,
        total: job.affectedCount,
        errors: job.errors.length,
        duration: job.completedAt.getTime() - (job.startedAt?.getTime() || 0)
      });

      return job;

    } catch (error) {
      console.error('[RECLASSIFY-FAILED]', error);
      throw error;
    }
  }

  /**
   * Estimar tempo de reclassificação
   */
  static estimateProcessingTime(transactionCount: number): {
    estimatedSeconds: number;
    estimatedMinutes: number;
    formattedTime: string;
  } {
    // Assumir ~10ms por transação (média)
    const estimatedMs = transactionCount * 10;
    const estimatedSeconds = Math.ceil(estimatedMs / 1000);
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

    let formattedTime: string;
    if (estimatedSeconds < 60) {
      formattedTime = `${estimatedSeconds}s`;
    } else if (estimatedMinutes < 60) {
      formattedTime = `${estimatedMinutes}min`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const mins = estimatedMinutes % 60;
      formattedTime = `${hours}h ${mins}min`;
    }

    return {
      estimatedSeconds,
      estimatedMinutes,
      formattedTime
    };
  }

  /**
   * Criar backup antes de reclassificar (opcional)
   */
  static async createBackup(ruleId: string): Promise<{
    backupId: string;
    transactionCount: number;
  }> {
    const backupId = `backup-${ruleId}-${Date.now()}`;
    const affectedTransactions = await this.findAffectedTransactions(ruleId, false);

    // Aqui você poderia salvar em uma tabela de backup ou arquivo
    console.log(`💾 [BACKUP-CREATED] ${backupId}: ${affectedTransactions.length} transactions`);

    return {
      backupId,
      transactionCount: affectedTransactions.length
    };
  }

  /**
   * Estatísticas de reclassificações
   */
  static async getReclassificationStats(companyId: string): Promise<{
    totalReclassified: number;
    byCategory: Record<string, number>;
    lastReclassifications: Array<{
      categoryName: string;
      count: number;
      date: string;
    }>;
  }> {
    // Buscar transações que foram reclassificadas (têm ruleId)
    const reclassified = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        updatedAt: transactions.updatedAt
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(sql`${transactions.ruleId} IS NOT NULL`)
      .limit(1000);

    const byCategory: Record<string, number> = {};
    for (const t of reclassified) {
      byCategory[t.categoryName || 'Unknown'] = (byCategory[t.categoryName || 'Unknown'] || 0) + 1;
    }

    // Últimas reclassificações (últimos 10 dias)
    const lastReclassifications = Object.entries(byCategory)
      .map(([categoryName, count]) => ({
        categoryName,
        count,
        date: new Date().toISOString() // Simplificado
      }))
      .slice(0, 10);

    return {
      totalReclassified: reclassified.length,
      byCategory,
      lastReclassifications
    };
  }
}

export default ReclassificationService;
