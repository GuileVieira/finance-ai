"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TopExpenses } from "@/components/dashboard/top-expenses";
import { Insights } from "@/components/dashboard/insights";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardData, CategorySummary } from "@/lib/api/dashboard";
import { LayoutWrapper } from "@/components/shared/layout-wrapper";

interface GeneralDashboardViewProps {
    data: DashboardData | undefined;
    isLoading: boolean;
    onMetricClick: (type: string) => void;
    onCategoryClick: (categoryId: string) => void;
}

export function GeneralDashboardView({
    data,
    isLoading,
    onMetricClick,
    onCategoryClick
}: GeneralDashboardViewProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg border-dashed">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Resumo Financeiro (Métricas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    metric={{
                        title: 'Receitas',
                        value: data.metrics?.totalIncome ?? 0,
                        change: data.metrics?.growthRate || 0,
                        changeType: (data.metrics?.growthRate || 0) >= 0 ? 'increase' : 'decrease',
                        color: 'text-emerald-500',
                        icon: '📈'
                    }}
                    onClick={() => onMetricClick('Receitas')}
                />
                <MetricCard
                    metric={{
                        title: 'Despesas',
                        value: -Math.abs(data.metrics?.totalExpenses ?? 0),
                        change: data.metrics?.expensesGrowthRate || 0,
                        changeType: (data.metrics?.expensesGrowthRate || 0) >= 0 ? 'increase' : 'decrease',
                        color: 'text-destructive',
                        icon: '📉'
                    }}
                    onClick={() => onMetricClick('Despesas')}
                />
                <MetricCard
                    metric={{
                        title: 'Saldo',
                        value: data.metrics?.netBalance ?? 0,
                        change: data.metrics?.balanceGrowthRate || 0,
                        changeType: (data.metrics?.balanceGrowthRate || 0) >= 0 ? 'increase' : 'decrease',
                        color: (data.metrics?.netBalance ?? 0) >= 0 ? 'text-emerald-500' : 'text-destructive',
                        icon: '💰'
                    }}
                />
                <MetricCard
                    metric={{
                        title: 'Transações',
                        value: data.metrics?.transactionCount ?? 0,
                        change: data.metrics?.transactionsGrowthRate || 0,
                        changeType: (data.metrics?.transactionsGrowthRate || 0) >= 0 ? 'increase' : 'decrease',
                        color: 'text-primary',
                        icon: '🔄'
                    }}
                />
            </div>

            {/* Gráficos Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                <div className="lg:col-span-4">
                    <TrendChart data={data.trendData || []} />
                </div>
                <div className="lg:col-span-3">
                    <CategoryChart
                        categories={data.categorySummary || []}
                        onCategoryClick={(cat: CategorySummary) => onCategoryClick(cat.id)}
                    />
                </div>
            </div>

            {/* Tabelas e Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentTransactions transactions={data.recentTransactions || []} />
                </div>
                <div className="space-y-6">
                    <TopExpenses expenses={data.topExpenses || []} />
                    <Insights />
                </div>
            </div>
        </div>
    );
}
