import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import InsightsService from '@/lib/services/insights.service';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('dashboard-insights');

// GET - Buscar insights do dashboard
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e obter companyId da sessão
    const { companyId } = await requireAuth();

    await initializeDatabase();

    const { searchParams } = new URL(request.url);

    // Parse filtros - usar companyId da sessão
    const filters = {
      period: searchParams.get('period') || undefined,
      companyId: companyId,
      accountId: searchParams.get('accountId') || undefined,
    };

    log.info({ filters }, 'Fetching dashboard insights with filters');

    const result = await InsightsService.getSimpleInsights(filters);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    log.error({ err: error }, 'Error fetching dashboard insights');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}
