'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricCard as MetricCardType } from '@/lib/types';
import { formatCurrencyCompact } from '@/lib/utils';
import { memo } from 'react';

interface MetricCardProps {
  metric: MetricCardType;
  onClick?: () => void;
}

export const MetricCard = memo(function MetricCard({ metric, onClick }: MetricCardProps) {
  const isPositive = metric.changeType === 'increase';

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 ease-out group",
        onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20" : "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-primary/10 transition-colors duration-300 group-hover:bg-primary/30" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {metric.title}
            </p>
            {metric.change !== 0 && (
              <Badge
                variant={isPositive ? 'success-light' : 'danger-light'}
                className="flex items-center gap-1 text-xs shrink-0"
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
                ) : (
                  <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
                )}
                <span className="hidden sm:inline">{isPositive ? '+' : ''}{metric.change.toFixed(2)}%</span>
                <span className="sm:hidden">{isPositive ? '+' : ''}{metric.change.toFixed(0)}%</span>
              </Badge>
            )}
          </div>
          <div>
            <div className={`text-lg sm:text-2xl font-bold ${metric.color || 'text-foreground'} whitespace-nowrap group relative`}>
              {(() => {
                const value = typeof metric.value === 'number' ? metric.value : parseFloat(metric.value.toString());
                if (isNaN(value)) return metric.value;

                // Se for o card de transações, mostrar como número inteiro
                if (metric.title === 'Transações') {
                  return value.toLocaleString('pt-BR');
                }

                return (
                  <div className="flex items-center gap-1 cursor-help" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}>
                    {formatCurrencyCompact(value)}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});