'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { TopExpenses } from '@/components/dashboard/top-expenses';
import { Insights } from '@/components/dashboard/insights';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { RefreshCw } from 'lucide-react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAccountsForSelect } from '@/hooks/use-accounts';
import { useAvailablePeriods } from '@/hooks/use-periods';
import { TransactionListSheet } from '@/components/dashboard/transaction-list-sheet';
import { CategorySummary, TopExpense } from '@/lib/api/dashboard';
import { DREMappingWidget } from '@/components/dashboard/dre-mapping-widget';
import { Settings } from 'lucide-react';

export default function DashboardPage() {
  console.log('🔄 Dashboard MINIMAL renderizando', new Date().toISOString());

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const [filters, setFilters] = useState<{
    period: string;
    accountId: string;
    companyId: string;
    startDate?: string;
    endDate?: string;
  }>({
    period: 'all',
    accountId: 'all',
    companyId: 'all'
  });

  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    filters: any;
  }>({
    isOpen: false,
    title: '',
    filters: {}
  });

  const [isDREWidgetOpen, setIsDREWidgetOpen] = useState(false);

  // Estabilizar funções com useCallback
  const handleFilterChange = useCallback((key: string, value: string) => {
    console.log('📝 Mudando filtro:', key, '=', value);
    setFilters(prev => {
      // Se mudou para período não-custom, limpa as datas
      if (key === 'period' && value !== 'custom') {
        return { ...prev, [key]: value, startDate: undefined, endDate: undefined };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      setFilters(prev => ({
        ...prev,
        period: 'custom',
        startDate: range.from ? range.from.toISOString().split('T')[0] : undefined,
        endDate: range.to ? range.to.toISOString().split('T')[0] : (range.from ? range.from.toISOString().split('T')[0] : undefined)
      }));
    }
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refresh solicitado');
    // refetch será adicionado depois
  }, []);

  const handleMetricClick = useCallback((metricTitle: string) => {
    let typeFilter = undefined;

    // Mapear título do card para filtros de transação
    if (metricTitle === 'Receitas') typeFilter = 'credit';
    if (metricTitle === 'Despesas') typeFilter = 'debit';
    // 'Saldo' e 'Transações' mostram tudo, ou poderíamos filtrar mais

    setDrillDown({
      isOpen: true,
      title: `Detalhes: ${metricTitle}`,
      filters: {
        ...filters, // Herdamos os filtros atuais (período, conta)
        type: typeFilter
      }
    });
  }, [filters]);

  const handleCategoryClick = useCallback((category: CategorySummary) => {
    setDrillDown({
      isOpen: true,
      title: `Categoria: ${category.name}`,
      filters: {
        ...filters,
        categoryId: category.id,
      }
    });
  }, [filters]);

  const handleExpenseClick = useCallback((expense: TopExpense) => {
    setDrillDown({
      isOpen: true,
      title: `Despesa: ${expense.description}`,
      filters: {
        ...filters,
        search: expense.description,
        type: 'debit'
      }
    });
  }, [filters]);

  const { data: periodsResponse, isLoading: isLoadingPeriods } = useAvailablePeriods({ companyId: filters.companyId });
  const periods = periodsResponse?.periods ?? [];

  useEffect(() => {
    if (isLoadingPeriods) return;

    if (periods.length === 0) {
      setFilters(prev => {
        if (prev.period === 'all') return prev;
        return { ...prev, period: 'all' };
      });
      return;
    }

    setFilters(prev => {
      if (prev.period !== 'all' && periods.some(period => period.id === prev.period)) {
        return prev;
      }
      if (prev.period === periods[0]?.id) return prev;
      return { ...prev, period: periods[0].id };
    });
  }, [isLoadingPeriods, periods.length, periods[0]?.id]);

  // Usar hook do TanStack Query para buscar dados do dashboard
  const {
    metrics,
    trendData,
    categorySummary,
    topExpenses,
    recentTransactions,
    isLoading,
    isRefetching,
    isEmpty,
    isFilterEmpty,
    error,
    refetch,
  } = useDashboard(filters, {
    enabled: true,
    refetchInterval: false, // Manter desativado
  });

  // Buscar contas bancárias para o filtro
  const { accountOptions, isLoading: isLoadingAccounts } = useAccountsForSelect();

  // Converter métricas para formato esperado pelos componentes
  const dashboardMetrics = useMemo(() => {
    console.log('📊 Calculando métricas do dashboard');

    if (!metrics) {
      console.log('❌ Sem métricas disponíveis');
      return [];
    }

    const result = [
      {
        title: 'Receitas',
        value: metrics.totalIncome,
        change: metrics.growthRate || 0,
        changeType: (metrics.growthRate || 0) >= 0 ? 'increase' as const : 'decrease' as const,
        icon: '📈',
        color: 'text-chart-2'
      },
      {
        title: 'Despesas',
        value: -Math.abs(metrics.totalExpenses), // Valor negativo
        change: metrics.expensesGrowthRate || 0,
        changeType: (metrics.expensesGrowthRate || 0) >= 0 ? 'increase' as const : 'decrease' as const,
        icon: '📉',
        color: 'text-destructive'
      },
      {
        title: 'Saldo',
        value: metrics.netBalance,
        change: metrics.balanceGrowthRate || 0,
        changeType: (metrics.balanceGrowthRate || 0) >= 0 ? 'increase' as const : 'decrease' as const,
        icon: '💰',
        color: metrics.netBalance >= 0 ? 'text-emerald-600' : 'text-destructive'
      },
      {
        title: 'Transações',
        value: metrics.transactionCount,
        change: metrics.transactionsGrowthRate || 0,
        changeType: (metrics.transactionsGrowthRate || 0) >= 0 ? 'increase' as const : 'decrease' as const,
        icon: '🔄',
        color: 'text-primary'
      }
    ];

    console.log('✅ Métricas calculadas:', result.length, 'cards');
    return result;
  }, [
    metrics?.totalIncome,
    metrics?.totalExpenses,
    metrics?.netBalance,
    metrics?.transactionCount,
    metrics?.growthRate
  ]);

  console.log('🎯 Estado atual - Loading:', isLoading, 'Error:', !!error, 'Metrics:', !!metrics, 'isEmpty:', isEmpty, 'isFilterEmpty:', isFilterEmpty);

  // Se está vazio (sem transações e sem filtros), mostrar tela de boas-vindas
  if (isEmpty && !isLoading) {
    return (
      <LayoutWrapper>
        <div className="space-y-6">
          <EmptyState
            title="Bem-vindo ao FinanceAI!"
            description="Para começar a visualizar seus dados financeiros, importe seus extratos bancários no formato OFX. O sistema vai categorizar automaticamente suas transações usando inteligência artificial."
          />
        </div>
      </LayoutWrapper>
    );
  }

  // Componente para mostrar quando filtro não tem resultados
  const FilterEmptyMessage = () => (
    <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-muted/20">
      <div className="text-4xl mb-4">🔍</div>
      <h3 className="text-lg font-semibold mb-2">Nenhuma transação encontrada</h3>
      <p className="text-muted-foreground mb-4">
        Não há transações para o filtro selecionado. Tente ajustar o período ou o banco.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setFilters({ period: 'all', accountId: 'all', companyId: 'all' })}
      >
        Limpar filtros
      </Button>
    </div>
  );

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
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {filters.period === 'custom' && (
            <DatePickerWithRange
              date={dateRange}
              onDateChange={handleDateRangeChange}
              className="w-full sm:w-auto"
            />
          )}
          <Select value={filters.accountId} onValueChange={(value) => handleFilterChange('accountId', value)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder={isLoadingAccounts ? "Carregando..." : "Selecione uma conta"} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingAccounts ? (
                <div className="p-2 text-sm text-muted-foreground">Carregando...</div>
              ) : (
                accountOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDREWidgetOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Plano de Contas
          </Button>
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

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <div className="col-span-4 text-center p-8">
              <div className="text-lg">Carregando métricas...</div>
            </div>
          ) : isFilterEmpty ? (
            <FilterEmptyMessage />
          ) : (
            dashboardMetrics.map((metric, index) => {
              console.log(`🎴 Renderizando card ${index}: ${metric.title}`);
              return (
                <MetricCard
                  key={`${metric.title}-${index}`}
                  metric={metric}
                  onClick={() => handleMetricClick(metric.title)}
                />
              );
            })
          )}
        </div>

        {/* Só mostrar gráficos se tiver dados */}
        {!isFilterEmpty && (
          <>
            {/* Análises Temporais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendChart data={trendData} isLoading={isLoading} />
              <CashFlowChart data={trendData} isLoading={isLoading} period={filters.period} />
            </div>

            {/* Análises Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategoryChart
                categories={categorySummary}
                isLoading={isLoading}
                isEmpty={!categorySummary || categorySummary.length === 0}
                onCategoryClick={handleCategoryClick}
              />
              <RecentTransactions
                transactions={recentTransactions}
                isLoading={isLoading}
                isEmpty={!recentTransactions || recentTransactions.length === 0}
              />
            </div>

            {/* Análises Adicionais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopExpenses
                expenses={topExpenses}
                isLoading={isLoading}
                isEmpty={!topExpenses || topExpenses.length === 0}
                onExpenseClick={handleExpenseClick}
              />
              <Insights
                period={filters.period}
                companyId={filters.companyId}
                accountId={filters.accountId}
              />
            </div>
          </>
        )}

        <TransactionListSheet
          isOpen={drillDown.isOpen}
          onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
          title={drillDown.title}
          filters={drillDown.filters}
        />

        <DREMappingWidget
          isOpen={isDREWidgetOpen}
          onClose={() => setIsDREWidgetOpen(false)}
        />

      </div>
    </LayoutWrapper>
  );
}
