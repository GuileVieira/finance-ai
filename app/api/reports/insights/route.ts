import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import InsightsService from '@/lib/services/insights.service';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    const category = searchParams.get('category');
    const type = searchParams.get('type'); // alert, recommendation, positive, trend
    const companyId = searchParams.get('companyId') || undefined;
    const accountId = searchParams.get('accountId') || undefined;

    console.log('📊 [INSIGHTS-API] Buscando insights com filtros:', { period, category, type, companyId, accountId });

    const insightsData = await InsightsService.getFinancialInsights({
      period,
      category,
      type,
      companyId,
      accountId
    });

    return NextResponse.json({
      success: true,
      data: insightsData
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch insights'
      },
      { status: 500 }
    );
  }
}