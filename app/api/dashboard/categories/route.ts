import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import DashboardService from '@/lib/services/dashboard.service';

// GET - Buscar resumo de categorias do dashboard
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);

    // Parse filtros
    const filters = {
      period: searchParams.get('period') || undefined,
      companyId: searchParams.get('companyId') || undefined,
      accountId: searchParams.get('accountId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    console.log('📊 [DASHBOARD-CATEGORIES-API] Buscando categorias com filtros:', filters);

    const categorySummary = await DashboardService.getCategorySummary(filters);

    return NextResponse.json({
      success: true,
      data: categorySummary
    });

  } catch (error) {
    console.error('❌ Erro ao buscar categorias do dashboard:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}