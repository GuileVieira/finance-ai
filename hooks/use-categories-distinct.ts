'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// Interface para resposta da API
export interface CategoryResponse {
  id: string;
  name: string;
  type: string;
  colorHex: string;
  transactionCount: number;
}

const API_BASE = '/api/categories/distinct';

export class CategoriesAPI {
  /**
   * Buscar categorias distintas usadas nas transações
   */
  static async getDistinctCategories(includeEmpty = false): Promise<CategoryResponse[]> {
    const url = includeEmpty ? `${API_BASE}?includeEmpty=true` : API_BASE;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao buscar categorias: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido ao buscar categorias');
    }

    return data.data;
  }
}

/**
 * Hook principal para buscar categorias distintas
 */
export function useDistinctCategories(options?: {
  includeEmpty?: boolean;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['categories-distinct', options?.includeEmpty],
    queryFn: () => CategoriesAPI.getDistinctCategories(options?.includeEmpty),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: options?.enabled !== false,
    retry: 2,
    select: (categories: CategoryResponse[]) => {
      // Agrupar por tipo para melhor organização
      const categoriesByType = categories.reduce((acc, category) => {
        const typeKey = category.type;
        if (!acc[typeKey]) {
          acc[typeKey] = [];
        }
        acc[typeKey].push(category);
        return acc;
      }, {} as Record<string, CategoryResponse[]>);

      // Ordenar por quantidade de transações (mais usadas primeiro)
      const sortedCategories = [...categories].sort((a, b) => b.transactionCount - a.transactionCount);

      return {
        categories: sortedCategories,
        categoriesByType,
        totalCategories: categories.length,
        totalTransactions: categories.reduce((sum, cat) => sum + cat.transactionCount, 0)
      };
    }
  });
}

/**
 * Hook para buscar categorias formatadas para select
 */
export function useCategoriesForSelect() {
  const { data: categoriesData, isLoading } = useDistinctCategories({ includeEmpty: false });

  const categoryOptions = useMemo(() => {
    if (!categoriesData) return [];

    // Opção "Todas as categorias"
    const allOption = {
      value: 'all',
      label: 'Todas as categorias'
    };

    // Opções individuais formatadas com contagem
    const categoryOptions = categoriesData.categories.map(category => ({
      value: category.id, // Usar ID em vez do nome
      label: `${category.name} (${category.transactionCount} transações)`,
      type: category.type,
      color: category.colorHex,
      transactionCount: category.transactionCount,
      name: category.name // Manter o nome para referência
    }));

    return [allOption, ...categoryOptions];
  }, [categoriesData]);

  return {
    categoryOptions,
    isLoading,
    totalCategories: categoriesData?.totalCategories || 0
  };
}