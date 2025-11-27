'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { createQueryClient } from '@/lib/query-client';

interface QueryClientProviderProps {
  children: React.ReactNode;
}

export function QueryClientProviderWrapper({ children }: QueryClientProviderProps) {
  const [queryClient, setQueryClient] = useState<ReturnType<typeof createQueryClient> | null>(null);

  useEffect(() => {
    // Criar QueryClient apenas no cliente
    const client = createQueryClient();
    setQueryClient(client);

    return () => {
      // Limpar ao desmontar
      client.clear();
    };
  }, []);

  // Evitar renderização no servidor
  if (!queryClient) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}