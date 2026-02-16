import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { transactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();

    const { id: transactionId } = await params;
    const { categoryId } = await request.json();

    if (!categoryId) {
      return NextResponse.json({
        success: false,
        error: 'ID da categoria é obrigatório'
      }, { status: 400 });
    }

    console.log(`📝 Atualizando transação ${transactionId} para categoria ${categoryId}`);

    const { withUser } = await import('@/lib/db/connection');

    // Atualizar a transação dentro de um contexto com RLS
    const updatedTransaction = await withUser(session.userId, async (tx) => {
      return tx
        .update(transactions)
        .set({
          categoryId: categoryId,
          updatedAt: new Date(),
          manuallyCategorized: true
        })
        .where(eq(transactions.id, transactionId))
        .returning();
    });

    if (!updatedTransaction || updatedTransaction.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Transação não encontrada'
      }, { status: 404 });
    }

    console.log(`✅ Transação ${transactionId} atualizada com sucesso`);

    return NextResponse.json({
      success: true,
      data: updatedTransaction[0]
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar transação:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}