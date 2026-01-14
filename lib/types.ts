// Tipos compartilhados para o projeto FinanceAI

export interface Category {
  id: string;
  name: string;
  type: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational' | 'financial_movement';
  colorHex: string;
  /** @deprecated Use colorHex instead */
  color?: string;
  totalAmount?: number;
  transactionCount?: number;
  /** @deprecated Use transactionCount instead */
  transactions?: number;
  percentage?: number;
  icon?: string;
  description?: string;
  examples?: string[];
  active?: boolean;
  dreGroup?: 'RoB' | 'TDCF' | 'MP' | 'CF' | 'RNOP' | 'DNOP' | null;
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
  type: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational' | 'financial_movement';
  color: string;
  description: string;
  active: boolean;
  examples?: string[];
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
  transactionDate: string;
  description: string;
  name?: string | null;
  memo?: string | null;
  category: string;
  categoryId?: string | null;
  categoryName?: string | null;
  amount: number;
  type: 'credit' | 'debit' | 'income' | 'expense';
  bank?: string;
  bankName?: string;
  balance_after?: number | string;
  account?: { name: string };
  accountId?: string;
  verified?: boolean;
}

export interface UserData {
  name: string;
  email: string;
  avatar: string | null;
}

// Tipos para Relatórios Financeiros
export interface DREStatement {
  period: string;

  // Campos novos (usados pelo componente de comparação)
  grossRevenue: number;
  netRevenue: number;
  taxes: number;
  financialCosts: number;
  variableCosts: number;
  fixedCosts: number;
  contributionMargin: {
    value: number;
    percentage: number;
  };
  operationalResult: number;
  nonOperationalExpenses: number;
  nonOperational: {
    revenue: number;
    expenses: number;
    netResult: number;
  };
  financialResult: number; // Resultado financeiro (receitas - custos financeiros)
  netResult: number;

  // Campos antigos (mantidos para compatibilidade)
  totalRevenue: number;
  totalVariableCosts: number;
  totalFixedCosts: number;
  totalNonOperational: number;
  totalExpenses: number;
  operatingIncome: number;
  netIncome: number;

  categories: DRECategory[];
  lineDetails?: {
    grossRevenue: Array<{ label: string; value: number; transactions: number; drilldown: unknown[] }>;
    taxes: Array<{ label: string; value: number; transactions: number; drilldown: unknown[] }>;
    financialCosts: Array<{ label: string; value: number; transactions: number; drilldown: unknown[] }>;
    variableCosts: Array<{ label: string; value: number; transactions: number; drilldown: unknown[] }>;
    fixedCosts: Array<{ label: string; value: number; transactions: number; drilldown: unknown[] }>;
    nonOperationalRevenue: Array<{ label: string; value: number; transactions: number; drilldown: unknown[] }>;
    nonOperationalExpenses: Array<{ label: string; value: number; transactions: number; drilldown: unknown[] }>;
  };
  generatedAt: string;
}

export interface DRECategory {
  id: string;
  name: string;
  type: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational' | 'financial_movement';
  budget: number;
  actual: number;
  variance: number;
  percentage: number;
  color: string;
  icon: string;
  subcategories: string[];
  growthRate: number;
  transactions?: number;
  drilldown?: any[];
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

// Tipos para Sistema de Insights Avançados

export type InsightPriority = 'critical' | 'warning' | 'info' | 'positive';

export interface InsightThresholds {
  profitMargin: {
    low: number;      // default: 10
    high: number;     // default: 30
  };
  categoryConcentration: {
    warning: number;  // default: 40
  };
  avgTransaction: {
    high: number;     // default: 5000
  };
  dailyFrequency: {
    high: number;     // default: 10
  };
  growth: {
    positive: number; // default: 20
    negative: number; // default: -10
  };
  anomaly: {
    zScore: number;   // default: 2
  };
  recurrence: {
    valueTolerance: number;  // default: 0.1 (10%)
    daysTolerance: number;   // default: 3
  };
  seasonality: {
    varianceThreshold: number; // default: 0.2 (20%)
  };
}

export interface RecurringExpense {
  id: string;
  description: string;
  normalizedDescription: string;
  averageValue: number;
  currentValue: number;
  variance: number;
  frequency: number; // quantas vezes apareceu nos últimos meses
  lastOccurrence: string;
  category?: string;
  categoryId?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface AnomalyData {
  id: string;
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  categoryId?: string;
  type: 'transaction' | 'category_spike';
  zScore: number;
  mean: number;
  stdDev: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface SeasonalityData {
  month: number;
  monthName: string;
  historicalAverage: number;
  currentValue: number;
  variance: number;
  variancePercent: number;
  isSeasonalPeak: boolean;
  isSeasonalLow: boolean;
  sameMonthLastYear?: number;
  sameMonthLastYearVariance?: number;
}

export interface PeriodComparison {
  period: 'previous_month' | 'same_month_last_year' | 'rolling_3_months' | 'rolling_12_months';
  label: string;
  currentValue: number;
  comparisonValue: number;
  variance: number;
  variancePercent: number;
}

export interface ExtendedInsight extends Insight {
  priority: InsightPriority;
  source: 'deterministic' | 'seasonality' | 'recurrence' | 'anomaly';
  relatedData?: RecurringExpense | AnomalyData | SeasonalityData;
}