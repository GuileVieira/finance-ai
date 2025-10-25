'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { TransactionsAPI, TransactionFilters, TransactionResponse, TransactionStats } from '@/lib/api/transactions';

interface UIFilters {
  period?: string;
  bank?: string;
  category?: string;
  type?: string;
  search?: string;
}

interface UseTransactionsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook principal para buscar transações com filtros e paginação
 */
export function useTransactions(
  filters: UIFilters = {},
  options: UseTransactionsOptions = {}
) {
  const queryClient = useQueryClient();

  // Converter filtros da UI para filtros da API
  const apiFilters = useMemo(() => {
    return TransactionsAPI.convertUIToAPIFilters(filters);
  }, [filters]);

  // Chave de cache única baseada nos filtros
  const queryKey = ['transactions', apiFilters];

  // Buscar transações
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey,
    queryFn: () => TransactionsAPI.getTransactions(apiFilters),
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  // Buscar estatísticas
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ['transactions-stats', apiFilters],
    queryFn: () => TransactionsAPI.getTransactionStats(apiFilters),
    staleTime: 1000 * 60 * 5, // 5 minutos para estatísticas
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: options.enabled !== false,
    retry: 2,
  });

  // Transações formatadas
  const transactions = useMemo(() => {
    return response?.transactions || [];
  }, [response]);

  // Informações de paginação
  const pagination = useMemo(() => {
    return response?.pagination ? {
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages,
      hasNextPage: response.pagination.page < response.pagination.totalPages,
      hasPreviousPage: response.pagination.page > 1,
    } : {
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }, [response]);

  // Função para invalidar cache quando filtros mudam
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-stats'] });
  }, [queryClient]);

  // Função para pré-carregar próxima página
  const prefetchNextPage = useCallback(async () => {
    if (pagination.hasNextPage) {
      const nextFilters = { ...apiFilters, page: pagination.page + 1 };
      await queryClient.prefetchQuery({
        queryKey: ['transactions', nextFilters],
        queryFn: () => TransactionsAPI.getTransactions(nextFilters),
        staleTime: 1000 * 60 * 2,
      });
    }
  }, [queryClient, pagination.hasNextPage, pagination.page, apiFilters]);

  // Mutação para atualizar categoria de uma transação
  const updateTransactionCategory = useMutation({
    mutationFn: async ({ transactionId, categoryId }: { transactionId: string; categoryId: string }) => {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryId }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar transação');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (updatedTransaction, { transactionId, categoryId }) => {
      // Atualizar o cache local com a transação atualizada
      queryClient.setQueriesData(
        { queryKey: ['transactions'] },
        (oldData: any) => {
          if (!oldData) return oldData;

          if (Array.isArray(oldData)) {
            // Para paginação múltipla
            return oldData.map(page => ({
              ...page,
              transactions: page.transactions.map((t: any) =>
                t.id === transactionId
                  ? { ...t, categoryId, categoryName: updatedTransaction.category?.name || 'Categoria atualizada' }
                  : t
              )
            }));
          } else {
            // Para página única
            return {
              ...oldData,
              transactions: oldData.transactions.map((t: any) =>
                t.id === transactionId
                  ? { ...t, categoryId, categoryName: updatedTransaction.category?.name || 'Categoria atualizada' }
                  : t
              )
            };
          }
        }
      );

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['transactions-stats'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  return {
    // Dados
    transactions,
    stats,
    pagination,

    // Estados de loading
    isLoading,
    isLoadingStats,
    isRefetching,

    // Erros
    error,
    statsError,

    // Funções
    refetch,
    invalidateCache,
    prefetchNextPage,

    // Flags úteis
    isEmpty: !isLoading && transactions.length === 0,
    hasError: !!error || !!statsError,
  };
}

/**
 * Hook para buscar transações com paginação infinita (opcional)
 */
export function useInfiniteTransactions(
  filters: UIFilters = {},
  options: UseTransactionsOptions = {}
) {
  const apiFilters = useMemo(() => {
    return TransactionsAPI.convertUIToAPIFilters(filters);
  }, [filters]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useQuery({
    queryKey: ['transactions-infinite', apiFilters],
    queryFn: ({ pageParam = 1 }) =>
      TransactionsAPI.getTransactions({ ...apiFilters, page: pageParam }),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });

  // Transações concatenadas de todas as páginas
  const transactions = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data.flatMap(page => page.transactions);
    }
    return data.transactions || [];
  }, [data]);

  // Paginação
  const pagination = useMemo(() => {
    const lastPage = Array.isArray(data) ? data[data.length - 1] : data;
    return lastPage ? {
      total: lastPage.total,
      page: lastPage.page,
      limit: lastPage.limit,
      totalPages: lastPage.totalPages,
    } : {
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    };
  }, [data]);

  return {
    transactions,
    pagination,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    updateTransactionCategory,
    isEmpty: !isLoading && transactions.length === 0,
    hasError: !!error,
  };
}