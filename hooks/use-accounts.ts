'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// Interface para resposta da API
export interface AccountResponse {
  id: string;
  name: string;
  bankName: string;
  bankCode: string;
  agencyNumber?: string;
  accountNumber: string;
  accountType?: string;
  companyId: string;
  companyName: string;
  active: boolean;
  maskedAccountNumber?: string;
}

const API_BASE = '/api/accounts';

export class AccountsAPI {
  /**
   * Buscar todas as contas disponíveis
   */
  static async getAccounts(companyId?: string): Promise<AccountResponse[]> {
    const url = companyId ? `${API_BASE}?companyId=${companyId}` : API_BASE;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao buscar contas: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar contas');
    }

    return data.data.accounts;
  }
}

/**
 * Hook principal para buscar contas
 */
export function useAccounts(companyId?: string, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['accounts', companyId],
    queryFn: () => AccountsAPI.getAccounts(companyId),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: options?.enabled !== false,
    retry: 2,
    select: (accounts: AccountResponse[]) => {
      // Agrupar por banco para melhor organização
      const accountsByBank = accounts.reduce((acc, account) => {
        const bankKey = account.bankName;
        if (!acc[bankKey]) {
          acc[bankKey] = [];
        }
        acc[bankKey].push(account);
        return acc;
      }, {} as Record<string, AccountResponse[]>);

      return {
        accounts,
        accountsByBank,
        totalAccounts: accounts.length
      };
    }
  });
}

/**
 * Hook para buscar contas formatadas para select
 */
export function useAccountsForSelect(companyId?: string) {
  const { data: accountsData, isLoading } = useAccounts(companyId);

  const accountOptions = useMemo(() => {
    if (!accountsData) return [];

    // Opção "Todos os bancos"
    const allOption = {
      value: 'all',
      label: 'Todos os bancos',
      bankName: 'Todos'
    };

    // Opções individuais formatadas
    const bankOptions = Object.entries(accountsData.accountsByBank).map(([bankName, accounts]) => ({
      value: bankName,
      label: `${bankName} (${accounts.length} contas)`,
      bankName,
      accounts
    }));

    return [allOption, ...bankOptions];
  }, [accountsData]);

  return {
    accountOptions,
    isLoading,
    totalAccounts: accountsData?.totalAccounts || 0
  };
}