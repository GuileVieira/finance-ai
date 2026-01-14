import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import { DashboardFilters } from '@/lib/api/dashboard';
import DashboardService from '@/lib/services/dashboard.service';
import { requireAuth } from '@/lib/auth/get-session';

// GET - Buscar dados completos do dashboard
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e obter companyId da sessão
    const session = await requireAuth();

    await initializeDatabase();

    const { searchParams } = new URL(request.url);

    // Parse filtros
    const filters: DashboardFilters = {
      companyId: session.companyId, // Default para sessão
    };

    if (searchParams.get('companyId')) {
      const queryCompanyId = searchParams.get('companyId')!;
      // Se for 'all', podemos passar undefined ou 'all' dependendo do service. 
      // Vamos passar 'all' se o service suportar, ou remover o filtro se 'all' significar "todas".
      // Assumindo que o service trata 'all' ou ausência como "todas" se a intenção for essa.
      // Mas para manter compatibilidade com o que fizemos em accounts, vamos passar o valor.
      filters.companyId = queryCompanyId;
    }

    if (searchParams.get('period')) {
      filters.period = searchParams.get('period')!;
    }

    // ...

    if (searchParams.get('accountId')) {
      filters.accountId = searchParams.get('accountId')!;
    }

    if (searchParams.get('startDate')) {
      filters.startDate = searchParams.get('startDate')!;
    }

    if (searchParams.get('endDate')) {
      filters.endDate = searchParams.get('endDate')!;
    }

    console.log('📊 [DASHBOARD-API] Buscando dados do dashboard com filtros:', filters);

    // Buscar dados completos do dashboard
    const dashboardData = await DashboardService.getDashboardData(filters);

    console.log(`✅ Dashboard carregado com ${dashboardData.recentTransactions.length} transações recentes`);

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    // Verificar se é erro de autenticação
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 });
    }

    console.error('❌ Erro ao buscar dados do dashboard:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// GET da documentação da API
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    message: 'API do Dashboard Financeiro',
    endpoint: '/api/dashboard',
    method: 'GET',
    parameters: {
      period: 'string (opcional) - Período no formato YYYY-MM',
      companyId: 'string (opcional) - ID da empresa',
      accountId: 'string (opcional) - ID da conta bancária',
      startDate: 'YYYY-MM-DD (opcional) - Data inicial',
      endDate: 'YYYY-MM-DD (opcional) - Data final'
    },
    examples: {
      currentMonth: '/api/dashboard?period=2025-10',
      specificAccount: '/api/dashboard?accountId=uuid-da-conta',
      dateRange: '/api/dashboard?startDate=2025-01-01&endDate=2025-12-31',
      allData: '/api/dashboard'
    }
  });
}