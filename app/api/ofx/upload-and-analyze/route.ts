import { NextRequest, NextResponse } from 'next/server';
import { parseOFXFile } from '@/lib/ofx-parser';
import { categorizeTransaction } from '@/lib/transaction-classifier';
import { db } from '@/lib/db/connection';
import { companies, accounts, uploads, transactions, categories } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany, getDefaultAccount, findAccountByBankInfo, updateAccountBankInfo } from '@/lib/db/init-db';
import FileStorageService from '@/lib/storage/file-storage.service';
import { createHash } from 'crypto';
import BatchProcessingService from '@/lib/services/batch-processing.service';
import AsyncUploadProcessorService from '@/lib/services/async-upload-processor.service';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('\n=== [OFX-UPLOAD-ANALYZE] Nova requisição de upload e análise ===');
    console.log('🔧 Headers:', {
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent')?.substring(0, 50)
    });

    // Inicializar banco de dados se necessário
    console.log('🔧 Verificando banco de dados...');
    await initializeDatabase();

    // Obter empresa e conta padrão
    const defaultCompany = await getDefaultCompany();
    if (!defaultCompany) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma empresa encontrada. Configure uma empresa primeiro.'
      }, { status: 400 });
    }

    console.log(`🏢 Usando empresa: ${defaultCompany.name} (${defaultCompany.id})`);

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

    console.log('📁 Arquivo recebido:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Ler conteúdo do arquivo
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ofxContent = fileBuffer.toString('utf-8');

    console.log('📋 Arquivo lido, tamanho:', ofxContent.length, 'caracteres');

    // Salvar arquivo fisicamente
    console.log('💾 Salvando arquivo no sistema...');
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

    console.log('✅ Arquivo salvo:', storageResult.filePath);

    // Calcular hash do arquivo para detecção de duplicatas
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    console.log('🔐 Hash do arquivo calculado:', fileHash);

    // Verificar se o arquivo já foi enviado (duplicata)
    console.log('🔍 Verificando duplicatas...');
    const [existingUpload] = await db.select()
      .from(uploads)
      .where(and(
        eq(uploads.companyId, defaultCompany.id),
        eq(uploads.fileHash, fileHash)
      ))
      .limit(1);

    if (existingUpload) {
      console.log(`⚠️ Arquivo duplicado detectado. Upload anterior: ${existingUpload.id} (${existingUpload.uploadedAt})`);
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
    console.log('🔍 Fazendo parser do arquivo OFX...');
    const parseResult = await parseOFXFile(ofxContent);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: `Erro ao parser OFX: ${parseResult.error}`
      }, { status: 400 });
    }

    console.log('✅ Parser OFX concluído:', {
      numTransactions: parseResult.transactions?.length || 0,
      bankInfo: parseResult.bankInfo,
      safeMode
    });

    // Modo seguro: limitar a primeira transação apenas
    if (safeMode && parseResult.transactions && parseResult.transactions.length > 1) {
      console.log(`🔒 Modo seguro: limitando de ${parseResult.transactions.length} para 1 transação`);
      parseResult.transactions = [parseResult.transactions[0]];
    }

    // Agora extrair informações bancárias do OFX para gerenciamento de contas
    console.log('🔍 Extraindo informações bancárias do OFX...');

    // Buscar todas as contas da empresa
    const allAccounts = await db.select().from(accounts).where(eq(accounts.companyId, defaultCompany.id));
    console.log(`📋 Encontradas ${allAccounts.length} contas para a empresa`);

    let defaultAccount = null;
    let accountMatchType = '';

    // Estratégia 1: Tentar encontrar conta exata pelo número da conta
    if (parseResult.bankInfo?.accountId) {
      const exactMatch = allAccounts.find(acc =>
        acc.accountNumber === parseResult.bankInfo.accountId ||
        acc.accountNumber.replace(/[^0-9-]/g, '') === parseResult.bankInfo.accountId.replace(/[^0-9-]/g, '')
      );

      if (exactMatch) {
        defaultAccount = exactMatch;
        accountMatchType = 'conta exata';
        console.log(`✅ Encontrada conta exata: ${exactMatch.name} (${exactMatch.accountNumber})`);

        // Atualizar informações da conta com dados do OFX se disponíveis
        if (parseResult.bankInfo?.bankName) {
          console.log('🔄 Atualizando informações bancárias da conta encontrada...');
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
        acc.bankName?.toLowerCase().includes(parseResult.bankInfo.bankName.toLowerCase()) ||
        parseResult.bankInfo.bankName.toLowerCase().includes(acc.bankName?.toLowerCase() || '')
      );

      if (bankMatch) {
        defaultAccount = bankMatch;
        accountMatchType = 'banco correspondente';
        console.log(`✅ Encontrada conta do mesmo banco: ${bankMatch.name} (${bankMatch.bankName})`);

        // Atualizar informações da conta com dados do OFX
        if (parseResult.bankInfo) {
          console.log('🔄 Atualizando informações bancárias da conta encontrada...');
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
      console.log('🔍 Verificando se já existe conta com as informações do OFX...');

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
        console.log(`✅ Encontrada conta similar: ${similarAccount.name} (${similarAccount.bankName})`);

        // Atualizar informações da conta com dados do OFX
        console.log('🔄 Atualizando informações bancárias da conta similar...');
        defaultAccount = await updateAccountBankInfo(similarAccount.id, {
          bankName: parseResult.bankInfo.bankName,
          bankCode: parseResult.bankInfo.bankId,
          accountNumber: parseResult.bankInfo.accountId,
          agencyNumber: parseResult.bankInfo.branchId,
          accountType: parseResult.bankInfo.accountType
        }) || defaultAccount;
      } else {
        console.log('🏦 Criando nova conta baseada nas informações do OFX...');

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
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        defaultAccount = newAccount;
        accountMatchType = 'criada automaticamente do OFX';
        console.log(`✅ Nova conta criada: ${newAccount.name} (${newAccount.bankName})`);
      }
    }

    // Estratégia 4: Usar primeira conta existente apenas se não tiver informações do OFX
    if (!defaultAccount && allAccounts.length > 0) {
      defaultAccount = allAccounts[0];
      accountMatchType = 'primeira disponível (sem info OFX)';
      console.log(`⚠️ Usando primeira conta disponível: ${defaultAccount.name} (${defaultAccount.bankName})`);
    }

    // Estratégia 5: Criar conta genérica se não existir nenhuma
    if (!defaultAccount) {
      console.log('🏦 Nenhuma conta encontrada. Criando conta genérica...');

      const [newAccount] = await db.insert(accounts).values({
        companyId: defaultCompany.id,
        name: 'Conta Nova - Upload OFX',
        bankName: 'Banco Não Identificado',
        bankCode: '000',
        agencyNumber: '0000',
        accountNumber: '00000-0',
        accountType: 'checking',
        openingBalance: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      defaultAccount = newAccount;
      accountMatchType = 'criada automaticamente (genérica)';
      console.log(`✅ Conta genérica criada: ${newAccount.name}`);
    }

    console.log(`🏦 Usando conta: ${defaultAccount.name} (${defaultAccount.id}) - ${accountMatchType}`);

    // Criar registro de upload
    console.log('📝 Criando registro de upload...');
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

    console.log(`✅ Upload registrado: ${newUpload.id}`);

    // Se modo assíncrono, retornar imediatamente e processar em background
    if (async) {
      console.log('🚀 Modo assíncrono ativado - iniciando processamento em background');

      // Iniciar processamento em background (não aguardar)
      AsyncUploadProcessorService.startProcessing(
        newUpload.id,
        fileBuffer,
        defaultAccount.id,
        {
          fileName: file.name,
          bankName: parseResult.bankInfo?.bankName,
          companyId: defaultCompany.id  // ⬅️ ADICIONADO: necessário para categorização
        }
      ).catch(error => {
        console.error('❌ Erro no processamento assíncrono:', error);
      });

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
          message: 'Upload registrado com sucesso. Processamento iniciado em background.',
          progressEndpoint: `/api/uploads/${newUpload.id}/progress`
        }
      });
    }

    // Modo síncrono (comportamento original)
    console.log('🔄 Modo síncrono - preparando processamento incremental...');
    const batchService = BatchProcessingService;
    await batchService.prepareUploadForBatchProcessing(newUpload.id, parseResult.transactions.length);

    // Converter transações para o formato esperado pelo batch service
    const formattedTransactions = parseResult.transactions.map(tx => ({
      description: tx.description,
      name: tx.name,
      memo: tx.memo,
      amount: tx.amount,
      date: tx.date,
      fitid: tx.fitid,
      balance: tx.balance
    }));

    // Processar em batches
    console.log(`📦 Processando ${formattedTransactions.length} transações em batches...`);
    let totalSuccessful = 0;
    let totalFailed = 0;
    const batchSize = 15; // Mesmo batch size do serviço

    for (let i = 0; i < formattedTransactions.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchTransactions = formattedTransactions.slice(i, i + batchSize);

      console.log(`🔄 Processando batch ${batchNumber}/${Math.ceil(formattedTransactions.length / batchSize)} (${batchTransactions.length} transações)`);

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

        console.log(`✅ Batch ${batchNumber} concluído: ${batchResult.success} sucesso, ${batchResult.failed} falhas`);

      } catch (error) {
        console.error(`❌ Erro no batch ${batchNumber}:`, error);
        totalFailed += batchTransactions.length;
      }
    }

    // Marcar upload como concluído
    await batchService.completeUpload(newUpload.id, {
      successful: totalSuccessful,
      failed: totalFailed,
      totalTime: Date.now() - startTime
    });

    console.log(`🎉 Processamento concluído: ${totalSuccessful} sucesso, ${totalFailed} falhas`);

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

    const analysisResult = {
      fileInfo: {
        name: file.name,
        size: file.size,
        uploadDate: new Date().toISOString()
      },
      bankInfo: parseResult.bankInfo,
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

    console.log('🎯 Resultado final da análise:', analysisResult);
    console.log('=== [OFX-UPLOAD-ANALYZE] Fim da requisição ===\n');

    return NextResponse.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro no upload e análise OFX:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    });
    console.log('=== [OFX-UPLOAD-ANALYZE] Fim da requisição (ERRO) ===\n');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      processingTime
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API de Upload e Análise OFX',
    endpoint: '/api/ofx/upload-and-analyze',
    method: 'POST',
    contentType: 'multipart/form-data',
    body: {
      file: 'File (obrigatório) - Arquivo OFX'
    },
    workflow: [
      '1️⃣ Upload do arquivo OFX',
      '2️⃣ Parser do conteúdo OFX',
      '3️⃣ Classificação inteligente de cada transação',
      '4️⃣ Análise com pesquisa de empresas (CNPJ/CNAE)',
      '5️⃣ Retorno de transações classificadas',
      '6️⃣ Estatísticas e resumo financeiro'
    ],
    features: [
      '📁 Upload de arquivos OFX',
      '🔍 Parser inteligente',
      '🤖 Classificação com IA',
      '🏭 Pesquisa de empresas',
      '📊 Estatísticas detalhadas',
      '💾 Botão Salvar (em desenvolvimento)'
    ],
    maxFileSize: '10MB',
    supportedFormats: ['.ofx']
  });
}