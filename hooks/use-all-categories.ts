'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface CategoryOption {
  value: string;
  label: string;
  type: string;
  color: string;
  name: string;
}

/**
 * Hook para buscar todas as categorias para selects
 */
export function useAllCategories(companyId: string) {
  const { data: categoriesData, isLoading, error } = useQuery({
    queryKey: ['categories-all', companyId],
    queryFn: async () => {
      console.log(`🔍 Buscando categorias para empresa: ${companyId}`);

      const response = await fetch(`/api/categories?companyId=${companyId}&isActive=true`);

      if (!response.ok) {
        throw new Error(`Erro ao buscar categorias: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Categorias recebidas:`, result);

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido ao buscar categorias');
      }

      return result.data.map((cat: any) => ({
        value: cat.id,
        label: cat.name,
        type: cat.type,
        color: cat.colorHex || '#6366F1',
        name: cat.name
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: !!companyId,
    retry: 2,
  });

  const categoryOptions = useMemo(() => {
    if (!categoriesData) return [];

    return categoriesData.sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesData]);

  return {
    categoryOptions,
    isLoading,
    error,
    totalCategories: categoriesData?.length || 0
  };
}