import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClassificationAgent } from '@/lib/agent/agent';
import { BatchClassificationRequest, BatchClassificationResponse } from '@/lib/agent/types';
import { requireAuth } from '@/lib/auth/get-session';

// Schema de validação da requisição em lote
const BatchCategorizeRequestSchema = z.object({
  transactions: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
    amount: z.number().positive('Valor deve ser positivo'),
    date: z.string().optional()
  })).min(1, 'Pelo menos uma transação é obrigatória').max(100, 'Máximo de 100 transações por requisição'),
  useCache: z.boolean().default(true),
  forceAI: z.boolean().default(false),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const validatedData = BatchCategorizeRequestSchema.parse(body);

    // Adicionar IDs se não fornecidos
    const transactions = validatedData.transactions.map((tx, index) => ({
      ...tx,
      id: tx.id || `batch_${Date.now()}_${index.toString().padStart(3, '0')}`
    }));

    const agent = ClassificationAgent.getInstance();
    const result = await agent.classifyBatch({
      transactions,
      useCache: validatedData.useCache,
      forceAI: validatedData.forceAI
    });

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        requestId: `batch_${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalTransactions: transactions.length,
        summary: result.summary
      }
    });

  } catch (error) {
    console.error('Erro na API de categorização em lote:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Endpoint para processamento assíncrono de lotes grandes
export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { batchId, status } = body;

    if (!batchId || !status) {
      return NextResponse.json({
        success: false,
        error: 'ID do lote e status são obrigatórios'
      }, { status: 400 });
    }

    // Aqui você implementaria o gerenciamento de status de processamento assíncrono
    return NextResponse.json({
      success: true,
      message: `Status do lote ${batchId} atualizado para ${status}`,
      metadata: {
        batchId,
        status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar status do lote:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Endpoint para consultar status de processamento
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({
        success: false,
        error: 'ID do lote é obrigatório'
      }, { status: 400 });
    }

    // Simular consulta de status
    return NextResponse.json({
      success: true,
      data: {
        batchId,
        status: 'completed',
        progress: 100,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        results: []
      }
    });

  } catch (error) {
    console.error('Erro na consulta de lote:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}