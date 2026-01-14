'use client';

import { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryForm } from '@/components/categories/category-form';
import { CategoryRulesManager } from '@/components/categories/category-rules-manager';
import { categoryTypes } from '@/lib/mock-categories';
import type { Category, CategoryFormData } from '@/lib/types';
import { TransactionsAPI } from '@/lib/api/transactions';
import { Plus, Edit, Trash2, Settings, Search, Filter, Eye, ArrowLeft, Activity, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { dispatchTutorialEvent } from '@/components/tutorial';

interface InsightsStats {
  accuracy: {
    averageAccuracy: number;
    totalCategorized: number;
    totalTransactions: number;
  };
  categories: {
    activeCategories: number;
    usedCategories: number;
    totalCategories: number;
  };
}

type CategoryTransaction = {
  id: string;
  description: string | null;
  amount: number;
  type: 'credit' | 'debit';
  transactionDate: string | null;
  accountName?: string | null;
  bankName?: string | null;
};

export default function SettingsCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [managingRules, setManagingRules] = useState<Category | null>(null);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<CategoryTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsLimit] = useState(15);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const { toast } = useToast();

  // Carregar categorias da API
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories?includeStats=true');
        const result = await response.json();
        if (result.success && result.data) {
          // Mapear transactionCount para transactions para compatibilidade
          const mappedCategories = result.data.map((cat: Category & { transactionCount?: number }) => ({
            ...cat,
            transactions: cat.transactionCount ?? cat.transactions ?? 0
          }));
          setCategories(mappedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Marcar categorias como visualizadas para o tutorial
  useEffect(() => {
    // Salvar no localStorage e disparar evento
    localStorage.setItem('tutorial-categories-viewed', 'true');
    dispatchTutorialEvent('tutorial:categories-viewed');
  }, []);

  // Carregar estatísticas
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/insights');
        const result = await response.json();
        if (result.success && result.data.stats) {
          setStats(result.data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  // Filtrar categorias
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || category.type === filterType;
    return matchesSearch && matchesType;
  });

  // Criar nova categoria
  const handleCreateCategory = (data: CategoryFormData) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: data.name,
      type: data.type,
      colorHex: data.color,
      color: data.color,
      description: data.description,
      totalAmount: 0,
      transactionCount: 0,
      transactions: 0,
      percentage: 0,
      active: data.active ?? true,
      examples: data.examples || []
    };

    setCategories(prev => [...prev, newCategory]);
    setIsCreateDialogOpen(false);

    toast({
      title: 'Categoria Criada',
      description: `${newCategory.name} foi adicionada com sucesso!`,
    });
  };

  // Editar categoria
  const handleEditCategory = (data: CategoryFormData) => {
    if (!editingCategory) return;

    setCategories(prev => prev.map(cat =>
      cat.id === editingCategory.id
        ? { ...cat, ...data }
        : cat
    ));

    setEditingCategory(null);

    toast({
      title: 'Categoria Atualizada',
      description: 'As alterações foram salvas com sucesso!',
    });
  };

  // Excluir categoria
  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    setCategories(prev => prev.filter(cat => cat.id !== categoryId));

    toast({
      title: 'Categoria Excluída',
      description: `${category.name} foi removida com sucesso!`,
    });
  };

  // Toggle status ativo/inativo
  const handleToggleActive = (categoryId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, active: !cat.active }
        : cat
    ));
  };

  const getTypeColor = (type: string) => {
    const typeConfig = categoryTypes.find(t => t.value === type);
    return typeConfig?.color || '#6B7280';
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = categoryTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  // Padrões para sugerir tipo correto
  const TAX_PATTERNS = ['imposto', 'iss', 'pis', 'cofins', 'icms', 'ipi', 'irpj', 'csll', 'inss', 'tributo'];
  const REVENUE_PATTERNS = ['venda', 'receita', 'faturamento', 'recebimento'];
  const FIXED_COST_PATTERNS = ['aluguel', 'salario', 'salário', 'folha', 'energia', 'agua', 'água', 'internet', 'telefone'];
  const VARIABLE_COST_PATTERNS = ['material', 'insumo', 'mercadoria', 'frete', 'comissão', 'comissao'];

  const getSuggestedType = (name: string): string | null => {
    const lowerName = name.toLowerCase();
    if (TAX_PATTERNS.some(p => lowerName.includes(p))) return 'variable_cost'; // Impostos são deduções sobre receita
    if (REVENUE_PATTERNS.some(p => lowerName.includes(p))) return 'revenue';
    if (FIXED_COST_PATTERNS.some(p => lowerName.includes(p))) return 'fixed_cost';
    if (VARIABLE_COST_PATTERNS.some(p => lowerName.includes(p))) return 'variable_cost';
    return null;
  };

  const hasTypeMismatch = (category: Category): boolean => {
    const suggested = getSuggestedType(category.name);
    return suggested !== null && suggested !== category.type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (value: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  };

  const handleViewCategory = (category: Category) => {
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

        if (!isCancelled) {
          const normalizedTransactions: CategoryTransaction[] = (response.transactions || []).map((transaction) => {
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

          setCategoryTransactions(normalizedTransactions);
          setTransactionsTotal(pagination.total || normalizedTransactions.length || 0);
          setTransactionsTotalPages(pagination.totalPages || 1);
          if (pagination.page && pagination.page !== transactionsPage) {
            setTransactionsPage(pagination.page);
          }
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

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header com navegação */}
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Configurações
            </Button>
          </Link>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">Gestão de Categorias</h1>
            <p className="text-muted-foreground">
              Gerencie todas as categorias financeiras do sistema
            </p>
          </div>

          <Link href="/settings/categories/rules-health">
            <Button variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Saúde das Regras
            </Button>
          </Link>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Nova Categoria Financeira</DialogTitle>
              </DialogHeader>
              <CategoryForm
                onSave={handleCreateCategory}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {categories.filter(c => c.active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-xs font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {categories.reduce((sum, cat) => sum + (cat.transactions || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Transações</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 text-xs font-bold">📈</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : stats?.accuracy.totalCategorized && stats.accuracy.totalCategorized > 0 ? (
                    <p className="text-2xl font-bold">
                      {stats.accuracy.averageAccuracy.toFixed(0)}%
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">--</p>
                  )}
                  <p className="text-sm text-muted-foreground">Acurácia</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 text-xs font-bold">🎯</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar categorias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {categoryTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle>
              Categorias ({filteredCategories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table data-tutorial="categories-list">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Transações</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma categoria encontrada.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id} className={!category.active ? 'opacity-50' : ''}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleViewCategory(category)}
                          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label={`Ver transações da categoria ${category.name}`}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color || category.colorHex }}
                          />
                          <div>
                            <p className="font-medium">{category.name}</p>
                            {category.description && (
                              <p className="text-sm text-muted-foreground">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: `${getTypeColor(category.type)}20`,
                              color: getTypeColor(category.type),
                            }}
                          >
                            {getTypeLabel(category.type)}
                          </Badge>
                          {hasTypeMismatch(category) && (
                            <div className="group relative">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 w-48 p-2 bg-popover border rounded-md shadow-md text-xs">
                                <p className="font-medium text-yellow-600">Tipo pode estar incorreto</p>
                                <p className="text-muted-foreground">
                                  Sugestão: {getTypeLabel(getSuggestedType(category.name) || '')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: category.color || category.colorHex }}
                          />
                          <span className="text-sm font-mono">
                            {category.color || category.colorHex}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{category.transactions || 0}</p>
                          <p className="text-muted-foreground">
                            {Number(category.percentage || 0).toFixed(2)}% do total
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={category.active ? 'default' : 'secondary'}>
                          {category.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCategory(category)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Dialog open={editingCategory?.id === category.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCategory(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Editar Categoria</DialogTitle>
                              </DialogHeader>
                              {editingCategory && (
                                <CategoryForm
                                  initialData={editingCategory}
                                  onSave={handleEditCategory}
                                  onCancel={() => setEditingCategory(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          <Dialog open={managingRules?.id === category.id} onOpenChange={(open) => !open && setManagingRules(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setManagingRules(category)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px]">
                              <DialogHeader>
                                <DialogTitle>Regras de Categorização</DialogTitle>
                              </DialogHeader>
                              {managingRules && (
                                <CategoryRulesManager
                                  category={managingRules}
                                  onClose={() => setManagingRules(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(category.id)}
                          >
                            {category.active ? 'Desativar' : 'Ativar'}
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir ${category.name}?`)) {
                                handleDeleteCategory(category.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog
          open={!!viewingCategory}
          onOpenChange={(open) => {
            if (!open) {
              setViewingCategory(null);
              setTransactionsPage(1);
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Detalhes da Categoria</DialogTitle>
            </DialogHeader>
            {viewingCategory && (
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: viewingCategory.color }}
                  />
                  <div>
                    <h3 className="font-semibold">{viewingCategory.name}</h3>
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: `${getTypeColor(viewingCategory.type)}20`,
                        color: getTypeColor(viewingCategory.type),
                      }}
                    >
                      {getTypeLabel(viewingCategory.type)}
                    </Badge>
                  </div>
                </div>

                {viewingCategory.description && (
                  <div>
                    <p className="text-sm font-medium">Descrição</p>
                    <p className="text-muted-foreground">{viewingCategory.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Transações</p>
                    <p className="text-2xl font-bold">{viewingCategory.transactions}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Percentual</p>
                    <p className="text-2xl font-bold">{Number(viewingCategory.percentage || 0).toFixed(2)}%</p>
                  </div>
                </div>

                {viewingCategory.examples && viewingCategory.examples.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Exemplos</p>
                    <div className="flex flex-wrap gap-1">
                      {viewingCategory.examples.map((example, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Transações cadastradas</p>
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
                              <TableCell>{formatDate(transaction.transactionDate || '')}</TableCell>
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
      </div>
    </LayoutWrapper>
  );
}
