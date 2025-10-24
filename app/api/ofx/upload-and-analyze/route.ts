import { NextRequest, NextResponse } from 'next/server';
import { parseOFXFile } from '@/lib/ofx-parser';
import { categorizeTransaction } from '@/lib/transaction-classifier';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('\n=== [OFX-UPLOAD-ANALYZE] Nova requisição de upload e análise ===');

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
      bankInfo: parseResult.bankInfo
    });

    // Classificar cada transação
    console.log('🤖 Classificando transações...');
    const classifiedTransactions = [];

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

        if (!classifyResponse.ok) {
          console.error(`❌ Erro ao classificar transação ${i + 1}:`, classifyResponse.statusText);
          classifiedTransactions.push({
            ...transaction,
            category: 'Utilidades e Insumos',
            confidence: 0.1,
            reasoning: `Erro na classificação: ${classifyResponse.statusText}`,
            source: 'ai'
          });
        } else {
          const classifyResult = await classifyResponse.json();
          if (classifyResult.success) {
            console.log(`✅ Transação ${i + 1} classificada:`, classifyResult.data.category);
            classifiedTransactions.push({
              ...transaction,
              ...classifyResult.data
            });
          } else {
            console.error(`❌ Erro na resposta da classificação ${i + 1}:`, classifyResult.error);
            classifiedTransactions.push({
              ...transaction,
              category: 'Utilidades e Insumos',
              confidence: 0.1,
              reasoning: `Erro na resposta: ${classifyResult.error}`,
              source: 'ai'
            });
          }
        }

        // Pequeno delay para não sobrecarregar a API
        if (i < parseResult.transactions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`❌ Erro ao classificar transação ${i + 1}:`, error);
        classifiedTransactions.push({
          ...transaction,
          category: 'Utilidades e Insumos',
          confidence: 0.1,
          reasoning: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          source: 'ai'
        });
      }
    }

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
      transactions: classifiedTransactions,
      statistics: {
        totalTransactions: classifiedTransactions.length,
        totalAmount: Math.abs(totalAmount),
        credits: credits,
        debits: debits,
        categoryDistribution: categoryStats,
        averageConfidence: classifiedTransactions.reduce((sum, t) => sum + (t.confidence || 0), 0) / classifiedTransactions.length
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
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