'use client';

import React from 'react';
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

      // Processar e ordenar categorias
      const processedCategories = result.data.map((cat: any) => ({
        value: cat.id,
        label: cat.name,
        type: cat.type,
        color: cat.colorHex || '#6366F1',
        name: cat.name,
        description: cat.description || ''
      }));

      // Ordenar por tipo e depois por nome para melhor organização
      const typeOrder = {
        'revenue': 1,
        'fixed_cost': 2,
        'variable_cost': 3,
        'non_operational': 4,
        'financial_movement': 5
      };

      return processedCategories.sort((a, b) => {
        // Primeiro ordenar por tipo
        const typeA = typeOrder[a.type] || 999;
        const typeB = typeOrder[b.type] || 999;

        if (typeA !== typeB) {
          return typeA - typeB;
        }

        // Depois ordenar por nome
        return a.name.localeCompare(b.name);
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    enabled: !!companyId,
    retry: 2,
  });

  const categoryOptions = useMemo(() => {
    return categoriesData || [];
  }, [categoriesData]);

  // Função de busca otimizada
  const searchCategories = React.useCallback((searchTerm: string) => {
    if (!searchTerm || !categoryOptions.length) return categoryOptions;

    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    return categoryOptions.filter(category => {
      const searchableFields = [
        category.label.toLowerCase(),
        category.name.toLowerCase(),
        category.description?.toLowerCase() || ''
      ];

      return searchableFields.some(field =>
        field.includes(lowerSearchTerm)
      );
    }).sort((a, b) => {
      // Priorizar match exato no nome
      const aExact = a.name.toLowerCase() === lowerSearchTerm;
      const bExact = b.name.toLowerCase() === lowerSearchTerm;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Priorizar match no início do nome
      const aStarts = a.name.toLowerCase().startsWith(lowerSearchTerm);
      const bStarts = b.name.toLowerCase().startsWith(lowerSearchTerm);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Manter ordenação original
      return 0;
    });
  }, [categoryOptions]);

  // Função para criar grupos por tipo
  const getGroupedCategories = React.useCallback((searchTerm?: string) => {
    const filtered = searchTerm ? searchCategories(searchTerm) : categoryOptions;

    const groups = filtered.reduce((acc, category) => {
      const typeKey = category.type || 'other';
      if (!acc[typeKey]) {
        acc[typeKey] = [];
      }
      acc[typeKey].push(category);
      return acc;
    }, {} as Record<string, typeof categoryOptions>);

    const typeLabels = {
      'revenue': 'Receitas',
      'fixed_cost': 'Custos Fixos',
      'variable_cost': 'Custos Variáveis',
      'non_operational': 'Não Operacionais',
      'financial_movement': 'Movimentações Financeiras',
      'other': 'Outras'
    };

    return Object.entries(groups).map(([type, items]) => ({
      type,
      label: typeLabels[type as keyof typeof typeLabels],
      items
    }));
  }, [categoryOptions, searchCategories]);

  return {
    categoryOptions,
    groupedCategories: getGroupedCategories(),
    searchCategories,
    isLoading,
    error,
    totalCategories: categoriesData?.length || 0
  };
}