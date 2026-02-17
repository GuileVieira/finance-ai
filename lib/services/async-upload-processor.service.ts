import { parseOFXFile } from '@/lib/ofx-parser';
import { db } from '@/lib/db/connection';
import { uploads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import BatchProcessingService from '@/lib/services/batch-processing.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('async-upload');

export interface TransactionData {
  description: string;
  name?: string;
  memo?: string;
  amount: number;
  date: string;
  fitid?: string;
  balance?: number;
}

export class AsyncUploadProcessorService {
  private static instance: AsyncUploadProcessorService;
  private processingQueue: Map<string, Promise<void>> = new Map();

  private constructor() {}

  public static getInstance(): AsyncUploadProcessorService {
    if (!AsyncUploadProcessorService.instance) {
      AsyncUploadProcessorService.instance = new AsyncUploadProcessorService();
    }
    return AsyncUploadProcessorService.instance;
  }

  /**
   * Inicia o processamento assíncrono de um upload
   */
  async startProcessing(
    uploadId: string,
    fileBuffer: Buffer,
    accountId: string,
    metadata: { fileName: string; bankName?: string; companyId: string }
  ): Promise<void> {
    // Se já está processando, não fazer nada
    if (this.processingQueue.has(uploadId)) {
      log.warn({ uploadId }, 'Upload is already being processed');
      return;
    }

    // Criar promise de processamento
    const processingPromise = this.processUploadInBackground(
      uploadId,
      fileBuffer,
      accountId,
      metadata
    );

    // Adicionar à fila
    this.processingQueue.set(uploadId, processingPromise);

    // Remover da fila quando concluir (não aguardar)
    processingPromise
      .then(() => {
        this.processingQueue.delete(uploadId);
      })
      .catch((error) => {
        log.error({ err: error, uploadId }, 'Error processing upload');
        this.processingQueue.delete(uploadId);
      });
  }

  /**
   * Processa o upload em background
   */
  private async processUploadInBackground(
    uploadId: string,
    fileBuffer: Buffer,
    accountId: string,
    metadata: { fileName: string; bankName?: string; companyId: string }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      log.info({ uploadId }, 'Starting async processing');

      // Atualizar status para processing
      await db
        .update(uploads)
        .set({ status: 'processing' })
        .where(eq(uploads.id, uploadId));

      // Parse do arquivo OFX
      const ofxContent = fileBuffer.toString('utf-8');
      const parseResult = await parseOFXFile(ofxContent);

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Erro ao fazer parse do OFX');
      }

      const transactions = parseResult.transactions || [];

      // Preparar processamento em batches
      const batchService = BatchProcessingService;
      await batchService.prepareUploadForBatchProcessing(uploadId, transactions.length);

      // Converter transações para o formato esperado
      const formattedTransactions = transactions.map((tx) => ({
        description: tx.description,
        memo: tx.memo,
        amount: tx.amount,
        date: tx.date,
        fitid: tx.fitid,
        balance: tx.balance
      }));

      // Processar em batches
      let totalSuccessful = 0;
      let totalFailed = 0;
      const batchSize = 15;

      for (let i = 0; i < formattedTransactions.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const batchTransactions = formattedTransactions.slice(i, i + batchSize);

        log.info(
          { uploadId, batchNumber, totalBatches: Math.ceil(formattedTransactions.length / batchSize) },
          'Processing batch'
        );

        try {
          const batchResult = await batchService.processBatch(
            uploadId,
            batchTransactions,
            accountId,
            null, // categoryId - será determinado no processamento
            metadata,
            batchNumber,
            i
          );

          totalSuccessful += batchResult.success;
          totalFailed += batchResult.failed;
        } catch (error) {
          log.error({ err: error, uploadId, batchNumber }, 'Error processing batch');
          totalFailed += batchTransactions.length;
        }
      }

      // Marcar upload como concluído
      await batchService.completeUpload(uploadId, {
        successful: totalSuccessful,
        failed: totalFailed,
        totalTime: Date.now() - startTime
      });

      log.info(
        { uploadId, successful: totalSuccessful, failed: totalFailed, durationMs: Date.now() - startTime },
        'Processing completed'
      );
    } catch (error) {
      log.error({ err: error, uploadId }, 'Fatal error in upload processing');

      // Marcar como failed
      await db
        .update(uploads)
        .set({
          status: 'failed',
          processingLog: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
        })
        .where(eq(uploads.id, uploadId));
    }
  }

  /**
   * Verifica se um upload está sendo processado
   */
  isProcessing(uploadId: string): boolean {
    return this.processingQueue.has(uploadId);
  }

  /**
   * Retorna quantos uploads estão na fila
   */
  getQueueSize(): number {
    return this.processingQueue.size;
  }
}

export default AsyncUploadProcessorService.getInstance();
