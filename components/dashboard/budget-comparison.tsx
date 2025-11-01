'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mockBudgetComparison } from '@/lib/mock-data';

export function BudgetComparison() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação vs Orçamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockBudgetComparison.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.category}</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={item.status === 'positive' ? 'success-light' : 'danger-light'}
                  >
                    {item.status === 'positive' ? '+' : '-'}{item.variance}%
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    R$ {item.actual.toLocaleString('pt-BR')} / R$ {item.budget.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="relative">
                <Progress
                  value={(item.actual / item.budget) * 100}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Realizado: {(item.actual / item.budget * 100).toFixed(1)}%</span>
                  <span>Meta: 100%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">
            <span className="font-medium">⚠️ Alerta:</span> Custo fixo está
            <span className="font-semibold"> 18.9% acima</span> do orçamento.
            Considere revisar contratações ou negociar com fornecedores.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}