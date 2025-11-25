'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { CategoriesAPI, Category, CategoryWithStats, CategoryRule, CategoryRuleDB, CategoryFilters, CategorySummary, CreateCategoryData, UpdateCategoryData } from '@/lib/api/categories';

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters: CategoryFilters) => [...categoryKeys.lists(), filters] as const,
  withTransactions: () => [...categoryKeys.all, 'with-transactions'] as const,
  withTransactionsList: (filters: CategoryFilters) => [...categoryKeys.withTransactions(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
  summary: (filters: CategoryFilters) => [...categoryKeys.all, 'summary', filters] as const,
  rules: (filters: { categoryId?: string; isActive?: boolean }) => [...categoryKeys.all, 'rules', filters] as const,
  rule: (id: string) => [...categoryKeys.all, 'rule', id] as const,
};

// Hook para buscar categorias com filtros
export function useCategories(filters: CategoryFilters = {}, options?: Omit<UseQueryOptions<CategoryWithStats[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: categoryKeys.list(filters),
    queryFn: () => CategoriesAPI.getCategories(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    ...options,
  });
}

// Hook para buscar categorias com transações associadas
export function useCategoriesWithTransactions(filters: CategoryFilters = {}, options?: Omit<UseQueryOptions<CategoryWithStats[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: categoryKeys.withTransactionsList(filters),
    queryFn: () => CategoriesAPI.getCategoriesWithTransactions(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    ...options,
  });
}

// Hook para buscar categoria por ID
export function useCategory(id: string, options?: Omit<UseQueryOptions<Category, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => CategoriesAPI.getCategoryById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

// Hook para buscar resumo das categorias
export function useCategoriesSummary(filters: CategoryFilters = {}, options?: Omit<UseQueryOptions<CategorySummary, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: categoryKeys.summary(filters),
    queryFn: () => CategoriesAPI.getCategoriesSummary(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos para dados de resumo
    ...options,
  });
}

// Hook para buscar regras de categorização
export function useCategoryRules(filters: { categoryId?: string; isActive?: boolean } = {}, options?: Omit<UseQueryOptions<CategoryRuleDB[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: categoryKeys.rules(filters),
    queryFn: () => CategoriesAPI.getCategoryRules(filters),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

// Hook para mutação de criação de categoria
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryData: CreateCategoryData) => CategoriesAPI.createCategory(categoryData),
    onSuccess: () => {
      // Invalidar queries relacionadas a categorias
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.summary({}) });
    },
    onError: (error) => {
      console.error('Erro ao criar categoria:', error);
    },
  });
}

// Hook para mutação de atualização de categoria
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryData: UpdateCategoryData) => CategoriesAPI.updateCategory(categoryData),
    onSuccess: (updatedCategory, variables) => {
      // Atualizar cache da categoria específica
      queryClient.setQueryData(
        categoryKeys.detail(variables.id),
        updatedCategory
      );

      // Invalidar listas e resumo
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.summary({}) });
    },
    onError: (error) => {
      console.error('Erro ao atualizar categoria:', error);
    },
  });
}

// Hook para mutação de deleção de categoria
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CategoriesAPI.deleteCategory(id),
    onSuccess: () => {
      // Invalidar queries relacionadas a categorias
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.summary({}) });
    },
    onError: (error) => {
      console.error('Erro ao deletar categoria:', error);
    },
  });
}

// Hook para mutação de toggle de status ativo da categoria
export function useToggleCategoryActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      CategoriesAPI.toggleCategoryActive(id, active),
    onSuccess: (updatedCategory, variables) => {
      // Atualizar cache da categoria específica
      queryClient.setQueryData(
        categoryKeys.detail(variables.id),
        updatedCategory
      );

      // Invalidar listas e resumo
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.summary({}) });
    },
    onError: (error) => {
      console.error('Erro ao alterar status da categoria:', error);
    },
  });
}

// Hook para mutação de criação de regra de categoria
export function useCreateCategoryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleData: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) =>
      CategoriesAPI.createCategoryRule(ruleData),
    onSuccess: () => {
      // Invalidar queries de regras
      queryClient.invalidateQueries({ queryKey: categoryKeys.rules({}) });
    },
    onError: (error) => {
      console.error('Erro ao criar regra de categoria:', error);
    },
  });
}

// Hook para mutação de atualização de regra de categoria
export function useUpdateCategoryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...ruleData }: { id: string } & Partial<Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>>) =>
      CategoriesAPI.updateCategoryRule(id, ruleData),
    onSuccess: (updatedRule, variables) => {
      // Atualizar cache da regra específica
      queryClient.setQueryData(
        categoryKeys.rule(variables.id),
        updatedRule
      );

      // Invalidar listas de regras
      queryClient.invalidateQueries({ queryKey: categoryKeys.rules({}) });
    },
    onError: (error) => {
      console.error('Erro ao atualizar regra de categoria:', error);
    },
  });
}

// Hook para mutação de deleção de regra de categoria
export function useDeleteCategoryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CategoriesAPI.deleteCategoryRule(id),
    onSuccess: () => {
      // Invalidar queries de regras
      queryClient.invalidateQueries({ queryKey: categoryKeys.rules({}) });
    },
    onError: (error) => {
      console.error('Erro ao deletar regra de categoria:', error);
    },
  });
}

// Hook para mutação de toggle de status ativo da regra de categoria
export function useToggleCategoryRuleActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      CategoriesAPI.toggleCategoryRuleActive(id, isActive),
    onSuccess: (updatedRule, variables) => {
      // Atualizar cache da regra específica
      queryClient.setQueryData(
        categoryKeys.rule(variables.id),
        updatedRule
      );

      // Invalidar listas de regras
      queryClient.invalidateQueries({ queryKey: categoryKeys.rules({}) });
    },
    onError: (error) => {
      console.error('Erro ao alterar status da regra de categoria:', error);
    },
  });
}

// Hook combinado para operações comuns de categorias
export function useCategoriesOperations(filters: CategoryFilters = {}) {
  const categoriesQuery = useCategories(filters);
  const summaryQuery = useCategoriesSummary(filters);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const toggleCategoryActive = useToggleCategoryActive();

  return {
    // Queries
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading || summaryQuery.isLoading,
    error: categoriesQuery.error || summaryQuery.error,
    summary: summaryQuery.data,
    refetch: () => {
      categoriesQuery.refetch();
      summaryQuery.refetch();
    },

    // Mutations
    createCategory: createCategory.mutate,
    updateCategory: updateCategory.mutate,
    deleteCategory: deleteCategory.mutate,
    toggleCategoryActive: toggleCategoryActive.mutate,

    // Estados de loading das mutações
    isCreating: createCategory.isPending,
    isUpdating: updateCategory.isPending,
    isDeleting: deleteCategory.isPending,
    isToggling: toggleCategoryActive.isPending,
  };
}