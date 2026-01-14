'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import { CategorySummary } from '@/lib/api/dashboard';

interface CategoryChartProps {
  categories?: CategorySummary[];
  isLoading?: boolean;
  isEmpty?: boolean;
  onCategoryClick?: (category: CategorySummary) => void;
}

export function CategoryChart({ categories, isLoading, isEmpty, onCategoryClick }: CategoryChartProps) {
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
    <Card className="w-full">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle>Detalhamento por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`flex items-center justify-between gap-3 py-2 px-2 rounded-md transition-colors ${onCategoryClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
              onClick={() => onCategoryClick?.(category)}
            >
              {/* Indicador colorido + ícone + nome + badge */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                {category.type === 'revenue' ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-success shrink-0" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
                <span className="text-sm font-medium truncate max-w-[140px]" title={category.name}>
                  {category.name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 uppercase font-medium ${category.type === 'revenue'
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
                  }`}>
                  {category.type === 'revenue' ? 'Receita' : 'Despesa'}
                </span>
              </div>
              {/* Valor e porcentagem */}
              <div className="text-right shrink-0 tabular-nums">
                <div className={`text-sm font-semibold ${category.type === 'revenue' ? 'text-success' : 'text-destructive'}`}>
                  {category.type === 'revenue' ? '+' : '-'} R$ {Math.abs(category.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground">
                  ({category.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-3 mt-3 border-t shrink-0">
          <Link href="/categories">
            <Button variant="outline" className="w-full">
              Ver Todas as Categorias
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}