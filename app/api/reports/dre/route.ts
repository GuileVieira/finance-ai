import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import DREService from '@/lib/services/dre.service';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('reports-dre');

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

    log.info({ period, includeComparison, companyId, accountId, startDate, endDate }, 'Fetching DRE with filters');

    // Buscar DRE do período atual
    const currentData = await DREService.getDREStatement({
      period,
      companyId,
      accountId,
      startDate,
      endDate,
      userId: (await requireAuth()).userId,
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
          accountId,
          userId: (await requireAuth()).userId,
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
    log.error({ err: error }, 'Error fetching DRE');
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
    const session = await requireAuth();
    const body = await request.json();
    const { period, accountId } = body;
    const companyId = session.companyId; // Usar companyId da sessão

    log.info({ period, companyId, accountId }, 'Calculating DRE with filters');

    const dreData = await DREService.getDREStatement({
      period: period || 'current',
      companyId,
      accountId,
      userId: session.userId,
    });

    return NextResponse.json({
      success: true,
      data: dreData
    });
  } catch (error) {
    log.error({ err: error }, 'Error calculating DRE');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate DRE'
      },
      { status: 500 }
    );
  }
}