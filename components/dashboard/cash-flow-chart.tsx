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
}

export function CashFlowChart({ data, isLoading }: CashFlowChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa Diário (Últimos 10 dias)</CardTitle>
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
          <CardTitle>Fluxo de Caixa Diário (Últimos 10 dias)</CardTitle>
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

  // Transformar TrendData para CashFlowData - pegar últimos 10 dias
  const recentData = data.slice(-10).map(item => ({
    day: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    inflow: item.income,
    outflow: item.expenses,
    balance: item.balance
  }));

  // Calcular saldo mínimo
  const minBalance = Math.min(...recentData.map(d => d.balance));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa Diário (Últimos 10 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={recentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString('pt-BR')}`,
                name === 'inflow' ? 'Entradas' :
                name === 'outflow' ? 'Saídas' : 'Saldo'
              ]}
              contentStyle={{
                backgroundColor: 'oklch(var(--popover))',
                border: '1px solid oklch(var(--border))',
                borderRadius: '6px',
                padding: '10px 12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 50
              }}
              wrapperStyle={{ zIndex: 50 }}
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
            <span className="font-medium">💰 Insight:</span> Saldo mínimo nos últimos 10 dias foi
            <span className="text-primary font-semibold"> R$ {minBalance.toLocaleString('pt-BR')}</span>.
            Mantenha um buffer de caixa de pelo menos 30 dias de despesas fixas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}