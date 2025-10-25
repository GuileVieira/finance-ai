'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { TransactionsAPI } from '@/lib/api/transactions';
import { useToast } from '@/hooks/use-toast';

interface TransactionRule {
  id: string;
  pattern: string;
  categoryId: string;
  categoryName: string;
  confidence: number;
  examples: string[];
  active: boolean;
  createdAt: string;
  applicationCount: number;
}

interface GroupOperation {
  type: 'merge-categories' | 'create-rule' | 'apply-rule';
  targetCategoryId?: string;
  pattern?: string;
}

interface UseTransactionGroupsOptions {
  companyId: string;
}

export function useTransactionGroups({ companyId }: UseTransactionGroupsOptions) {
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [isGroupMode, setIsGroupMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar regras existentes
  const { data: rules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['transaction-rules', companyId],
    queryFn: () => fetch(`/api/transaction-rules?companyId=${companyId}`).then(res => res.json()),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!companyId,
  });

  // Mutação para mesclar categorias
  const mergeCategoriesMutation = useMutation({
    mutationFn: async ({ transactionIds, targetCategoryId }: {
      transactionIds: string[];
      targetCategoryId: string;
    }) => {
      const response = await fetch('/api/transactions/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds,
          updates: { categoryId: targetCategoryId }
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao mesclar categorias');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Categorias Mescladas',
        description: `${variables.transactionIds.length} transações atualizadas`,
      });

      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-stats'] });

      // Limpar seleção
      setSelectedTransactions(new Set());
      setIsGroupMode(false);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao Mesclar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  // Mutação para criar regra
  const createRuleMutation = useMutation({
    mutationFn: async ({ pattern, categoryId, examples }: {
      pattern: string;
      categoryId: string;
      examples: string[];
    }) => {
      const response = await fetch('/api/transaction-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          pattern,
          categoryId,
          examples,
          confidence: 0.8,
          active: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar regra');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Regra Criada',
        description: 'Nova regra de categorização criada com sucesso',
      });

      // Invalidar cache de regras
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });

      // Limpar seleção
      setSelectedTransactions(new Set());
      setIsGroupMode(false);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao Criar Regra',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  // Função para alternar seleção de transação
  const toggleTransactionSelection = useCallback((transactionId: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
        if (newSet.size === 0) {
          setIsGroupMode(false);
        }
      } else {
        newSet.add(transactionId);
        if (newSet.size === 1) {
          setIsGroupMode(true);
        }
      }
      return newSet;
    });
  }, []);

  // Função para selecionar todas as transações visíveis
  const selectAllVisible = useCallback((transactionIds: string[]) => {
    setSelectedTransactions(new Set(transactionIds));
    setIsGroupMode(transactionIds.length > 0);
  }, []);

  // Função para limpar seleção
  const clearSelection = useCallback(() => {
    setSelectedTransactions(new Set());
    setIsGroupMode(false);
  }, []);

  // Função para mesclar categorias
  const mergeCategories = useCallback((targetCategoryId: string) => {
    if (selectedTransactions.size === 0) {
      toast({
        title: 'Nenhuma Transação Selecionada',
        description: 'Selecione pelo menos uma transação para mesclar categorias',
        variant: 'destructive',
      });
      return;
    }

    mergeCategoriesMutation.mutate({
      transactionIds: Array.from(selectedTransactions),
      targetCategoryId,
    });
  }, [selectedTransactions, mergeCategoriesMutation, toast]);

  // Função para criar regra de categorização
  const createCategorizationRule = useCallback((transactions: any[]) => {
    if (transactions.length === 0) {
      toast({
        title: 'Nenhuma Transação Selecionada',
        description: 'Selecione transações para criar uma regra',
        variant: 'destructive',
      });
      return;
    }

    // Extrair padrões das descrições
    const descriptions = transactions.map(t => t.description);
    const examples = descriptions.slice(0, 5); // Limitar a 5 exemplos

    // Criar padrão simples (pode ser melhorado com algoritmo mais sofisticado)
    const patterns = descriptions.map(desc => desc.toLowerCase());
    const commonWords = findCommonWords(patterns);
    const pattern = commonWords.length > 0 ? commonWords.join(' ') : patterns[0];

    // Usar a categoria da primeira transação como padrão
    const categoryId = transactions[0].categoryId;
    const categoryName = transactions[0].categoryName;

    if (!categoryId) {
      toast({
        title: 'Sem Categoria de Referência',
        description: 'As transações selecionadas não têm uma categoria definida',
        variant: 'destructive',
      });
      return;
    }

    createRuleMutation.mutate({
      pattern,
      categoryId,
      examples,
    });
  }, [createRuleMutation, toast]);

  // Verificar se transações selecionadas são compatíveis para mesclagem
  const canMergeCategories = useMemo(() => {
    return selectedTransactions.size > 1;
  }, [selectedTransactions.size]);

  // Verificar se pode criar regra
  const canCreateRule = useMemo(() => {
    return selectedTransactions.size >= 2; // Precisa de pelo menos 2 para criar padrão
  }, [selectedTransactions.size]);

  // Gerar estatísticas da seleção
  const selectionStats = useMemo(() => {
    return {
      total: selectedTransactions.size,
      canMerge: canMergeCategories,
      canCreateRule: canCreateRule,
    };
  }, [selectedTransactions.size, canMergeCategories, canCreateRule]);

  return {
    // Estado
    selectedTransactions,
    isGroupMode,
    selectionStats,

    // Regras
    rules: rules?.data || [],
    isLoadingRules,

    // Estados de loading
    isMergingCategories: mergeCategoriesMutation.isPending,
    isCreatingRule: createRuleMutation.isPending,

    // Ações
    toggleTransactionSelection,
    selectAllVisible,
    clearSelection,
    mergeCategories,
    createCategorizationRule,

    // Utilitários
    isTransactionSelected: (id: string) => selectedTransactions.has(id),
  };
}

// Função auxiliar para encontrar palavras comuns
function findCommonWords(strings: string[]): string[] {
  if (strings.length === 0) return [];

  // Dividir strings em palavras e contar frequência
  const wordFrequency: Record<string, number> = {};

  strings.forEach(str => {
    const words = str.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remover caracteres especiais
      .split(/\s+/) // Dividir por espaços
      .filter(word => word.length > 2); // Ignorar palavras muito curtas

    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });

  // Retornar palavras que aparecem em pelo menos 70% das strings
  const threshold = Math.ceil(strings.length * 0.7);
  return Object.entries(wordFrequency)
    .filter(([word, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1]) // Ordenar por frequência
    .slice(0, 5) // Limitar a 5 palavras
    .map(([word]) => word);
}