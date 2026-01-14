
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BankAccount, BankAccountFormData } from '@/lib/types/accounts';
import { toast } from 'sonner';

// Tipos da API (para tipagem interna do hook)
interface AccountApiResponse {
  id: string;
  companyId: string;
  name: string;
  bankName: string;
  bankCode: string | null;
  agencyNumber: string | null;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'investment';
  openingBalance: number;
  currentBalance?: number;
  active: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Mappers Helpers
function mapApiToFrontend(apiAccount: AccountApiResponse): BankAccount {
  const openingBalance = Number(apiAccount.openingBalance) || 0;
  const currentBalance = apiAccount.currentBalance !== undefined
    ? Number(apiAccount.currentBalance)
    : openingBalance;

  return {
    id: apiAccount.id,
    company_id: apiAccount.companyId,
    name: apiAccount.name,
    bank_name: apiAccount.bankName,
    bank_code: apiAccount.bankCode || '',
    agency_number: apiAccount.agencyNumber || undefined,
    account_number: apiAccount.accountNumber,
    account_type: apiAccount.accountType.toLowerCase() as 'checking' | 'savings' | 'investment',
    opening_balance: openingBalance,
    current_balance: currentBalance,
    created_at: apiAccount.createdAt,
    updated_at: apiAccount.updatedAt,
    active: apiAccount.active,
    last_sync_at: apiAccount.lastSyncAt || undefined,
  };
}

function mapFrontendToApi(formData: BankAccountFormData, companyId: string) {
  return {
    companyId,
    name: formData.name,
    bankName: formData.bank_name,
    bankCode: formData.bank_code,
    agencyNumber: formData.agency_number,
    accountNumber: formData.account_number,
    accountType: formData.account_type,
    openingBalance: formData.opening_balance,
    active: formData.active ?? true,
  };
}

// Keys Factory
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
};

// --- Hooks ---

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.lists(),
    queryFn: async () => {
      const response = await fetch('/api/accounts');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Falha ao buscar contas');
      }

      return (result.data.accounts as AccountApiResponse[]).map(mapApiToFrontend);
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { formData: BankAccountFormData, companyId: string }) => {
      const { formData, companyId } = data;
      const apiData = mapFrontendToApi(formData, companyId);

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao criar conta');

      return mapApiToFrontend(result.data.account);
    },
    onSuccess: (newAccount) => {
      queryClient.setQueryData(accountKeys.lists(), (old: BankAccount[] = []) => [...old, newAccount]);
      toast.success('Conta criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conta: ${error.message}`);
    }
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string, formData: BankAccountFormData, companyId: string }) => {
      const { id, formData, companyId } = data;
      const apiData = mapFrontendToApi(formData, companyId);

      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao atualizar conta');

      return mapApiToFrontend(result.data.account);
    },
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData(accountKeys.lists(), (old: BankAccount[] = []) =>
        old.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)
      );
      toast.success('Conta atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao excluir conta');
      return id;
    },
    onSuccess: (deletedId) => {
      // Soft delete: update query cache to mark as inactive
      queryClient.setQueryData(accountKeys.lists(), (old: BankAccount[] = []) =>
        old.map(acc => acc.id === deletedId ? { ...acc, active: false } : acc)
      );
      toast.success('Conta desativada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });
}

export function useToggleAccountStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: BankAccount) => {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !account.active }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return { id: account.id, active: !account.active };
    },
    onMutate: async (variable) => {
      await queryClient.cancelQueries({ queryKey: accountKeys.lists() });
      const previousAccounts = queryClient.getQueryData<BankAccount[]>(accountKeys.lists());

      queryClient.setQueryData(accountKeys.lists(), (old: BankAccount[] = []) =>
        old.map(acc => acc.id === variable.id ? { ...acc, active: !acc.active } : acc)
      );

      return { previousAccounts };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(accountKeys.lists(), context.previousAccounts);
      }
      toast.error('Erro ao alterar status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    }
  });
}

export function useSyncAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSyncAt: new Date().toISOString() }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return { id, lastSyncAt: new Date().toISOString() };
    },
    onSuccess: ({ id, lastSyncAt }) => {
      queryClient.setQueryData(accountKeys.lists(), (old: BankAccount[] = []) =>
        old.map(acc => acc.id === id ? { ...acc, last_sync_at: lastSyncAt } : acc)
      );
      toast.success('Conta sincronizada!');
    },
    onError: () => {
      toast.error('Erro ao sincronizar conta');
    }
  });
}

export function useAccountsForSelect() {
  const { data: accounts, isLoading } = useAccounts();

  const accountOptions = accounts?.map(account => ({
    value: account.id,
    label: `${account.name} (${account.bank_name || 'Banco Desconhecido'})`
  })) || [];

  return {
    accountOptions,
    isLoading
  };
}