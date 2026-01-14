'use client';

import { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { CategoryCard } from '@/components/categories/category-card';
import { AutoRulesTable } from '@/components/categories/auto-rules-table';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { CategoryRuleDialog } from '@/components/categories/category-rule-dialog';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Plus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TransactionsAPI } from '@/lib/api/transactions';
import { CategoryWithStats, CategoryRule, CategoryRuleDB } from '@/lib/api/categories';
import {
  useCategoriesWithTransactions,
  useCategories,
  useCategoryRules,
  useCreateCategoryRule,
  useUpdateCategoryRule,
  useDeleteCategoryRule,
  useToggleCategoryActive,
  useToggleCategoryRuleActive
} from '@/hooks/use-categories';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategoriesOperations
} from '@/hooks/use-categories';
import { CategoryType } from '@/lib/api/categories';
import { FilterBar } from '@/components/shared/filter-bar';
import { DashboardAPI } from '@/lib/api/dashboard';
import { DateRange } from 'react-day-picker';

// Tipos de categorias disponíveis
const categoryTypes = [
  { value: 'all', label: 'Todos', description: 'Todas as categorias cadastradas.' },
  { value: 'revenue', label: 'Receitas', description: 'Entradas de dinheiro (vendas, rendimentos).' },
  { value: 'variable_cost', label: 'Custos Variáveis', description: 'Gastos que mudam conforme você vende mais ou menos (ex: impostos, comissões).' },
  { value: 'fixed_cost', label: 'Custos Fixos', description: 'Gastos que você tem todo mês, vendendo ou não (ex: aluguel, salários).' },
  { value: 'non_operating', label: 'Não Operacionais', description: 'Movimentações que não fazem parte da operação (ex: empréstimos, dividendos).' },
];

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<CategoryType | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CategoryRule | undefined>();
  const [viewingCategory, setViewingCategory] = useState<CategoryWithStats | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Array<{
    id: string;
    description: string | null;
    amount: number;
    type: 'credit' | 'debit';
    transactionDate: string | null;
    accountName?: string | null;
    bankName?: string | null;
  }>>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const transactionsLimit = 15;
  const { toast } = useToast();

  // Estado do filtro unificado
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filters, setFilters] = useState<{
    period: string;
    accountId: string;
    companyId: string;
    startDate?: string;
    endDate?: string;
  }>({
    period: 'this_month',
    accountId: 'all',
    companyId: 'all',
    startDate: undefined,
    endDate: undefined
  });

  // Atualizar datas quando o período muda
  useEffect(() => {
    if (filters.period === 'custom') return;
    const { startDate, endDate } = DashboardAPI.convertPeriodToDates(filters.period);

    // Evitar atualização desnecessária se não mudou
    if (filters.startDate === startDate && filters.endDate === endDate) return;

    setFilters(prev => ({ ...prev, startDate, endDate: endDate || undefined }));
  }, [filters.period]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      if (key === 'period' && value !== 'custom') {
        const { startDate, endDate } = DashboardAPI.convertPeriodToDates(value);
        return { ...prev, [key]: value, startDate, endDate: endDate || undefined };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      setFilters(prev => ({
        ...prev,
        period: 'custom',
        startDate: range.from ? range.from.toISOString().split('T')[0] : undefined,
        endDate: range.to ? range.to.toISOString().split('T')[0] : (range.from ? range.from.toISOString().split('T')[0] : undefined)
      }));
    }
  };

  const handleRefresh = () => {
    refetch();
    if (refetchRules) refetchRules();
  };

  // Buscar categorias com transações usando TanStack Query
  const {
    data: categories = [],
    isLoading,
    error,
    refetch
  } = useCategories({
    type: activeTab !== 'all' ? activeTab : undefined,
    includeStats: true,
    sortBy: 'totalAmount',
    sortOrder: 'desc',
    startDate: filters.startDate,
    endDate: filters.endDate,
    accountId: filters.accountId,
    companyId: filters.companyId
  });

  // Buscar categorias e regras
  const { data: autoRules, isLoading: isLoadingRules, refetch: refetchRules } = useCategoryRules({ isActive: true });

  // Filtrar categorias zeradas (conforme solicitado)
  const displayedCategories = categories.filter(cat => (cat.transactionCount || 0) > 0);

  // Hook combinado para operações com categorias
  const categoryOps = useCategoriesOperations({
    type: activeTab !== 'all' ? activeTab : undefined,
    startDate: filters.startDate,
    endDate: filters.endDate
  });

  // Hooks para mutações de regras
  const createRule = useCreateCategoryRule();
  const updateRule = useUpdateCategoryRule();
  const deleteRule = useDeleteCategoryRule();
  const toggleRule = useToggleCategoryRuleActive();

  // Handlers para operações com categorias
  const handleCreateCategory = (categoryData: any) => {
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A criação de categorias será implementada em breve.',
    });
  };

  const handleUpdateCategory = (updatedCategory: any) => {
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A atualização de categorias será implementada em breve.',
    });
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A exclusão de categorias será implementada em breve.',
    });
  };

  const handleToggleCategory = (categoryId: string, active: boolean, categoryName: string) => {
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A alteração de status será implementada em breve.',
    });
  };

  // Handlers para operações com regras
  const handleCreateRule = (ruleData: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    createRule.mutate(ruleData, {
      onSuccess: () => {
        toast({
          title: 'Regra Criada',
          description: `${ruleData.name} foi criada com sucesso!`,
        });
        setIsRuleDialogOpen(false);
        setEditingRule(undefined);
      }
    });
  };

  const handleEditRule = (rule: CategoryRuleDB) => {
    // Transform database format to dialog format
    const dialogRule: CategoryRule = {
      id: rule.id,
      name: rule.description || `Regra para ${rule.rulePattern}`,
      description: rule.description,
      pattern: rule.rulePattern,
      categoryId: rule.categoryId,
      priority: rule.priority || 5,
      isActive: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    };
    setEditingRule(dialogRule);
    setIsRuleDialogOpen(true);
  };

  const handleUpdateRule = (ruleData: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...ruleData }, {
        onSuccess: () => {
          toast({
            title: 'Regra Atualizada',
            description: `${ruleData.name} foi atualizada com sucesso!`,
          });
          setIsRuleDialogOpen(false);
          setEditingRule(undefined);
        }
      });
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    deleteRule.mutate(ruleId, {
      onSuccess: () => {
        toast({
          title: 'Regra Excluída',
          description: 'A regra foi excluída com sucesso!',
        });
      }
    });
  };

  const handleToggleRule = (ruleId: string, isActive: boolean) => {
    toggleRule.mutate({ id: ruleId, isActive }, {
      onSuccess: () => {
        toast({
          title: `Regra ${isActive ? 'Ativada' : 'Desativada'}`,
          description: `A regra foi ${isActive ? 'ativada' : 'desativada'} com sucesso!`,
        });
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  };

  const handleViewCategory = (category: CategoryWithStats) => {
    setViewingCategory(category);
    setTransactionsPage(1);
  };

  const handlePrevTransactionsPage = () => {
    setTransactionsPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextTransactionsPage = () => {
    setTransactionsPage((prev) => Math.min(prev + 1, transactionsTotalPages));
  };

  useEffect(() => {
    if (!viewingCategory) {
      setCategoryTransactions([]);
      setTransactionsError(null);
      setTransactionsLoading(false);
      setTransactionsTotal(0);
      setTransactionsTotalPages(1);
      return;
    }

    let isCancelled = false;

    const fetchTransactions = async () => {
      setTransactionsLoading(true);
      setTransactionsError(null);

      try {
        const response = await TransactionsAPI.getTransactions({
          categoryId: viewingCategory.id,
          page: transactionsPage,
          limit: transactionsLimit,
        });

        if (isCancelled) {
          return;
        }

        const normalized = (response.transactions || []).map((transaction: any) => {
          const rawAmount = transaction.amount ?? 0;
          const numericAmount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount);
          const signedAmount = transaction.type === 'debit'
            ? -Math.abs(numericAmount)
            : Math.abs(numericAmount);

          return {
            id: transaction.id,
            description: transaction.description || transaction.rawDescription || transaction.name || null,
            amount: signedAmount,
            type: transaction.type || 'credit',
            transactionDate: transaction.transactionDate || transaction.date || null,
            accountName: transaction.accountName,
            bankName: transaction.bankName,
          };
        });

        const pagination = response.pagination || {};

        setCategoryTransactions(normalized);
        setTransactionsTotal(pagination.total || normalized.length || 0);
        setTransactionsTotalPages(pagination.totalPages || 1);
        if (pagination.page && pagination.page !== transactionsPage) {
          setTransactionsPage(pagination.page);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('❌ Erro ao buscar transações da categoria:', error);
          setTransactionsError(error instanceof Error ? error.message : 'Erro ao carregar transações');
        }
      } finally {
        if (!isCancelled) {
          setTransactionsLoading(false);
        }
      }
    };

    fetchTransactions();

    return () => {
      isCancelled = true;
    };
  }, [viewingCategory, transactionsPage, transactionsLimit]);

  // Tratamento de erros (depois de todos os hooks)
  // Não mostra erro se simplesmente não há categorias
  if (error && !error.message?.includes('fetch')) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Erro ao carregar categorias
            </h3>
            <p className="text-muted-foreground mb-4">
              {error.message}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Tentar novamente
            </Button>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="space-y-6">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Filtro por Tipo de Categoria */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 max-w-full">
            <TooltipProvider>
              {categoryTypes.map((type) => (
                <Tooltip key={type.value}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTab === type.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTab(type.value as CategoryType | 'all')}
                      disabled={isLoading}
                      className="whitespace-nowrap"
                    >
                      {type.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{type.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto flex-1 justify-end">
            <FilterBar
              period={filters.period}
              accountId={filters.accountId}
              companyId={filters.companyId}
              dateRange={dateRange}
              onPeriodChange={(value) => handleFilterChange('period', value)}
              onAccountChange={(value) => handleFilterChange('accountId', value)}
              onCompanyChange={(value) => handleFilterChange('companyId', value)}
              onDateRangeChange={handleDateRangeChange}
              onRefresh={handleRefresh}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Conteúdo Principal */}
        {/* Cards de Categorias */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {isLoading ? 'Carregando categorias...' :
                categoryOps.summary ?
                  `Baseado em ${categoryOps.summary.totalCategories} categorias financeiras (${displayedCategories.length} com movimentações)` :
                  `Baseado em ${displayedCategories.length} categorias com movimentações`}
            </h2>
            <Button onClick={() => setIsDialogOpen(true)} disabled={categoryOps.isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando categorias...</p>
            </div>
          ) : displayedCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {activeTab === 'all' ?
                  'Nenhuma categoria encontrada. Crie sua primeira categoria!' :
                  'Nenhuma categoria encontrada para este filtro.'}
              </p>
              {activeTab === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)} disabled={categoryOps.isCreating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Categoria
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedCategories.map((category: CategoryWithStats) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  showViewButton
                  onView={() => handleViewCategory(category)}
                  showEditButton={true}
                  loading={categoryOps.isToggling || categoryOps.isDeleting}
                  onRules={() => {
                    toast({
                      title: 'Regras Temporariamente Indisponível',
                      description: 'Funcionalidade de regras está em manutenção',
                    });
                  }}
                  onToggle={(active) => {
                    handleToggleCategory(category.id, active, category.name);
                  }}
                  onUpdate={(updatedCategory) => {
                    handleUpdateCategory(updatedCategory);
                  }}
                  onDelete={() => {
                    handleDeleteCategory(category.id, category.name);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tabela de Regras Automáticas */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Regras Automáticas Inteligentes
              {autoRules && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({autoRules.length} regras ativas)
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingRule(undefined);
                  setIsRuleDialogOpen(true);
                }}
                disabled={createRule.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchRules()}
                disabled={isLoadingRules}
              >
                <Settings className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          {isLoadingRules ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando regras...</p>
            </div>
          ) : autoRules && autoRules.length > 0 ? (
            <AutoRulesTable
              rules={autoRules}
              onToggle={handleToggleRule}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              loading={createRule.isPending || updateRule.isPending || deleteRule.isPending || toggleRule.isPending}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                Nenhuma regra automática encontrada.
              </p>
            </div>
          )}
        </div>

        {/* Insights Baseados em Dados Reais */}
        {categoryOps.summary && (
          <div className="mt-6 bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">💡 Insights Baseados nos Dados Reais:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Total de categorias: {categoryOps.summary.totalCategories} ({categoryOps.summary.activeCategories} ativas)</li>
              <li>• Distribuição por tipo:</li>
              <li>  - Receitas: {categoryOps.summary.categoriesByType.revenue}</li>
              <li>  - Custos Variáveis: {categoryOps.summary.categoriesByType.variable_cost}</li>
              <li>  - Custos Fixos: {categoryOps.summary.categoriesByType.fixed_cost}</li>
              <li>  - Não Operacionais: {categoryOps.summary.categoriesByType.non_operating}</li>
              {categoryOps.summary.mostUsedCategories.length > 0 && (
                <li>• Categoria mais usada: {categoryOps.summary.mostUsedCategories[0].name} ({categoryOps.summary.mostUsedCategories[0].transactionCount} transações)</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <Dialog
        open={!!viewingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setViewingCategory(null);
            setTransactionsPage(1);
          }
        }}
      >
        <DialogContent className="w-[min(90vw,70rem)] max-w-[70vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transações da Categoria</DialogTitle>
          </DialogHeader>

          {viewingCategory && (
            <div className="space-y-4 pr-1">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{viewingCategory.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {viewingCategory.transactionCount} transações registradas · {formatCurrency(viewingCategory.totalAmount)} acumulado
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Transações vinculadas</p>
                    <p className="text-xs text-muted-foreground">
                      {transactionsLoading
                        ? 'Carregando transações...'
                        : `${transactionsTotal} transaç${transactionsTotal === 1 ? 'ão' : 'ões'} encontradas`}
                    </p>
                  </div>
                  {transactionsTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevTransactionsPage}
                        disabled={transactionsPage === 1 || transactionsLoading}
                      >
                        Anterior
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Página {transactionsPage} de {transactionsTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextTransactionsPage}
                        disabled={transactionsPage === transactionsTotalPages || transactionsLoading}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-md border">
                  {transactionsError ? (
                    <div className="p-4 text-sm text-destructive">
                      {transactionsError}
                    </div>
                  ) : transactionsLoading ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Carregando transações...
                    </div>
                  ) : categoryTransactions.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Nenhuma transação encontrada para esta categoria.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {transaction.description || 'Sem descrição'}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase">
                                  {transaction.type === 'debit' ? 'Saída' : 'Entrada'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">
                                {transaction.accountName || transaction.bankName || '-'}
                              </p>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className={transaction.amount >= 0 ? 'text-success' : 'text-destructive'}>
                                {formatCurrency(transaction.amount)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para Nova Categoria */}
      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateCategory}
      />

      {/* Dialog para Nova/Editar Regra */}
      <CategoryRuleDialog
        open={isRuleDialogOpen}
        onOpenChange={setIsRuleDialogOpen}
        onSave={editingRule ? handleUpdateRule : handleCreateRule}
        initialData={editingRule}
      />

      {/* Toaster para notificações */}
      <Toaster />
    </LayoutWrapper>
  );
}
