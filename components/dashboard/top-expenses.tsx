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
}

export function TopExpenses({ expenses, isLoading, isEmpty }: TopExpensesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Despesas Financeiras</CardTitle>
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
          <CardTitle>Top Despesas Financeiras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
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
        <CardTitle>Top Despesas Financeiras</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {expenses.map((expense, index) => (
            <div key={expense.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium text-sm">
                    {expense.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {expense.category} • {expense.accountName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm text-red-600">
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