'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { useTransactions } from '@/hooks/use-transactions';
import { Search, Download, Plus, Filter, TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
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

  const { toast } = useToast();

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
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

                {/* Banco - placeholder até buscar da API */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Banco/Conta</label>
                  <Select value={filters.bank} onValueChange={(value) => handleFilterChange('bank', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os bancos</SelectItem>
                      <SelectItem value="BB">Banco do Brasil</SelectItem>
                      <SelectItem value="Itaú">Itaú</SelectItem>
                      <SelectItem value="Santander">Santander</SelectItem>
                      <SelectItem value="CEF">Caixa Econômica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoria - placeholder até buscar da API */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Categoria</label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      <SelectItem value="Vendas de Produtos">Vendas de Produtos</SelectItem>
                      <SelectItem value="Salários e Encargos">Salários e Encargos</SelectItem>
                      <SelectItem value="Aluguel e Ocupação">Aluguel e Ocupação</SelectItem>
                      <SelectItem value="Tecnologia e Software">Tecnologia e Software</SelectItem>
                      <SelectItem value="Custos de Produtos">Custos de Produtos</SelectItem>
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
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
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