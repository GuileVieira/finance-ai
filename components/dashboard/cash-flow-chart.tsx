'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { mockCashFlow } from '@/lib/mock-data';

export function CashFlowChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa Diário (Últimos 10 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={mockCashFlow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString('pt-BR')}`,
                name === 'inflow' ? 'Entradas' :
                name === 'outflow' ? 'Saídas' : 'Saldo'
              ]}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
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
            <span className="text-primary font-semibold"> R$ 38.000</span>.
            Mantenha um buffer de caixa de pelo menos 30 dias de despesas fixas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}