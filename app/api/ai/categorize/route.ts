import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClassificationAgent } from '@/lib/agent/agent';
import { ClassificationResult } from '@/lib/agent/types';
import { requireAuth } from '@/lib/auth/get-session';

// Schema de validação da requisição
const CategorizeRequestSchema = z.object({
  description: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
  amount: z.number().positive('Valor deve ser positivo'),
  transactionId: z.string().optional(),
  useCache: z.boolean().default(true),
  forceAI: z.boolean().default(false)
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const validatedData = CategorizeRequestSchema.parse(body);

    // Gerar ID se não fornecido
    const transactionId = validatedData.transactionId ||
      `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const agent = ClassificationAgent.getInstance();
    const result = await agent.classifyTransaction(
      validatedData.description,
      validatedData.amount,
      transactionId
    );

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        requestId: `req_${Date.now()}`,
        timestamp: new Date().toISOString(),
        processingTime: result.processingTime,
        source: result.source
      }
    });

  } catch (error) {
    console.error('Erro na API de categorização:', error);

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

// Endpoint para validação de classificação
export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { transactionId, isCorrect, feedback } = body;

    if (!transactionId || typeof isCorrect !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'Dados de feedback inválidos'
      }, { status: 400 });
    }

    // Aqui você implementaria o feedback para o sistema de aprendizado
    // Por enquanto, apenas retorna sucesso
    return NextResponse.json({
      success: true,
      message: 'Feedback recebido com sucesso',
      metadata: {
        transactionId,
        feedback: isCorrect,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro no feedback:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar feedback'
    }, { status: 500 });
  }
}

// Endpoint para consultar status do agente
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Retornar estatísticas do sistema
      const agent = ClassificationAgent.getInstance();
      // Implementar método getStats no agente

      return NextResponse.json({
        success: true,
        data: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Ação não especificada ou inválida'
    }, { status: 400 });

  } catch (error) {
    console.error('Erro na consulta de status:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}