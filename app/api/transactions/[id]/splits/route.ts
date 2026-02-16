import { NextRequest, NextResponse } from 'next/server';
import TransactionsService from '@/lib/services/transactions.service';
import { requireAuth } from '@/lib/auth/get-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: transactionId } = await params;

    const splits = await TransactionsService.getTransactionSplits(transactionId, session.userId);

    return NextResponse.json({
      success: true,
      data: splits
    });
  } catch (error) {
    console.error('❌ Erro ao buscar splits:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: transactionId } = await params;
    const { splits } = await request.json();

    if (!Array.isArray(splits)) {
      return NextResponse.json({
        success: false,
        error: 'Splits devem ser um array'
      }, { status: 400 });
    }

    await TransactionsService.updateTransactionSplits(transactionId, splits, session.userId);

    return NextResponse.json({
      success: true,
      message: 'Transação desmembrada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao salvar splits:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}
