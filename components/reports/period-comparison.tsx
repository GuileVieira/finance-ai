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

  const calculateVariation = (current: number, previous: number) => {
    if (!previous || previous === 0) return { value: 0, isPositive: true, percentage: 0 };
    const variation = ((current - previous) / previous) * 100;
    return {
      value: current - previous,
      percentage: Math.abs(variation),
      isPositive: variation >= 0
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
              value={currentPeriod.period}
              onValueChange={onPeriodChange}
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
                color: 'text-success'
              },
              {
                label: 'Impostos',
                current: currentPeriod.taxes,
                previous: previousPeriod?.taxes,
                color: 'text-danger'
              },
              {
                label: 'Custos Financeiros',
                current: currentPeriod.financialCosts,
                previous: previousPeriod?.financialCosts,
                color: 'text-danger'
              },
              {
                label: 'Receita Líquida',
                current: currentPeriod.netRevenue,
                previous: previousPeriod?.netRevenue,
                color: 'text-success'
              },
              {
                label: 'Custo Variável',
                current: currentPeriod.variableCosts,
                previous: previousPeriod?.variableCosts,
                color: 'text-danger'
              },
              {
                label: 'Custo Fixo',
                current: currentPeriod.fixedCosts,
                previous: previousPeriod?.fixedCosts,
                color: 'text-danger'
              },
              {
                label: 'Resultado Operacional',
                current: currentPeriod.operationalResult,
                previous: previousPeriod?.operationalResult,
                color: currentPeriod.operationalResult >= 0 ? 'text-success' : 'text-danger'
              },
              {
                label: 'Despesas Não Operacionais',
                current: currentPeriod.nonOperationalExpenses,
                previous: previousPeriod?.nonOperationalExpenses,
                color: 'text-danger'
              },
              {
                label: 'Resultado Líquido',
                current: currentPeriod.netResult,
                previous: previousPeriod?.netResult,
                color: currentPeriod.netResult >= 0 ? 'text-success' : 'text-danger'
              }
            ].map((item, index) => {
              const variation = item.previous ? calculateVariation(item.current, item.previous) : null;

              return (
                <div key={index}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(item.current)}</div>
                        {item.previous && (
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
                            {variation.isPositive ? '+' : ''}{formatCurrency(variation.value)}
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
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-danger" />
                  Pontos de Atenção
                </h4>
                <ul className="space-y-2 text-sm">
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
                  {currentPeriod.netResult < previousPeriod.netResult && currentPeriod.netResult < 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-danger mt-1">•</span>
                      <span>Prejuízo aumentou {formatCurrency(
                        Math.abs(currentPeriod.netResult - previousPeriod.netResult)
                      )}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}