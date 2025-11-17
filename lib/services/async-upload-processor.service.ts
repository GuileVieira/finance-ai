import { parseOFXFile } from '@/lib/ofx-parser';
import { db } from '@/lib/db/connection';
import { uploads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import BatchProcessingService from '@/lib/services/batch-processing.service';

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
      console.log(`⚠️ Upload ${uploadId} já está sendo processado`);
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
        console.error(`❌ Erro no processamento de ${uploadId}:`, error);
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
      console.log(`🚀 Iniciando processamento assíncrono de ${uploadId}`);

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
        name: tx.name,
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

        console.log(
          `🔄 [${uploadId}] Processando batch ${batchNumber}/${Math.ceil(
            formattedTransactions.length / batchSize
          )}`
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
          console.error(`❌ Erro no batch ${batchNumber}:`, error);
          totalFailed += batchTransactions.length;
        }
      }

      // Marcar upload como concluído
      await batchService.completeUpload(uploadId, {
        successful: totalSuccessful,
        failed: totalFailed,
        totalTime: Date.now() - startTime
      });

      console.log(
        `✅ [${uploadId}] Processamento concluído: ${totalSuccessful} sucesso, ${totalFailed} falhas (${Date.now() - startTime}ms)`
      );
    } catch (error) {
      console.error(`❌ Erro fatal no processamento de ${uploadId}:`, error);

      // Marcar como failed
      await db
        .update(uploads)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
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
