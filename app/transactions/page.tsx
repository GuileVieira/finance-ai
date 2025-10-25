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
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { useTransactions } from '@/hooks/use-transactions';
import { useTransactionGroups } from '@/hooks/use-transaction-groups';
import { useAccountsForSelect } from '@/hooks/use-accounts';
import { useAllCategories } from '@/hooks/use-all-categories';
import { Search, Download, Plus, Filter, TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertCircle, CheckSquare, Square, Layers, Ruler, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCardSkeleton } from '@/components/transactions/metric-card-skeleton';
import { TableSkeleton } from '@/components/transactions/table-skeleton';

export default function TransactionsPage() {
  const [filters, setFilters] = useState({
    period: '2025-10',
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
  const { accountOptions, isLoading: isLoadingAccounts } = useAccountsForSelect();
  const { categoryOptions, isLoading: isLoadingCategories } = useAllCategories(companyId);

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
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.income || 0)}
                </div>
                <p className="text-xs text-gray-500">
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
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  - {formatCurrency(stats?.expenses || 0)}
                </div>
                <p className="text-xs text-gray-500">
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
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(stats?.total || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(stats?.total || 0)}
                </div>
                <p className="text-xs text-gray-500">
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
                  {isRefetching && <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />}
                  <Filter className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : (pagination?.total || 0)}
                </div>
                <p className="text-xs text-gray-500">
                  {isLoading ? '...' : `${totalPages} página(s)`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mensagem de Erro */}
        {hasError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">
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
                  <label className="text-sm font-medium text-gray-700">Buscar transação</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  <label className="text-sm font-medium text-gray-700">Período</label>
                  <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-10">Outubro/2025</SelectItem>
                      <SelectItem value="2025-09">Setembro/2025</SelectItem>
                      <SelectItem value="2025-08">Agosto/2025</SelectItem>
                      <SelectItem value="2025-07">Julho/2025</SelectItem>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Banco - dados reais da API */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Banco/Conta</label>
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
                  <label className="text-sm font-medium text-gray-700">Categoria</label>
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
                  <label className="text-sm font-medium text-gray-700">Tipo de Transação</label>
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
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
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
              <div className="border-t border-blue-200 pt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-blue-900 mb-2 block">
                      Mesmar para a categoria:
                    </label>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={setSelectedCategoryId}
                      disabled={isMergingCategories || isCreatingRule}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleMergeCategories}
                      disabled={!selectedCategoryId || !selectionStats.canMerge || isMergingCategories || isCreatingRule}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      {isMergingCategories ? 'Mesclando...' : 'Aplicar a Todas'}
                    </Button>
                  </div>
                </div>

                {/* Análise das categorias selecionadas */}
                <div className="mt-3 p-2 bg-blue-100/50 rounded text-xs text-blue-800">
                  <span className="font-medium">Análise:</span> {getCategoryAnalysis()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma transação encontrada</h3>
                <p className="text-gray-500 mb-4">
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
                      className={`hover:bg-muted/50 ${isTransactionSelected(transaction.id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <TableCell className="w-12">
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
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {transaction.categoryName || 'Sem categoria'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {transaction.bankName || 'Não identificado'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
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
                  <p className="text-sm text-gray-600">
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

        {/* Insights */}
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-600">💡</span>
              <p className="text-sm text-emerald-800">
                <strong>Insights:</strong> 94% de acurácia na categorização automática • Salários representam 51.8% dos custos fixos • 47 categorias financeiras mapeadas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </LayoutWrapper>
  );
}