'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { mockHistoricalData } from '@/lib/mock-data';

export function TrendChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Receita vs Despesa (Últimos 6 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockHistoricalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={2}
              name="Receita"
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#EF4444"
              strokeWidth={2}
              name="Despesas"
            />
            <Line
              type="monotone"
              dataKey="result"
              stroke="#059669"
              strokeWidth={2}
              name="Resultado"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">📈 Insight:</span> As despesas estão crescendo
            <span className="text-red-600 font-semibold"> 21.2%</span> nos últimos 3 meses,
            enquanto a receita cresceu <span className="text-green-600 font-semibold">7.9%</span>.
            É necessário controlar o ritmo de aumento dos custos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}