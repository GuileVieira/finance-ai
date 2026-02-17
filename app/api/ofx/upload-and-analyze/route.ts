import { NextRequest, NextResponse } from 'next/server';
import { parseOFXFile } from '@/lib/ofx-parser';

import { db } from '@/lib/db/connection';
import { companies, accounts, uploads, transactions, categories } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany, getDefaultAccount, findAccountByBankInfo, updateAccountBankInfo } from '@/lib/db/init-db';
import FileStorageService from '@/lib/storage/file-storage.service';
import { createHash } from 'crypto';
import BatchProcessingService from '@/lib/services/batch-processing.service';
import AsyncUploadProcessorService from '@/lib/services/async-upload-processor.service';
import { requireAuth } from '@/lib/auth/get-session';
import { getBankByCode } from '@/lib/data/brazilian-banks';
import { createLogger } from '@/lib/logger';

const log = createLogger('ofx-upload');

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { companyId } = await requireAuth();

    log.info('[OFX-UPLOAD-ANALYZE] Nova requisicao de upload e analise');
    log.debug({
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent')?.substring(0, 50)
    }, 'Headers da requisicao');

    // Inicializar banco de dados se necessário
    log.debug('Verificando banco de dados...');
    await initializeDatabase();

    // Obter empresa do usuário autenticado
    const [defaultCompany] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!defaultCompany) {
      return NextResponse.json({
        success: false,
        error: 'Empresa não encontrada.'
      }, { status: 400 });
    }

    log.info({ companyName: defaultCompany.name, companyId: defaultCompany.id }, 'Usando empresa');

    // Verificar se é multipart/form-data (upload de arquivo)
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({
        success: false,
        error: 'Requisição deve ser multipart/form-data'
      }, { status: 400 });
    }

    // Parse do formulário multipart
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const safeMode = formData.get('safeMode') === 'true'; // Modo seguro para testes
    const async = formData.get('async') === 'true'; // Modo assíncrono (padrão: true)

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

    log.info({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }, 'Arquivo recebido');

    // Ler conteúdo do arquivo
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const ofxContent = fileBuffer.toString('utf-8');

    log.info({ contentLength: ofxContent.length }, 'Arquivo lido');

    // Salvar arquivo fisicamente
    log.debug('Salvando arquivo no sistema...');
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

    log.info({ filePath: storageResult.filePath }, 'Arquivo salvo');

    // Calcular hash do arquivo para detecção de duplicatas
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    log.debug({ fileHash }, 'Hash do arquivo calculado');

    // Verificar se o arquivo já foi enviado (duplicata)
    log.debug('Verificando duplicatas...');
    const [existingUpload] = await db.select()
      .from(uploads)
      .where(and(
        eq(uploads.companyId, defaultCompany.id),
        eq(uploads.fileHash, fileHash)
      ))
      .limit(1);

    if (existingUpload) {
      log.warn({ uploadId: existingUpload.id, uploadedAt: existingUpload.uploadedAt }, 'Arquivo duplicado detectado');
      return NextResponse.json({
        success: false,
        error: 'Arquivo já foi enviado anteriormente. Cada arquivo OFX só pode ser processado uma vez.',
        duplicateInfo: {
          uploadId: existingUpload.id,
          originalUploadDate: existingUpload.uploadedAt,
          originalFileName: existingUpload.originalName,
          totalTransactions: existingUpload.totalTransactions,
          successfulTransactions: existingUpload.successfulTransactions,
          failedTransactions: existingUpload.failedTransactions,
          status: existingUpload.status
        }
      }, { status: 409 }); // Conflict
    }

    // Parser OFX
    log.info('Fazendo parser do arquivo OFX...');
    const parseResult = await parseOFXFile(ofxContent);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: `Erro ao parser OFX: ${parseResult.error}`
      }, { status: 400 });
    }

    // Calcular openingBalance a partir do LEDGERBAL
    const hasLedgerBalance = !!parseResult.balance && parseResult.balance.amount !== 0;
    let calculatedOpeningBalance = '0';
    if (hasLedgerBalance && parseResult.balance) {
      const transactionSum = parseResult.transactions.reduce(
        (sum, tx) => sum + tx.amount, 0
      );
      calculatedOpeningBalance = (parseResult.balance.amount - transactionSum).toFixed(2);
      log.info({
        ledgerBalance: parseResult.balance.amount,
        transactionSum: parseFloat(transactionSum.toFixed(2)),
        openingBalance: calculatedOpeningBalance
      }, 'Saldo de abertura calculado a partir do LEDGERBAL');
    }

    log.info({
      numTransactions: parseResult.transactions?.length || 0,
      bankInfo: parseResult.bankInfo,
      ledgerBalance: parseResult.balance?.amount ?? null,
      calculatedOpeningBalance,
      safeMode
    }, 'Parser OFX concluido');

    // Modo seguro: limitar a primeira transação apenas
    if (safeMode && parseResult.transactions && parseResult.transactions.length > 1) {
      log.info({ originalCount: parseResult.transactions.length, limitedTo: 1 }, 'Modo seguro: limitando transacoes');
      parseResult.transactions = [parseResult.transactions[0]];
    }

    // Agora extrair informações bancárias do OFX para gerenciamento de contas
    log.debug('Extraindo informacoes bancarias do OFX...');

    // Buscar todas as contas da empresa
    const allAccounts = await db.select().from(accounts).where(eq(accounts.companyId, defaultCompany.id));
    log.info({ accountCount: allAccounts.length }, 'Contas encontradas para a empresa');

    let defaultAccount = null;
    let accountMatchType = '';

    // Estratégia 1: Tentar encontrar conta exata pelo número da conta
    if (parseResult.bankInfo?.accountId) {
      const exactMatch = allAccounts.find(acc =>
        acc.accountNumber === parseResult.bankInfo!.accountId ||
        acc.accountNumber.replace(/[^0-9-]/g, '') === parseResult.bankInfo!.accountId!.replace(/[^0-9-]/g, '')
      );

      if (exactMatch) {
        defaultAccount = exactMatch;
        accountMatchType = 'conta exata';
        log.info({ accountName: exactMatch.name, accountNumber: exactMatch.accountNumber }, 'Encontrada conta exata');

        // Atualizar informações da conta com dados do OFX se disponíveis
        if (parseResult.bankInfo?.bankName) {
          log.debug('Atualizando informacoes bancarias da conta encontrada...');
          defaultAccount = await updateAccountBankInfo(exactMatch.id, {
            bankName: parseResult.bankInfo.bankName,
            bankCode: parseResult.bankInfo.bankId,
            agencyNumber: parseResult.bankInfo.branchId,
            accountType: parseResult.bankInfo.accountType
          }) || defaultAccount;
        }
      }
    }

    // Estratégia 2: Tentar encontrar pelo banco se não encontrou pela conta
    if (!defaultAccount && parseResult.bankInfo?.bankName) {
      const bankMatch = allAccounts.find(acc =>
        acc.bankName?.toLowerCase().includes(parseResult.bankInfo!.bankName!.toLowerCase()) ||
        parseResult.bankInfo!.bankName!.toLowerCase().includes(acc.bankName?.toLowerCase() || '')
      );

      if (bankMatch) {
        defaultAccount = bankMatch;
        accountMatchType = 'banco correspondente';
        log.info({ accountName: bankMatch.name, bankName: bankMatch.bankName }, 'Encontrada conta do mesmo banco');

        // Atualizar informações da conta com dados do OFX
        if (parseResult.bankInfo) {
          log.debug('Atualizando informacoes bancarias da conta encontrada...');
          defaultAccount = await updateAccountBankInfo(bankMatch.id, {
            bankName: parseResult.bankInfo.bankName,
            bankCode: parseResult.bankInfo.bankId,
            accountNumber: parseResult.bankInfo.accountId,
            agencyNumber: parseResult.bankInfo.branchId,
            accountType: parseResult.bankInfo.accountType
          }) || defaultAccount;
        }
      }
    }

    // Estratégia 3: Criar nova conta se tiver informações do OFX mas não houver correspondência exata
    if (!defaultAccount && parseResult.bankInfo) {
      log.debug('Verificando se ja existe conta com as informacoes do OFX...');

      // Verificar se já existe conta com o mesmo número da conta e banco
      const similarAccount = allAccounts.find(acc => {
        const accountMatch = parseResult.bankInfo?.accountId &&
          (acc.accountNumber === parseResult.bankInfo.accountId ||
            acc.accountNumber.replace(/[^0-9-]/g, '') === parseResult.bankInfo.accountId.replace(/[^0-9-]/g, ''));

        const bankMatch = parseResult.bankInfo?.bankName &&
          (acc.bankName?.toLowerCase() === parseResult.bankInfo.bankName.toLowerCase() ||
            acc.bankName?.toLowerCase().includes(parseResult.bankInfo.bankName.toLowerCase()) ||
            parseResult.bankInfo.bankName.toLowerCase().includes(acc.bankName?.toLowerCase() || ''));

        return accountMatch || bankMatch;
      });

      if (similarAccount) {
        defaultAccount = similarAccount;
        accountMatchType = 'conta similar existente';
        log.info({ accountName: similarAccount.name, bankName: similarAccount.bankName }, 'Encontrada conta similar');

        // Atualizar informações da conta com dados do OFX
        log.debug('Atualizando informacoes bancarias da conta similar...');

        // Tentar identificar nome do banco pelo código se não vier no OFX
        let resolvedBankName = parseResult.bankInfo.bankName;
        if ((!resolvedBankName || resolvedBankName === 'Banco Não Identificado') && parseResult.bankInfo.bankId) {
          const bankInfo = getBankByCode(parseResult.bankInfo.bankId);
          if (bankInfo) {
            resolvedBankName = bankInfo.shortName; // Usar nome curto (ex: Itaú)
            log.info({ bankCode: parseResult.bankInfo.bankId, bankName: resolvedBankName }, 'Banco identificado pelo codigo');
          }
        }

        defaultAccount = await updateAccountBankInfo(similarAccount.id, {
          bankName: resolvedBankName,
          bankCode: parseResult.bankInfo.bankId,
          accountNumber: parseResult.bankInfo.accountId,
          agencyNumber: parseResult.bankInfo.branchId,
          accountType: parseResult.bankInfo.accountType
        }) || defaultAccount;
      } else {
        log.info('Criando nova conta baseada nas informacoes do OFX...');

        // Tentar identificar nome do banco pelo código
        let resolvedBankName = parseResult.bankInfo.bankName || 'Banco Não Identificado';
        let bankCode = parseResult.bankInfo.bankId || '000';

        if ((!parseResult.bankInfo.bankName || parseResult.bankInfo.bankName === 'Banco Não Identificado') && bankCode !== '000') {
          const bankInfo = getBankByCode(bankCode);
          if (bankInfo) {
            resolvedBankName = bankInfo.shortName;
            log.info({ bankCode, bankName: resolvedBankName }, 'Banco identificado pelo codigo');
          }
        }

        const [newAccount] = await db.insert(accounts).values({
          companyId: defaultCompany.id,
          name: parseResult.bankInfo?.accountId
            ? `Conta ${resolvedBankName} - ${parseResult.bankInfo.accountId}`
            : `Conta ${resolvedBankName} - OFX`,
          bankName: resolvedBankName,
          bankCode: bankCode,
          agencyNumber: parseResult.bankInfo?.branchId || '0000',
          accountNumber: parseResult.bankInfo?.accountId || '00000-0',
          accountType: parseResult.bankInfo?.accountType || 'checking',
          openingBalance: calculatedOpeningBalance,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        defaultAccount = newAccount;
        accountMatchType = 'criada automaticamente do OFX';
        log.info({ accountName: newAccount.name, bankName: newAccount.bankName }, 'Nova conta criada');
      }
    }

    // Estratégia 4: Usar primeira conta existente apenas se não tiver informações do OFX
    if (!defaultAccount && allAccounts.length > 0) {
      defaultAccount = allAccounts[0];
      accountMatchType = 'primeira disponível (sem info OFX)';
      log.warn({ accountName: defaultAccount.name, bankName: defaultAccount.bankName }, 'Usando primeira conta disponivel');
    }

    // Estratégia 5: Criar conta genérica se não existir nenhuma
    if (!defaultAccount) {
      log.info('Nenhuma conta encontrada. Criando conta generica...');

      const [newAccount] = await db.insert(accounts).values({
        companyId: defaultCompany.id,
        name: 'Conta Nova - Upload OFX',
        bankName: 'Banco Não Identificado',
        bankCode: '000',
        agencyNumber: '0000',
        accountNumber: '00000-0',
        accountType: 'checking',
        openingBalance: calculatedOpeningBalance,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      defaultAccount = newAccount;
      accountMatchType = 'criada automaticamente (genérica)';
      log.info({ accountName: newAccount.name }, 'Conta generica criada');
    }

    log.info({ accountName: defaultAccount.name, accountId: defaultAccount.id, matchType: accountMatchType }, 'Conta selecionada');

    // Criar registro de upload
    log.debug('Criando registro de upload...');
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
      status: 'pending', // Será atualizado para processing quando começar o batch
      totalTransactions: parseResult.transactions.length,
      uploadedAt: new Date()
    }).returning();

    log.info({ uploadId: newUpload.id }, 'Upload registrado');

    // Se modo assíncrono, retornar imediatamente e processar em background
    if (async) {
      log.info('Modo assincrono ativado - iniciando processamento em background');

      // Iniciar processamento em background (não aguardar)
      AsyncUploadProcessorService.startProcessing(
        newUpload.id,
        fileBuffer,
        defaultAccount.id,
        {
          fileName: file.name,
          bankName: parseResult.bankInfo?.bankName,
          companyId: defaultCompany.id
        }
      ).catch(async (error) => {
        log.error({ err: error }, 'Erro no processamento assincrono');
        try {
          await db
            .update(uploads)
            .set({
              status: 'failed',
              processingLog: { error: error instanceof Error ? error.message : 'Erro no processamento assincrono' }
            })
            .where(eq(uploads.id, newUpload.id));
        } catch (dbError) {
          log.error({ err: dbError }, 'Falha ao marcar upload como failed');
        }
      });

      const isNewAccount = accountMatchType === 'criada automaticamente do OFX' || accountMatchType === 'criada automaticamente (genérica)';

      // Retornar imediatamente com informações básicas
      return NextResponse.json({
        success: true,
        data: {
          upload: {
            id: newUpload.id,
            fileName: file.name,
            status: 'pending',
            totalTransactions: parseResult.transactions.length
          },
          account: {
            id: defaultAccount.id,
            name: defaultAccount.name,
            bankName: defaultAccount.bankName
          },
          balanceInfo: {
            autoSet: hasLedgerBalance,
            amount: parseFloat(calculatedOpeningBalance),
            accountId: defaultAccount.id,
            accountName: defaultAccount.name,
            isNewAccount
          },
          message: 'Upload registrado com sucesso. Processamento iniciado em background.',
          progressEndpoint: `/api/uploads/${newUpload.id}/progress`
        }
      });
    }

    // Modo síncrono (comportamento original)
    log.info('Modo sincrono - preparando processamento incremental...');
    const batchService = BatchProcessingService;
    await batchService.prepareUploadForBatchProcessing(newUpload.id, parseResult.transactions.length);

    // Converter transações para o formato esperado pelo batch service
    const formattedTransactions = parseResult.transactions.map(tx => ({
      description: tx.description,
      name: tx.description, // OFXTransaction não tem name, usamos description
      memo: tx.memo,
      amount: tx.amount,
      date: tx.date,
      fitid: tx.fitid,
      balance: tx.balance
    }));

    // Processar em batches
    log.info({ transactionCount: formattedTransactions.length }, 'Processando transacoes em batches...');
    let totalSuccessful = 0;
    let totalFailed = 0;
    const batchSize = 15; // Mesmo batch size do serviço

    for (let i = 0; i < formattedTransactions.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchTransactions = formattedTransactions.slice(i, i + batchSize);
      const totalBatches = Math.ceil(formattedTransactions.length / batchSize);

      log.info({ batchNumber, totalBatches, batchSize: batchTransactions.length }, 'Processando batch');

      try {
        const batchResult = await batchService.processBatch(
          newUpload.id,
          batchTransactions,
          defaultAccount.id,
          null, // categoryId - será determinado no processamento
          {
            fileName: file.name,
            bankName: parseResult.bankInfo?.bankName
          },
          batchNumber,
          i
        );

        totalSuccessful += batchResult.success;
        totalFailed += batchResult.failed;

        log.info({ batchNumber, success: batchResult.success, failed: batchResult.failed }, 'Batch concluido');

      } catch (error) {
        log.error({ err: error, batchNumber }, 'Erro no batch');
        totalFailed += batchTransactions.length;
      }
    }

    // Marcar upload como concluído
    await batchService.completeUpload(newUpload.id, {
      successful: totalSuccessful,
      failed: totalFailed,
      totalTime: Date.now() - startTime
    });

    log.info({ successful: totalSuccessful, failed: totalFailed }, 'Processamento concluido');

    // Buscar transações salvas para estatísticas
    const savedTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.uploadId, newUpload.id));

    // Estatísticas da classificação
    const categoryStats = savedTransactions.reduce((stats, transaction) => {
      const category = 'Categoria não disponível'; // Simplificado para o novo formato
      stats[category] = (stats[category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const totalAmount = savedTransactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const credits = savedTransactions
      .filter(t => parseFloat(t.amount || '0') > 0)
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const debits = Math.abs(savedTransactions
      .filter(t => parseFloat(t.amount || '0') < 0)
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0));

    const isNewAccount = accountMatchType === 'criada automaticamente do OFX' || accountMatchType === 'criada automaticamente (genérica)';

    const analysisResult = {
      fileInfo: {
        name: file.name,
        size: file.size,
        uploadDate: new Date().toISOString()
      },
      bankInfo: parseResult.bankInfo,
      balanceInfo: {
        autoSet: hasLedgerBalance,
        amount: parseFloat(calculatedOpeningBalance),
        accountId: defaultAccount.id,
        accountName: defaultAccount.name,
        isNewAccount
      },
      company: {
        id: defaultCompany.id,
        name: defaultCompany.name
      },
      account: {
        id: defaultAccount.id,
        name: defaultAccount.name,
        bankName: defaultAccount.bankName
      },
      upload: {
        id: newUpload.id,
        filename: newUpload.filename,
        filePath: newUpload.filePath,
        totalTransactions: newUpload.totalTransactions,
        successfulTransactions: totalSuccessful,
        failedTransactions: totalFailed,
        status: 'completed'
      },
      transactions: [], // Simplificado - as transações estão no banco
      statistics: {
        totalTransactions: savedTransactions.length,
        totalAmount: Math.abs(totalAmount),
        credits: credits,
        debits: debits,
        categoryDistribution: categoryStats,
        averageConfidence: savedTransactions.reduce((sum, t) => sum + parseFloat(t.confidence || '0'), 0) / savedTransactions.length,
        databasePersistence: {
          successful: totalSuccessful,
          failed: totalFailed,
          totalProcessed: parseResult.transactions.length
        },
        batchProcessing: {
          enabled: true,
          batchSize: 15,
          totalBatches: Math.ceil(parseResult.transactions.length / 15),
          processingTime: Date.now() - startTime
        }
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      savedToDatabase: totalSuccessful > 0,
      message: `Processado em batches - ${totalSuccessful} transações salvas com sucesso`
    };

    log.info({ analysisResult }, 'Resultado final da analise');
    log.info('[OFX-UPLOAD-ANALYZE] Fim da requisicao');

    return NextResponse.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error({
      err: error,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    }, 'Erro no upload e analise OFX');
    log.info('[OFX-UPLOAD-ANALYZE] Fim da requisicao (ERRO)');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      processingTime
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  await requireAuth();
  return NextResponse.json({
    message: 'API de Upload e Análise OFX',
    endpoint: '/api/ofx/upload-and-analyze',
    method: 'POST',
    contentType: 'multipart/form-data',
    body: {
      file: 'File (obrigatório) - Arquivo OFX'
    },
    workflow: [
      '1. Upload do arquivo OFX',
      '2. Parser do conteudo OFX',
      '3. Classificacao inteligente de cada transacao',
      '4. Analise com pesquisa de empresas (CNPJ/CNAE)',
      '5. Retorno de transacoes classificadas',
      '6. Estatisticas e resumo financeiro'
    ],
    features: [
      'Upload de arquivos OFX',
      'Parser inteligente',
      'Classificacao com IA',
      'Pesquisa de empresas',
      'Estatisticas detalhadas',
      'Botao Salvar (em desenvolvimento)'
    ],
    maxFileSize: '10MB',
    supportedFormats: ['.ofx']
  });
}
