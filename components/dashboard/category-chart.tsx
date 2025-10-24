'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Category } from '@/lib/mock-data';

interface CategoryChartProps {
  categories: Category[];
}

export function CategoryChart({ categories }: CategoryChartProps) {
  const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);

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
                    R$ {category.amount.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ({category.percentage}%)
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