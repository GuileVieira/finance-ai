'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Transaction } from '@/lib/db/schema';
import { useTransactionDetails } from '@/components/providers/transaction-details-provider';

interface RecentTransactionsProps {
  transactions?: Transaction[];
  isLoading?: boolean;
  isEmpty?: boolean;
  companyId?: string;
}

export function RecentTransactions({ transactions, isLoading, isEmpty, companyId }: RecentTransactionsProps) {

  const getCategoryVariant = (category: string) => {
    // Todas as categorias usam variantes monocromáticas
    return 'outline' as const;
  };

  const { openTransaction } = useTransactionDetails();

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
          <div className="flex items-center text-xs font-medium text-muted-foreground mb-2">
            <div className="w-20">Data</div>
            <div className="flex-1 min-w-0 px-2">Descrição</div>
            <div className="w-44">Categoria</div>
            <div className="w-24 text-right">Valor</div>
          </div>
          {transactions.filter(transaction => transaction != null).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors -mx-2"
              onClick={() => openTransaction(transaction as unknown as import('@/lib/types').Transaction, companyId)}
            >
              <div className="w-20 font-medium text-xs">
                {transaction.transactionDate
                  ? new Date(transaction.transactionDate).toLocaleDateString('pt-BR')
                  : 'Sem data'
                }
              </div>
              <div className="flex-1 min-w-0 px-2 truncate">{transaction.description}</div>
              <div className="w-44">
                <Badge
                  variant={getCategoryVariant(transaction.categoryId || '')}
                  className="text-xs px-2 py-1"
                >
                  {(transaction as any).categoryName || 'Sem Categoria'}
                </Badge>
              </div>
              <div className={`w-24 text-right font-medium text-xs ${Number(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {Number(transaction.amount) > 0 ? '+' : ''}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
          <div className="pt-4 border-t flex gap-2">
            <Link href="/transactions">
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </Link>

          </div>
        </div>
      </CardContent>
    </Card>
  );
}