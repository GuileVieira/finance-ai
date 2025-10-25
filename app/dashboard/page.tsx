'use client';

import { useState, useCallback, useMemo } from 'react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { useDashboard } from '@/hooks/use-dashboard';

export default function DashboardPage() {
  console.log('🔄 Dashboard MINIMAL renderizando', new Date().toISOString());

  const [filters, setFilters] = useState({
    period: '2025-10',
    accountId: 'all',
    companyId: 'all'
  });

  // Estabilizar funções com useCallback
  const handleFilterChange = useCallback((key: string, value: string) => {
    console.log('📝 Mudando filtro:', key, '=', value);
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refresh solicitado');
    // refetch será adicionado depois
  }, []);

  // Usar hook do TanStack Query para buscar dados do dashboard
  const {
    metrics,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useDashboard(filters, {
    enabled: true,
    refetchInterval: false, // Manter desativado
  });

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

  console.log('🎯 Estado atual - Loading:', isLoading, 'Error:', !!error, 'Metrics:', !!metrics);

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Filtros do Dashboard */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-10">Outubro/2025</SelectItem>
              <SelectItem value="2025-09">Setembro/2025</SelectItem>
              <SelectItem value="2025-08">Agosto/2025</SelectItem>
              <SelectItem value="2025-07">Julho/2025</SelectItem>
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

        {/* Cards de métricas APENAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <div className="col-span-4 text-center p-8">
              <div className="text-lg">Carregando métricas...</div>
            </div>
          ) : error ? (
            <div className="col-span-4 text-center p-8">
              <div className="text-lg text-red-600">Erro: {error.message}</div>
            </div>
          ) : (
            dashboardMetrics.map((metric, index) => {
              console.log(`🎴 Renderizando card ${index}: ${metric.title}`);
              return <MetricCard key={`${metric.title}-${index}`} metric={metric} />;
            })
          )}
        </div>

        {/* Log de debug */}
        <div className="bg-gray-100 p-4 rounded text-xs">
          <div><strong>Debug Info:</strong></div>
          <div>Loading: {isLoading.toString()}</div>
          <div>Error: {error?.message || 'none'}</div>
          <div>Metrics: {metrics ? 'available' : 'none'}</div>
          <div>Cards count: {dashboardMetrics.length}</div>
          <div>Period: {filters.period}</div>
        </div>
      </div>
    </LayoutWrapper>
  );
}