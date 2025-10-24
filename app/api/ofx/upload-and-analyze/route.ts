import { NextRequest, NextResponse } from 'next/server';
import { parseOFXFile } from '@/lib/ofx-parser';
import { categorizeTransaction } from '@/lib/transaction-classifier';
import { db } from '@/lib/db/connection';
import { companies, accounts, uploads, transactions, categories } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany, getDefaultAccount } from '@/lib/db/init-db';
import FileStorageService from '@/lib/storage/file-storage.service';
import { createHash } from 'crypto';

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
      }
    }

    // Estratégia 3: Usar primeira conta existente se nenhuma correspondência
    if (!defaultAccount && allAccounts.length > 0) {
      defaultAccount = allAccounts[0];
      accountMatchType = 'primeira disponível';
      console.log(`⚠️ Usando primeira conta disponível: ${defaultAccount.name} (${defaultAccount.bankName})`);
    }

    // Estratégia 4: Criar nova conta se não existir nenhuma
    if (!defaultAccount) {
      console.log('🏦 Nenhuma conta encontrada. Criando automaticamente...');

      const [newAccount] = await db.insert(accounts).values({
        companyId: defaultCompany.id,
        name: parseResult.bankInfo?.accountId
          ? `Conta ${parseResult.bankInfo.bankName || 'Banco'} - ${parseResult.bankInfo.accountId}`
          : 'Conta Extraída do OFX',
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
      accountMatchType = 'criada automaticamente';
      console.log(`✅ Conta criada automaticamente: ${newAccount.name} (${newAccount.bankName})`);
    }

    console.log(`🏦 Usando conta: ${defaultAccount.name} (${defaultAccount.id}) - ${accountMatchType}`);

    // Criar registro de upload (agora com a conta correta)
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
      status: 'processing',
      totalTransactions: parseResult.transactions.length,
      uploadedAt: new Date()
    }).returning();

    console.log(`✅ Upload registrado: ${newUpload.id}`);

    // Classificar cada transação e salvar no banco
    console.log('🤖 Classificando e salvando transações...');
    const classifiedTransactions = [];
    let successfulSaves = 0;
    let failedSaves = 0;

    for (let i = 0; i < parseResult.transactions.length; i++) {
      const transaction = parseResult.transactions[i];

      console.log(`📝 Analisando transação ${i + 1}/${parseResult.transactions.length}:`, {
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date
      });

      try {
        // Chamar API de classificação
        const classifyResponse = await fetch('http://localhost:3000/api/ai/work-categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: transaction.description,
            amount: transaction.amount,
            memo: transaction.memo,
            fileName: file.name,
            bankName: parseResult.bankInfo?.bankName,
            date: transaction.date,
            balance: transaction.balance
          })
        });

        let categoryData: any = null;
        let categoryName = 'Não classificado';
        let confidence = 0;
        let reasoning = '';

        if (!classifyResponse.ok) {
          console.error(`❌ Erro ao classificar transação ${i + 1}:`, classifyResponse.statusText);
          reasoning = `Erro na classificação: ${classifyResponse.statusText}`;
        } else {
          const classifyResult = await classifyResponse.json();
          if (classifyResult.success) {
            categoryData = classifyResult.data;
            categoryName = classifyResult.data.category;
            confidence = classifyResult.data.confidence || 0;
            reasoning = classifyResult.data.reasoning || '';
            console.log(`✅ Transação ${i + 1} classificada: ${categoryName} (${confidence})`);
          } else {
            console.error(`❌ Erro na resposta da classificação ${i + 1}:`, classifyResult.error);
            reasoning = `Erro na resposta: ${classifyResult.error}`;
          }
        }

        // Buscar categoria no banco
        let categoryId = null;
        if (categoryName && categoryName !== 'Não classificado') {
          const [foundCategory] = await db.select()
            .from(categories)
            .where(and(
              eq(categories.companyId, defaultCompany.id),
              eq(categories.name, categoryName),
              eq(categories.active, true)
            ))
            .limit(1);

          if (foundCategory) {
            categoryId = foundCategory.id;
          }
        }

        // Salvar transação no banco
        const transactionData = {
          accountId: defaultAccount.id,
          categoryId,
          uploadId: newUpload.id,
          description: transaction.description,
          amount: transaction.amount.toString(),
          type: transaction.amount >= 0 ? 'credit' : 'debit',
          transactionDate: new Date(transaction.date),
          rawDescription: transaction.description,
          metadata: {
            fitid: transaction.fitid,
            memo: transaction.memo,
            originalAmount: transaction.amount
          },
          manuallyCategorized: false,
          verified: false,
          confidence: confidence.toString(),
          reasoning
        };

        await db.insert(transactions).values(transactionData);
        successfulSaves++;

        // Adicionar à lista de transações classificadas para retorno
        classifiedTransactions.push({
          ...transaction,
          category: categoryName,
          confidence,
          reasoning,
          categoryId,
          source: 'ai'
        });

        // Pequeno delay para não sobrecarregar a API
        if (i < parseResult.transactions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`❌ Erro ao processar transação ${i + 1}:`, error);
        failedSaves++;

        classifiedTransactions.push({
          ...transaction,
          category: 'Não classificado',
          confidence: 0,
          reasoning: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          source: 'error'
        });
      }
    }

    // Atualizar status do upload
    await db.update(uploads)
      .set({
        status: failedSaves > 0 ? 'completed' : 'completed', // ainda completed mesmo com erros parciais
        successfulTransactions: successfulSaves,
        failedTransactions: failedSaves,
        processedAt: new Date(),
        processingLog: {
          totalProcessed: parseResult.transactions.length,
          successful: successfulSaves,
          failed: failedSaves,
          processingTime: Date.now() - startTime
        }
      })
      .where(eq(uploads.id, newUpload.id));

    console.log(`✅ Transações salvas: ${successfulSaves} sucesso, ${failedSaves} falhas`);

    console.log('📊 Análise concluída:', {
      totalTransactions: parseResult.transactions.length,
      classifiedTransactions: classifiedTransactions.length,
      processingTime: Date.now() - startTime
    });

    // Estatísticas da classificação
    const categoryStats = classifiedTransactions.reduce((stats, transaction) => {
      const category = transaction.category || 'Não classificado';
      stats[category] = (stats[category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const totalAmount = classifiedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const credits = classifiedTransactions.filter(t => t.amount > 0).length;
    const debits = classifiedTransactions.filter(t => t.amount < 0).length;

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
        successfulTransactions: newUpload.successfulTransactions,
        failedTransactions: newUpload.failedTransactions,
        status: newUpload.status
      },
      transactions: classifiedTransactions,
      statistics: {
        totalTransactions: classifiedTransactions.length,
        totalAmount: Math.abs(totalAmount),
        credits: credits,
        debits: debits,
        categoryDistribution: categoryStats,
        averageConfidence: classifiedTransactions.reduce((sum, t) => sum + (t.confidence || 0), 0) / classifiedTransactions.length,
        databasePersistence: {
          successful: successfulSaves,
          failed: failedSaves,
          totalProcessed: parseResult.transactions.length
        }
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      savedToDatabase: successfulSaves > 0
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