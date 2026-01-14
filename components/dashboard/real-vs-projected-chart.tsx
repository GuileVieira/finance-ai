'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

interface ChartDataPoint {
  month: string;
  actual: number;
  projected: number;
}

interface RealVsProjectedChartProps {
  data: ChartDataPoint[];
  title: string;
  height?: number;
}

export function RealVsProjectedChart({ data, title, height = 140 }: RealVsProjectedChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Sem dados para {title}
      </div>
    );
  }

  // Formatar valores para o eixo Y (abreviados)
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.1} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
        <Bar
          dataKey="actual"
          name="Real"
          fill="#10b981"
          radius={[2, 2, 0, 0]}
          maxBarSize={20}
        />
        <Bar
          dataKey="projected"
          name="Projetado"
          fill="#6366f1"
          radius={[2, 2, 0, 0]}
          maxBarSize={20}
          opacity={0.6}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
