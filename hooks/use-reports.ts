'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { DREStatement, CashFlowReport, Insight, CategoryRule } from '@/lib/types';

export interface ReportsFilters {
  period?: string;
  companyId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

interface UseReportsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook para buscar DRE Statement
 */
export function useDREStatement(
  filters: ReportsFilters = {},
  options: UseReportsOptions = {}
) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dre-statement', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.period) params.append('period', filters.period);
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/reports/dre?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Erro ao buscar DRE: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido ao buscar DRE');
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dre-statement'] });
  }, [queryClient]);

  return {
    dreData: data,
    isLoading,
    error,
    refetch,
    invalidateCache,
    hasError: !!error,
  };
}

/**
 * Hook para buscar DRE com comparação entre períodos
 */
export function useDREComparison(
  filters: ReportsFilters = {},
  options: UseReportsOptions = {}
) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dre-comparison', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.period) params.append('period', filters.period);
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      params.append('compare', 'true'); // Habilitar comparação

      const response = await fetch(`/api/reports/dre?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Erro ao buscar comparação DRE: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido ao buscar comparação DRE');
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 15, // 15 minutos para comparações
    gcTime: 1000 * 60 * 45, // 45 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dre-comparison'] });
  }, [queryClient]);

  return {
    comparisonData: data,
    isLoading,
    error,
    refetch,
    invalidateCache,
    hasError: !!error,
  };
}

/**
 * Hook para buscar relatório de fluxo de caixa
 */
export function useCashFlowReport(
  filters: ReportsFilters = {},
  days?: number,
  options: UseReportsOptions = {}
) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cash-flow-report', filters, days],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.period) params.append('period', filters.period);
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (days) params.append('days', String(days));

      const response = await fetch(`/api/reports/cash-flow?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Erro ao buscar fluxo de caixa: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido ao buscar fluxo de caixa');
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos para fluxo de caixa
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cash-flow-report'] });
  }, [queryClient]);

  return {
    cashFlowData: data?.report,
    period: data?.period,
    isLoading,
    error,
    refetch,
    invalidateCache,
    hasError: !!error,
  };
}

/**
 * Hook para buscar insights financeiros
 */
export function useFinancialInsights(
  filters: ReportsFilters & { category?: string; type?: 'alert' | 'recommendation' | 'positive' | 'trend' } = {},
  options: UseReportsOptions = {}
) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['financial-insights', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.period) params.append('period', filters.period);
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.category) params.append('category', filters.category);
      if (filters.type) params.append('type', filters.type);

      const response = await fetch(`/api/reports/insights?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Erro ao buscar insights: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido ao buscar insights');
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 15, // 15 minutos para insights
    gcTime: 1000 * 60 * 45, // 45 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['financial-insights'] });
  }, [queryClient]);

  return {
    insightsData: data,
    insights: data?.insights || [],
    total: data?.total || 0,
    period: data?.period || '',
    isLoading,
    error,
    refetch,
    invalidateCache,
    hasError: !!error,
    isEmpty: !isLoading && (!data?.insights || data.insights.length === 0),
  };
}

/**
 * Hook para exportar relatórios
 */
export function useReportExport() {
  const queryClient = useQueryClient();

  const exportReport = useCallback(async (
    reportType: 'dre' | 'cashflow',
    format: 'pdf' | 'excel',
    filters: ReportsFilters = {}
  ) => {
    try {
      const exportData = {
        format,
        reportType,
        filters,
        includeDetails: true,
        includeCharts: true,
      };

      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error(`Erro ao exportar relatório: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${filters.period || 'current'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }, []);

  const exportDRE = useCallback(async (format: 'pdf' | 'excel', filters: ReportsFilters = {}) => {
    return exportReport('dre', format, filters);
  }, [exportReport]);

  const exportCashFlow = useCallback(async (format: 'pdf' | 'excel', filters: ReportsFilters = {}) => {
    return exportReport('cashflow', format, filters);
  }, [exportReport]);

  return {
    exportReport,
    exportDRE,
    exportCashFlow,
  };
}

/**
 * Hook combinado para página de relatórios
 * Usa useDREComparison para incluir comparação automática com período anterior
 */
export function useReportsData(
  filters: ReportsFilters = {},
  options: UseReportsOptions = {}
) {
  const dreComparison = useDREComparison(filters, options);
  const cashFlow = useCashFlowReport(filters, 30, options);
  const insights = useFinancialInsights(filters, options);
  const exportReport = useReportExport();

  // Função para invalidar todos os caches de relatórios
  const invalidateAllReports = useCallback(() => {
    dreComparison.invalidateCache();
    cashFlow.invalidateCache();
    insights.invalidateCache();
  }, [dreComparison.invalidateCache, cashFlow.invalidateCache, insights.invalidateCache]);

  // Estado de loading combinado
  const isLoading = useMemo(() => (
    dreComparison.isLoading || cashFlow.isLoading || insights.isLoading
  ), [dreComparison.isLoading, cashFlow.isLoading, insights.isLoading]);

  // Estado de erro combinado
  const hasError = useMemo(() => (
    dreComparison.hasError || cashFlow.hasError || insights.hasError
  ), [dreComparison.hasError, cashFlow.hasError, insights.hasError]);

  // Primeiro erro encontrado
  const firstError = useMemo(() => (
    dreComparison.error || cashFlow.error || insights.error
  ), [dreComparison.error, cashFlow.error, insights.error]);

  return {
    // Dados - comparisonData já contém { current, comparison }
    dreData: dreComparison.comparisonData,
    cashFlowData: cashFlow.cashFlowData,
    insightsData: insights.insightsData,

    // Estados
    isLoading,
    hasError,
    firstError,

    // Funções
    refetchAll: () => {
      dreComparison.refetch();
      cashFlow.refetch();
      insights.refetch();
    },
    invalidateAllReports,
    exportReport,

    // Funções individuais
    exportDRE: exportReport.exportDRE,
    exportCashFlow: exportReport.exportCashFlow,
  };
}
