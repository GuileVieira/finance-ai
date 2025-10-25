import { Transaction } from '@/lib/types';

export interface TransactionFilters {
  accountId?: string;
  companyId?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  verified?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransactionResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionStats {
  total: number;
  income: number;
  expenses: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
}

const API_BASE = '/api/transactions';

export class TransactionsAPI {
  /**
   * Busca transações com filtros e paginação
   */
  static async getTransactions(filters: TransactionFilters = {}): Promise<TransactionResponse> {
    const params = new URLSearchParams();

    // Adicionar filtros à URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao buscar transações: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar transações');
    }

    return data.data;
  }

  /**
   * Busca estatísticas das transações
   */
  static async getTransactionStats(filters: Omit<TransactionFilters, 'page' | 'limit'> = {}): Promise<TransactionStats> {
    const params = new URLSearchParams();

    // Adicionar filtros à URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    // Adicionar flag para estatísticas
    params.append('stats', 'true');

    const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao buscar estatísticas: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar estatísticas');
    }

    return data.data.statistics;
  }

  /**
   * Converte filtros da UI para filtros da API
   */
  static convertUIToAPIFilters(uiFilters: {
    period?: string;
    bank?: string;
    category?: string;
    type?: string;
    search?: string;
  }): TransactionFilters {
    const apiFilters: TransactionFilters = {};

    // Converter período para startDate e endDate
    if (uiFilters.period && uiFilters.period !== 'all') {
      const [year, month] = uiFilters.period.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      apiFilters.startDate = startDate;
      apiFilters.endDate = endDate;
    }

    // Mapear tipo da UI para tipo da API (income/expense → credit/debit)
    if (uiFilters.type && uiFilters.type !== 'all') {
      apiFilters.type = uiFilters.type === 'income' ? 'credit' : 'debit';
    }

    // Busca textual
    if (uiFilters.search) {
      apiFilters.search = uiFilters.search;
    }

    // Por enquanto, não implementamos filtros de banco e categoria
    // Os selects estão funcionando mas a API ainda não suporta filtragem por estes campos
    // TODO: Implementar filtragem por accountId e categoryId quando os hooks enviarem IDs

    // Valores padrão de paginação
    apiFilters.page = 1;
    apiFilters.limit = 50;

    return apiFilters;
  }
}