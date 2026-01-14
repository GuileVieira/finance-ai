import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import DREService from '@/lib/services/dre.service';
import { requireAuth } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
  try {
    const { companyId: sessionCompanyId } = await requireAuth();
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    const includeComparison = searchParams.get('compare') === 'true';
    const companyId = sessionCompanyId; // Usar companyId da sessão
    const accountId = searchParams.get('accountId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    console.log('📊 [DRE-API] Buscando DRE com filtros:', { period, includeComparison, companyId, accountId, startDate, endDate });

    // Buscar DRE do período atual
    const currentData = await DREService.getDREStatement({
      period,
      companyId,
      accountId,
      startDate,
      endDate
    });

    // Buscar DRE do período anterior para comparação
    let comparisonData = undefined;
    if (includeComparison) {
      const previousPeriod = DREService.getPreviousPeriod(period);
      // Só busca comparação se houver período anterior válido
      if (previousPeriod) {
        comparisonData = await DREService.getDREStatement({
          period: previousPeriod,
          companyId,
          accountId
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        current: currentData,
        comparison: comparisonData,
        period: currentData.period
      }
    });
  } catch (error) {
    console.error('Error fetching DRE:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch DRE data'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId: sessionCompanyId } = await requireAuth();
    await initializeDatabase();

    const body = await request.json();
    const { period, accountId } = body;
    const companyId = sessionCompanyId; // Usar companyId da sessão

    console.log('📊 [DRE-API] Calculando DRE com filtros:', { period, companyId, accountId });

    const dreData = await DREService.getDREStatement({
      period: period || 'current',
      companyId,
      accountId
    });

    return NextResponse.json({
      success: true,
      data: dreData
    });
  } catch (error) {
    console.error('Error calculating DRE:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate DRE'
      },
      { status: 500 }
    );
  }
}