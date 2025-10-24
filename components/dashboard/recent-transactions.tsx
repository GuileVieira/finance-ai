'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockRecentTransactions } from '@/lib/mock-data';

export function RecentTransactions() {
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Salários e Encargos': '#DC2626',
      'Aluguel e Ocupação': '#B91C1C',
      'Tecnologia e Software': '#991B1B',
      'Vendas de Produtos': '#10B981',
      'Comissões Variáveis': '#D97706'
    };
    return colors[category] || '#6B7280';
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
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: getCategoryColor(transaction.category) + '20',
                    color: getCategoryColor(transaction.category)
                  }}
                >
                  {transaction.category}
                </Badge>
              </div>
              <div className={`text-right font-medium ${
                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
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