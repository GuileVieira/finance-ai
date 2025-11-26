'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Wrench,
  Activity,
  TrendingDown,
  FileWarning,
  GitMerge,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RulesHealthData {
  healthScore: number;
  healthStatus: {
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    label: string;
    color: string;
  };
  alerts: Array<{
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    count?: number;
    actionUrl?: string;
  }>;
  statistics: {
    totalRules: number;
    activeRules: number;
    rulesByType: Record<string, number>;
    averageConfidence: number;
  };
  conflicts: {
    total: number;
    crossCategory: number;
    sameCategory: number;
    details: Array<{
      rule1: { id: string; rulePattern: string; categoryId: string };
      rule2: { id: string; rulePattern: string; categoryId: string };
      similarity: number;
      isCrossCategory: boolean;
    }>;
  };
  orphanRules: {
    total: number;
    details: Array<{ id: string; rulePattern: string; categoryId: string }>;
  };
  performance: {
    byStatus: Record<string, number>;
    byRecommendation: Record<string, number>;
    averageHealth: number;
    averagePrecision: number;
  };
}

interface RulesHealthDashboardProps {
  companyId: string;
}

export function RulesHealthDashboard({ companyId }: RulesHealthDashboardProps) {
  const [healthData, setHealthData] = useState<RulesHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false);
  const { toast } = useToast();

  const fetchHealthData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/categories/rules/health?companyId=${companyId}`);
      const result = await response.json();

      if (result.success) {
        setHealthData(result.data);
      } else {
        throw new Error(result.message || 'Erro ao carregar dados');
      }
    } catch (error) {
      console.error('Erro ao buscar saúde das regras:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o status das regras',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const runMaintenance = async (actions: string[] = ['all']) => {
    try {
      setIsRunningMaintenance(true);
      const response = await fetch('/api/categories/rules/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, actions })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Manutenção Concluída',
          description: `Regras processadas: ${JSON.stringify(result.results)}`,
        });
        // Recarregar dados
        fetchHealthData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erro ao executar manutenção:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao executar manutenção',
        variant: 'destructive'
      });
    } finally {
      setIsRunningMaintenance(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getAlertIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Analisando regras...</span>
      </div>
    );
  }

  if (!healthData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Não foi possível carregar os dados</p>
          <Button onClick={fetchHealthData} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Health Score */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saúde do Sistema de Regras</h2>
          <p className="text-muted-foreground">
            Monitoramento e manutenção das regras de categorização
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchHealthData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => runMaintenance(['all'])}
            disabled={isRunningMaintenance}
          >
            {isRunningMaintenance ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4 mr-2" />
            )}
            Executar Manutenção
          </Button>
        </div>
      </div>

      {/* Health Score Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-8">
            {/* Score circular */}
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${healthData.healthScore * 3.52} 352`}
                  strokeLinecap="round"
                  className={getHealthScoreColor(healthData.healthScore)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getHealthScoreColor(healthData.healthScore)}`}>
                  {healthData.healthScore}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            </div>

            {/* Status e estatísticas */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant="outline"
                  className={`${getHealthScoreBgColor(healthData.healthScore)} text-white border-0`}
                >
                  {healthData.healthStatus.label}
                </Badge>
                <span className="text-muted-foreground">
                  {healthData.statistics.activeRules} regras ativas de {healthData.statistics.totalRules} totais
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Confiança Média</p>
                  <p className="text-2xl font-semibold">{healthData.statistics.averageConfidence}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saúde Média</p>
                  <p className="text-2xl font-semibold">{healthData.performance.averageHealth}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precisão Média</p>
                  <p className="text-2xl font-semibold">{healthData.performance.averagePrecision}%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {healthData.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas ({healthData.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getAlertBgColor(alert.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{alert.title}</p>
                      {alert.count && (
                        <Badge variant="secondary">{alert.count}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.description}
                    </p>
                  </div>
                  {alert.actionUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={alert.actionUrl}>Ver detalhes</a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Grid de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Conflitos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Conflitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.conflicts.total}
            </div>
            <div className="text-sm text-muted-foreground">
              {healthData.conflicts.crossCategory} entre categorias
            </div>
            {healthData.conflicts.crossCategory > 0 && (
              <Badge variant="destructive" className="mt-2">
                Atenção necessária
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Regras Órfãs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Regras Órfãs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.orphanRules.total}
            </div>
            <div className="text-sm text-muted-foreground">
              sem categoria válida
            </div>
            {healthData.orphanRules.total > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => runMaintenance(['orphans'])}
                disabled={isRunningMaintenance}
              >
                Limpar
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Regras para Revisão */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Para Revisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.performance.byRecommendation.review || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              precisam de atenção
            </div>
          </CardContent>
        </Card>

        {/* Baixo Desempenho */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Baixo Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.performance.byRecommendation.deactivate || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              podem ser desativadas
            </div>
            {(healthData.performance.byRecommendation.deactivate || 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => runMaintenance(['maintenance'])}
                disabled={isRunningMaintenance}
              >
                Limpar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
          <CardDescription>
            Ciclo de vida das regras de categorização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(healthData.performance.byStatus).map(([status, count]) => {
              const total = healthData.statistics.totalRules;
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{status}</span>
                    <span className="text-muted-foreground">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detalhes de Conflitos (se houver) */}
      {healthData.conflicts.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Detalhes dos Conflitos
            </CardTitle>
            <CardDescription>
              Regras com padrões similares apontando para categorias diferentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData.conflicts.details.map((conflict, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-0.5 rounded text-sm">
                          {conflict.rule1.rulePattern}
                        </code>
                        <span className="text-muted-foreground">vs</span>
                        <code className="bg-muted px-2 py-0.5 rounded text-sm">
                          {conflict.rule2.rulePattern}
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(conflict.similarity * 100)}% similaridade
                      </p>
                    </div>
                    <Badge variant="destructive">
                      Categorias diferentes
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado ideal */}
      {healthData.alerts.length === 0 && healthData.healthScore >= 90 && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sistema Saudável</h3>
            <p className="text-muted-foreground">
              Todas as regras estão funcionando corretamente. Nenhuma ação necessária.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RulesHealthDashboard;
