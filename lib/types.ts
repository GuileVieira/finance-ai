// Tipos compartilhados para o projeto FinanceAI

export interface Category {
  id: string;
  name: string;
  type: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operating';
  color: string;
  amount: number;
  transactions: number;
  percentage: number;
  icon?: string;
  description?: string;
  examples?: string[];
}

export interface AutoRule {
  id: string;
  category: string;
  pattern: string;
  type: 'exact' | 'contains';
  accuracy: number;
  status: 'active' | 'inactive';
}

export interface CategoryFormData {
  name: string;
  type: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operating';
  color: string;
  description: string;
  active: boolean;
}

export interface NavigationItem {
  name: string;
  href: string;
  active: boolean;
}

export interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease';
  color: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  bank?: string;
}

export interface UserData {
  name: string;
  email: string;
  avatar: string | null;
}