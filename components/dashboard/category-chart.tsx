'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategorySummary } from '@/lib/api/dashboard';

interface CategoryChartProps {
  categories?: CategorySummary[];
  isLoading?: boolean;
  isEmpty?: boolean;
}

export function CategoryChart({ categories, isLoading, isEmpty }: CategoryChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-8 ml-auto" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty || !categories || categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium mb-2">Nenhuma categoria registrada</p>
            <p className="text-sm">As categorias aparecerão aqui conforme você adiciona transações</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhamento por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm font-medium">
                    {category.name.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    R$ {category.totalAmount.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ({category.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
              <Progress
                value={category.percentage}
                className="h-2"
                style={{
                  '--progress-background': `${category.color}20`
                } as React.CSSProperties}
              />
            </div>
          ))}
          <div className="pt-4 border-t">
            <Button variant="outline" className="w-full">
              Ver Todas as Categorias
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}