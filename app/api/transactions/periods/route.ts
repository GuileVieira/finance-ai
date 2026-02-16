import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import TransactionsService from '@/lib/services/transactions.service';
import { requireAuth } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || undefined;
    const type = searchParams.get('type') as ('credit' | 'debit') | null;

    const filters: {
      companyId?: string;
      accountId?: string;
      type?: 'credit' | 'debit';
      userId?: string;
    } = {
      companyId, // Always use companyId from session
      userId: (await requireAuth()).userId,
    };

    if (accountId && accountId !== 'all') {
      filters.accountId = accountId;
    }

    if (type && (type as any) !== 'all') {
      filters.type = type as 'credit' | 'debit';
    }

    const periods = await TransactionsService.getAvailablePeriods(filters);

    return NextResponse.json({
      success: true,
      data: {
        periods,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao listar períodos disponíveis:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar períodos'
    }, { status: 500 });
  }
}
