'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Transaction } from '@/lib/db/schema';
import { useTransactionDetails } from '@/components/providers/transaction-details-provider';

import { AlertTriangle, Split } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
        <TooltipProvider>
          <div className="space-y-3">
            <div className="flex items-center text-xs font-medium text-muted-foreground mb-2">
              <div className="w-20">Data</div>
              <div className="flex-1 min-w-0 px-2">Descrição</div>
              <div className="w-44">Categoria</div>
              <div className="w-24 text-right">Valor</div>
            </div>
            {transactions.filter(transaction => transaction != null).map((transaction) => {
              const metadata = (transaction.metadata as any);
              const isAmbiguous = metadata?.ambiguity?.isAmbiguous;
              
              return (
                <div
                  key={transaction.id}
                  className={`flex items-center text-sm cursor-pointer hover:bg-muted/40 p-2 rounded-xl transition-all duration-200 -mx-2 ${
                    isAmbiguous ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
                  }`}
                  onClick={() => openTransaction(transaction as unknown as import('@/lib/types').Transaction, companyId)}
                >
                  <div className="w-20 font-medium text-xs">
                    {transaction.transactionDate
                      ? new Date(transaction.transactionDate).toLocaleDateString('pt-BR')
                      : 'Sem data'
                    }
                  </div>
                  <div className="flex-1 min-w-0 px-2 truncate flex items-center gap-2">
                    {isAmbiguous && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" strokeWidth={1.5} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Transação Ambígua: {metadata.ambiguity?.reason || 'Verifique os detalhes'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {(transaction as any).splitCount > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Split className="h-4 w-4 text-blue-500 shrink-0" strokeWidth={1.5} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Transação Desmembrada ({ (transaction as any).splitCount } itens)</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <span className={isAmbiguous ? 'text-amber-700 dark:text-amber-500' : ''}>
                      {transaction.description}
                    </span>
                  </div>
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
              );
            })}
            <div className="pt-4 border-t flex gap-2">
              <Link href="/transactions">
                <Button variant="outline" size="sm">
                  Ver todas
                </Button>
              </Link>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}