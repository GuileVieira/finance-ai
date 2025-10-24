'use client';

import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/query-persist-client-core';

// Configuração de persistência com localStorage
const localStoragePersister = {
  persistClient: (client: QueryClient) => {
    try {
      const state = client.getQueryCache().getAll();
      const serializedState = JSON.stringify(state, (key, value) => {
        // Não serializar funções ou valores não serializáveis
        if (typeof value === 'function') return undefined;
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      });
      localStorage.setItem('query-client-cache', serializedState);
    } catch (error) {
      console.warn('Failed to persist query client:', error);
    }
  },

  restoreClient: async () => {
    try {
      const persistedState = localStorage.getItem('query-client-cache');
      if (persistedState) {
        return JSON.parse(persistedState);
      }
    } catch (error) {
      console.warn('Failed to restore query client:', error);
    }
    return undefined;
  },

  removeClient: () => {
    try {
      localStorage.removeItem('query-client-cache');
    } catch (error) {
      console.warn('Failed to remove query client cache:', error);
    }
  }
};

// Função para criar QueryClient com persistência
export function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 30, // 30 minutos
        retry: (failureCount, error) => {
          // Não tentar novamente para erros 4xx
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as any).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });

  // Configurar persistência apenas no cliente
  if (typeof window !== 'undefined') {
    persistQueryClient({
      queryClient,
      persister: localStoragePersister,
      maxAge: 1000 * 60 * 60 * 24, // 24 horas
      buster: 'v1', // Incrementar para invalidar cache antigo
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Não persistir queries em estado de erro ou loading
          return !query.state.isFetching && !query.state.fetchStatus === 'fetching';
        },
      },
    });
  }

  return queryClient;
}

// Função para limpar cache persistido
export function clearPersistedCache() {
  try {
    localStorage.removeItem('query-client-cache');
  } catch (error) {
    console.warn('Failed to clear persisted cache:', error);
  }
}