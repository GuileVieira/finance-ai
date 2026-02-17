import { Transaction, Category, Account, Company } from '@/lib/db/schema';

export interface DashboardFilters {
  period?: string;
  companyId?: string;
  accountId?: string;
  bankName?: string; // Filtrar por nome do banco (ex: "Banco Santander S.a.")
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface DashboardMetrics {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  averageTicket: number;
  growthRate: number;
  expensesGrowthRate: number;
  balanceGrowthRate: number;
  transactionsGrowthRate: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface TrendData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
  transactions: number;
  openingBalance?: number;
}

export interface TopExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  accountName: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  categorySummary: CategorySummary[];
  trendData: TrendData[];
  topExpenses: TopExpense[];
  recentTransactions: Transaction[];
}

const API_BASE = '/api';

export class DashboardAPI {
  /**
   * Busca métricas principais do dashboard
   */
  static async getMetrics(filters: DashboardFilters = {}): Promise<DashboardMetrics> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE}/dashboard/metrics?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar métricas: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar métricas');
    }

    return data.data;
  }

  /**
   * Busca dados de categorias para o dashboard
   */
  static async getCategorySummary(filters: DashboardFilters = {}): Promise<CategorySummary[]> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE}/dashboard/categories?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar categorias: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar categorias');
    }

    return data.data;
  }

  /**
   * Busca dados de tendência para gráficos
   */
  static async getTrendData(filters: DashboardFilters = {}): Promise<TrendData[]> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE}/dashboard/trends?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar tendências: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar tendências');
    }

    return data.data;
  }

  /**
   * Busca top despesas do período
   */
  static async getTopExpenses(filters: DashboardFilters = {}, limit: number = 10): Promise<TopExpense[]> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    params.append('limit', String(limit));

    const response = await fetch(`${API_BASE}/dashboard/top-expenses?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar top despesas: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar top despesas');
    }

    return data.data;
  }

  /**
   * Busca dados completos do dashboard
   */
  static async getDashboardData(filters: DashboardFilters = {}): Promise<DashboardData> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE}/dashboard?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar dados do dashboard: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar dados do dashboard');
    }

    return data.data;
  }

  /**
   * Converte período do formato YYYY-MM para startDate e endDate
   */
  /**
   * Converte período do formato YYYY-MM ou chaves dinâmicas para startDate e endDate
   */
  static convertPeriodToDates(period: string): { startDate: string; endDate: string } {
    if (!period || period === 'all') {
      return { startDate: '', endDate: '' };
    }

    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Períodos dinâmicos
    if (period === 'today') {
      return { startDate: formatDate(today), endDate: formatDate(today) };
    }

    if (period === 'last_7_days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }

    if (period === 'last_15_days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 15);
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }

    if (period === 'last_30_days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }

    if (period === 'last_90_days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 90);
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }

    if (period === 'last_180_days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 180);
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }

    if (period === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }

    if (period === 'this_year') {
      const start = new Date(today.getFullYear(), 0, 1);
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }

    if (period === 'last_month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }

    if (period === 'last_year') {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }

    if (period === 'last_quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
      let lastQuarterYear = today.getFullYear();
      let lastQuarterFn = currentQuarter - 1;

      if (lastQuarterFn === 0) {
        lastQuarterFn = 4;
        lastQuarterYear -= 1;
      }

      const quarterStartMonth = (lastQuarterFn - 1) * 3;
      const start = new Date(lastQuarterYear, quarterStartMonth, 1);
      const end = new Date(lastQuarterYear, quarterStartMonth + 3, 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }

    // Fallback para YYYY-MM
    const [year, month] = period.split('-');

    // Se não tiver hífen, pode ser inválido ou outro formato
    if (!month) return { startDate: '', endDate: '' };

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Validação para evitar datas absurdas
    if (yearNum < 2000 || yearNum > 2100) {
      console.error('❌ Ano inválido:', yearNum);
      return { startDate: '', endDate: '' };
    }

    if (monthNum < 1 || monthNum > 12) {
      console.error('❌ Mês inválido:', monthNum);
      return { startDate: '', endDate: '' };
    }

    // Lógica simples e segura
    const startDate = `${year}-${month.padStart(2, '0')}-01`;

    // Dias em cada mês (considerando anos bissextos simplificados)
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Ajuste bissexto simples
    if (monthNum === 2 && ((yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0)) {
      daysInMonth[1] = 29;
    }

    const lastDay = daysInMonth[monthNum - 1];

    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    console.log(`🗓️ Convertendo ${period}: ${startDate} até ${endDate}`);
    return { startDate, endDate };
  }
}