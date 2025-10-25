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
    if (filters.period && filters.period !== 'all') {
      const { startDate, endDate } = DashboardAPI.convertPeriodToDates(filters.period);
      result.startDate = startDate;
      result.endDate = endDate;
      console.log(`📅 Convertendo período ${filters.period} para ${startDate} até ${endDate}`);
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

  console.log('📊 Estado da query:', {
    isLoading,
    hasError: !!error,
    hasData: !!metrics,
    isRefetching
  });

  return {
    // Dados do dashboard
    metrics,
    trendData,

    // Estados
    isLoading,
    isRefetching,

    // Erros
    error,

    // Funções
    refetch,
  };
}