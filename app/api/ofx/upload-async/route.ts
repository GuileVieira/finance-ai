import { NextRequest, NextResponse } from 'next/server';
import { parseOFXFile } from '@/lib/ofx-parser';
import { db } from '@/lib/db/connection';
import { companies, accounts, uploads, categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany, getDefaultAccount, findAccountByBankInfo, updateAccountBankInfo } from '@/lib/db/init-db';
import FileStorageService from '@/lib/storage/file-storage.service';
import { createHash } from 'crypto';
import BatchProcessingService from '@/lib/services/batch-processing.service';
import { getBankByCode, getBankName } from '@/lib/data/brazilian-banks';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('\n=== [OFX-UPLOAD-ASYNC] Nova requisição de upload assíncrono ===');

    // Inicializar banco de dados se necessário
    await initializeDatabase();

    // Obter empresa e conta padrão
    const defaultCompany = await getDefaultCompany();
    if (!defaultCompany) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma empresa encontrada. Configure uma empresa primeiro.'
      }, { status: 400 });
    }

    // Verificar se é multipart/form-data
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({
        success: false,
        error: 'Requisição deve ser multipart/form-data'
      }, { status: 400 });
    }

    // Parse do formulário
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum arquivo OFX enviado'
      }, { status: 400 });
    }

    // Validar tipo do arquivo
    if (!file.name.toLowerCase().endsWith('.ofx')) {
      return NextResponse.json({
        success: false,
        error: 'Arquivo deve ser um arquivo .ofx válido'
      }, { status: 400 });
    }

    console.log('📁 Arquivo recebido:', { name: file.name, size: file.size });

    // Ler conteúdo do arquivo
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ofxContent = fileBuffer.toString('utf-8');

    // Salvar arquivo fisicamente
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

    // Calcular hash para detecção de duplicatas
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

    // Verificar duplicatas
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
        error: 'Arquivo já foi enviado anteriormente.',
        duplicateInfo: {
          uploadId: existingUpload.id,
          originalUploadDate: existingUpload.uploadedAt,
          totalTransactions: existingUpload.totalTransactions,
          status: existingUpload.status
        }
      }, { status: 409 });
    }

    // Parser OFX (apenas validação inicial)
    console.log('🔍 Fazendo parser inicial do arquivo OFX...');
    const parseResult = await parseOFXFile(ofxContent);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: `Erro ao parser OFX: ${parseResult.error}`
      }, { status: 400 });
    }

    // Estratégia de resolução de conta:
    // 1. Se OFX tem bankInfo, buscar conta correspondente
    // 2. Se encontrar, atualizar informações
    // 3. Se não encontrar, criar nova conta
    // 4. Se OFX não tem bankInfo, usar conta padrão

    let targetAccount = null;

    if (parseResult.bankInfo && parseResult.bankInfo.bankId && parseResult.bankInfo.accountId) {
      console.log('🔍 Buscando conta existente para:', {
        bankCode: parseResult.bankInfo.bankId,
        accountNumber: parseResult.bankInfo.accountId
      });

      // Tentar encontrar conta que corresponda ao banco e número de conta do OFX
      targetAccount = await findAccountByBankInfo(
        defaultCompany.id,
        parseResult.bankInfo.bankId,
        parseResult.bankInfo.accountId
      );

      if (targetAccount && parseResult.bankInfo.bankId) {
        // Conta encontrada - atualizar com informações do OFX se necessário
        console.log('🔄 Atualizando informações bancárias da conta existente...');

        // Obter nome correto do banco pela tabela
        const bankCode = parseResult.bankInfo.bankId;
        const bankFromTable = getBankByCode(bankCode);
        const resolvedBankName = bankFromTable?.shortName || parseResult.bankInfo.bankName || targetAccount.bankName;

        targetAccount = await updateAccountBankInfo(targetAccount.id, {
          bankName: resolvedBankName,
          bankCode: bankCode,
          accountNumber: parseResult.bankInfo.accountId,
          agencyNumber: parseResult.bankInfo.branchId,
          accountType: parseResult.bankInfo.accountType
        });
      } else if (!targetAccount) {
        // Conta não encontrada - criar nova
        console.log('🏦 Criando nova conta baseada no OFX...');

        // Obter nome correto do banco pela tabela de bancos brasileiros
        const bankCode = parseResult.bankInfo.bankId || '000';
        const bankFromTable = getBankByCode(bankCode);
        const resolvedBankName = bankFromTable?.shortName || parseResult.bankInfo.bankName || 'Banco Não Identificado';

        console.log(`🏦 Banco identificado: ${resolvedBankName} (código ${bankCode})`);

        const [newAccount] = await db.insert(accounts).values({
          companyId: defaultCompany.id,
          name: parseResult.bankInfo.accountId
            ? `Conta ${resolvedBankName} - ${parseResult.bankInfo.accountId}`
            : `Conta ${resolvedBankName} - OFX`,
          bankName: resolvedBankName,
          bankCode: bankCode,
          agencyNumber: parseResult.bankInfo.branchId || '0000',
          accountNumber: parseResult.bankInfo.accountId || '00000-0',
          accountType: parseResult.bankInfo.accountType || 'checking',
          openingBalance: 0,
          active: true
        }).returning();

        targetAccount = newAccount;
      }
    } else {
      // OFX não tem bankInfo completo - usar conta padrão
      console.log('ℹ️ OFX sem bankInfo completo, usando conta padrão...');
      targetAccount = await getDefaultAccount();
    }

    if (!targetAccount) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma conta encontrada e não foi possível criar automaticamente.'
      }, { status: 400 });
    }

    console.log(`✅ Conta selecionada: ${targetAccount.name} (${targetAccount.bankName})`);

    // Criar registro de upload com status 'pending'
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
      status: 'pending', // Aguardando processamento
      totalTransactions: parseResult.transactions.length,
      uploadedAt: new Date()
    }).returning();

    console.log(`✅ Upload registrado: ${newUpload.id} (${parseResult.transactions.length} transações)`);

    // *** INICIAR PROCESSAMENTO ASSÍNCRONO ***
    // Não esperar pelo processamento - retornar imediatamente
    console.log('🚀 Iniciando processamento assíncrono...');

    // Processar em background sem bloquear a resposta
    processOFXAsync(newUpload.id, parseResult.transactions, {
      fileName: file.name,
      bankName: parseResult.bankInfo?.bankName || targetAccount.bankName,
      accountId: targetAccount.id,
      companyId: defaultCompany.id
    }).catch(error => {
      console.error(`❌ Erro no processamento assíncrono do upload ${newUpload.id}:`, error);
    });

    // Resposta imediata para o usuário
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        uploadId: newUpload.id,
        message: 'Arquivo recebido com sucesso! O processamento está sendo feito em background.',
        fileInfo: {
          name: file.name,
          size: file.size,
          totalTransactions: parseResult.transactions.length
        },
        processingInfo: {
          status: 'pending',
          estimatedTime: Math.ceil(parseResult.transactions.length / 15 * 2), // ~2 segundos por batch
          progressUrl: `/api/uploads/${newUpload.id}/progress`,
          checkInterval: 2000 // Verificar progresso a cada 2 segundos
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
    console.error('❌ Erro no upload assíncrono:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * Função assíncrona para processamento do OFX em background
 */
async function processOFXAsync(
  uploadId: string,
  transactions: any[],
  context: {
    fileName: string;
    bankName?: string;
    accountId: string;
    companyId: string;
  }
) {
  try {
    console.log(`🔄 [ASYNC-PROCESS] Iniciando processamento do upload ${uploadId}`);

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
          null, // categoryId - será determinado no processamento
          {
            fileName: context.fileName,
            bankName: context.bankName
          },
          batchNumber,
          i
        );

        totalSuccessful += batchResult.success;
        totalFailed += batchResult.failed;

        // Pequeno delay entre batches para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ [ASYNC-ERROR] Erro no batch ${batchNumber}:`, error);
        totalFailed += batchTransactions.length;
      }
    }

    // Marcar upload como concluído
    await batchService.completeUpload(uploadId, {
      successful: totalSuccessful,
      failed: totalFailed,
      totalTime: Date.now() - Date.now()
    });

    console.log(`🎉 [ASYNC-COMPLETE] Upload ${uploadId} processado: ${totalSuccessful} sucesso, ${totalFailed} falhas`);

    // Aqui poderíamos enviar notificação, WebSocket, etc.

  } catch (error) {
    console.error(`❌ [ASYNC-FAIL] Falha geral no processamento do upload ${uploadId}:`, error);

    // Marcar upload como falha
    await db.update(uploads)
      .set({
        status: 'failed',
        processingLog: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        }
      })
      .where(eq(uploads.id, uploadId));
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API de Upload Assíncrono OFX',
    endpoint: '/api/ofx/upload-async',
    method: 'POST',
    contentType: 'multipart/form-data',
    workflow: [
      '1️⃣ Upload imediato do arquivo OFX',
      '2️⃣ Parser rápido para validação',
      '3️⃣ Salvar arquivo e criar registro',
      '4️⃣ Iniciar processamento assíncrono',
      '5️⃣ Retornar resposta imediata',
      '6️⃣ Processar em batches em background',
      '7️⃣ Notificar quando completar'
    ],
    features: [
      '🚀 Upload instantâneo (não trava navegador)',
      '📦 Processamento em batches de 15 transações',
      '📊 Progresso em tempo real via API',
      '🔄 Retomada automática em caso de falha',
      '💾 Persistência incremental',
      '🔔 Notificação quando finalizar (em desenvolvimento)'
    ],
    maxFileSize: '10MB',
    supportedFormats: ['.ofx']
  });
}