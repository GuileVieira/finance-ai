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

// Tipos para Relatórios Financeiros
export interface DREStatement {
  period: string;
  grossRevenue: number;
  taxes: number;
  financialCosts: number;
  netRevenue: number;
  variableCosts: number;
  contributionMargin: {
    value: number;
    percentage: number;
  };
  fixedCosts: number;
  operationalResult: number;
  nonOperationalExpenses: number;
  netResult: number;
  categories: DRECategory[];
}

export interface DRECategory {
  name: string;
  value: number;
  percentage: number;
  type: 'variable' | 'fixed' | 'non_operating';
  color: string;
  transactions: number;
  drilldown?: Transaction[];
}

export interface CashFlowItem {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  balance: number;
}

export interface CashFlowReport {
  period: string;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpense: number;
  dailyFlows: CashFlowItem[];
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