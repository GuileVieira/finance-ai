'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { useTransactions } from '@/hooks/use-transactions';
import { useTransactionGroups } from '@/hooks/use-transaction-groups';
import { useAccountsForSelect } from '@/hooks/use-accounts';
import { useAllCategories } from '@/hooks/use-all-categories';
import { Search, Download, Plus, Filter, TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertCircle, CheckSquare, Square, Layers, Ruler, X, Edit, Upload, FileUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCardSkeleton } from '@/components/transactions/metric-card-skeleton';
import { TableSkeleton } from '@/components/transactions/table-skeleton';
import { CategoryRuleDialog } from '@/components/transactions/category-rule-dialog';
import { useAvailablePeriods } from '@/hooks/use-periods';
import { TransactionDetailsDialog } from '@/components/dashboard/transaction-details-dialog';

export default function TransactionsPage() {
  const [filters, setFilters] = useState({
    period: 'all',
    bank: 'all',
    category: 'all',
    type: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  // ID da empresa padrão (poderia vir de contexto ou API)
  const [companyId] = useState('f5733d9a-85ec-48da-aff0-4d6add7ea89b');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const { toast } = useToast();

  // Hooks para buscar dados dos filtros
  const { accountOptions, isLoading: isLoadingAccounts } = useAccountsForSelect(companyId);
  const { categoryOptions, isLoading: isLoadingCategories } = useAllCategories(companyId);
  const { data: periodsResponse, isLoading: isLoadingPeriods } = useAvailablePeriods({ companyId });
  const periods = periodsResponse?.periods ?? [];

  // Hook para gerenciar grupos de transações
  const {
    selectedTransactions,
    isGroupMode,
    selectionStats,
    isMergingCategories,
    isCreatingRule,
    toggleTransactionSelection,
    selectAllVisible,
    clearSelection,
    mergeCategories,
    createCategorizationRule,
    isTransactionSelected,
  } = useTransactionGroups({ companyId });

  // Limpar seleção de categoria quando não há transações selecionadas
  useEffect(() => {
    if (!isGroupMode) {
      setSelectedCategoryId('');
    }
  }, [isGroupMode]);

  useEffect(() => {
    if (isLoadingPeriods) return;

    if (periods.length === 0) {
      setFilters(prev => {
        if (prev.period === 'all') return prev;
        return { ...prev, period: 'all' };
      });
      return;
    }

    setFilters(prev => {
      if (prev.period !== 'all' && periods.some(period => period.id === prev.period)) {
        return prev;
      }
      if (prev.period === periods[0]?.id) return prev;
      return { ...prev, period: periods[0].id };
    });
  }, [isLoadingPeriods, periods.length, periods[0]?.id]);

  // Estado para edição de transação individual
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [singleTransactionCategory, setSingleTransactionCategory] = useState<string>('');

  // Estado para edição inline da categoria
  const [inlineEditingTransaction, setInlineEditingTransaction] = useState<string | null>(null);
  const [inlineEditingCategory, setInlineEditingCategory] = useState<string>('');

  // Estado para o diálogo de regras
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [transactionForRule, setTransactionForRule] = useState<{
    id: string;
    description: string;
    amount: number;
    categoryName?: string;
    selectedCategoryId: string;
  } | null>(null);

  // Filtros com paginação
  const filtersWithPagination = useMemo(() => ({
    ...filters,
    page: currentPage,
    limit: itemsPerPage,
  }), [filters, currentPage, itemsPerPage]);

  // Usar hook do TanStack Query para buscar transações
  const {
    transactions,
    stats,
    pagination,
    isLoading,
    isLoadingStats,
    isRefetching,
    error,
    statsError,
    refetch,
    isEmpty,
    hasError,
    prefetchNextPage,
    updateTransactionCategory,
  } = useTransactions(filtersWithPagination, {
    enabled: true,
    refetchInterval: 1000 * 60 * 5, // Atualizar a cada 5 minutos
  });

  // Pré-carregar próxima página quando se aproximar do final
  useEffect(() => {
    const threshold = 0.8; // 80% da página atual
    const currentProgress = (pagination.page * 50) / pagination.total;
    if (currentProgress >= threshold && pagination.hasNextPage) {
      prefetchNextPage();
    }
  }, [pagination.page, pagination.total, pagination.hasNextPage, prefetchNextPage]);

  // Transações paginadas (a API já retorna paginada)
  const paginatedTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  // Total de páginas
  const totalPages = pagination.totalPages;

  const handleFilterChange = (key: string, value: string) => {
    console.log('🔄 [UI-FILTERS] Mudando filtro:', key, '=', value);
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset para primeira página quando filtros mudam
  };

  const handleExport = () => {
    toast({
      title: 'Exportação Iniciada',
      description: 'Baixando transações em formato CSV...',
    });
  };

  const handleAddTransaction = () => {
    toast({
      title: 'Adicionar Transação',
      description: 'Abrindo formulário para nova transação...',
    });
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Atualizando Dados',
      description: 'Buscando transações mais recentes...',
    });
  };

  const handleSelectAll = () => {
    const visibleTransactionIds = transactions.map(t => t.id);
    selectAllVisible(visibleTransactionIds);
  };

  const handleCreateRule = () => {
    const selectedTransactionsData = transactions.filter(t => selectedTransactions.has(t.id));
    createCategorizationRule(selectedTransactionsData);
  };

  const handleMergeCategories = () => {
    if (!selectedCategoryId) {
      toast({
        title: 'Nenhuma Categoria Selecionada',
        description: 'Selecione uma categoria de destino para mesclar',
        variant: 'destructive',
      });
      return;
    }

    mergeCategories(selectedCategoryId);
    // Limpar seleção de categoria após mesclar
    setSelectedCategoryId('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Função para lidar com a confirmação do diálogo de regras
  const handleRuleDialogConfirm = async (options: {
    createRule: boolean;
    applyRetroactive: boolean;
    rulePattern: string;
    ruleType: string;
  }) => {
    if (!transactionForRule) return;

    try {
      // Atualizar transação
      const response = await fetch(`/api/transactions/${transactionForRule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryId: transactionForRule.selectedCategoryId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar transação');
      }

      let ruleCreated = false;

      // Criar regra se solicitado
      if (options.createRule) {
        const ruleResponse = await fetch('/api/transaction-rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId,
            categoryId: transactionForRule.selectedCategoryId,
            rulePattern: options.rulePattern,
            ruleType: options.ruleType,
            confidenceScore: 0.9,
          }),
        });

        const ruleResult = await ruleResponse.json();

        if (ruleResult.success) {
          ruleCreated = true;

          // Aplicar regra retroativamente se solicitado
          if (options.applyRetroactive && ruleResult.data?.id) {
            await fetch('/api/transaction-rules/apply-retroactive', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                companyId,
                ruleId: ruleResult.data.id,
                applyToAll: true,
              }),
            });
          }
        }
      }

      // Mensagem de sucesso baseada no que foi feito
      if (ruleCreated) {
        if (options.applyRetroactive) {
          toast({
            title: 'Regra Criada e Aplicada',
            description: `Categoria alterada e regra aplicada retroativamente para "${transactionForRule.description}"`,
          });
        } else {
          toast({
            title: 'Regra Criada',
            description: `Categoria alterada e regra criada para "${transactionForRule.description}"`,
          });
        }
      } else {
        toast({
          title: 'Transação Atualizada',
          description: `Categoria alterada para "${transactionForRule.categoryName}"`,
        });
      }

      // Fechar card de edição se estiver aberto
      if (editingTransaction === transactionForRule.id) {
        setEditingTransaction(null);
        setSingleTransactionCategory('');
      }

      // Recarregar dados
      refetch();

    } catch (error) {
      console.error('❌ Erro ao processar atualização:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao processar atualização',
        variant: 'destructive',
      });
    }
  };

  // Função para abrir diálogo de regras
  const openRuleDialog = (transaction: {
    id: string;
    description: string;
    amount: number;
    categoryName?: string;
  }, categoryId: string, categoryName?: string) => {
    setTransactionForRule({
      ...transaction,
      selectedCategoryId: categoryId,
      categoryName,
    });
    setRuleDialogOpen(true);
  };

  // Função para atualizar transação individual (agora abre diálogo)
  const handleUpdateSingleTransaction = (transactionId: string, categoryId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
      toast({
        title: 'Erro',
        description: 'Transação não encontrada',
        variant: 'destructive',
      });
      return;
    }

    const category = categoryOptions.find(c => c.value === categoryId);
    openRuleDialog(transaction, categoryId, category?.label);
  };

  // Função para atualizar categoria inline (agora abre diálogo)
  const handleInlineUpdateCategory = (transactionId: string, categoryId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
      toast({
        title: 'Erro',
        description: 'Transação não encontrada',
        variant: 'destructive',
      });
      return;
    }

    const category = categoryOptions.find(c => c.value === categoryId);
    openRuleDialog(transaction, categoryId, category?.label);

    // Fechar edição inline
    setInlineEditingTransaction(null);
    setInlineEditingCategory('');
  };

  const getCategoryAnalysis = () => {
    const selectedTransactionsData = transactions.filter(t => selectedTransactions.has(t.id));

    if (selectedTransactionsData.length === 0) return 'Nenhuma transação selecionada';

    const categoryMap = new Map<string, number>();
    let totalAmount = 0;

    selectedTransactionsData.forEach(transaction => {
      const categoryName = transaction.categoryName || 'Sem categoria';
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
      totalAmount += Math.abs(parseFloat(transaction.amount));
    });

    const categories = Array.from(categoryMap.entries());

    if (categories.length === 1) {
      const [name, count] = categories[0];
      return `Todas as ${count} transações já são "${name}" (Total: R$ ${totalAmount.toFixed(2)})`;
    }

    const sortedCategories = categories.sort((a, b) => b[1] - a[1]);
    const mostCommon = sortedCategories[0];

    return `${categories.length} categorias diferentes. Mais comum: "${mostCommon[0]}" (${mostCommon[1]} transações). Total: R$ ${totalAmount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Encontrar transação selecionada para mostrar detalhes
  const selectedTransaction = transactions.find(t => t.id === editingTransaction);

  // Verificar se é a primeira vez (sem dados no sistema)
  const isFirstTimeUser = isEmpty && !isLoading && filters.search === '' && filters.category === 'all' && filters.type === 'all' && filters.bank === 'all';

  // Se for primeira vez (sem dados), mostrar tela de boas-vindas
  if (isFirstTimeUser) {
    return (
      <LayoutWrapper>
        <div className="space-y-6">
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="rounded-full bg-muted p-6 mb-6">
                <FileUp className="h-12 w-12 text-muted-foreground" />
              </div>

              <h3 className="text-xl font-semibold mb-2">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Importe seus extratos bancários no formato OFX para começar a visualizar e categorizar suas transações.
              </p>

              <Link href="/upload">
                <Button size="lg" className="gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Extratos OFX
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="space-y-6">

        {/* Cards Métricos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card de Receitas */}
          {isLoadingStats ? (
            <MetricCardSkeleton />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {formatCurrency(stats?.income || 0)}
                </div>
                <p className="text-xs text-muted-foreground/70">
                  {stats?.incomeCount || 0} transações
                </p>
              </CardContent>
            </Card>
          )}

          {/* Card de Despesas */}
          {isLoadingStats ? (
            <MetricCardSkeleton />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  - {formatCurrency(stats?.expenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground/70">
                  {stats?.expenseCount || 0} transações
                </p>
              </CardContent>
            </Card>
          )}

          {/* Card de Saldo */}
          {isLoadingStats ? (
            <MetricCardSkeleton />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(stats?.total || 0) >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {formatCurrency(stats?.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground/70">
                  {stats?.transactionCount || 0} total
                </p>
              </CardContent>
            </Card>
          )}

          {/* Card de Transações */}
          {isLoading ? (
            <MetricCardSkeleton />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transações</CardTitle>
                <div className="flex items-center space-x-2">
                  {isRefetching && <RefreshCw className="h-4 w-4 text-info animate-spin" />}
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {isLoading ? '...' : (pagination?.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground/70">
                  {isLoading ? '...' : `${totalPages} página(s)`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mensagem de Erro */}
        {hasError && (
          <Card className="border-destructive/20 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">
                  <strong>Erro ao carregar dados:</strong> {error?.message || statsError?.message || 'Erro desconhecido'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="ml-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Busca */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Buscar transação</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      placeholder="Digite descrição..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Período */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Período</label>
                  <Select
                    value={filters.period}
                    onValueChange={(value) => handleFilterChange('period', value)}
                    disabled={isLoadingPeriods}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingPeriods ? 'Carregando períodos...' : 'Selecione o período'} />
                    </SelectTrigger>
                    <SelectContent>
                      {!isLoadingPeriods && periods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                          {period.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="all">Todos os períodos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Banco - dados reais da API */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Banco/Conta</label>
                  <Select value={filters.bank} onValueChange={(value) => handleFilterChange('bank', value)} disabled={isLoadingAccounts}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAccounts ? "Carregando..." : "Selecione o banco"} />
                    </SelectTrigger>
                    <SelectContent>
                      {accountOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoria - dados reais da API */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Categoria</label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)} disabled={isLoadingCategories}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCategories ? "Carregando..." : "Selecione a categoria"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tipo de Transação</label>
                  <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="income">Apenas Receitas</SelectItem>
                      <SelectItem value="expense">Apenas Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barra de Ações Flutuante (quando há seleção) */}
        {isGroupMode && (
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <span className="font-medium text-foreground">
                      {selectionStats.total} transação{selectionStats.total !== 1 ? 'ões' : ''} selecionada{selectionStats.total !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      disabled={isMergingCategories || isCreatingRule}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCreateRule}
                    disabled={!selectionStats.canCreateRule || isMergingCategories || isCreatingRule}
                  >
                    <Ruler className="h-4 w-4 mr-2" />
                    {isCreatingRule ? 'Criando...' : 'Criar Regra'}
                  </Button>
                </div>
              </div>

              {/* Seletor de Categoria para Mesclar */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Mover para a categoria:
                    </label>
                    <Combobox
                      options={categoryOptions}
                      value={selectedCategoryId}
                      onValueChange={setSelectedCategoryId}
                      disabled={isMergingCategories || isCreatingRule}
                      placeholder="Buscar categoria..."
                      searchPlaceholder="Digite o nome da categoria..."
                      emptyMessage="Nenhuma categoria encontrada"
                    />
                  </div>

                  <div className="flex items-center" style={{ paddingTop: '24px' }}>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleMergeCategories}
                      disabled={!selectedCategoryId || !selectionStats.canMerge || isMergingCategories || isCreatingRule}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      {isMergingCategories ? 'Mesclando...' : 'Aplicar a Todas'}
                    </Button>
                  </div>
                </div>

                {/* Análise das categorias selecionadas */}
                <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  <span className="font-medium">Análise:</span> {getCategoryAnalysis()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Modal de Detalhes da Transação (Substitui o card antigo) */}
        <TransactionDetailsDialog
          open={!!editingTransaction && !isGroupMode}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTransaction(null);
            }
          }}
          transaction={selectedTransaction as unknown as import("@/lib/types").Transaction}
          onCategoryChange={async (transactionId, categoryId) => {
            try {
              await updateTransactionCategory.mutateAsync({ transactionId, categoryId });
              toast({
                title: "Categoria atualizada",
                description: "A categoria da transação foi alterada com sucesso."
              });
            } catch (e) {
              toast({
                title: "Erro",
                description: "Erro ao atualizar categoria.",
                variant: "destructive"
              });
            }
          }}
        />

        {/* Tabela de Transações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transações</CardTitle>
              <CardDescription>
                {isLoading ? 'Carregando...' : `${pagination.total} transações encontradas`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={10} columns={5} />
            ) : isEmpty ? (
              <div className="text-center py-12">
                <Filter className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma transação encontrada</h3>
                <p className="text-muted-foreground/70 mb-4">
                  Tente ajustar os filtros ou verificar outro período.
                </p>
                <Button variant="outline" onClick={() => setFilters({
                  period: '2025-10',
                  bank: 'all',
                  category: 'all',
                  type: 'all',
                  search: ''
                })}>
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={transactions.length > 0 && transactions.every(t => isTransactionSelected(t.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleSelectAll();
                          } else {
                            clearSelection();
                          }
                        }}
                        aria-label="Selecionar todas"
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className={`hover:bg-muted/50 cursor-pointer ${isTransactionSelected(transaction.id) ? 'bg-info/10' : ''} ${editingTransaction === transaction.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => {
                        if (!isGroupMode && inlineEditingTransaction !== transaction.id) {
                          setEditingTransaction(editingTransaction === transaction.id ? null : transaction.id);
                          setSingleTransactionCategory(transaction.categoryId || '');
                        }
                      }}
                    >
                      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isTransactionSelected(transaction.id)}
                          onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                          aria-label={`Selecionar transação ${transaction.description}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDate(transaction.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium text-foreground">{transaction.name || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48 lg:max-w-64">
                          {/* Descrição principal */}
                          <p className="font-medium text-foreground truncate" title={transaction.description}>
                            {transaction.description}
                          </p>

                          {/* Memo abaixo da descrição com fonte menor */}
                          {transaction.memo ? (
                            <p className="text-sm text-muted-foreground truncate mt-1" title={transaction.memo}>
                              * {transaction.memo}
                            </p>
                          ) : (
                            <div className="h-4 mt-1">
                              {/* Espaço reservado sutil quando não há memo */}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {inlineEditingTransaction === transaction.id ? (
                          <div className="flex items-center gap-2">
                            <Combobox
                              options={categoryOptions}
                              value={inlineEditingCategory}
                              onValueChange={setInlineEditingCategory}
                              placeholder="Selecione..."
                              searchPlaceholder="Buscar categoria..."
                              emptyMessage="Nenhuma categoria"
                              className="min-w-0"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (inlineEditingCategory) {
                                  handleInlineUpdateCategory(transaction.id, inlineEditingCategory);
                                }
                              }}
                              disabled={!inlineEditingCategory}
                              className="h-6 px-2 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              ✓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setInlineEditingTransaction(null);
                                setInlineEditingCategory('');
                              }}
                              className="h-6 px-2 text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-secondary/80 capitalize"
                            onClick={() => {
                              if (!isGroupMode) {
                                setInlineEditingTransaction(transaction.id);
                                setInlineEditingCategory(transaction.categoryId || '');
                              }
                            }}
                          >
                            {transaction.categoryName || 'Sem categoria'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {transaction.bankName || 'Não identificado'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${transaction.amount > 0 ? 'text-emerald-500' : 'text-destructive'
                        }`}>
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Paginação */}
            {totalPages > 1 && (
              <>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * itemsPerPage) + 1} a {Math.min(pagination.page * itemsPerPage, pagination.total)} de {pagination.total} transações
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPreviousPage}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-3 py-1 text-sm">
                      Página {pagination.page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={!pagination.hasNextPage}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      </div >

      {/* Diálogo de configuração de regras */}
      {
        transactionForRule && (
          <CategoryRuleDialog
            open={ruleDialogOpen}
            onOpenChange={setRuleDialogOpen}
            transaction={{
              id: transactionForRule.id,
              description: transactionForRule.description,
              amount: transactionForRule.amount,
              categoryName: transactionForRule.categoryName,
            }}
            selectedCategory={{
              id: transactionForRule.selectedCategoryId,
              name: transactionForRule.categoryName || '',
            }}
            companyId={companyId}
            onConfirm={handleRuleDialogConfirm}
          />
        )
      }

      <Toaster />
    </LayoutWrapper >
  );
}
