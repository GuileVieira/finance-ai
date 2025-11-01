'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Lightbulb, AlertCircle } from 'lucide-react';
import { Insight } from '@/lib/types';

interface InsightsCardProps {
  insights: Insight[];
  onInsightClick?: (insight: Insight) => void;
}

export default function InsightsCard({ insights, onInsightClick }: InsightsCardProps) {
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'recommendation':
        return <Lightbulb className="w-5 h-5 text-primary" />;
      case 'positive':
        return <TrendingUp className="w-5 h-5 text-success" />;
      case 'trend':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground/70" />;
    }
  };

  const getImpactColor = (impact: Insight['impact']) => {
    switch (impact) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20 dark:bg-warning/20';
      case 'low':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getImpactLabel = (impact: Insight['impact']) => {
    switch (impact) {
      case 'high':
        return 'Alto';
      case 'medium':
        return 'Médio';
      case 'low':
        return 'Baixo';
      default:
        return 'Desconhecido';
    }
  };

  const getTypeColor = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return 'border-destructive/20 bg-destructive/10 dark:bg-destructive/10';
      case 'recommendation':
        return 'border-primary/20 bg-primary/5';
      case 'positive':
        return 'border-success/20 bg-success/10 dark:bg-success/10';
      case 'trend':
        return 'border-warning/20 bg-warning/10 dark:bg-warning/10';
      default:
        return 'border-border bg-muted';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Insights Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum insight identificado no período.</p>
            <p className="text-sm">Continue monitorando suas finanças para receber recomendações personalizadas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Insights Financeiros
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {insights.length} insights identificados no período
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getTypeColor(insight.type)}`}
            onClick={() => onInsightClick?.(insight)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getInsightIcon(insight.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                  <Badge className={`text-xs ${getImpactColor(insight.impact)}`}>
                    {getImpactLabel(insight.impact)}
                  </Badge>
                </div>

                <p className="text-sm text-foreground leading-relaxed">
                  {insight.description}
                </p>

                {(insight.value || insight.comparison || insight.category) && (
                  <div className="mt-3 space-y-2">
                    {insight.value && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Valor:</span>
                        <span className="font-bold">
                          {formatCurrency(insight.value)}
                        </span>
                      </div>
                    )}

                    {insight.comparison && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Comparação:</span>
                        <span className="text-primary">{insight.comparison}</span>
                      </div>
                    )}

                    {insight.category && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {insight.category}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {insights.length > 5 && (
          <div className="text-center pt-4 border-t">
            <button className="text-sm text-primary hover:text-primary/80 font-medium">
              Ver todos os insights ({insights.length} no total)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}