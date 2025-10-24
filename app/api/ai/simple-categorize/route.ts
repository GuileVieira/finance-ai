import { NextRequest, NextResponse } from 'next/server';
import { runSimpleAgent } from '@/lib/agent/simple-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, amount } = body;

    if (!description || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Descrição e valor são obrigatórios'
      }, { status: 400 });
    }

    const result = await runSimpleAgent(description, parseFloat(amount));

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro na API de categorização simples:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
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