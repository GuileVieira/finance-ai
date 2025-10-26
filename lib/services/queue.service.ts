/**
 * Sistema de Filas para Processamento Assíncrono
 *
 * Nível 2 - Para produção escalável
 *
 * Benefícios do sistema de filas:
 * ✅ Processos sobrevivem a restarts do servidor
 * ✅ Múltiplos workers processando em paralelo
 * ✅ Retentativas automáticas com backoff
 * ✅ Prioridade de jobs
 * ✅ Dashboard de monitoramento
 * ✅ Escalabilidade horizontal
 */

import { Queue, Worker, Job } from 'bullmq';
import { createRedis } from '@/lib/redis';
import BatchProcessingService from './batch-processing.service';

interface OFXProcessingJob {
  uploadId: string;
  transactions: any[];
  context: {
    fileName: string;
    bankName?: string;
    accountId: string;
    companyId: string;
  };
}

class QueueService {
  private static instance: QueueService;
  private ofxQueue: Queue<OFXProcessingJob>;
  private worker: Worker<OFXProcessingJob>;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      const redis = createRedis();

      // Criar fila para processamento OFX
      this.ofxQueue = new Queue('ofx-processing', {
        connection: redis,
        defaultJobOptions: {
          removeOnComplete: 100, // Manter 100 jobs completos
          removeOnFail: 50,      // Manter 50 jobs falhos
          attempts: 3,           // Tentar 3 vezes
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      // Criar worker para processar jobs
      this.worker = new Worker('ofx-processing',
        async (job: Job<OFXProcessingJob>) => {
          return this.processOFXJob(job);
        }, {
          connection: redis,
          concurrency: 3, // 3 jobs em paralelo
          limiter: {
            max: 10,
            duration: 60000 // Max 10 jobs por minuto
          }
        }
      );

      // Eventos do worker
      this.worker.on('completed', (job) => {
        console.log(`✅ [QUEUE] Job ${job.id} completado:`, job.data.uploadId);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`❌ [QUEUE] Job ${job?.id} falhou:`, err);
      });

      this.worker.on('error', (err) => {
        console.error('❌ [QUEUE] Erro no worker:', err);
      });

      this.isInitialized = true;
      console.log('✅ [QUEUE] Sistema de filas inicializado');

    } catch (error) {
      console.error('❌ [QUEUE] Erro ao inicializar filas:', error);
      throw error;
    }
  }

  /**
   * Adicionar job na fila de processamento OFX
   */
  async addOFXProcessingJob(
    uploadId: string,
    transactions: any[],
    context: OFXProcessingJob['context'],
    options: {
      priority?: number;
      delay?: number;
    } = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const job = await this.ofxQueue.add(
      'process-ofx',
      {
        uploadId,
        transactions,
        context
      },
      {
        priority: options.priority || 0,
        delay: options.delay || 0,
        // Adicionar metadata para tracking
        jobId: uploadId,
        meta: {
          uploadId,
          fileName: context.fileName,
          totalTransactions: transactions.length,
          createdAt: new Date().toISOString()
        }
      }
    );

    console.log(`📋 [QUEUE] Job adicionado à fila: ${job.id} (${transactions.length} transações)`);
    return job.id!;
  }

  /**
   * Processar job OFX individual
   */
  private async processOFXJob(job: Job<OFXProcessingJob>): Promise<void> {
    const { uploadId, transactions, context } = job.data;

    try {
      console.log(`🔄 [QUEUE-JOB] Processando job ${job.id}: ${uploadId}`);

      // Atualizar status do upload para processing
      await this.updateUploadStatus(uploadId, 'processing');

      const batchService = BatchProcessingService;

      // Preparar para processamento em batches
      await batchService.prepareUploadForBatchProcessing(uploadId, transactions.length);

      // Formatar transações
      const formattedTransactions = transactions.map(tx => ({
        description: tx.description,
        name: tx.name,
        memo: tx.memo,
        amount: tx.amount,
        date: tx.date,
        fitid: tx.fitid,
        balance: tx.balance
      }));

      // Processar em batches
      const batchSize = 15;
      let totalSuccessful = 0;
      let totalFailed = 0;

      for (let i = 0; i < formattedTransactions.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const batchTransactions = formattedTransactions.slice(i, i + batchSize);

        try {
          const batchResult = await batchService.processBatch(
            uploadId,
            batchTransactions,
            context.accountId,
            null,
            {
              fileName: context.fileName,
              bankName: context.bankName
            },
            batchNumber,
            i
          );

          totalSuccessful += batchResult.success;
          totalFailed += batchResult.failed;

          // Atualizar progresso do job (opcional)
          job.updateProgress({
            processedTransactions: i + batchTransactions.length,
            totalTransactions: transactions.length,
            percentage: Math.round(((i + batchTransactions.length) / transactions.length) * 100)
          });

          // Delay entre batches
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ [QUEUE-BATCH] Erro no batch ${batchNumber}:`, error);
          totalFailed += batchTransactions.length;
        }
      }

      // Marcar upload como concluído
      await batchService.completeUpload(uploadId, {
        successful: totalSuccessful,
        failed: totalFailed,
        totalTime: Date.now() - job.timestamp
      });

      console.log(`🎉 [QUEUE-JOB] Job ${job.id} completado: ${totalSuccessful} sucesso, ${totalFailed} falhas`);

    } catch (error) {
      console.error(`❌ [QUEUE-JOB] Falha no job ${job.id}:`, error);

      // Marcar upload como falha
      await this.updateUploadStatus(uploadId, 'failed', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Atualizar status do upload no banco
   */
  private async updateUploadStatus(
    uploadId: string,
    status: string,
    metadata?: any
  ): Promise<void> {
    // Implementar atualização no banco
    // Esta é uma função stub - dependeria da estrutura exata do banco
    console.log(`📊 [QUEUE] Atualizando status do upload ${uploadId} para ${status}`);
  }

  /**
   * Obter estatísticas da fila
   */
  async getQueueStats() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const [waiting, active, completed, failed] = await Promise.all([
      this.ofxQueue.getWaiting(),
      this.ofxQueue.getActive(),
      this.ofxQueue.getCompleted(),
      this.ofxQueue.getFailed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  }

  /**
   * Limpar jobs antigos
   */
  async cleanOldJobs(keepCompleted = 100, keepFailed = 50) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.ofxQueue.clean(0, keepCompleted, 'completed');
    await this.ofxQueue.clean(0, keepFailed, 'failed');

    console.log('🧹 [QUEUE] Jobs antigos limpos');
  }

  /**
   * Fechar conexões
   */
  async close() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.ofxQueue) {
      await this.ofxQueue.close();
    }
    this.isInitialized = false;
    console.log('🔒 [QUEUE] Sistema de filas fechado');
  }
}

export default QueueService.getInstance();