'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockRecentTransactions } from '@/lib/mock-data';

export function RecentTransactions() {
  const getCategoryVariant = (category: string) => {
    // Todas as categorias usam variantes monocromáticas
    return 'primary-light';
  };

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
          {mockRecentTransactions.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-4 items-center text-sm">
              <div className="font-medium">{transaction.date}</div>
              <div className="truncate">{transaction.description}</div>
              <div>
                <Badge
                  variant={getCategoryVariant(transaction.category)}
                  className="text-xs"
                >
                  {transaction.category}
                </Badge>
              </div>
              <div className={`text-right font-medium ${
                transaction.amount > 0 ? 'text-success' : 'text-danger'
              }`}>
                {transaction.amount > 0 ? '+' : ''}R$ {Math.abs(transaction.amount).toLocaleString('pt-BR')}
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