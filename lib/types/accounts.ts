export interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  bank_name: string;
  bank_code: string;
  agency_number?: string;
  account_number: string;
  account_type: 'checking' | 'savings' | 'investment';
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
  active: boolean;
  last_sync_at?: string;
  logo_url?: string;
}

export interface BankAccountFormData {
  name: string;
  bank_name: string;
  bank_code: string;
  agency_number?: string;
  account_number: string;
  account_type: 'checking' | 'savings' | 'investment';
  opening_balance: number;
  active?: boolean;
}

// Re-exportar do arquivo de bancos brasileiros para compatibilidade
export {
  brazilianBanks as supportedBanks,
  getBankByCode,
  getBankName,
  getBankColor,
  getAllBanksSorted,
  searchBanks,
} from '@/lib/data/brazilian-banks';

export type { BrazilianBank as Bank } from '@/lib/data/brazilian-banks';