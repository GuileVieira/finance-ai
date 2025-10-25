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

  // Chave de cache simples e estável
  const queryKey = useMemo(() => {
    return ['dashboard-minimal', filters.period, filters.accountId, filters.companyId];
  }, [filters.period, filters.accountId, filters.companyId]);

  console.log('🔑 QueryKey:', queryKey);

  // Buscar APENAS métricas para teste
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log('🚀 Iniciando busca de métricas...');
      const result = await DashboardAPI.getMetrics(filters);
      console.log('✅ Métricas recebidas:', result);
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || false,
    retry: 2,
  });

  console.log('📊 Estado da query:', {
    isLoading,
    hasError: !!error,
    hasData: !!metrics,
    isRefetching
  });

  return {
    // Apenas métricas para teste
    metrics,

    // Estados
    isLoading,
    isRefetching,

    // Erros
    error,

    // Funções
    refetch,
  };
}