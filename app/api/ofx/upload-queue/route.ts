import { NextRequest, NextResponse } from 'next/server';
import { parseOFXFile, OFXTransaction } from '@/lib/ofx-parser';
import { db } from '@/lib/db/connection';
import { companies, accounts, uploads } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany, getDefaultAccount, findAccountByBankInfo, updateAccountBankInfo } from '@/lib/db/init-db';
import FileStorageService from '@/lib/storage/file-storage.service';
import { createHash } from 'crypto';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';
import { TransactionData } from '@/lib/services/batch-processing.service';

const log = createLogger('ofx-queue');

// Importar sistema de filas se disponível
let QueueService: { initialize: () => Promise<void>; addOFXProcessingJob: (uploadId: string, transactions: unknown[], context: Record<string, unknown>, options: Record<string, unknown>) => Promise<string>; getQueueStats: () => Promise<unknown> } | null = null;
try {
  // QueueService = require('@/lib/services/queue.service').default;
} catch (error) {
  log.info('[QUEUE] Sistema de filas nao disponivel, usando background processing');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { companyId } = await requireAuth();

    log.info('[OFX-UPLOAD-QUEUE] Upload com sistema de filas');

    // Inicializar banco
    await initializeDatabase();
    const [defaultCompany] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!defaultCompany) {
      return NextResponse.json({
        success: false,
        error: 'Empresa não encontrada'
      }, { status: 400 });
    }

    // Validar upload
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({
        success: false,
        error: 'Requisição deve ser multipart/form-data'
      }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file || !file.name.toLowerCase().endsWith('.ofx')) {
      return NextResponse.json({
        success: false,
        error: 'Arquivo OFX válido é obrigatório'
      }, { status: 400 });
    }

    log.info({ name: file.name, size: file.size }, 'Arquivo recebido');

    // Processar arquivo
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const ofxContent = fileBuffer.toString('utf-8');

    // Salvar arquivo
    const storageResult = await FileStorageService.saveOFXFile(
      arrayBuffer,
      file.name,
      defaultCompany.id
    );

    if (!storageResult.success) {
      return NextResponse.json({
        success: false,
        error: `Erro ao salvar arquivo: ${storageResult.error}`
      }, { status: 500 });
    }

    // Verificar duplicatas
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    const [existingUpload] = await db.select()
      .from(uploads)
      .where(and(
        eq(uploads.companyId, defaultCompany.id),
        eq(uploads.fileHash, fileHash)
      ))
      .limit(1);

    if (existingUpload) {
      return NextResponse.json({
        success: false,
        error: 'Arquivo já foi enviado anteriormente',
        duplicateInfo: {
          uploadId: existingUpload.id,
          status: existingUpload.status
        }
      }, { status: 409 });
    }

    // Parser OFX
    const parseResult = await parseOFXFile(ofxContent);
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: `Erro ao parser OFX: ${parseResult.error}`
      }, { status: 400 });
    }

    // Estratégia de resolução de conta (igual ao upload-async)
    let targetAccount = null;

    if (parseResult.bankInfo && parseResult.bankInfo.bankId && parseResult.bankInfo.accountId) {
      log.info({
        bankCode: parseResult.bankInfo.bankId,
        accountNumber: parseResult.bankInfo.accountId
      }, 'Buscando conta existente');

      // Tentar encontrar conta que corresponda ao banco e número de conta do OFX
      targetAccount = await findAccountByBankInfo(
        defaultCompany.id,
        parseResult.bankInfo.bankId,
        parseResult.bankInfo.accountId
      );

      if (targetAccount && parseResult.bankInfo.bankName) {
        // Conta encontrada - atualizar com informações do OFX
        log.debug('Atualizando informacoes bancarias da conta existente...');
        targetAccount = await updateAccountBankInfo(targetAccount.id, {
          bankName: parseResult.bankInfo.bankName,
          bankCode: parseResult.bankInfo.bankId,
          accountNumber: parseResult.bankInfo.accountId,
          agencyNumber: parseResult.bankInfo.branchId,
          accountType: parseResult.bankInfo.accountType
        });
      } else if (!targetAccount) {
        // Conta não encontrada - criar nova
        log.info('Criando nova conta baseada no OFX...');
        const [newAccount] = await db.insert(accounts).values({
          companyId: defaultCompany.id,
          name: parseResult.bankInfo.accountId
            ? `Conta ${parseResult.bankInfo.bankName || 'Banco'} - ${parseResult.bankInfo.accountId}`
            : `Conta ${parseResult.bankInfo.bankName || 'Banco'} - OFX`,
          bankName: parseResult.bankInfo.bankName || 'Banco Não Identificado',
          bankCode: parseResult.bankInfo.bankId || '000',
          agencyNumber: parseResult.bankInfo.branchId || '0000',
          accountNumber: parseResult.bankInfo.accountId || '00000-0',
          accountType: parseResult.bankInfo.accountType || 'checking',
          openingBalance: parseResult.balance?.amount?.toString() ?? '0',
          active: true
        }).returning();

        targetAccount = newAccount;
      }
    } else {
      // OFX não tem bankInfo completo - usar conta padrão
      log.info('OFX sem bankInfo completo, usando conta padrao...');
      targetAccount = await getDefaultAccount();
    }

    if (!targetAccount) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma conta encontrada e não foi possível criar automaticamente.'
      }, { status: 400 });
    }

    log.info({ accountName: targetAccount.name, bankName: targetAccount.bankName }, 'Conta selecionada');

    // Criar registro de upload
    const [newUpload] = await db.insert(uploads).values({
      companyId: defaultCompany.id,
      accountId: targetAccount.id,
      filename: storageResult.metadata?.filename || file.name,
      originalName: file.name,
      fileType: 'ofx',
      fileSize: file.size,
      filePath: storageResult.filePath,
      fileHash: fileHash,
      storageProvider: 'filesystem',
      status: 'pending',
      totalTransactions: parseResult.transactions.length,
      uploadedAt: new Date()
    }).returning();

    log.info({ uploadId: newUpload.id, transactionCount: parseResult.transactions.length }, 'Upload registrado');

    // *** ESCOLHER MÉTODO DE PROCESSAMENTO ***
    let processingMethod = 'background';
    let jobId: string | null = null;

    if (QueueService) {
      // MÉTODO 1: Sistema de Filas (Redis/BullMQ)
      try {
        await QueueService.initialize();
        jobId = await QueueService.addOFXProcessingJob(
          newUpload.id,
          parseResult.transactions,
          {
            fileName: file.name,
            bankName: parseResult.bankInfo?.bankName || targetAccount.bankName,
            accountId: targetAccount.id,
            companyId: defaultCompany.id
          },
          {
            priority: 1 // Prioridade normal
          }
        );

        processingMethod = 'queue';
        log.info({ jobId }, '[QUEUE] Job adicionado a fila de processamento');

      } catch (queueError) {
        log.error({ err: queueError }, '[QUEUE] Falha ao adicionar job na fila, usando background processing');
        processingMethod = 'background';
      }
    }

    if (processingMethod === 'background') {
      // MÉTODO 2: Background Processing (nível atual)
      log.info('[BACKGROUND] Iniciando processamento em background...');

      // Processar em background sem bloquear resposta
      import('@/lib/services/batch-processing.service').then(({ default: BatchService }) => {
        processOFXInBackground(newUpload.id, parseResult.transactions, {
          fileName: file.name,
          bankName: parseResult.bankInfo?.bankName || targetAccount.bankName,
          accountId: targetAccount.id,
          companyId: defaultCompany.id
        }, BatchService).catch(error => {
          log.error({ err: error }, '[BACKGROUND] Erro no processamento');
        });
      });
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        uploadId: newUpload.id,
        jobId, // null se não usar filas
        message: `Arquivo recebido! Processamento iniciado via ${processingMethod}.`,
        processing: {
          method: processingMethod, // 'queue' ou 'background'
          status: 'pending',
          estimatedTime: Math.ceil(parseResult.transactions.length / 15 * 2),
          progressUrl: `/api/uploads/${newUpload.id}/progress`
        },
        fileInfo: {
          name: file.name,
          size: file.size,
          totalTransactions: parseResult.transactions.length
        },
        accountInfo: {
          id: targetAccount.id,
          name: targetAccount.name,
          bankName: targetAccount.bankName
        },
        uploadTime: responseTime
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Erro no upload com filas');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
  }
}

interface BatchService {
  prepareUploadForBatchProcessing: (uploadId: string, count: number) => Promise<void>;
  processBatch: (
    uploadId: string,
    transactions: TransactionData[],
    accountId: string,
    categoryId: string | null,
    context: { fileName: string; bankName?: string },
    batchNumber: number,
    offset: number
  ) => Promise<{ success: number; failed: number }>;
  completeUpload: (uploadId: string, stats: { successful: number; failed: number; totalTime: number }) => Promise<void>;
}

/**
 * Funcao de background processing (fallback quando filas nao disponiveis)
 */
async function processOFXInBackground(
  uploadId: string,
  transactions: OFXTransaction[],
  context: { fileName: string; bankName?: string; accountId: string; companyId: string },
  BatchServiceInstance: BatchService
) {
  try {
    log.info({ uploadId }, '[BACKGROUND] Processando upload');

    await BatchServiceInstance.prepareUploadForBatchProcessing(uploadId, transactions.length);

    const formattedTransactions: TransactionData[] = transactions.map((tx) => ({
      description: tx.description,
      memo: tx.memo,
      amount: tx.amount,
      date: tx.date,
      fitid: tx.fitid,
      balance: tx.balance
    }));

    const batchSize = 15;
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (let i = 0; i < formattedTransactions.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchTransactions = formattedTransactions.slice(i, i + batchSize);

      try {
        const batchResult = await BatchServiceInstance.processBatch(
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

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        log.error({ err: error, batchNumber }, '[BACKGROUND] Erro no batch');
        totalFailed += batchTransactions.length;
      }
    }

    await BatchServiceInstance.completeUpload(uploadId, {
      successful: totalSuccessful,
      failed: totalFailed,
      totalTime: Date.now() - Date.now()
    });

    log.info({ uploadId }, '[BACKGROUND] Upload concluido');

  } catch (error) {
    log.error({ err: error, uploadId }, '[BACKGROUND] Falha no upload');
  }
}

export async function GET(_request: NextRequest) {
  await requireAuth();
  const queueStats = QueueService ? await QueueService.getQueueStats() : null;

  return NextResponse.json({
    message: 'API de Upload com Sistema de Filas',
    endpoint: '/api/ofx/upload-queue',
    method: 'POST',
    processing: {
      queue: {
        available: !!QueueService,
        stats: queueStats,
        features: [
          'Processos sobrevivem a restarts',
          'Multiplos workers paralelos',
          'Retentativas automaticas',
          'Prioridade de jobs',
          'Dashboard de monitoramento'
        ]
      },
      background: {
        available: true,
        features: [
          'Upload instantaneo',
          'Processamento sem bloquear',
          'Progresso salvo',
          'Retomada automatica'
        ]
      }
    },
    workflow: [
      '1. Upload instantaneo',
      '2. Criar registro no banco',
      '3. Adicionar job na fila (se disponivel)',
      '4. Processar em background (fallback)',
      '5. Retornar resposta imediata',
      '6. Acompanhar progresso via API'
    ]
  });
}
