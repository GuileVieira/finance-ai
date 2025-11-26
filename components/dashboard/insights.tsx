'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Upload } from 'lucide-react';
import Link from 'next/link';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-3/4" />
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
          <div className="space-y-3">
            {data?.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">
                  {index + 1}
                </Badge>
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
