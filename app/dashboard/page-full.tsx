'use client';

import { useEffect, useMemo, useState } from 'react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { TopExpenses } from '@/components/dashboard/top-expenses';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { Insights } from '@/components/dashboard/insights';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart';
import { BudgetComparison } from '@/components/dashboard/budget-comparison';
import { StrategicAlerts } from '@/components/dashboard/strategic-alerts';
import { Benchmarks } from '@/components/dashboard/benchmarks';
import { Scenarios } from '@/components/dashboard/scenarios';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { useDashboard, useDashboardMetrics } from '@/hooks/use-dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MetricCardSkeleton } from '@/components/transactions/metric-card-skeleton';
import { useAvailablePeriods } from '@/hooks/use-periods';

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    period: 'all',
    accountId: 'all',
    companyId: 'all'
  });

  // Debug: verificar se está em loop
  console.log('🔄 Dashboard renderizando', new Date().toISOString());

  const { data: periodsResponse, isLoading: isLoadingPeriods } = useAvailablePeriods({ companyId: filters.companyId });
  const periods = periodsResponse?.periods ?? [];

  useEffect(() => {
    if (isLoadingPeriods) return;

    if (periods.length === 0) {
      setFilters(prev => ({ ...prev, period: 'all' }));
      return;
    }

    setFilters(prev => {
      if (prev.period !== 'all' && periods.some(period => period.id === prev.period)) {
        return prev;
      }
      return { ...prev, period: periods[0].id };
    });
  }, [isLoadingPeriods, periods]);

  // Usar hooks do TanStack Query para buscar dados do dashboard
  const {
    dashboardData,
    metrics,
    categorySummary,
    trendData,
    topExpenses,
    recentTransactions,
    isLoading,
    isRefetching,
    error,
    refetch,
    isEmpty,
    hasError
  } = useDashboard(filters, {
    enabled: true,
    refetchInterval: false, // Desativar refetch automático temporariamente
  });

  // Converter métricas para formato esperado pelos componentes
  const dashboardMetrics = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        title: 'Receitas',
        value: metrics.totalIncome,
        change: metrics.growthRate,
        changeType: metrics.growthRate >= 0 ? 'increase' as const : 'decrease' as const,
        icon: '📈',
        color: 'text-green-600'
      },
      {
        title: 'Despesas',
        value: metrics.totalExpenses,
        change: -5.2, // TODO: Calcular variação real
        changeType: 'decrease' as const,
        icon: '📉',
        color: 'text-red-600'
      },
      {
        title: 'Saldo',
        value: metrics.netBalance,
        change: 12.8, // TODO: Calcular variação real
        changeType: 'increase' as const,
        icon: '💰',
        color: metrics.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
      },
      {
        title: 'Transações',
        value: metrics.transactionCount,
        change: 8.4, // TODO: Calcular variação real
        changeType: 'increase' as const,
        icon: '🔄',
        color: 'text-blue-600'
      }
    ];
  }, [
    metrics?.totalIncome,
    metrics?.totalExpenses,
    metrics?.netBalance,
    metrics?.transactionCount,
    metrics?.growthRate
  ]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Filtros do Dashboard */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Select
            value={filters.period}
            onValueChange={(value) => handleFilterChange('period', value)}
            disabled={isLoadingPeriods}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={isLoadingPeriods ? 'Carregando períodos...' : 'Selecione o período'} />
            </SelectTrigger>
            <SelectContent>
              {!isLoadingPeriods && periods.map(period => (
                <SelectItem key={period.id} value={period.id}>
                  {period.label}
                </SelectItem>
              ))}
              <SelectItem value="all">Todos os períodos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.accountId} onValueChange={(value) => handleFilterChange('accountId', value)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="bb">Banco do Brasil</SelectItem>
              <SelectItem value="itau">Itaú</SelectItem>
              <SelectItem value="santander">Santander</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Mensagem de Erro */}
        {hasError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Erro ao carregar dashboard:</strong> {error?.message || 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}

        {/* Alertas Estratégicos */}
        <StrategicAlerts />

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <MetricCardSkeleton key={index} />
            ))
          ) : (
            dashboardMetrics.map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))
          )}
        </div>

        {/* Análises Temporais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart data={trendData} isLoading={isLoading} />
          <CashFlowChart data={trendData} isLoading={isLoading} />
        </div>

        {/* Comparações e Benchmarks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetComparison isLoading={isLoading} />
          <Benchmarks isLoading={isLoading} />
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de categorias */}
          <div className="lg:col-span-2">
            <CategoryChart
              categories={categorySummary}
              isLoading={isLoading}
              isEmpty={!isLoading && categorySummary.length === 0}
            />
          </div>

          {/* Top Despesas */}
          <div>
            <TopExpenses
              expenses={topExpenses}
              isLoading={isLoading}
              isEmpty={!isLoading && topExpenses.length === 0}
            />
          </div>
        </div>

        {/* Cenários e Projeções */}
        <Scenarios isLoading={isLoading} />

        {/* Transações e Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transações Recentes */}
          <div className="lg:col-span-2">
            <RecentTransactions
              transactions={recentTransactions}
              isLoading={isLoading}
              isEmpty={!isLoading && recentTransactions.length === 0}
            />
          </div>

          {/* Insights */}
          <div>
            <Insights isLoading={isLoading} />
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
