'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Transaction } from '@/lib/db/schema';

interface RecentTransactionsProps {
  transactions?: Transaction[];
  isLoading?: boolean;
  isEmpty?: boolean;
}

export function RecentTransactions({ transactions, isLoading, isEmpty }: RecentTransactionsProps) {
  const getCategoryVariant = (category: string) => {
    // Todas as categorias usam variantes monocromáticas
    return 'primary-light';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty || !transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium mb-2">Nenhuma transação registrada</p>
            <p className="text-sm">As transações mais recentes aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes (Categorizadas)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground mb-2">
            <div>Data</div>
            <div>Descrição</div>
            <div>Categoria</div>
            <div className="text-right">Valor</div>
          </div>
          {transactions.filter(transaction => transaction != null).map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-4 items-center text-sm">
              <div className="font-medium">
                {transaction.transactionDate
                  ? new Date(transaction.transactionDate).toLocaleDateString('pt-BR')
                  : 'Sem data'
                }
              </div>
              <div className="truncate">{transaction.description}</div>
              <div>
                <Badge
                  variant={getCategoryVariant(transaction.categoryId || '')}
                  className="text-xs"
                >
                  {transaction.categoryId ? 'Categorizado' : 'Sem Categoria'}
                </Badge>
              </div>
              <div className={`text-right font-medium ${
                transaction.amount && transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.amount && transaction.amount > 0 ? '+' : ''}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
          <div className="pt-4 border-t flex gap-2">
            <Button variant="outline" size="sm">
              Ver todas
            </Button>
            <Button variant="outline" size="sm">
              Filtrar por Categoria
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}