'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { DashboardAPI, DashboardFilters, DashboardData, DashboardMetrics, CategorySummary, TrendData, TopExpense } from '@/lib/api/dashboard';

interface UseDashboardOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook principal para buscar dados completos do dashboard
 */
export function useDashboard(
  filters: DashboardFilters = {},
  options: UseDashboardOptions = {}
) {
  const queryClient = useQueryClient();

  // Converter filtros para formato da API
  const apiFilters = useMemo(() => {
    const result: any = {};

    // Copiar apenas as propriedades existentes
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
    }

    return result;
  }, [
    filters.period,
    filters.companyId,
    filters.accountId,
    filters.startDate,
    filters.endDate
  ]);

  // Chave de cache única baseada nos filtros
  const queryKey = ['dashboard', apiFilters];

  // Buscar dados completos do dashboard
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey,
    queryFn: () => DashboardAPI.getDashboardData(apiFilters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  // Métricas
  const metrics = useMemo(() => {
    return dashboardData?.metrics || {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      transactionCount: 0,
      incomeCount: 0,
      expenseCount: 0,
      averageTicket: 0,
      growthRate: 0,
    };
  }, [
    dashboardData?.metrics?.totalIncome,
    dashboardData?.metrics?.totalExpenses,
    dashboardData?.metrics?.netBalance,
    dashboardData?.metrics?.transactionCount,
    dashboardData?.metrics?.incomeCount,
    dashboardData?.metrics?.expenseCount,
    dashboardData?.metrics?.averageTicket,
    dashboardData?.metrics?.growthRate
  ]);

  // Resumo de categorias
  const categorySummary = useMemo(() => {
    return dashboardData?.categorySummary || [];
  }, [dashboardData?.categorySummary]);

  // Dados de tendência
  const trendData = useMemo(() => {
    return dashboardData?.trendData || [];
  }, [dashboardData?.trendData]);

  // Top despesas
  const topExpenses = useMemo(() => {
    return dashboardData?.topExpenses || [];
  }, [dashboardData?.topExpenses]);

  // Transações recentes
  const recentTransactions = useMemo(() => {
    return dashboardData?.recentTransactions || [];
  }, [dashboardData?.recentTransactions]);

  // Função para invalidar cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  return {
    // Dados
    dashboardData,
    metrics,
    categorySummary,
    trendData,
    topExpenses,
    recentTransactions,

    // Estados de loading
    isLoading,
    isRefetching,

    // Erros
    error,

    // Funções
    refetch,
    invalidateCache,

    // Flags úteis
    isEmpty: !isLoading && (!dashboardData || dashboardData.transactionCount === 0),
    hasError: !!error,
  };
}

/**
 * Hook específico para métricas do dashboard
 */
export function useDashboardMetrics(
  filters: DashboardFilters = {},
  options: UseDashboardOptions = {}
) {
  const apiFilters = useMemo(() => {
    const result = { ...filters };

    if (filters.period && filters.period !== 'all') {
      const { startDate, endDate } = DashboardAPI.convertPeriodToDates(filters.period);
      result.startDate = startDate;
      result.endDate = endDate;
    }

    return result;
  }, [filters]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-metrics', apiFilters],
    queryFn: () => DashboardAPI.getMetrics(apiFilters),
    staleTime: 1000 * 60 * 2, // 2 minutos para métricas
    gcTime: 1000 * 60 * 10, // 10 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  return {
    metrics: data || {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      transactionCount: 0,
      incomeCount: 0,
      expenseCount: 0,
      averageTicket: 0,
      growthRate: 0,
    },
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook específico para dados de tendência
 */
export function useDashboardTrends(
  filters: DashboardFilters = {},
  options: UseDashboardOptions = {}
) {
  const apiFilters = useMemo(() => {
    const result = { ...filters };

    if (filters.period && filters.period !== 'all') {
      const { startDate, endDate } = DashboardAPI.convertPeriodToDates(filters.period);
      result.startDate = startDate;
      result.endDate = endDate;
    }

    return result;
  }, [filters]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-trends', apiFilters],
    queryFn: () => DashboardAPI.getTrendData(apiFilters),
    staleTime: 1000 * 60 * 10, // 10 minutos para tendências
    gcTime: 1000 * 60 * 30, // 30 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  return {
    trendData: data || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook específico para resumo de categorias
 */
export function useDashboardCategories(
  filters: DashboardFilters = {},
  options: UseDashboardOptions = {}
) {
  const apiFilters = useMemo(() => {
    const result = { ...filters };

    if (filters.period && filters.period !== 'all') {
      const { startDate, endDate } = DashboardAPI.convertPeriodToDates(filters.period);
      result.startDate = startDate;
      result.endDate = endDate;
    }

    return result;
  }, [filters]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-categories', apiFilters],
    queryFn: () => DashboardAPI.getCategorySummary(apiFilters),
    staleTime: 1000 * 60 * 5, // 5 minutos para categorias
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  return {
    categorySummary: data || [],
    isLoading,
    error,
    refetch,
  };
}