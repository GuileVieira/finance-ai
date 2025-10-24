'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mockBenchmarks } from '@/lib/mock-data';

export function Benchmarks() {
  const getBenchmarkColor = (status: string) => {
    switch (status) {
      case 'above':
        return 'text-green-600';
      case 'below':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'above':
        return 'bg-green-500';
      case 'below':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benchmarks vs Mercado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Margem de Contribuição</span>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${getBenchmarkColor(mockBenchmarks.margin.status)}`}>
                  {mockBenchmarks.margin.current}%
                </span>
                <Badge variant="outline" className="text-xs">
                  Mercado: {mockBenchmarks.margin.industry}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={mockBenchmarks.margin.current}
                className="flex-1"
              />
              <span className={`text-sm font-medium ${getBenchmarkColor(mockBenchmarks.margin.status)}`}>
                {mockBenchmarks.margin.difference > 0 ? '+' : ''}{mockBenchmarks.margin.difference}pp
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Crescimento Mensal</span>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${getBenchmarkColor(mockBenchmarks.growth.status)}`}>
                  {mockBenchmarks.growth.current}%
                </span>
                <Badge variant="outline" className="text-xs">
                  Mercado: {mockBenchmarks.growth.industry}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={Math.min(mockBenchmarks.growth.current * 5, 100)}
                className="flex-1"
              />
              <span className={`text-sm font-medium ${getBenchmarkColor(mockBenchmarks.growth.status)}`}>
                +{mockBenchmarks.growth.difference}pp
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Índice de Custo</span>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${getBenchmarkColor(mockBenchmarks.costRatio.status)}`}>
                  {mockBenchmarks.costRatio.current}%
                </span>
                <Badge variant="outline" className="text-xs">
                  Mercado: {mockBenchmarks.costRatio.industry}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={mockBenchmarks.costRatio.current}
                className="flex-1"
              />
              <span className={`text-sm font-medium ${getBenchmarkColor(mockBenchmarks.costRatio.status)}`}>
                +{mockBenchmarks.costRatio.difference}pp
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-primary">
            <span className="font-medium">📊 Análise:</span>
            Seu crescimento está acima da média do mercado,
            mas a margem precisa melhorar. Foque em otimizar custos
            para atingir a média do setor.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}