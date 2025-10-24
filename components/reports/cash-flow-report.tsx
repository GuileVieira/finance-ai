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
import { CashFlowReport, CashFlowItem } from '@/lib/types';
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

interface CashFlowReportProps {
  data: CashFlowReport;
  onExport?: (format: 'pdf' | 'excel') => void;
}

export default function CashFlowReportComponent({
  data,
  onExport
}: CashFlowReportProps) {
  const [viewType, setViewType] = useState<'daily' | 'summary'>('daily');
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

  const chartData = useMemo(() => {
    return data.dailyFlows.map((flow, index) => ({
      date: formatDate(flow.date),
      balance: flow.balance,
      income: flow.amount > 0 ? flow.amount : 0,
      expense: flow.amount < 0 ? Math.abs(flow.amount) : 0,
      day: index + 1
    }));
  }, [data.dailyFlows]);

  const dailyStats = useMemo(() => {
    const stats = {
      avgDailyIncome: 0,
      avgDailyExpense: 0,
      highestBalance: -Infinity,
      lowestBalance: Infinity,
      daysPositive: 0,
      daysNegative: 0
    };

    if (data.dailyFlows.length === 0) return stats;

    let totalIncome = 0;
    let totalExpense = 0;

    data.dailyFlows.forEach(flow => {
      totalIncome += flow.amount > 0 ? flow.amount : 0;
      totalExpense += flow.amount < 0 ? Math.abs(flow.amount) : 0;

      if (flow.balance > stats.highestBalance) {
        stats.highestBalance = flow.balance;
      }
      if (flow.balance < stats.lowestBalance) {
        stats.lowestBalance = flow.balance;
      }
      if (flow.balance >= 0) {
        stats.daysPositive++;
      } else {
        stats.daysNegative++;
      }
    });

    stats.avgDailyIncome = totalIncome / data.dailyFlows.length;
    stats.avgDailyExpense = totalExpense / data.dailyFlows.length;

    return stats;
  }, [data.dailyFlows]);

  const renderDailyView = () => (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa Diário</CardTitle>
        <p className="text-sm text-muted-foreground">
          Detalhamento das movimentações diárias
        </p>
      </CardHeader>
      <CardContent>
        {/* Gráfico de Fluxo de Caixa */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `R$ ${value/1000}k`} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Entradas vs Saídas */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3">Entradas vs Saídas Diárias</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `R$ ${value/1000}k`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
              <Bar dataKey="income" fill="#10b981" name="Entradas" />
              <Bar dataKey="expense" fill="#ef4444" name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela Detalhada */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Transações Detalhadas</h4>
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
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {data.dailyFlows.map((flow, index) => (
                    <tr key={`${flow.date}-${index}`} className="border-t">
                      <td className="p-3">{formatDate(flow.date)}</td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{flow.description}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {flow.category}
                          </Badge>
                        </div>
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        flow.amount >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {flow.amount >= 0 ? '+' : ''}{formatCurrency(flow.amount)}
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        flow.balance >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {formatCurrency(flow.balance)}
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
  );

  const renderSummaryView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Saldo Inicial e Final */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldos do Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Saldo Inicial</span>
            <span className="font-semibold">{formatCurrency(data.openingBalance)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Saldo Final</span>
            <span className={`font-bold text-lg ${
              data.closingBalance >= 0 ? 'text-success' : 'text-danger'
            }`}>
              {formatCurrency(data.closingBalance)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Variação: {data.closingBalance >= data.openingBalance ? '+' : ''}
            {formatCurrency(data.closingBalance - data.openingBalance)}
          </div>
        </CardContent>
      </Card>

      {/* Total de Entradas e Saídas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimentação Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">Total Entradas</span>
          </div>
          <div className="font-semibold text-success">
            {formatCurrency(data.totalIncome)}
          </div>

          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-danger" />
            <span className="text-sm text-muted-foreground">Total Saídas</span>
          </div>
          <div className="font-semibold text-danger">
            {formatCurrency(data.totalExpense)}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Diárias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estatísticas Diárias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Média Entradas</div>
            <div className="font-semibold text-success">
              {formatCurrency(dailyStats.avgDailyIncome)}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Média Saídas</div>
            <div className="font-semibold text-danger">
              {formatCurrency(dailyStats.avgDailyExpense)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Dias Positivos</div>
              <div className="font-semibold">{dailyStats.daysPositive}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Dias Negativos</div>
              <div className="font-semibold">{dailyStats.daysNegative}</div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Maior Saldo</div>
              <div className="font-semibold text-success">
                {formatCurrency(dailyStats.highestBalance)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Menor Saldo</div>
              <div className="font-semibold text-danger">
                {formatCurrency(dailyStats.lowestBalance)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

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

        <div className="flex gap-2">
          <Select value={viewType} onValueChange={(value: 'daily' | 'summary') => setViewType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Visão Diária</SelectItem>
              <SelectItem value="summary">Visão Resumida</SelectItem>
            </SelectContent>
          </Select>

          {onExport && (
            <>
              <Button variant="outline" size="sm" onClick={() => onExport('excel')}>
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport('pdf')}>
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      {viewType === 'daily' ? renderDailyView() : renderSummaryView()}
    </div>
  );
}