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
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  color: string;
  icon?: string;
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

// Tipos para Relatórios Financeiros
export interface DREStatement {
  period: string;
  totalRevenue: number;
  totalVariableCosts: number;
  totalFixedCosts: number;
  totalNonOperational: number;
  totalExpenses: number;
  operatingIncome: number;
  netIncome: number;
  categories: DRECategory[];
  generatedAt: string;
}

export interface DRECategory {
  id: string;
  name: string;
  type: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational';
  budget: number;
  actual: number;
  variance: number;
  percentage: number;
  color: string;
  icon: string;
  subcategories: string[];
  growthRate: number;
}

export interface DRELineItem {
  label: string;
  value: number;
  type: 'revenue' | 'expense' | 'result';
  category?: 'operational' | 'non_operational';
  drilldown?: Transaction[];
  transactions?: number;
}

export interface CashFlowItem {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  balance: number;
}

export interface CashFlowDay {
  date: string;
  openingBalance: number;
  income: number;
  expenses: number;
  netCashFlow: number;
  closingBalance: number;
  transactions: number;
}

export interface CashFlowReport {
  period: string;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  averageDailyIncome: number;
  averageDailyExpenses: number;
  cashFlowDays: CashFlowDay[];
  bestDay: {
    date: string;
    amount: number;
  };
  worstDay: {
    date: string;
    amount: number;
  };
  generatedAt: string;
}

export interface ReportPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'month' | 'quarter' | 'semester' | 'year' | 'custom';
}

export interface Insight {
  id: string;
  type: 'alert' | 'recommendation' | 'positive' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category?: string;
  value?: number;
  comparison?: string;
  actionable: boolean;
  suggestions: string[];
  createdAt: string;
}

export interface CategoryRule {
  id: string;
  category: string;
  pattern: string;
  type: 'exact' | 'contains' | 'regex';
  accuracy: number;
  status: 'active' | 'inactive';
  matchCount: number;
}

export interface ExportOptions {
  format: 'pdf' | 'excel';
  includeDetails: boolean;
  includeCharts: boolean;
  period: ReportPeriod;
  categories?: string[];
}