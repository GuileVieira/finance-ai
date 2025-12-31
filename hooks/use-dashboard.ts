'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DashboardAPI, DashboardFilters } from '@/lib/api/dashboard';

interface UseDashboardOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook MINIMALISTA para buscar métricas do dashboard
 * Removido todo o processamento complexo que pode causar loops
 */
export function useDashboard(
  filters: DashboardFilters = {},
  options: UseDashboardOptions = {}
) {
  console.log('🔧 useDashboard chamado com filtros:', filters);

  // Converter filtros para formato da API (incluindo período -> datas)
  const apiFilters = useMemo(() => {
    const result: any = {};

    // Copiar propriedades existentes
    if (filters.period) result.period = filters.period;
    if (filters.companyId) result.companyId = filters.companyId;
    if (filters.accountId) result.accountId = filters.accountId;
    if (filters.startDate) result.startDate = filters.startDate;
    if (filters.endDate) result.endDate = filters.endDate;

    // Converter período para datas se necessário
    if (filters.period && filters.period !== 'all' && filters.period !== 'custom') {
      const { startDate, endDate } = DashboardAPI.convertPeriodToDates(filters.period);
      result.startDate = startDate;
      result.endDate = endDate;
      console.log(`📅 Convertendo período ${filters.period} para ${startDate} até ${endDate}`);
    } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
      // Já estão definidos no result copiados acima, apenas logar
      console.log(`📅 Período personalizado: ${filters.startDate} até ${filters.endDate}`);
    }

    return result;
  }, [
    filters.period,
    filters.companyId,
    filters.accountId,
    filters.startDate,
    filters.endDate
  ]);

  console.log('🔑 Filtros da API:', apiFilters);

  // Chave de cache baseada nos filtros convertidos
  const queryKey = useMemo(() => {
    return ['dashboard-minimal', apiFilters.period, apiFilters.accountId, apiFilters.companyId, apiFilters.startDate, apiFilters.endDate];
  }, [apiFilters.period, apiFilters.accountId, apiFilters.companyId, apiFilters.startDate, apiFilters.endDate]);

  // Buscar dados completos do dashboard (para gráficos)
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log('🚀 Buscando dados completos com filtros:', apiFilters);
      const result = await DashboardAPI.getDashboardData(apiFilters);
      console.log('✅ Dados completos recebidos:', result);
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || false,
    retry: 2,
  });

  // Extrair dados do dashboardData
  const metrics = dashboardData?.metrics;
  const trendData = dashboardData?.trendData || [];
  const categorySummary = dashboardData?.categorySummary || [];
  const topExpenses = dashboardData?.topExpenses || [];
  const recentTransactions = dashboardData?.recentTransactions || [];

  // Verificar se o filtro atual não tem dados
  const isFilterEmpty = !isLoading && (!metrics || metrics.transactionCount === 0);

  // Verificar se tem filtros aplicados (período específico ou banco específico)
  const hasActiveFilters = (filters.period && filters.period !== 'all') ||
    (filters.accountId && filters.accountId !== 'all');

  // isEmpty = true apenas quando NÃO tem filtros e não tem dados (usuário nunca importou)
  // Se tem filtros aplicados, não é "empty" - é só o filtro que não retornou resultados
  const isEmpty = isFilterEmpty && !hasActiveFilters;

  console.log('📊 Estado da query:', {
    isLoading,
    hasError: !!error,
    hasData: !!metrics,
    isEmpty,
    isRefetching,
    categoriesCount: categorySummary.length,
    expensesCount: topExpenses.length,
    transactionsCount: recentTransactions.length
  });

  return {
    // Dados do dashboard
    metrics,
    trendData,
    categorySummary,
    topExpenses,
    recentTransactions,

    // Estados
    isLoading,
    isRefetching,
    isEmpty,        // true = usuário nunca importou dados
    isFilterEmpty,  // true = filtro atual não tem resultados

    // Erros
    error,

    // Funções
    refetch,
  };
}