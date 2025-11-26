import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import InsightsService from '@/lib/services/insights.service';

// GET - Buscar insights do dashboard
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);

    // Parse filtros
    const filters = {
      period: searchParams.get('period') || undefined,
      companyId: searchParams.get('companyId') || undefined,
      accountId: searchParams.get('accountId') || undefined,
    };

    console.log('💡 [DASHBOARD-INSIGHTS-API] Buscando insights com filtros:', filters);

    const result = await InsightsService.getSimpleInsights(filters);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao buscar insights do dashboard:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}
