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

export interface Bank {
  code: string;
  name: string;
  logo_url?: string;
  color: string;
}

export const supportedBanks: Bank[] = [
  { code: '001', name: 'Banco do Brasil', color: '#FFCD00' },
  { code: '033', name: 'Santander', color: '#EC0000' },
  { code: '104', name: 'Caixa Econômica Federal', color: '#0066B3' },
  { code: '237', name: 'Bradesco', color: '#CC092F' },
  { code: '341', name: 'Itaú', color: '#FF7900' },
  { code: '748', name: 'Sicredi', color: '#0F8042' },
  { code: '756', name: 'Sicoob', color: '#00A693' },
  { code: '260', name: 'NuBank', color: '#820AD1' },
  { code: '336', name: 'C6 Bank', color: '#00C470' },
  { code: '212', name: 'Banco Original', color: '#FF6A00' },
];