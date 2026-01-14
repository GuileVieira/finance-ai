import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts, projections } from '@/lib/db/schema';
import { DashboardFilters } from '@/lib/api/dashboard';
import { eq, and, gte, lte, sum, sql, desc } from 'drizzle-orm';

export interface ExecutiveDashboardData {
    summary: {
        initialBalance: number;
        totalInflow: number;
        totalOutflow: number;
        finalBalance: number;
    };
    monthlyData: Array<{
        month: string;
        actual: number;
        projected: number;
        dreGroup: string;
    }>;
    dreTable: Array<{
        group: string;
        label: string;
        actual: number;
        projected: number;
        variance: number;
    }>;
}

export default class ExecutiveDashboardService {
    /**
     * Obtém os dados para o Dashboard Executivo
     */
    static async getDashboardData(filters: DashboardFilters): Promise<ExecutiveDashboardData> {
        const { startDate, endDate } = this.getPeriodRange(filters.period);

        // 1. Calcular Saldo Inicial
        // O saldo inicial é o saldo de todas as transações antes do startDate
        // Nota: O balance de transactions é acumulado. Para saber o saldo *no início* do dia startDate,
        // somamos tudo antes de startDate.
        const initialBalanceResult = await db
            .select({
                balance: sum(transactions.amount).mapWith(Number),
            })
            .from(transactions)
            .leftJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(and(
                lte(transactions.transactionDate, sql`${startDate}::date - interval '1 day'`),
                filters.companyId && filters.companyId !== 'all' ? eq(accounts.companyId, filters.companyId) : undefined,
                filters.accountId && filters.accountId !== 'all' ? eq(transactions.accountId, filters.accountId) : undefined
            ));

        const initialBalance = initialBalanceResult[0]?.balance || 0;

        // 2. Calcular Entradas e Saídas no período
        const periodMetrics = await db
            .select({
                inflow: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE 0 END`).mapWith(Number),
                outflow: sum(sql`CASE WHEN ${transactions.type} = 'debit' THEN ABS(${transactions.amount}) ELSE 0 END`).mapWith(Number),
            })
            .from(transactions)
            .leftJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(and(
                gte(transactions.transactionDate, startDate),
                lte(transactions.transactionDate, endDate),
                filters.companyId && filters.companyId !== 'all' ? eq(accounts.companyId, filters.companyId) : undefined,
                filters.accountId && filters.accountId !== 'all' ? eq(transactions.accountId, filters.accountId) : undefined
            ));

        const totalInflow = periodMetrics[0]?.inflow || 0;
        const totalOutflow = periodMetrics[0]?.outflow || 0;
        const finalBalance = initialBalance + totalInflow - totalOutflow;

        // 3. Dados para os 6 Gráficos (Real vs Projetado por Grupo DRE)
        // Vamos buscar os últimos 6 meses para os gráficos
        const monthlyData = await this.getMonthlyComparison(filters.companyId || 'all');

        // 4. Estrutura do DRE (Tabela à direita)
        const dreTable = await this.getDRETableData(filters, startDate, endDate);

        return {
            summary: {
                initialBalance,
                totalInflow,
                totalOutflow,
                finalBalance,
            },
            monthlyData,
            dreTable,
        };
    }

    private static getPeriodRange(period?: string) {
        // Implementação simplificada para o exemplo, deve seguir o padrão do DREService
        const now = new Date();
        let startDate = '';
        let endDate = '';

        if (period === 'this_month' || !period || period === 'all') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        } else {
            // Outros períodos... por enquanto vamos focar no mês atual
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        }

        return { startDate, endDate };
    }

    private static async getMonthlyComparison(companyId: string) {
        // Busca dados reais e projetados dos últimos 6 meses
        // TODO: Implementar lógica de agregação por mês e dreGroup
        return [];
    }

    private static async getDRETableData(filters: DashboardFilters, startDate: string, endDate: string) {
        // Agrupa transações pelo novo dreGroup
        const actualsByGroup = await db
            .select({
                dreGroup: categories.dreGroup,
                amount: sum(sql`CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount} ELSE -ABS(${transactions.amount}) END`).mapWith(Number),
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .leftJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(and(
                gte(transactions.transactionDate, startDate),
                lte(transactions.transactionDate, endDate),
                filters.companyId && filters.companyId !== 'all' ? eq(accounts.companyId, filters.companyId) : undefined,
                filters.accountId && filters.accountId !== 'all' ? eq(transactions.accountId, filters.accountId) : undefined,
                sql`${categories.dreGroup} IS NOT NULL`
            ))
            .groupBy(categories.dreGroup);

        // Mapeamento dos labels do DRE
        const labels: Record<string, string> = {
            'RoB': 'Receita Bruta',
            'TDCF': 'Tributos/Devoluções',
            'MP': 'Matéria Prima/Custos',
            'CF': 'Custos Fixos',
            'RNOP': 'Rec. Não Operacional',
            'DNOP': 'Desp. Não Operacional',
        };

        return actualsByGroup.map(item => ({
            group: item.dreGroup || 'OUTROS',
            label: labels[item.dreGroup || ''] || 'Outros',
            actual: Math.abs(item.amount),
            projected: 0, // TODO: Buscar da tabela projections
            variance: 0,
        }));
    }
}
