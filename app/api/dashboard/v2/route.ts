import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/get-session';
import { initializeDatabase } from '@/lib/db/init-db';
import ExecutiveDashboardService from '@/lib/services/executive-dashboard.service';
import { DashboardFilters } from '@/lib/api/dashboard';

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await initializeDatabase();

        const { searchParams } = new URL(request.url);
        const filters: DashboardFilters = {
            companyId: searchParams.get('companyId') || session.companyId,
            period: searchParams.get('period') || 'this_month',
            accountId: searchParams.get('accountId') || 'all',
        };

        console.log('📊 [EXECUTIVE-DASHBOARD-API] Filtros recebidos:', filters);

        const data = await ExecutiveDashboardService.getDashboardData(filters);

        console.log('📊 [EXECUTIVE-DASHBOARD-API] Dados retornados:', {
            summary: data.summary,
            dreTableCount: data.dreTable.length,
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('❌ [EXECUTIVE-DASHBOARD-API] Erro:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar dados do dashboard executivo' },
            { status: 500 }
        );
    }
}
