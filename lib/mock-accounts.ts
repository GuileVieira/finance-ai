import { BankAccount } from '@/lib/types/accounts';

export const mockAccounts: BankAccount[] = [
  {
    id: '1',
    company_id: '1',
    name: 'Conta Principal - Empresa',
    bank_name: 'Banco do Brasil',
    bank_code: '001',
    agency_number: '1234-5',
    account_number: '12345-6',
    account_type: 'checking',
    opening_balance: 50000,
    current_balance: 87430.50,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-10-24T09:15:00Z',
    active: true,
    last_sync_at: '2024-10-24T08:00:00Z'
  },
  {
    id: '2',
    company_id: '1',
    name: 'Conta Poupança',
    bank_name: 'Caixa Econômica Federal',
    bank_code: '104',
    agency_number: '5678-9',
    account_number: '98765-4',
    account_type: 'savings',
    opening_balance: 20000,
    current_balance: 35680.25,
    created_at: '2024-02-01T14:20:00Z',
    updated_at: '2024-10-23T16:45:00Z',
    active: true,
    last_sync_at: '2024-10-23T15:30:00Z'
  },
  {
    id: '3',
    company_id: '1',
    name: 'Investimentos',
    bank_name: 'Itaú',
    bank_code: '341',
    agency_number: '4321-0',
    account_number: '54321-0',
    account_type: 'investment',
    opening_balance: 100000,
    current_balance: 127890.75,
    created_at: '2024-03-10T09:00:00Z',
    updated_at: '2024-10-24T07:30:00Z',
    active: true,
    last_sync_at: '2024-10-24T07:00:00Z'
  },
  {
    id: '4',
    company_id: '1',
    name: 'Conta Secundária',
    bank_name: 'Bradesco',
    bank_code: '237',
    agency_number: '8765-4',
    account_number: '24680-2',
    account_type: 'checking',
    opening_balance: 15000,
    current_balance: 12340.80,
    created_at: '2024-04-05T11:30:00Z',
    updated_at: '2024-10-22T14:20:00Z',
    active: true,
    last_sync_at: '2024-10-22T13:45:00Z'
  },
  {
    id: '5',
    company_id: '1',
    name: 'Conta Digital',
    bank_name: 'NuBank',
    bank_code: '260',
    agency_number: '0001',
    account_number: '12345678-9',
    account_type: 'checking',
    opening_balance: 8000,
    current_balance: 15670.30,
    created_at: '2024-05-20T16:00:00Z',
    updated_at: '2024-10-24T10:00:00Z',
    active: true,
    last_sync_at: '2024-10-24T09:30:00Z'
  },
  {
    id: '6',
    company_id: '1',
    name: 'Conta Inativa',
    bank_name: 'Santander',
    bank_code: '033',
    agency_number: '2468-0',
    account_number: '13579-1',
    account_type: 'checking',
    opening_balance: 5000,
    current_balance: 2100.50,
    created_at: '2023-12-01T13:00:00Z',
    updated_at: '2024-08-15T10:30:00Z',
    active: false,
    last_sync_at: '2024-08-14T09:00:00Z'
  }
];

export const accountTypes = [
  { value: 'checking', label: 'Conta Corrente', description: 'Para transações diárias' },
  { value: 'savings', label: 'Poupança', description: 'Para economizar e investir' },
  { value: 'investment', label: 'Investimento', description: 'Para aplicações financeiras' }
];

export const getAccountTypeLabel = (type: string) => {
  const accountType = accountTypes.find(t => t.value === type);
  return accountType?.label || type;
};

export const formatAccountNumber = (accountNumber: string) => {
  // Formatar número da conta (ex: 12345-6)
  return accountNumber;
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};