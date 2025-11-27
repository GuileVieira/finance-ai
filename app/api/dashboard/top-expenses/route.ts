import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import DashboardService from '@/lib/services/dashboard.service';
import { requireAuth } from '@/lib/auth/get-session';

// GET - Buscar top despesas do dashboard
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
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    const limit = parseInt(searchParams.get('limit') || '10', 10);

    console.log('📊 [DASHBOARD-TOP-EXPENSES-API] Buscando top despesas com filtros:', filters);

    const topExpenses = await DashboardService.getTopExpenses(filters, limit);

    return NextResponse.json({
      success: true,
      data: topExpenses
    });

  } catch (error) {
    console.error('❌ Erro ao buscar top despesas do dashboard:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}