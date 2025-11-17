import { db } from '@/lib/db/connection';
import { uploads, processingBatches, transactions, categories } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NewTransaction, NewProcessingBatch, ProcessingBatch } from '@/lib/db/schema';
import _ from 'lodash';
import categoryCacheService from '@/lib/services/category-cache.service';
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { aiCategorizationAdapter } from '@/lib/services/ai-categorization-adapter.service';

export interface BatchProcessingConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  enableCheckpoints: boolean;
}

export interface TransactionData {
  description: string;
  name?: string;
  memo?: string;
  amount: number;
  date: string;
  fitid?: string;
  balance?: number;
}

export interface ProcessingProgress {
  uploadId: string;
  currentBatch: number;
  totalBatches: number;
  processedTransactions: number;
  totalTransactions: number;
  status: 'processing' | 'completed' | 'failed' | 'paused';
  percentage: number;
  estimatedTimeRemaining?: number;
}

export class BatchProcessingService {
  private static instance: BatchProcessingService;
  private config: BatchProcessingConfig = {
    batchSize: 15, // Processar 15 transações por vez
    maxRetries: 3,
    retryDelay: 1000,
    enableCheckpoints: true
  };

  // Limite de processamento paralelo (10 transações simultâneas)
  private readonly PARALLEL_LIMIT = 10;

  // CompanyId para o processamento atual
  private companyId: string = '';

  private constructor() {
    // Configurar serviço de IA
    TransactionCategorizationService.setAIService(aiCategorizationAdapter);
  }

  public static getInstance(): BatchProcessingService {
    if (!BatchProcessingService.instance) {
      BatchProcessingService.instance = new BatchProcessingService();
    }
    return BatchProcessingService.instance;
  }

  /**
   * Preparar upload para processamento em batches
   */
  async prepareUploadForBatchProcessing(
    uploadId: string,
    totalTransactions: number
  ): Promise<void> {
    const totalBatches = Math.ceil(totalTransactions / this.config.batchSize);

    // Atualizar upload com informações de batch
    await db.update(uploads)
      .set({
        status: 'processing',
        totalBatches,
        processedTransactions: 0,
        currentBatch: 0,
        lastProcessedIndex: 0
      })
      .where(eq(uploads.id, uploadId));

    console.log(`🔄 [BATCH-PREP] Upload ${uploadId} preparado:`, {
      totalTransactions,
      totalBatches,
      batchSize: this.config.batchSize
    });
  }

  /**
   * Criar um novo batch de processamento
   */
  async createBatch(
    uploadId: string,
    batchNumber: number,
    totalTransactions: number
  ): Promise<ProcessingBatch> {
    const [batch] = await db.insert(processingBatches)
      .values({
        uploadId,
        batchNumber,
        totalTransactions,
        status: 'pending',
        startedAt: new Date()
      })
      .returning();

    console.log(`📦 [BATCH-CREATE] Batch ${batchNumber}/${totalTransactions} criado para upload ${uploadId}`);
    return batch;
  }

  /**
   * Configurar companyId para o processamento
   */
  setCompanyId(companyId: string): void {
    this.companyId = companyId;
  }

  /**
   * Processar um lote de transações
   */
  async processBatch(
    uploadId: string,
    batchTransactions: TransactionData[],
    accountId: string,
    categoryId: string | null,
    context: {
      fileName?: string;
      bankName?: string;
      companyId?: string;
    },
    batchNumber: number,
    startIndex: number
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    console.log(`🔄 [BATCH-PROCESS] Iniciando batch ${batchNumber}:`, {
      uploadId,
      transactionsCount: batchTransactions.length,
      startIndex
    });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Atualizar status do batch
    await db.update(processingBatches)
      .set({
        status: 'processing',
        startedAt: new Date()
      })
      .where(
        and(
          eq(processingBatches.uploadId, uploadId),
          eq(processingBatches.batchNumber, batchNumber)
        )
      );

    try {
      // 🚀 OTIMIZAÇÃO: Processamento paralelo em chunks
      // Divide transações em grupos de PARALLEL_LIMIT para processar simultaneamente
      const chunks = _.chunk(batchTransactions, this.PARALLEL_LIMIT);

      console.log(`⚡ [PARALLEL] Processando ${batchTransactions.length} transações em ${chunks.length} chunks paralelos (${this.PARALLEL_LIMIT} por vez)`);

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];

        // Processar todas transações do chunk em paralelo
        const chunkResults = await Promise.allSettled(
          chunk.map(async (transaction, idx) => {
            const globalIndex = startIndex + (chunkIndex * this.PARALLEL_LIMIT) + idx;

            // Classificar transação usando novo sistema unificado
            const companyIdToUse = context.companyId || this.companyId;
            if (!companyIdToUse) {
              throw new Error('companyId is required for categorization');
            }

            const classificationResult = await this.classifyTransaction(transaction, companyIdToUse);

            // Preparar dados para inserção
            const transactionData: NewTransaction = {
              accountId,
              categoryId: classificationResult.categoryId,
              uploadId,
              description: transaction.description,
              name: transaction.name,
              memo: transaction.memo,
              amount: transaction.amount.toString(),
              type: transaction.amount >= 0 ? 'credit' : 'debit',
              transactionDate: new Date(transaction.date),
              rawDescription: transaction.description,
              metadata: {
                fitid: transaction.fitid,
                originalAmount: transaction.amount,
                batchNumber,
                globalIndex
              },
              manuallyCategorized: false,
              verified: false,
              confidence: classificationResult.confidence.toString(),
              reasoning: classificationResult.reasoning,
              // Novos campos para rastreamento
              categorizationSource: classificationResult.source,
              ruleId: classificationResult.ruleId || null
            };

            // Inserir transação
            await db.insert(transactions).values(transactionData);

            return { success: true, globalIndex };
          })
        );

        // Processar resultados do chunk
        chunkResults.forEach((result, idx) => {
          const globalIndex = startIndex + (chunkIndex * this.PARALLEL_LIMIT) + idx;

          if (result.status === 'fulfilled') {
            success++;
          } else {
            failed++;
            const errorMsg = `Erro na transação ${globalIndex}: ${result.reason?.message || 'Erro desconhecido'}`;
            errors.push(errorMsg);
            console.error(`❌ [BATCH-ERROR] ${errorMsg}`);
          }
        });

        // Atualizar progresso após cada chunk
        const processedSoFar = startIndex + (chunkIndex + 1) * this.PARALLEL_LIMIT;
        await this.updateUploadProgress(uploadId, Math.min(processedSoFar, startIndex + batchTransactions.length), batchNumber);

        console.log(`✅ [PARALLEL-CHUNK] Chunk ${chunkIndex + 1}/${chunks.length} concluído: ${chunk.length} transações (${success} sucesso, ${failed} falhas)`);
      }

      // Atualizar batch como concluído
      await db.update(processingBatches)
        .set({
          status: 'completed',
          processedTransactions: success,
          completedAt: new Date(),
          processingLog: {
            success,
            failed,
            errors,
            processingTime: Date.now()
          }
        })
        .where(
          and(
            eq(processingBatches.uploadId, uploadId),
            eq(processingBatches.batchNumber, batchNumber)
          )
        );

      // Atualizar progresso final do batch
      await this.updateUploadProgress(uploadId, startIndex + batchTransactions.length, batchNumber);

      console.log(`✅ [BATCH-COMPLETE] Batch ${batchNumber} concluído:`, {
        success,
        failed,
        uploadId
      });

    } catch (error) {
      // Marcar batch como falha
      await db.update(processingBatches)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
          completedAt: new Date()
        })
        .where(
          and(
            eq(processingBatches.uploadId, uploadId),
            eq(processingBatches.batchNumber, batchNumber)
          )
        );

      console.error(`❌ [BATCH-FAIL] Batch ${batchNumber} falhou:`, error);
      throw error;
    }

    return { success, failed, errors };
  }

  /**
   * Classificar uma transação individual usando o novo sistema unificado
   */
  private async classifyTransaction(
    transaction: TransactionData,
    companyId: string
  ): Promise<{
    categoryId: string | null;
    categoryName: string;
    confidence: number;
    reasoning: string;
    source: string;
    ruleId?: string;
  }> {
    try {
      // Usar TransactionCategorizationService unificado
      const result = await TransactionCategorizationService.categorize(
        {
          description: transaction.description,
          memo: transaction.memo,
          name: transaction.name,
          amount: transaction.amount
        },
        {
          companyId,
          confidenceThreshold: 70,
          historyDaysLimit: 90
        }
      );

      console.log(
        `✅ [CATEGORIZE] "${transaction.description}" → ${result.categoryName} ` +
        `(${result.confidence}% via ${result.source})`
      );

      return {
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        confidence: result.confidence,
        reasoning: result.reasoning || '',
        source: result.source,
        ruleId: result.ruleId
      };

    } catch (error) {
      // Fallback para categoria "Não Classificado"
      console.error('❌ Erro na classificação:', error);

      const [fallbackCategory] = await db.select()
        .from(categories)
        .where(and(
          eq(categories.name, 'Não Classificado'),
          eq(categories.active, true)
        ))
        .limit(1);

      return {
        categoryId: fallbackCategory?.id || null,
        categoryName: fallbackCategory?.name || 'Não classificado',
        confidence: 0,
        reasoning: 'Falha na classificação - usando categoria fallback',
        source: 'error'
      };
    }
  }

  /**
   * Atualizar progresso do upload
   */
  private async updateUploadProgress(
    uploadId: string,
    processedTransactions: number,
    currentBatch: number
  ): Promise<void> {
    await db.update(uploads)
      .set({
        processedTransactions,
        currentBatch,
        lastProcessedIndex: processedTransactions - 1
      })
      .where(eq(uploads.id, uploadId));
  }

  /**
   * Obter progresso atual do processamento
   */
  async getProcessingProgress(uploadId: string): Promise<ProcessingProgress | null> {
    const [upload] = await db.select()
      .from(uploads)
      .where(eq(uploads.id, uploadId))
      .limit(1);

    if (!upload) return null;

    const percentage = upload.totalTransactions > 0
      ? Math.round((upload.processedTransactions / upload.totalTransactions) * 100)
      : 0;

    return {
      uploadId,
      currentBatch: upload.currentBatch || 0,
      totalBatches: upload.totalBatches || 0,
      processedTransactions: upload.processedTransactions || 0,
      totalTransactions: upload.totalTransactions || 0,
      status: upload.status as any,
      percentage,
      estimatedTimeRemaining: await this.calculateEstimatedTime(upload)
    };
  }

  /**
   * Calcular tempo restante estimado
   */
  private async calculateEstimatedTime(upload: any): Promise<number | undefined> {
    if (!upload.processedTransactions || !upload.currentBatch) return undefined;

    // Calcular tempo médio por batch
    const batches = await db.select()
      .from(processingBatches)
      .where(and(
        eq(processingBatches.uploadId, upload.id),
        eq(processingBatches.status, 'completed')
      ));

    if (batches.length === 0) return undefined;

    const avgTimePerBatch = batches.reduce((sum, batch) => {
      if (batch.startedAt && batch.completedAt) {
        return sum + (new Date(batch.completedAt).getTime() - new Date(batch.startedAt).getTime());
      }
      return sum;
    }, 0) / batches.length;

    const remainingBatches = (upload.totalBatches || 0) - (upload.currentBatch || 0);
    return remainingBatches * avgTimePerBatch;
  }

  /**
   * Marcar upload como concluído
   */
  async completeUpload(uploadId: string, stats: {
    successful: number;
    failed: number;
    totalTime: number;
  }): Promise<void> {
    await db.update(uploads)
      .set({
        status: 'completed',
        successfulTransactions: stats.successful,
        failedTransactions: stats.failed,
        processedAt: new Date(),
        currentBatch: 0, // Reset para indicar conclusão
        processingLog: {
          totalProcessed: stats.successful + stats.failed,
          successful: stats.successful,
          failed: stats.failed,
          processingTime: stats.totalTime
        }
      })
      .where(eq(uploads.id, uploadId));

    console.log(`🎉 [UPLOAD-COMPLETE] Upload ${uploadId} concluído:`, stats);

    // 📊 Log estatísticas do cache
    categoryCacheService.logStats();
  }

  /**
   * Retomar processamento de upload interrompido
   */
  async resumeProcessing(uploadId: string): Promise<{
    canResume: boolean;
    nextBatch: number;
    lastProcessedIndex: number;
  }> {
    const [upload] = await db.select()
      .from(uploads)
      .where(eq(uploads.id, uploadId))
      .limit(1);

    if (!upload || upload.status !== 'processing') {
      return { canResume: false, nextBatch: 0, lastProcessedIndex: 0 };
    }

    // Encontrar último batch concluído com sucesso
    const [lastCompletedBatch] = await db.select()
      .from(processingBatches)
      .where(and(
        eq(processingBatches.uploadId, uploadId),
        eq(processingBatches.status, 'completed')
      ))
      .orderBy(desc(processingBatches.batchNumber))
      .limit(1);

    const nextBatch = (lastCompletedBatch?.batchNumber || 0) + 1;
    const lastProcessedIndex = upload.lastProcessedIndex || 0;

    return {
      canResume: nextBatch <= (upload.totalBatches || 0),
      nextBatch,
      lastProcessedIndex
    };
  }
}

export default BatchProcessingService.getInstance();