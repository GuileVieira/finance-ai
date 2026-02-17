import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/get-session';
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { aiCategorizationAdapter } from '@/lib/services/ai-categorization-adapter.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ai-work-categorize');

// Inicializar o serviço de IA no pipeline oficial
TransactionCategorizationService.setAIService(aiCategorizationAdapter);

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await requireAuth();
    const companyId = session.companyId;

    log.info('Nova requisicao via Official Pipeline');

    const body = await request.json();
    const { description, amount, memo, balance } = body;

    if (!description || amount === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Descrição e valor são obrigatórios'
      }, { status: 400 });
    }

    // Executar categorização através do serviço unificado
    const result = await TransactionCategorizationService.categorize(
      {
        description,
        amount: parseFloat(amount),
        memo: memo || undefined,
        balance: balance || undefined
      },
      {
        companyId,
        confidenceThreshold: 75 // Threshold oficial do MVP
      }
    );

    const processingTime = Date.now() - startTime;
    log.info({ source: result.source, processingTime }, 'Categorizado com sucesso');

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Erro no work-categorize');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}