'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign
} from 'lucide-react';
import { CashFlowReport, CashFlowDay } from '@/lib/types';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar
} from 'recharts';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

interface CashFlowReportProps {
  data: CashFlowReport;
  onExport?: (format: 'pdf' | 'excel') => void;
}

interface AggregatedData {
  label: string;
  income: number;
  expenses: number;
  netFlow: number;
  closingBalance: number;
  transactions: number;
  startDate: string;
  endDate: string;
}

export default function CashFlowReportComponent({
  data,
  onExport
}: CashFlowReportProps) {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const formatDateFull = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para obter a chave de agrupamento baseada na granularidade
  const getGroupKey = (dateStr: string, gran: Granularity): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (gran) {
      case 'daily':
        return dateStr;
      case 'weekly': {
        // Início da semana (segunda-feira)
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        return weekStart.toISOString().split('T')[0];
      }
      case 'monthly':
        return `${year}-${String(month + 1).padStart(2, '0')}`;
      case 'quarterly': {
        const quarter = Math.floor(month / 3) + 1;
        return `${year}-Q${quarter}`;
      }
      case 'semiannual': {
        const semester = month < 6 ? 1 : 2;
        return `${year}-S${semester}`;
      }
      case 'annual':
        return `${year}`;
      default:
        return dateStr;
    }
  };

  // Função para formatar o label do período
  const formatGroupLabel = (key: string, gran: Granularity): string => {
    switch (gran) {
      case 'daily':
        return formatDate(key);
      case 'weekly': {
        const date = new Date(key);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 6);
        return `${formatDate(key)} - ${formatDate(endDate.toISOString().split('T')[0])}`;
      }
      case 'monthly': {
        const [year, month] = key.split('-');
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${months[parseInt(month) - 1]}/${year}`;
      }
      case 'quarterly': {
        const [year, q] = key.split('-Q');
        return `${q}T/${year}`;
      }
      case 'semiannual': {
        const [year, s] = key.split('-S');
        return `${s}S/${year}`;
      }
      case 'annual':
        return key;
      default:
        return key;
    }
  };

  // Agregar dados baseado na granularidade
  const aggregatedData = useMemo((): AggregatedData[] => {
    if (!data?.cashFlowDays || !Array.isArray(data.cashFlowDays) || data.cashFlowDays.length === 0) {
      return [];
    }

    const groups = new Map<string, {
      income: number;
      expenses: number;
      transactions: number;
      lastClosingBalance: number;
      startDate: string;
      endDate: string;
    }>();

    // Ordenar por data
    const sortedDays = [...data.cashFlowDays].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedDays.forEach((day: CashFlowDay) => {
      const key = getGroupKey(day.date, granularity);

      if (!groups.has(key)) {
        groups.set(key, {
          income: 0,
          expenses: 0,
          transactions: 0,
          lastClosingBalance: day.closingBalance,
          startDate: day.date,
          endDate: day.date
        });
      }

      const group = groups.get(key)!;
      group.income += day.income;
      group.expenses += day.expenses;
      group.transactions += day.transactions;
      group.lastClosingBalance = day.closingBalance;
      group.endDate = day.date;
    });

    // Converter para array e ordenar
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        label: formatGroupLabel(key, granularity),
        income: value.income,
        expenses: value.expenses,
        netFlow: value.income - value.expenses,
        closingBalance: value.lastClosingBalance,
        transactions: value.transactions,
        startDate: value.startDate,
        endDate: value.endDate
      }));
  }, [data.cashFlowDays, granularity]);

  // Dados para o gráfico
  const chartData = useMemo(() => {
    return aggregatedData.map((item, index) => ({
      label: item.label,
      balance: item.closingBalance,
      inflow: item.income,
      outflow: item.expenses,
      index: index + 1
    }));
  }, [aggregatedData]);

  // Estatísticas do período
  const periodStats = useMemo(() => {
    const stats = {
      avgIncome: 0,
      avgExpense: 0,
      highestBalance: -Infinity,
      lowestBalance: Infinity,
      periodsPositive: 0,
      periodsNegative: 0,
      totalPeriods: aggregatedData.length
    };

    if (aggregatedData.length === 0) return stats;

    let totalIncome = 0;
    let totalExpense = 0;

    aggregatedData.forEach((item) => {
      totalIncome += item.income;
      totalExpense += item.expenses;

      if (item.closingBalance > stats.highestBalance) {
        stats.highestBalance = item.closingBalance;
      }
      if (item.closingBalance < stats.lowestBalance) {
        stats.lowestBalance = item.closingBalance;
      }
      if (item.netFlow >= 0) {
        stats.periodsPositive++;
      } else {
        stats.periodsNegative++;
      }
    });

    stats.avgIncome = totalIncome / aggregatedData.length;
    stats.avgExpense = totalExpense / aggregatedData.length;

    return stats;
  }, [aggregatedData]);

  const granularityLabels: Record<Granularity, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual'
  };

  const periodLabel = granularityLabels[granularity].toLowerCase().replace('ário', 'ária').replace('al', 'ais').replace('ais', 'al');

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatório de Fluxo de Caixa</h2>
          <p className="text-muted-foreground">
            Análise detalhada do fluxo de caixa - {data.period}
          </p>
        </div>

        {onExport && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport('excel')}>
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport('pdf')}>
              PDF
            </Button>
          </div>
        )}
      </div>

      {/* Visão Resumida - Cards detalhados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Saldo Inicial e Final */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saldos do Período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Saldo Inicial</span>
              </div>
              <span className="font-semibold">{formatCurrency(data.openingBalance)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Saldo Final</span>
              </div>
              <span className={`font-bold text-lg ${
                data.closingBalance >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {formatCurrency(data.closingBalance)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground text-right">
              Variação: {data.closingBalance >= data.openingBalance ? '+' : ''}
              {formatCurrency(data.closingBalance - data.openingBalance)}
            </div>
          </CardContent>
        </Card>

        {/* Total de Entradas e Saídas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Movimentação Total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Total Entradas</span>
            </div>
            <div className="font-semibold text-success text-xl">
              {formatCurrency(data.totalIncome)}
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-danger" />
              <span className="text-sm text-muted-foreground">Total Saídas</span>
            </div>
            <div className="font-semibold text-danger text-xl">
              {formatCurrency(data.totalExpenses)}
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estatísticas do Período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Média Entradas</div>
              <div className="font-semibold text-success">
                {formatCurrency(periodStats.avgIncome)}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Média Saídas</div>
              <div className="font-semibold text-danger">
                {formatCurrency(periodStats.avgExpense)}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">Maior Saldo</div>
                <div className="font-semibold text-success">
                  {formatCurrency(periodStats.highestBalance)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Menor Saldo</div>
                <div className="font-semibold text-danger">
                  {formatCurrency(periodStats.lowestBalance)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico com seletor de granularidade */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Fluxo de Caixa {granularityLabels[granularity]}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detalhamento das movimentações {periodLabel}
              </p>
            </div>
            <Select value={granularity} onValueChange={(value: Granularity) => setGranularity(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="semiannual">Semestral</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Gráfico de Fluxo de Caixa Combinado */}
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  interval={granularity === 'daily' && chartData.length > 30 ? Math.floor(chartData.length / 15) : 0}
                />
                <YAxis tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'inflow' ? 'Entradas' :
                    name === 'outflow' ? 'Saídas' : 'Saldo'
                  ]}
                  labelFormatter={(label) => `Período: ${label}`}
                />
                <Bar dataKey="inflow" fill="#10b981" name="inflow" />
                <Bar dataKey="outflow" fill="#ef4444" name="outflow" />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#374151"
                  strokeWidth={2}
                  dot={{ fill: "#374151", r: 3 }}
                  name="balance"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela Detalhada */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Detalhamento por Período</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
              </Button>
            </div>

            {showDetails && (
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr className="text-sm text-left">
                      <th className="p-3">Período</th>
                      <th className="p-3 text-right">Entradas</th>
                      <th className="p-3 text-right">Saídas</th>
                      <th className="p-3 text-right">Fluxo Líquido</th>
                      <th className="p-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {aggregatedData.map((item, index) => (
                      <tr key={`${item.label}-${index}`} className="border-t">
                        <td className="p-3">
                          <div className="font-medium">{item.label}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.transactions} transações
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-success">
                          {formatCurrency(item.income)}
                        </td>
                        <td className="p-3 text-right text-danger">
                          {formatCurrency(item.expenses)}
                        </td>
                        <td className={`p-3 text-right font-medium ${
                          item.netFlow >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {item.netFlow >= 0 ? '+' : ''}{formatCurrency(item.netFlow)}
                        </td>
                        <td className={`p-3 text-right font-medium ${
                          item.closingBalance >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {formatCurrency(item.closingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
