'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  transactionDate: string;
  categoryName?: string | null;
  accountName?: string;
}

interface TransactionsListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodLabel: string;
  startDate: string;
  endDate: string;
  companyId?: string;
  accountId?: string;
}

export function TransactionsListDialog({
  open,
  onOpenChange,
  periodLabel,
  startDate,
  endDate,
  companyId,
  accountId
}: TransactionsListDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && startDate && endDate) {
      fetchTransactions();
    }
  }, [open, startDate, endDate, companyId, accountId]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (companyId && companyId !== 'all') params.append('companyId', companyId);
      if (accountId && accountId !== 'all') params.append('accountId', accountId);

      const response = await fetch(`/api/transactions?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar transações');
      }

      const result = await response.json();

      if (result.success) {
        // A API retorna { transactions, pagination } em data
        const transactionsArray = result.data?.transactions || [];
        // Filtrar transações pelo período exato
        const filtered = transactionsArray.filter((t: Transaction) => {
          const txDate = t.transactionDate.split('T')[0];
          return txDate >= startDate && txDate <= endDate;
        });
        setTransactions(filtered);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar transações');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Calcular totais
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'credit' || Number(t.amount) > 0) {
        acc.income += Math.abs(Number(t.amount));
      } else {
        acc.expenses += Math.abs(Number(t.amount));
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transações - {periodLabel}</DialogTitle>
          {startDate && endDate && (
            <DialogDescription>
              {startDate === endDate
                ? `Transações do dia ${formatDate(startDate)}`
                : `Transações de ${formatDate(startDate)} a ${formatDate(endDate)}`
              }
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 py-4 border-b">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Entradas</div>
            <div className="text-lg font-semibold text-success">{formatCurrency(totals.income)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Saídas</div>
            <div className="text-lg font-semibold text-red-500/85">{formatCurrency(totals.expenses)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-sm text-muted-foreground">{transactions.length} transações</div>
          </div>
        </div>

        {/* Lista de transações */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma transação encontrada neste período.</p>
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((transaction) => {
                const isIncome = transaction.type === 'credit' || Number(transaction.amount) > 0;
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-full ${isIncome ? 'bg-success/10' : 'bg-red-500/10'}`}>
                        {isIncome ? (
                          <ArrowUpCircle className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-500/85" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{transaction.description}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatDate(transaction.transactionDate)}</span>
                          {transaction.categoryName && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {transaction.categoryName}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold ${isIncome ? 'text-success' : 'text-red-500/85'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(Math.abs(Number(transaction.amount)))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
