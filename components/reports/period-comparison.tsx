'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { DREStatement, ReportPeriod } from '@/lib/types';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

interface PeriodComparisonProps {
  currentPeriod: DREStatement;
  previousPeriod?: DREStatement;
  historicalData?: DREStatement[];
  periods?: ReportPeriod[];
  onPeriodChange?: (periodId: string) => void;
}

const MetricIcon = ({ metric }: { metric: string }) => {
  const iconMap = {
    revenue: DollarSign,
    costs: TrendingDown,
    result: DollarSign,
    margin: Percent
  };

  const IconComponent = iconMap[metric as keyof typeof iconMap] || DollarSign;
  return <IconComponent className="w-4 h-4 mr-2" />;
};

export default function PeriodComparison({
  currentPeriod,
  previousPeriod,
  historicalData = [],
  periods = [],
  onPeriodChange
}: PeriodComparisonProps) {
  const [comparisonMetric, setComparisonMetric] = useState<'revenue' | 'costs' | 'result' | 'margin'>('revenue');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Tipo de métrica para determinar se aumento é bom ou ruim
  type MetricType = 'revenue' | 'expense' | 'result';

  // Função CORRIGIDA que considera o contexto da métrica
  const calculateVariationWithContext = (
    current: number,
    previous: number,
    metricType: MetricType
  ) => {
    if (!previous || previous === 0) return { value: 0, isPositive: true, percentage: 0 };

    const variation = ((current - previous) / Math.abs(previous)) * 100;
    const isIncrease = variation > 0;

    let isPositive: boolean;
    if (metricType === 'expense') {
      // Para DESPESAS: REDUÇÃO é positivo (verde), AUMENTO é negativo (vermelho)
      isPositive = !isIncrease;
    } else {
      // Para RECEITAS e RESULTADO: AUMENTO é positivo (verde)
      isPositive = isIncrease;
    }

    return {
      value: current - previous,
      percentage: Math.abs(variation),
      isPositive
    };
  };

  // Função antiga mantida para compatibilidade (usada nos cards de KPI que são receitas)
  const calculateVariation = (current: number, previous: number) => {
    return calculateVariationWithContext(current, previous, 'revenue');
  };

  // Função para calcular tendência dos últimos meses
  const calculateTrend = (metricKey: string, data: DREStatement[]) => {
    if (data.length < 3) return null;

    const values = data.slice(-3).map(d => {
      if (metricKey === 'contributionMargin') return d.contributionMargin.value;
      if (metricKey === 'costs') return d.variableCosts + d.fixedCosts;
      return (d as Record<string, number>)[metricKey] ?? 0;
    });

    // Regressão linear simples para detectar tendência
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v), 0);
    const sumX2 = values.reduce((sum, _, i) => sum + (i * i), 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const avgValue = sumY / n;

    if (avgValue === 0) return null;

    return {
      direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
      strength: Math.abs(slope) / Math.abs(avgValue) * 100 // % de mudança por período
    };
  };

  const comparisonData = useMemo(() => {
    const metrics = {
      revenue: { current: currentPeriod.grossRevenue, previous: previousPeriod?.grossRevenue },
      costs: {
        current: currentPeriod.variableCosts + currentPeriod.fixedCosts,
        previous: previousPeriod ? previousPeriod.variableCosts + previousPeriod.fixedCosts : undefined
      },
      result: { current: currentPeriod.netResult, previous: previousPeriod?.netResult },
      margin: {
        current: currentPeriod.contributionMargin.percentage,
        previous: previousPeriod?.contributionMargin.percentage
      }
    };

    return metrics[comparisonMetric];
  }, [currentPeriod, previousPeriod, comparisonMetric]);

  const chartData = useMemo(() => {
    const allData = [...historicalData, currentPeriod];
    if (previousPeriod) {
      allData.unshift(previousPeriod);
    }

    return allData.map(period => ({
      period: period.period,
      revenue: period.grossRevenue,
      costs: period.variableCosts + period.fixedCosts,
      result: period.netResult,
      margin: period.contributionMargin.percentage,
      netRevenue: period.netRevenue,
      operationalResult: period.operationalResult
    })).sort((a, b) => a.period.localeCompare(b.period));
  }, [historicalData, currentPeriod, previousPeriod]);

  const getMetricConfig = (metric: string) => {
    const configs = {
      revenue: { label: 'Receita Bruta', color: 'oklch(var(--success))' },
      costs: { label: 'Custos Totais', color: 'oklch(var(--danger))' },
      result: { label: 'Resultado Líquido', color: 'oklch(var(--primary))' },
      margin: { label: 'Margem de Contribuição', color: 'oklch(var(--primary-700))' }
    };
    return configs[metric] || configs.revenue;
  };

  const metricConfig = getMetricConfig(comparisonMetric);

  const periodSelectValue = useMemo(() => {
    if (!periods || periods.length === 0) {
      return currentPeriod.period;
    }

    const matchById = periods.find(period => period.id === currentPeriod.period);
    if (matchById) {
      return matchById.id;
    }

    const matchByName = periods.find(period => period.name === currentPeriod.period);
    if (matchByName) {
      return matchByName.id;
    }

    return currentPeriod.period;
  }, [periods, currentPeriod.period]);

  const renderMetricCard = (title: string, currentValue: number, previousValue?: number, format: 'currency' | 'percentage' = 'currency') => {
    const variation = previousValue ? calculateVariation(currentValue, previousValue) : null;

    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-1">{title}</div>
          <div className="text-2xl font-bold mb-2">
            {format === 'currency' ? formatCurrency(currentValue) : formatPercentage(currentValue)}
          </div>
          {variation && (
            <div className={`flex items-center gap-1 text-sm ${
              variation.isPositive ? 'text-success' : 'text-danger'
            }`}>
              {variation.isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>
                {variation.isPositive ? '+' : ''}{format === 'currency' ? formatCurrency(variation.value) : formatPercentage(variation.percentage)}
              </span>
              <span className="text-muted-foreground">
                ({formatPercentage(variation.percentage)})
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Análise Comparativa</h2>
          <p className="text-muted-foreground">
            Comparação entre períodos e tendências históricas
          </p>
        </div>

        <div className="flex gap-2">
          {periods.length > 0 && (
            <Select
              value={periodSelectValue}
              onValueChange={value => onPeriodChange?.(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {renderMetricCard(
          'Receita Bruta',
          currentPeriod.grossRevenue,
          previousPeriod?.grossRevenue
        )}
        {renderMetricCard(
          'Custos Totais',
          currentPeriod.variableCosts + currentPeriod.fixedCosts,
          previousPeriod ? previousPeriod.variableCosts + previousPeriod.fixedCosts : undefined
        )}
        {renderMetricCard(
          'Margem de Contribuição',
          currentPeriod.contributionMargin.percentage,
          previousPeriod?.contributionMargin.percentage,
          'percentage'
        )}
        {renderMetricCard(
          'Resultado Líquido',
          currentPeriod.netResult,
          previousPeriod?.netResult
        )}
      </div>

      {/* Configurações do Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Evolução Histórica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Métrica:</span>
              <div className="flex gap-2">
                {(['revenue', 'costs', 'result', 'margin'] as const).map((metric) => (
                  <Button
                    key={metric}
                    variant={comparisonMetric === metric ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setComparisonMetric(metric)}
                  >
                    <MetricIcon metric={metric} />
                    {getMetricConfig(metric).label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Gráfico:</span>
              <div className="flex gap-2">
                <Button
                  variant={chartType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('line')}
                >
                  Linha
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                >
                  Barras
                </Button>
              </div>
            </div>
          </div>

          {/* Gráfico */}
          {chartType === 'line' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.15} />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => {
                  if (comparisonMetric === 'margin') return `${value}%`;
                  return `R$ ${(value/1000).toFixed(0)}k`;
                }} />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number) => [
                    comparisonMetric === 'margin' ? formatPercentage(value) : formatCurrency(value),
                    metricConfig.label
                  ]}
                  labelFormatter={(label) => `Período: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey={comparisonMetric}
                  stroke={metricConfig.color}
                  strokeWidth={2}
                  dot={{ fill: metricConfig.color, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.15} />
                <XAxis type="number" tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                <YAxis dataKey="period" type="category" width={120} />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => [
                    name === 'value' ? formatCurrency(value) : value,
                    name === 'value' ? 'Valor' : name
                  ]}
                  labelFormatter={(label) => `Período: ${label}`}
                />
                <Bar dataKey={comparisonMetric} fill={metricConfig.color} barSize={20} maxBarSize={25} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Comparativo Detalhado */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Detalhado</CardTitle>
          <p className="text-sm text-muted-foreground">
            {currentPeriod.period} vs {previousPeriod?.period || 'Período Anterior'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                label: 'Receita Bruta',
                current: currentPeriod.grossRevenue,
                previous: previousPeriod?.grossRevenue,
                metricType: 'revenue' as MetricType
              },
              {
                label: 'Impostos',
                current: currentPeriod.taxes,
                previous: previousPeriod?.taxes,
                metricType: 'expense' as MetricType
              },
              {
                label: 'Custos Financeiros',
                current: currentPeriod.financialCosts,
                previous: previousPeriod?.financialCosts,
                metricType: 'expense' as MetricType
              },
              {
                label: 'Receita Líquida',
                current: currentPeriod.netRevenue,
                previous: previousPeriod?.netRevenue,
                metricType: 'revenue' as MetricType
              },
              {
                label: 'Custo Variável',
                current: currentPeriod.variableCosts,
                previous: previousPeriod?.variableCosts,
                metricType: 'expense' as MetricType
              },
              {
                label: 'Custo Fixo',
                current: currentPeriod.fixedCosts,
                previous: previousPeriod?.fixedCosts,
                metricType: 'expense' as MetricType
              },
              {
                label: 'Resultado Operacional',
                current: currentPeriod.operationalResult,
                previous: previousPeriod?.operationalResult,
                metricType: 'result' as MetricType
              },
              {
                label: 'Despesas Não Operacionais',
                current: currentPeriod.nonOperationalExpenses,
                previous: previousPeriod?.nonOperationalExpenses,
                metricType: 'expense' as MetricType
              },
              {
                label: 'Resultado Líquido',
                current: currentPeriod.netResult,
                previous: previousPeriod?.netResult,
                metricType: 'result' as MetricType
              }
            ].map((item, index) => {
              // Usar a nova função que considera o tipo da métrica
              const variation = item.previous !== undefined
                ? calculateVariationWithContext(item.current, item.previous, item.metricType)
                : null;

              return (
                <div key={index}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(item.current)}</div>
                        {item.previous !== undefined && (
                          <div className="text-sm text-muted-foreground">
                            Antes: {formatCurrency(item.previous)}
                          </div>
                        )}
                      </div>
                      {variation && (
                        <div className={`flex items-center gap-1 text-sm ${
                          variation.isPositive ? 'text-success' : 'text-danger'
                        }`}>
                          {variation.isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {variation.value >= 0 ? '+' : ''}{formatCurrency(variation.value)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {index < 8 && <Separator />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights da Comparação */}
      {previousPeriod && (
        <Card>
          <CardHeader>
            <CardTitle>Insights da Comparação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  Pontos Positivos
                </h4>
                <ul className="space-y-2 text-sm">
                  {currentPeriod.grossRevenue > previousPeriod.grossRevenue && (
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <span>Receita aumentou {formatPercentage(
                        ((currentPeriod.grossRevenue - previousPeriod.grossRevenue) / previousPeriod.grossRevenue) * 100
                      )}</span>
                    </li>
                  )}
                  {currentPeriod.contributionMargin.percentage > previousPeriod.contributionMargin.percentage && (
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <span>Margem melhorou em {formatPercentage(
                        currentPeriod.contributionMargin.percentage - previousPeriod.contributionMargin.percentage
                      )}</span>
                    </li>
                  )}
                  {currentPeriod.netResult > previousPeriod.netResult && (
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <span>Resultado líquido aumentou {formatCurrency(
                        currentPeriod.netResult - previousPeriod.netResult
                      )}</span>
                    </li>
                  )}
                  {/* Custos que diminuíram - POSITIVO */}
                  {currentPeriod.variableCosts < previousPeriod.variableCosts && (
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <span>Custos variáveis reduziram {formatCurrency(
                        previousPeriod.variableCosts - currentPeriod.variableCosts
                      )}</span>
                    </li>
                  )}
                  {currentPeriod.fixedCosts < previousPeriod.fixedCosts && (
                    <li className="flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <span>Custos fixos reduziram {formatCurrency(
                        previousPeriod.fixedCosts - currentPeriod.fixedCosts
                      )}</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-danger" />
                  Pontos de Atenção
                </h4>
                <ul className="space-y-2 text-sm">
                  {/* Receita diminuiu */}
                  {currentPeriod.grossRevenue < previousPeriod.grossRevenue && (
                    <li className="flex items-start gap-2">
                      <span className="text-danger mt-1">•</span>
                      <span>Receita diminuiu {formatPercentage(
                        Math.abs((currentPeriod.grossRevenue - previousPeriod.grossRevenue) / previousPeriod.grossRevenue) * 100
                      )}</span>
                    </li>
                  )}
                  {/* Margem piorou */}
                  {currentPeriod.contributionMargin.percentage < previousPeriod.contributionMargin.percentage && (
                    <li className="flex items-start gap-2">
                      <span className="text-danger mt-1">•</span>
                      <span>Margem caiu {formatPercentage(
                        previousPeriod.contributionMargin.percentage - currentPeriod.contributionMargin.percentage
                      )}</span>
                    </li>
                  )}
                  {currentPeriod.variableCosts > previousPeriod.variableCosts && (
                    <li className="flex items-start gap-2">
                      <span className="text-danger mt-1">•</span>
                      <span>Custos variáveis aumentaram {formatCurrency(
                        currentPeriod.variableCosts - previousPeriod.variableCosts
                      )}</span>
                    </li>
                  )}
                  {currentPeriod.fixedCosts > previousPeriod.fixedCosts && (
                    <li className="flex items-start gap-2">
                      <span className="text-danger mt-1">•</span>
                      <span>Custos fixos aumentaram {formatCurrency(
                        currentPeriod.fixedCosts - previousPeriod.fixedCosts
                      )}</span>
                    </li>
                  )}
                  {/* Resultado operacional negativo */}
                  {currentPeriod.operationalResult < 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-danger mt-1">•</span>
                      <span>Resultado operacional negativo: {formatCurrency(currentPeriod.operationalResult)}</span>
                    </li>
                  )}
                  {currentPeriod.netResult < previousPeriod.netResult && (
                    <li className="flex items-start gap-2">
                      <span className="text-danger mt-1">•</span>
                      <span>Resultado líquido piorou {formatCurrency(
                        Math.abs(currentPeriod.netResult - previousPeriod.netResult)
                      )}</span>
                    </li>
                  )}
                  {/* Despesas financeiras aumentaram */}
                  {currentPeriod.financialCosts > previousPeriod.financialCosts && currentPeriod.financialCosts > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-danger mt-1">•</span>
                      <span>Custos financeiros aumentaram {formatCurrency(
                        currentPeriod.financialCosts - previousPeriod.financialCosts
                      )}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Seção de Tendências (se houver dados históricos) */}
            {historicalData.length >= 2 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium mb-3">Tendências (últimos {Math.min(historicalData.length + 1, 3)} meses)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const allData = previousPeriod ? [previousPeriod, ...historicalData, currentPeriod] : [...historicalData, currentPeriod];
                    const revenueTrend = calculateTrend('grossRevenue', allData);
                    const costsTrend = calculateTrend('costs', allData);
                    const marginTrend = calculateTrend('contributionMargin', allData);

                    return (
                      <>
                        {revenueTrend && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                            {revenueTrend.direction === 'up' ? (
                              <TrendingUp className="w-5 h-5 text-success" />
                            ) : revenueTrend.direction === 'down' ? (
                              <TrendingDown className="w-5 h-5 text-danger" />
                            ) : (
                              <div className="w-5 h-5 text-muted-foreground">—</div>
                            )}
                            <div>
                              <div className="text-sm font-medium">Receita</div>
                              <div className={`text-xs ${revenueTrend.direction === 'up' ? 'text-success' : revenueTrend.direction === 'down' ? 'text-danger' : 'text-muted-foreground'}`}>
                                {revenueTrend.direction === 'up' ? 'Em alta' : revenueTrend.direction === 'down' ? 'Em queda' : 'Estável'}
                                {revenueTrend.strength > 1 && ` (${revenueTrend.strength.toFixed(1)}%/mês)`}
                              </div>
                            </div>
                          </div>
                        )}
                        {costsTrend && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                            {costsTrend.direction === 'up' ? (
                              <TrendingUp className="w-5 h-5 text-danger" />
                            ) : costsTrend.direction === 'down' ? (
                              <TrendingDown className="w-5 h-5 text-success" />
                            ) : (
                              <div className="w-5 h-5 text-muted-foreground">—</div>
                            )}
                            <div>
                              <div className="text-sm font-medium">Custos</div>
                              <div className={`text-xs ${costsTrend.direction === 'down' ? 'text-success' : costsTrend.direction === 'up' ? 'text-danger' : 'text-muted-foreground'}`}>
                                {costsTrend.direction === 'up' ? 'Aumentando' : costsTrend.direction === 'down' ? 'Reduzindo' : 'Estável'}
                                {costsTrend.strength > 1 && ` (${costsTrend.strength.toFixed(1)}%/mês)`}
                              </div>
                            </div>
                          </div>
                        )}
                        {marginTrend && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                            {marginTrend.direction === 'up' ? (
                              <TrendingUp className="w-5 h-5 text-success" />
                            ) : marginTrend.direction === 'down' ? (
                              <TrendingDown className="w-5 h-5 text-danger" />
                            ) : (
                              <div className="w-5 h-5 text-muted-foreground">—</div>
                            )}
                            <div>
                              <div className="text-sm font-medium">Margem</div>
                              <div className={`text-xs ${marginTrend.direction === 'up' ? 'text-success' : marginTrend.direction === 'down' ? 'text-danger' : 'text-muted-foreground'}`}>
                                {marginTrend.direction === 'up' ? 'Melhorando' : marginTrend.direction === 'down' ? 'Piorando' : 'Estável'}
                                {marginTrend.strength > 1 && ` (${marginTrend.strength.toFixed(1)}%/mês)`}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
