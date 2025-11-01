'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

interface TrendData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
  transactions: number;
}

interface TrendChartProps {
  data?: TrendData[];
  isLoading?: boolean;
}

export function TrendChart({ data, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução Receita vs Despesa</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução Receita vs Despesa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Nenhum dado disponível</p>
              <p className="text-sm">Adicione transações para visualizar a evolução financeira</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Formatar dados para o gráfico
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
    receitas: item.income,
    despesas: item.expenses,
    saldo: item.balance
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Receita vs Despesa</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.15} />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="receitas"
              stroke="#10b981"
              strokeWidth={2}
              name="Receitas"
            />
            <Line
              type="monotone"
              dataKey="despesas"
              stroke="#ef4444"
              strokeWidth={2}
              name="Despesas"
            />
            <Line
              type="monotone"
              dataKey="saldo"
              stroke="#374151"
              strokeWidth={2}
              name="Saldo"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">📈 Análise:</span> Visualize a evolução das finanças ao longo do tempo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}