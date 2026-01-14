import { Transaction } from '@/lib/types';
import { DashboardAPI } from './dashboard';

export interface TransactionFilters {
  accountId?: string;
  companyId?: string;
  categoryId?: string;
  type?: 'income' | 'expense' | 'credit' | 'debit';
  verified?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  categoryType?: string;
}

export interface TransactionResponse {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
    accountId?: string;
    companyId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    categoryType?: string;
  }): TransactionFilters {
    const apiFilters: TransactionFilters = {};

    // Converter período para startDate e endDate se fornecidos explicitamente
    if (uiFilters.startDate && uiFilters.endDate) {
      apiFilters.startDate = uiFilters.startDate;
      apiFilters.endDate = uiFilters.endDate;
    }
    // Caso contrário, converter do string period
    else if (uiFilters.period && uiFilters.period !== 'all' && uiFilters.period !== 'custom') {
      const { startDate, endDate } = DashboardAPI.convertPeriodToDates(uiFilters.period);
      if (startDate && endDate) {
        apiFilters.startDate = startDate;
        apiFilters.endDate = endDate;
      }
    }

    // Mapear tipo da UI para tipo da API (income/expense → credit/debit)
    if (uiFilters.type && uiFilters.type !== 'all') {
      apiFilters.type = uiFilters.type === 'income' ? 'credit' : 'debit';
      // Mapeamento direto se já estiver em credit/debit
      if (uiFilters.type === 'credit' || uiFilters.type === 'debit') {
        apiFilters.type = uiFilters.type;
      }
    }

    // Busca textual
    if (uiFilters.search) {
      apiFilters.search = uiFilters.search;
    }

    if (uiFilters.categoryType && uiFilters.categoryType !== 'all') {
      apiFilters.categoryType = uiFilters.categoryType;
    }

    // Propagar IDs
    if (uiFilters.accountId && uiFilters.accountId !== 'all') {
      apiFilters.accountId = uiFilters.accountId;
    }

    if (uiFilters.categoryId && uiFilters.categoryId !== 'all') {
      apiFilters.categoryId = uiFilters.categoryId;
    } else if (uiFilters.category && uiFilters.category !== 'all') {
      apiFilters.categoryId = uiFilters.category;
    }

    if (uiFilters.companyId && uiFilters.companyId !== 'all') {
      apiFilters.companyId = uiFilters.companyId;
    }

    // Fallback para bank/category antigos se existirem e os IDs não
    if (!apiFilters.accountId && uiFilters.bank && uiFilters.bank !== 'all') {
      // Nota: isso assume que 'bank' é um ID, o que geralmente é verdade nas selects atuais
      apiFilters.accountId = uiFilters.bank;
    }

    // Valores padrão de paginação
    apiFilters.page = 1;
    apiFilters.limit = 50;

    return apiFilters;
  }
}