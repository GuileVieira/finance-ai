'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Upload, AlertTriangle, TrendingUp, TrendingDown, Info, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface InsightsData {
  insights: string[];
  isEmpty: boolean;
  emptyMessage?: string;
}

interface InsightsProps {
  period?: string;
  companyId?: string;
  accountId?: string;
}

// Função para determinar o tipo de insight baseado no prefixo/emoji
function getInsightType(insight: string): 'critical' | 'warning' | 'positive' | 'info' {
  if (insight.startsWith('🚨')) return 'critical';
  if (insight.startsWith('⚠️')) return 'warning';
  if (insight.startsWith('✅')) return 'positive';
  return 'info';
}

// Função para remover emoji do início
function cleanInsightText(insight: string): string {
  return insight.replace(/^[🚨⚠️✅💡📅🔄📊🎯📂💰]\s*/, '');
}

// Componente para um item de insight com estilo baseado no tipo
function InsightItem({ insight, index }: { insight: string; index: number }) {
  const type = getInsightType(insight);
  const text = cleanInsightText(insight);

  const styles = {
    critical: {
      container: 'bg-destructive/10 border-l-4 border-destructive',
      icon: <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />,
      badge: 'bg-destructive text-destructive-foreground'
    },
    warning: {
      container: 'bg-orange-500/10 border-l-4 border-orange-500',
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      badge: 'bg-orange-500 text-white'
    },
    positive: {
      container: 'bg-green-500/10 border-l-4 border-green-500',
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      badge: 'bg-green-500 text-white'
    },
    info: {
      container: 'bg-muted/50 border-l-4 border-muted-foreground/30',
      icon: <Info className="h-4 w-4 text-muted-foreground" />,
      badge: 'bg-muted text-muted-foreground'
    }
  };

  const style = styles[type];

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-r-md', style.container)}>
      <div className="shrink-0 mt-0.5">
        {style.icon}
      </div>
      <p className="text-sm flex-1">{text}</p>
    </div>
  );
}

export function Insights({ period, companyId, accountId }: InsightsProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (period && period !== 'all') params.set('period', period);
        if (companyId && companyId !== 'all') params.set('companyId', companyId);
        if (accountId && accountId !== 'all') params.set('accountId', accountId);

        const response = await fetch(`/api/dashboard/insights?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Erro ao carregar insights');
        }
      } catch (err) {
        setError('Erro ao carregar insights');
        console.error('Error fetching insights:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [period, companyId, accountId]);

  // Separar insights críticos dos demais
  const criticalInsights = data?.insights.filter(i => getInsightType(i) === 'critical') || [];
  const otherInsights = data?.insights.filter(i => getInsightType(i) !== 'critical') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights
          {criticalInsights.length > 0 && (
            <Badge variant="destructive" className="ml-auto animate-pulse">
              {criticalInsights.length} alerta{criticalInsights.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-4/5" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">{error}</p>
          </div>
        ) : data?.isEmpty ? (
          <div className="text-center py-6">
            <Lightbulb className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Nenhum insight disponível
            </p>
            <p className="text-xs text-muted-foreground/70 mb-4">
              {data.emptyMessage || 'Importe transações para ver insights'}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/upload">
                <Upload className="h-4 w-4 mr-2" />
                Importar Transações
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Seção de Alertas Críticos */}
            {criticalInsights.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Atenção Necessária
                </div>
                <div className="space-y-2">
                  {criticalInsights.map((insight, index) => (
                    <InsightItem key={`critical-${index}`} insight={insight} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Separador se houver críticos e outros */}
            {criticalInsights.length > 0 && otherInsights.length > 0 && (
              <div className="border-t my-3" />
            )}

            {/* Outros Insights */}
            {otherInsights.length > 0 && (
              <div className="space-y-2">
                {otherInsights.map((insight, index) => (
                  <InsightItem key={`other-${index}`} insight={insight} index={index} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
