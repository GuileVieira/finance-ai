'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CategoryForm } from '@/components/categories/category-form';
import { CategoryRulesManager } from '@/components/categories/category-rules-manager';
import { categoryTypes } from '@/lib/mock-categories';
import { Category, Transaction } from '@/lib/types';
import { useCategory } from '@/hooks/use-categories';
import { ArrowLeft, Edit, Settings, Search, Filter, Download, Calendar, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('90');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const { toast } = useToast();

  // Buscar categoria real usando o hook
  const { data: category, isLoading, error } = useCategory(categoryId);

  // Buscar transações da categoria
  const fetchTransactions = useCallback(async () => {
    if (!categoryId) return;

    try {
      setLoadingTransactions(true);
      const response = await fetch(`/api/transactions?categoryId=${categoryId}&limit=50`);
      const result = await response.json();

      if (result.success && result.data) {
        // Mapear dados da API para o formato do frontend
        const mappedTransactions: Transaction[] = result.data.map((tx: Record<string, unknown>) => ({
          id: tx.id as string,
          description: tx.description as string,
          amount: Math.abs(tx.amount as number),
          type: (tx.amount as number) >= 0 ? 'credit' : 'debit',
          date: tx.date as string,
          category: tx.categoryName as string || 'Sem categoria',
          balance_after: tx.balanceAfter as number || 0,
          account: tx.accountName as string || 'Conta',
          status: 'completed' as const,
        }));
        setTransactions(mappedTransactions);
      }
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Tratamentos de loading e erro
  if (isLoading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-96">
          <p>Carregando categoria...</p>
        </div>
      </LayoutWrapper>
    );
  }

  if (error || !category) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Categoria não encontrada
            </h3>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'A categoria que você está procurando não existe ou foi removida.'}
            </p>
            <Link href="/categories">
              <Button variant="outline">
                Voltar para Categorias
              </Button>
            </Link>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  // Filtrar transações
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    return matchesSearch && matchesType;
  });

  // Calcular estatísticas
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const averageAmount = transactions.length > 0 ? totalAmount / transactions.length : 0;
  const creditTransactions = transactions.filter(t => t.type === 'credit');
  const debitTransactions = transactions.filter(t => t.type === 'debit');
  const totalCredits = creditTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = debitTransactions.reduce((sum, t) => sum + t.amount, 0);

  const handleUpdateCategory = async (data: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          colorHex: data.color,
          description: data.description,
          isActive: data.active,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsEditDialogOpen(false);
        // Recarregar página para atualizar dados do hook
        router.refresh();
        toast({
          title: 'Categoria Atualizada',
          description: 'As alterações foram salvas com sucesso!',
        });
      } else {
        throw new Error(result.error || 'Erro ao atualizar');
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao atualizar categoria',
        variant: 'destructive',
      });
    }
  };

  const getTypeColor = (type: string) => {
    const typeConfig = categoryTypes.find(t => t.value === type);
    return typeConfig?.color || '#6B7280';
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = categoryTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/categories">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <div>
                <h1 className="text-2xl font-bold">{category.name}</h1>
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
                  {category.description && (
                    <span className="text-sm text-muted-foreground">
                      {category.description}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Editar Categoria</DialogTitle>
                </DialogHeader>
                <CategoryForm
                  initialData={category}
                  onSave={handleUpdateCategory}
                  onCancel={() => setIsEditDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isRulesDialogOpen} onOpenChange={setIsRulesDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Regras
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>Regras de Categorização</DialogTitle>
                </DialogHeader>
                <CategoryRulesManager
                  category={category}
                  onClose={() => setIsRulesDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                  <p className="text-sm text-muted-foreground">Transações</p>
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
                    {formatCurrency(totalAmount)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Movimentado</p>
                </div>
                {category.type === 'revenue' ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(averageAmount)}
                  </p>
                  <p className="text-sm text-muted-foreground">Média por Transação</p>
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
                  <p className="text-2xl font-bold">{category.percentage}%</p>
                  <p className="text-sm text-muted-foreground">do Total Geral</p>
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
                    placeholder="Buscar transações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="credit">Créditos</SelectItem>
                  <SelectItem value="debit">Débitos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Transações */}
        <Card>
          <CardHeader>
            <CardTitle>
              Transações ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhuma transação encontrada para esta categoria.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{transaction.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {transaction.account}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(transaction.balance_after)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Exemplos da Categoria */}
        {category.examples && category.examples.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Exemplos de Transações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {category.examples.map((example, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {example}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  );
}