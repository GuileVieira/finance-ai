'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockTopExpenses } from '@/lib/mock-data';

export function TopExpenses() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Despesas (Base XMIND)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockTopExpenses.map((expense, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{expense.icon}</span>
                <div>
                  <div className="font-medium text-sm">
                    {expense.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {expense.transactions} trans
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">
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