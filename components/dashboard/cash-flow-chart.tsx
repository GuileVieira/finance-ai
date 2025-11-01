'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendData } from '@/lib/api/dashboard';

interface CashFlowData {
  day: string;
  inflow: number;
  outflow: number;
  balance: number;
}

interface CashFlowChartProps {
  data?: TrendData[];
  isLoading?: boolean;
  period?: string;
}

export function CashFlowChart({ data, isLoading, period }: CashFlowChartProps) {
  // Determinar título baseado no período
  const getChartTitle = () => {
    if (!period || period === 'all') {
      return 'Fluxo de Caixa Mensal';
    }

    // Converter período YYYY-MM para nome do mês
    const [year, month] = period.split('-');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = monthNames[parseInt(month) - 1];

    return `Fluxo de Caixa Diário (${monthName}/${year})`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{getChartTitle()}</CardTitle>
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
          <CardTitle>{getChartTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Nenhum dado disponível</p>
              <p className="text-sm">Adicione transações para visualizar o fluxo de caixa</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transformar TrendData para CashFlowData - usar todos os dados
  const chartData = data.map(item => {
    // Formatar data baseado no período
    let dayLabel: string;

    if (!period || period === 'all') {
      // Para período "all", mostrar como mês/ano
      dayLabel = new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    } else {
      // Para mês específico, mostrar como dia/mês
      dayLabel = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    return {
      day: dayLabel,
      inflow: item.income,
      outflow: item.expenses,
      balance: item.balance
    };
  });

  // Calcular saldo mínimo
  const minBalance = Math.min(...chartData.map(d => d.balance));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getChartTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.15} />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString('pt-BR')}`,
                name === 'inflow' ? 'Entradas' :
                name === 'outflow' ? 'Saídas' : 'Saldo'
              ]}
            />
            <Bar dataKey="inflow" fill="#10b981" name="inflow" />
            <Bar dataKey="outflow" fill="#ef4444" name="outflow" />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#374151"
              strokeWidth={2}
              name="balance"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">💰 Insight:</span> Saldo mínimo no período foi
            <span className="text-primary font-semibold"> R$ {minBalance.toLocaleString('pt-BR')}</span>.
            {!period || period === 'all'
              ? " Mantenha um buffer de caixa de pelo menos 3 meses de despesas fixas."
              : " Mantenha um buffer de caixa de pelo menos 30 dias de despesas fixas."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}