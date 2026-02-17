import { NextRequest, NextResponse } from 'next/server';
import { runSimpleAgent } from '@/lib/agent/simple-agent';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('ai-categorize');

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    await requireAuth();
    log.info('Nova requisicao de categorizacao');

    const body = await request.json();
    const { description, amount } = body;

    log.info({ description, amount }, 'Dados recebidos');

    if (!description || !amount) {
      log.warn('Descricao e valor sao obrigatorios');
      return NextResponse.json({
        success: false,
        error: 'Descrição e valor são obrigatórios'
      }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    log.info({ numAmount }, 'Valor processado');

    log.info('Executando agente simples');
    const result = await runSimpleAgent(description, numAmount);
    log.info({ result }, 'Resultado do agente');

    const finalResult = {
      ...result,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };

    log.info({ finalResult }, 'Resultado final');

    return NextResponse.json({
      success: true,
      data: finalResult
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error({ err: error, processingTime }, 'Erro na API de categorizacao simples');

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