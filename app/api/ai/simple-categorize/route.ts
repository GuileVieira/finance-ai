import { NextRequest, NextResponse } from 'next/server';
import { runSimpleAgent } from '@/lib/agent/simple-agent';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('\n=== [SIMPLE-CATEGORIZE] Nova requisição de categorização ===');

    const body = await request.json();
    const { description, amount } = body;

    console.log('📥 Dados recebidos:', {
      description,
      amount,
      timestamp: new Date().toISOString()
    });

    if (!description || !amount) {
      console.log('❌ Erro: Descrição e valor são obrigatórios');
      return NextResponse.json({
        success: false,
        error: 'Descrição e valor são obrigatórios'
      }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    console.log('💰 Valor processado:', numAmount);

    console.log('🤖 Executando agente simples...');
    const result = await runSimpleAgent(description, numAmount);
    console.log('✅ Resultado do agente:', result);

    const finalResult = {
      ...result,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };

    console.log('🎯 Resultado final:', finalResult);
    console.log('=== [SIMPLE-CATEGORIZE] Fim da requisição ===\n');

    return NextResponse.json({
      success: true,
      data: finalResult
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro na API de categorização simples:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    });
    console.log('=== [SIMPLE-CATEGORIZE] Fim da requisição (ERRO) ===\n');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      processingTime
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API de Categorização Simples - Use POST para categorizar transações',
    endpoint: '/api/ai/simple-categorize',
    method: 'POST',
    body: {
      description: 'string (obrigatório)',
      amount: 'number (obrigatório)'
    },
    example: {
      description: 'DEBITO IFOOD RESTAURANTES 45.90',
      amount: 45.90
    }
  });
}