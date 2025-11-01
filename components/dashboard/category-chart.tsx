'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
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
          <div className="text-center py-8 text-muted-foreground/70">
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
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {category.type === 'revenue' ? (
                        <ArrowUpRight className="h-3 w-3 text-success shrink-0" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      <span className="text-xs sm:text-sm font-medium capitalize truncate">
                        {category.name}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 self-start ${
                      category.type === 'revenue'
                        ? 'bg-success/10 text-success dark:bg-success/20'
                        : 'bg-destructive/10 text-destructive dark:bg-destructive/20'
                    }`}>
                      {category.type === 'revenue' ? 'RECEITA' : 'DESPESA'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs sm:text-sm font-medium ${
                    category.type === 'revenue' ? 'text-success' : 'text-destructive'
                  }`}>
                    {category.type === 'revenue' ? '+' : '-'} R$ {Math.abs(category.totalAmount).toLocaleString('pt-BR')}
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
            <Link href="/categories">
              <Button variant="outline" className="w-full">
                Ver Todas as Categorias
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}