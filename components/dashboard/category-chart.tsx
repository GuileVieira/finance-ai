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
                  <div className="flex items-center gap-1">
                    {category.type === 'revenue' ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {category.name.toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      category.type === 'revenue'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {category.type === 'revenue' ? 'RECEITA' : 'DESPESA'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    category.type === 'revenue' ? 'text-green-600' : 'text-red-600'
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