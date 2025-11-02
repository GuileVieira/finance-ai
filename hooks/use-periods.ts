import { useQuery } from '@tanstack/react-query';

export interface AvailablePeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  type: 'month';
}

interface UseAvailablePeriodsOptions {
  companyId?: string;
  accountId?: string;
  type?: 'credit' | 'debit';
}

export function useAvailablePeriods(filters: UseAvailablePeriodsOptions = {}) {
  return useQuery<{ periods: AvailablePeriod[] }, Error>({
    queryKey: ['available-periods', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.companyId && filters.companyId !== 'all') {
        params.append('companyId', filters.companyId);
      }

      if (filters.accountId && filters.accountId !== 'all') {
        params.append('accountId', filters.accountId);
      }

      if (filters.type && filters.type !== 'all') {
        params.append('type', filters.type);
      }

      const response = await fetch(`/api/transactions/periods${params.toString() ? `?${params.toString()}` : ''}`);

      if (!response.ok) {
        throw new Error(`Erro ao carregar períodos: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar períodos');
      }

      return result.data as { periods: AvailablePeriod[] };
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}
