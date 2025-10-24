'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MetricCard as MetricCardType } from '@/lib/mock-data';

interface MetricCardProps {
  metric: MetricCardType;
}

export function MetricCard({ metric }: MetricCardProps) {
  const isPositive = metric.changeType === 'increase';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </p>
            <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {metric.value}
            </p>
          </div>
          <Badge
            variant={isPositive ? 'default' : 'secondary'}
            className={`flex items-center gap-1 ${
              isPositive
                ? 'bg-success/20 text-success border-success/30'
                : 'bg-primary/20 text-primary border-primary/30'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? '+' : ''}{metric.change}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}