import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import DREService from '@/lib/services/dre.service';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    const includeComparison = searchParams.get('compare') === 'true';
    const companyId = searchParams.get('companyId') || undefined;
    const accountId = searchParams.get('accountId') || undefined;

    console.log('📊 [DRE-API] Buscando DRE com filtros:', { period, includeComparison, companyId, accountId });

    // Buscar DRE do período atual
    const currentData = await DREService.getDREStatement({
      period,
      companyId,
      accountId
    });

    // Buscar DRE do período anterior para comparação
    let comparisonData = undefined;
    if (includeComparison) {
      const previousPeriod = await DREService.getPreviousPeriod(period);
      comparisonData = await DREService.getDREStatement({
        period: previousPeriod,
        companyId,
        accountId
      });
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
    await initializeDatabase();

    const body = await request.json();
    const { period, companyId, accountId } = body;

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