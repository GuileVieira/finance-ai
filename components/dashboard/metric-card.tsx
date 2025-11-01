'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MetricCard as MetricCardType } from '@/lib/types';
import { memo } from 'react';

interface MetricCardProps {
  metric: MetricCardType;
}

export const MetricCard = memo(function MetricCard({ metric }: MetricCardProps) {
  const isPositive = metric.changeType === 'increase';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </p>
            <p className={`text-2xl font-bold ${metric.color || 'text-foreground'}`}>
              {(() => {
                const value = typeof metric.value === 'number' ? metric.value : parseFloat(metric.value.toString());
                if (isNaN(value)) return metric.value;

                // Se for o card de transações, mostrar como número inteiro
                if (metric.title === 'Transações') {
                  return value.toLocaleString('pt-BR');
                }

                // Para valores monetários, formatar como moeda
                const formattedValue = new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(Math.abs(value));

                // Adicionar espaço antes do sinal negativo se necessário
                return value < 0 ? `- ${formattedValue}` : formattedValue;
              })()}
            </p>
          </div>
          {metric.change !== 0 && (
            <Badge
              variant={isPositive ? 'success-light' : 'danger-light'}
              className="flex items-center gap-1"
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? '+' : ''}{metric.change.toFixed(2)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});