'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendData } from '@/lib/api/dashboard';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

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
      dayLabel = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    return {
      day: dayLabel,
      inflow: item.income,
      outflow: item.expenses,
      balance: item.balance
    };
  });

  // Calcular saldo mínimo e final
  const minBalance = Math.min(...chartData.map(d => d.balance));
  const closingBalance = chartData[chartData.length - 1]?.balance ?? 0;
  const openingBalance = data[0]?.openingBalance;
  const hasSpecificPeriod = period && period !== 'all';

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
              content={<CustomTooltip />}
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
        <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
          {hasSpecificPeriod && openingBalance != null ? (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Saldo Inicial</span>
                <span className="font-semibold text-foreground">
                  R$ {openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Saldo Mínimo</span>
                <span className={`font-semibold ${minBalance < 0 ? 'text-red-600' : 'text-foreground'}`}>
                  R$ {minBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Saldo Final</span>
                <span className={`font-semibold ${closingBalance < 0 ? 'text-red-600' : 'text-foreground'}`}>
                  R$ {closingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Saldo mínimo no período:
              <span className={`font-semibold ${minBalance < 0 ? 'text-red-600' : 'text-primary'}`}>
                {' '}R$ {minBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>.
              {' '}Mantenha um buffer de caixa de pelo menos 3 meses de despesas fixas.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}