import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts, projections, transactionSplits } from '@/lib/db/schema';
import { DashboardFilters } from '@/lib/api/dashboard';
import { eq, and, gte, lte, sum, sql, notInArray } from 'drizzle-orm';
import { DRE_GROUPS, EXCLUDED_DRE_GROUPS } from '@/lib/constants/dre-utils';
import { getFinancialExclusionClause } from './financial-exclusion';

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
        isDerived?: boolean;
    }>;
}

export default class ExecutiveDashboardService {
    /**
     * Helper para obter a query de transações combinadas (normais + splits)
     */
    private static getCombinedTransactionsSubquery() {
        return sql`(
          -- Transações que NÃO possuem desmembramentos
          SELECT 
            t.id as transaction_id,
            t.category_id as category_id,
            t.amount as amount_to_sum,
            t.type as type_to_sum,
            t.transaction_date,
            t.account_id,
            t.description
          FROM ${transactions} t
          WHERE t.id NOT IN (SELECT transaction_id FROM ${transactionSplits})
          
          UNION ALL
          
          -- Desmembramentos individuais
          SELECT 
            ts.transaction_id,
            ts.category_id,
            ts.amount as amount_to_sum,
            t.type as type_to_sum,
            t.transaction_date,
            t.account_id,
            COALESCE(ts.description, t.description) as description
          FROM ${transactionSplits} ts
          JOIN ${transactions} t ON ts.transaction_id = t.id
        ) as combined_transactions`;
    }

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
                balance: sum(sql`amount_to_sum`).mapWith(Number),
            })
            .from(this.getCombinedTransactionsSubquery())
            .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
            .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
            .where(and(
                sql`combined_transactions.transaction_date <= ${startDate}::date - interval '1 day'`,
                filters.companyId && filters.companyId !== 'all' ? eq(accounts.companyId, filters.companyId) : undefined,
                filters.accountId && filters.accountId !== 'all' ? sql`combined_transactions.account_id = ${filters.accountId}` : undefined,
                getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
            ));

        const initialBalance = initialBalanceResult[0]?.balance || 0;

        // 2. Calcular Entradas e Saídas no período
        const periodMetrics = await db
            .select({
                inflow: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE 0 END`).mapWith(Number),
                outflow: sum(sql`CASE WHEN type_to_sum = 'debit' THEN ABS(amount_to_sum) ELSE 0 END`).mapWith(Number),
            })
            .from(this.getCombinedTransactionsSubquery())
            .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
            .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
            .where(and(
                sql`combined_transactions.transaction_date >= ${startDate}`,
                sql`combined_transactions.transaction_date <= ${endDate}`,
                filters.companyId && filters.companyId !== 'all' ? eq(accounts.companyId, filters.companyId) : undefined,
                filters.accountId && filters.accountId !== 'all' ? sql`combined_transactions.account_id = ${filters.accountId}` : undefined,
                getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
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
        const today = new Date();
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        if (!period || period === 'all') {
            return { startDate: '2000-01-01', endDate: '2100-12-31' };
        }

        if (period === 'today') {
            return { startDate: formatDate(today), endDate: formatDate(today) };
        }

        if (period === 'last_7_days') {
            const start = new Date(today);
            start.setDate(today.getDate() - 7);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }

        if (period === 'last_15_days') {
            const start = new Date(today);
            start.setDate(today.getDate() - 15);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }

        if (period === 'last_30_days') {
            const start = new Date(today);
            start.setDate(today.getDate() - 30);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }

        if (period === 'last_90_days') {
            const start = new Date(today);
            start.setDate(today.getDate() - 90);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }

        if (period === 'last_180_days') {
            const start = new Date(today);
            start.setDate(today.getDate() - 180);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }

        if (period === 'this_month') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return { startDate: formatDate(start), endDate: formatDate(end) };
        }

        if (period === 'this_year') {
            const start = new Date(today.getFullYear(), 0, 1);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }

        if (period === 'last_month') {
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const end = new Date(today.getFullYear(), today.getMonth(), 0);
            return { startDate: formatDate(start), endDate: formatDate(end) };
        }

        if (period === 'last_year') {
            const start = new Date(today.getFullYear() - 1, 0, 1);
            const end = new Date(today.getFullYear() - 1, 11, 31);
            return { startDate: formatDate(start), endDate: formatDate(end) };
        }

        // Fallback para YYYY-MM (formato de mês específico)
        if (period.includes('-')) {
            const [year, month] = period.split('-');
            if (year && month) {
                const yearNum = parseInt(year);
                const monthNum = parseInt(month);
                if (yearNum >= 2000 && yearNum <= 2100 && monthNum >= 1 && monthNum <= 12) {
                    const start = new Date(yearNum, monthNum - 1, 1);
                    const end = new Date(yearNum, monthNum, 0);
                    return { startDate: formatDate(start), endDate: formatDate(end) };
                }
            }
        }

        // Fallback padrão: mês atual
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { startDate: formatDate(start), endDate: formatDate(end) };
    }

    private static async getMonthlyComparison(companyId: string) {
        // Busca dados reais agrupados por mês e dreGroup dos últimos 6 meses
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const startDate = sixMonthsAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        // Query para dados reais por mês e dreGroup
        const actualData = await db
            .select({
                yearMonth: sql<string>`TO_CHAR(combined_transactions.transaction_date, 'YYYY-MM')`,
                monthName: sql<string>`TO_CHAR(combined_transactions.transaction_date, 'Mon')`,
                dreGroup: categories.dreGroup,
                // Mantém o sinal: credit = positivo, debit = negativo
                amount: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE -ABS(amount_to_sum) END`).mapWith(Number),
            })
            .from(this.getCombinedTransactionsSubquery())
            .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
            .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
            .where(and(
                sql`combined_transactions.transaction_date >= ${startDate}`,
                sql`combined_transactions.transaction_date <= ${endDate}`,
                sql`${categories.dreGroup} IS NOT NULL`,
                notInArray(categories.dreGroup, EXCLUDED_DRE_GROUPS),
                getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` }),
                companyId !== 'all' ? eq(accounts.companyId, companyId) : undefined
            ))
            .groupBy(
                sql`TO_CHAR(combined_transactions.transaction_date, 'YYYY-MM')`,
                sql`TO_CHAR(combined_transactions.transaction_date, 'Mon')`,
                categories.dreGroup
            )
            .orderBy(sql`TO_CHAR(combined_transactions.transaction_date, 'YYYY-MM')`);

        // Query para dados projetados (da tabela projections)
        const projectedData = await db
            .select({
                year: projections.year,
                month: projections.month,
                dreGroup: projections.dreGroup,
                amount: projections.amount,
            })
            .from(projections)
            .where(and(
                gte(sql`MAKE_DATE(${projections.year}, ${projections.month}, 1)`, startDate),
                lte(sql`MAKE_DATE(${projections.year}, ${projections.month}, 1)`, endDate),
                companyId !== 'all' ? eq(projections.companyId, companyId) : undefined
            ));

        // Mapear projeções por chave "YYYY-MM-dreGroup"
        const projectionMap = new Map<string, number>();
        for (const p of projectedData) {
            const key = `${p.year}-${String(p.month).padStart(2, '0')}-${p.dreGroup}`;
            projectionMap.set(key, Number(p.amount) || 0);
        }

        // Combinar dados reais com projetados
        return actualData.map(item => {
            const projKey = `${item.yearMonth}-${item.dreGroup}`;
            return {
                month: item.monthName || '',
                // IMPORTANTE: Aqui poderíamos decidir se o gráfico mostra tudo positivo ou não.
                // Por enquanto, vamos manter assinado para consistência, o front decide como plotar.
                // Mas cuidado: area charts acumulados geralmente esperam positivo.
                // Se o usuário quiser DRE visual (cascata), precisa de sinal.
                actual: item.amount,
                projected: projectionMap.get(projKey) || 0,
                dreGroup: item.dreGroup || '',
            };
        });
    }

    private static async getDRETableData(filters: DashboardFilters, startDate: string, endDate: string) {
        // Agrupa transações pelo novo dreGroup
        const actualsByGroup = await db
            .select({
                dreGroup: categories.dreGroup,
                // amount já vem somado com sinal correto (credit +, debit -)
                amount: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE -ABS(amount_to_sum) END`).mapWith(Number),
            })
            .from(this.getCombinedTransactionsSubquery())
            .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
            .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
            .where(and(
                sql`combined_transactions.transaction_date >= ${startDate}`,
                sql`combined_transactions.transaction_date <= ${endDate}`,
                filters.companyId && filters.companyId !== 'all' ? eq(accounts.companyId, filters.companyId) : undefined,
                filters.accountId && filters.accountId !== 'all' ? sql`combined_transactions.account_id = ${filters.accountId}` : undefined,
                sql`${categories.dreGroup} IS NOT NULL`,
                notInArray(categories.dreGroup, EXCLUDED_DRE_GROUPS),
                getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
            ))
            .groupBy(categories.dreGroup);

        // Build a map of actuals by group code
        const totals = new Map<string, number>();
        for (const item of actualsByGroup) {
            const group = item.dreGroup || 'OUTROS';
            totals.set(group, (totals.get(group) || 0) + item.amount);
        }

        // Calculate derived lines
        const get = (key: string) => totals.get(key) || 0;

        const ro = get('RoB') + get('TDCF');
        totals.set('RO', ro);

        const mc = ro + get('MP') + get('CV');
        totals.set('MC', mc);

        const ebit = mc + get('CF');
        totals.set('EBIT', ebit);

        const lle = ebit + get('RNOP') + get('DNOP');
        totals.set('LLE', lle);

        const derivedKeys = new Set(['RO', 'MC', 'EBIT', 'LLE']);

        // Build final array, filtered to groups that exist in DRE_GROUPS, sorted by order
        const result: ExecutiveDashboardData['dreTable'] = [];
        for (const [group, amount] of totals.entries()) {
            const def = DRE_GROUPS[group];
            if (!def) continue;
            result.push({
                group,
                label: def.label,
                actual: amount,
                projected: 0,
                variance: 0,
                isDerived: derivedKeys.has(group),
            });
        }

        result.sort((a, b) => {
            const orderA = DRE_GROUPS[a.group]?.order ?? 999;
            const orderB = DRE_GROUPS[b.group]?.order ?? 999;
            return orderA - orderB;
        });

        return result;
    }
}
