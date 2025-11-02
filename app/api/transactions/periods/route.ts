import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import TransactionsService from '@/lib/services/transactions.service';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const accountId = searchParams.get('accountId') || undefined;
    const type = searchParams.get('type') as ('credit' | 'debit') | null;

    const filters: {
      companyId?: string;
      accountId?: string;
      type?: 'credit' | 'debit';
    } = {};

    if (companyId && companyId !== 'all') {
      filters.companyId = companyId;
    }

    if (accountId && accountId !== 'all') {
      filters.accountId = accountId;
    }

    if (type && type !== 'all') {
      filters.type = type;
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
