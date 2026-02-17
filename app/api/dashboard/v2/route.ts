import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/get-session';
import { initializeDatabase } from '@/lib/db/init-db';
import ExecutiveDashboardService from '@/lib/services/executive-dashboard.service';
import { DashboardFilters } from '@/lib/api/dashboard';
import { createLogger } from '@/lib/logger';

const log = createLogger('dashboard-v2');

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

        log.info({ filters }, 'Received filters for executive dashboard');

        const data = await ExecutiveDashboardService.getDashboardData(filters);

        log.info({ summary: data.summary, dreTableCount: data.dreTable.length }, 'Executive dashboard data returned');

        return NextResponse.json({ success: true, data });
    } catch (error) {
        log.error({ err: error }, 'Error fetching executive dashboard data');
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar dados do dashboard executivo' },
            { status: 500 }
        );
    }
}
