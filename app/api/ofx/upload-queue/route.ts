import { NextRequest, NextResponse } from 'next/server';
import { parseOFXFile } from '@/lib/ofx-parser';
import { db } from '@/lib/db/connection';
import { companies, accounts, uploads } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany, getDefaultAccount } from '@/lib/db/init-db';
import FileStorageService from '@/lib/storage/file-storage.service';
import { createHash } from 'crypto';

// Importar sistema de filas se disponível
let QueueService: any = null;
try {
  QueueService = require('@/lib/services/queue.service').default;
} catch (error) {
  console.log('📋 [QUEUE] Sistema de filas não disponível, usando background processing');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('\n=== [OFX-UPLOAD-QUEUE] Upload com sistema de filas ===');

    // Inicializar banco
    await initializeDatabase();
    const defaultCompany = await getDefaultCompany();
    if (!defaultCompany) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma empresa encontrada'
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

    console.log('📁 Arquivo recebido:', { name: file.name, size: file.size });

    // Processar arquivo
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ofxContent = fileBuffer.toString('utf-8');

    // Salvar arquivo
    const storageResult = await FileStorageService.saveOFXFile(
      fileBuffer,
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

    // Obter/criar conta
    let defaultAccount = await getDefaultAccount();
    if (!defaultAccount && parseResult.bankInfo) {
      const [newAccount] = await db.insert(accounts).values({
        companyId: defaultCompany.id,
        name: parseResult.bankInfo?.accountId
          ? `Conta ${parseResult.bankInfo.bankName || 'Banco'} - ${parseResult.bankInfo.accountId}`
          : `Conta ${parseResult.bankInfo.bankName || 'Banco'} - OFX`,
        bankName: parseResult.bankInfo?.bankName || 'Banco Não Identificado',
        bankCode: parseResult.bankInfo?.bankId || '000',
        agencyNumber: parseResult.bankInfo?.branchId || '0000',
        accountNumber: parseResult.bankInfo?.accountId || '00000-0',
        accountType: parseResult.bankInfo?.accountType || 'checking',
        openingBalance: 0,
        active: true
      }).returning();

      defaultAccount = newAccount;
    }

    if (!defaultAccount) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma conta encontrada'
      }, { status: 400 });
    }

    // Criar registro de upload
    const [newUpload] = await db.insert(uploads).values({
      companyId: defaultCompany.id,
      accountId: defaultAccount.id,
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

    console.log(`✅ Upload registrado: ${newUpload.id} (${parseResult.transactions.length} transações)`);

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
            bankName: parseResult.bankInfo?.bankName,
            accountId: defaultAccount.id,
            companyId: defaultCompany.id
          },
          {
            priority: 1 // Prioridade normal
          }
        );

        processingMethod = 'queue';
        console.log(`🚀 [QUEUE] Job ${jobId} adicionado à fila de processamento`);

      } catch (queueError) {
        console.error('❌ [QUEUE] Falha ao adicionar job na fila, usando background processing:', queueError);
        processingMethod = 'background';
      }
    }

    if (processingMethod === 'background') {
      // MÉTODO 2: Background Processing (nível atual)
      console.log('🔄 [BACKGROUND] Iniciando processamento em background...');

      // Processar em background sem bloquear resposta
      import('@/lib/services/batch-processing.service').then(({ default: BatchService }) => {
        processOFXInBackground(newUpload.id, parseResult.transactions, {
          fileName: file.name,
          bankName: parseResult.bankInfo?.bankName,
          accountId: defaultAccount.id,
          companyId: defaultCompany.id
        }, BatchService).catch(error => {
          console.error(`❌ [BACKGROUND] Erro no processamento:`, error);
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
          id: defaultAccount.id,
          name: defaultAccount.name,
          bankName: defaultAccount.bankName
        },
        uploadTime: responseTime
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload com filas:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
  }
}

/**
 * Função de background processing (fallback quando filas não disponíveis)
 */
async function processOFXInBackground(
  uploadId: string,
  transactions: any[],
  context: any,
  BatchService: any
) {
  try {
    console.log(`🔄 [BACKGROUND] Processando upload ${uploadId}`);

    await BatchService.prepareUploadForBatchProcessing(uploadId, transactions.length);

    const formattedTransactions = transactions.map((tx: any) => ({
      description: tx.description,
      name: tx.name,
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
        const batchResult = await BatchService.processBatch(
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
        console.error(`❌ [BACKGROUND] Erro no batch ${batchNumber}:`, error);
        totalFailed += batchTransactions.length;
      }
    }

    await BatchService.completeUpload(uploadId, {
      successful: totalSuccessful,
      failed: totalFailed,
      totalTime: Date.now() - Date.now()
    });

    console.log(`🎉 [BACKGROUND] Upload ${uploadId} concluído`);

  } catch (error) {
    console.error(`❌ [BACKGROUND] Falha no upload ${uploadId}:`, error);
  }
}

export async function GET(request: NextRequest) {
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
          '✅ Processos sobrevivem a restarts',
          '✅ Múltiplos workers paralelos',
          '✅ Retentativas automáticas',
          '✅ Prioridade de jobs',
          '✅ Dashboard de monitoramento'
        ]
      },
      background: {
        available: true,
        features: [
          '✅ Upload instantâneo',
          '✅ Processamento sem bloquear',
          '✅ Progresso salvo',
          '✅ Retomada automática'
        ]
      }
    },
    workflow: [
      '1️⃣ Upload instantâneo',
      '2️⃣ Criar registro no banco',
      '3️⃣ Adicionar job na fila (se disponível)',
      '4️⃣ Processar em background (fallback)',
      '5️⃣ Retornar resposta imediata',
      '6️⃣ Acompanhar progresso via API'
    ]
  });
}