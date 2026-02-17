import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { transactions, categoryRules } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('tx-batch-update');

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { transactionIds, updates, incrementRuleUsage = false } = body;

    // Validações
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'TransactionIds deve ser um array não vazio'
      }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Updates deve ser um objeto válido'
      }, { status: 400 });
    }

    log.info({ count: transactionIds.length, updates }, 'Atualizando transacoes em lote');

    // Construir updates dinamicamente
    const dbUpdates: any = { updatedAt: new Date() };
    if (updates.categoryId) dbUpdates.categoryId = updates.categoryId;
    if (updates.manuallyCategorized !== undefined) dbUpdates.manuallyCategorized = updates.manuallyCategorized;
    if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
    if (updates.confidence !== undefined) dbUpdates.confidence = updates.confidence.toString();
    if (updates.reasoning) dbUpdates.reasoning = updates.reasoning;

    // Executar update em lote
    const result = await db.update(transactions)
      .set(dbUpdates)
      .where(inArray(transactions.id, transactionIds))
      .returning();

    log.info({ count: result.length }, 'Transacoes atualizadas com sucesso');

    // Se foi uma atualização de categoria via regra, incrementar contador de uso
    if (incrementRuleUsage && updates.categoryId) {
      // Aqui poderíamos incrementar o usageCount da regra,
      // mas precisaríamos identificar qual regra foi usada
      log.info('Sugestao: Incrementar contador de uso da regra aplicada');
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.length,
        updatedTransactions: result.map(t => t.id),
        updates: dbUpdates
      },
      message: `${result.length} transações atualizadas com sucesso`
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao atualizar transacoes em lote');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API de atualização em lote de transações',
    endpoint: '/api/transactions/batch-update',
    method: 'POST',
    body: {
      transactionIds: 'string[] (obrigatório) - IDs das transações',
      updates: 'object (obrigatório) - Campos para atualizar',
      incrementRuleUsage: 'boolean (opcional) - Incrementar contador da regra'
    },
    example: {
      transactionIds: ['uuid1', 'uuid2', 'uuid3'],
      updates: {
        categoryId: 'category-uuid',
        manuallyCategorized: true,
        verified: true
      },
      incrementRuleUsage: true
    }
  });
}