'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface TopExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  accountName: string;
}

interface TopExpensesProps {
  expenses?: TopExpense[];
  isLoading?: boolean;
  isEmpty?: boolean;
  onExpenseClick?: (expense: TopExpense) => void;
}

export function TopExpenses({ expenses, isLoading, isEmpty, onExpenseClick }: TopExpensesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty || !expenses || expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground/70">
            <p className="text-lg font-medium mb-2">Nenhuma despesa registrada</p>
            <p className="text-sm">As despesas aparecerão aqui conforme você adiciona transações</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Despesas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {expenses.slice(0, 5).map((expense, index) => (
            <div
              key={expense.id}
              className={`flex items-start sm:items-center justify-between gap-2 rounded-md p-1 -m-1 transition-colors ${onExpenseClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
              onClick={() => onExpenseClick?.(expense)}
            >
              <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-destructive/10 text-destructive text-xs font-medium shrink-0 mt-0.5 sm:mt-0">
                  {index + 1}°
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm truncate">
                    {expense.description}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {expense.category} • {expense.accountName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-medium text-xs sm:text-sm text-destructive">
                  R$ {expense.amount.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}