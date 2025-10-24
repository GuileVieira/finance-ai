'use client';

import { MetricCard } from '@/components/dashboard/metric-card';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { TopExpenses } from '@/components/dashboard/top-expenses';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { Insights } from '@/components/dashboard/insights';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart';
import { BudgetComparison } from '@/components/dashboard/budget-comparison';
import { StrategicAlerts } from '@/components/dashboard/strategic-alerts';
import { Benchmarks } from '@/components/dashboard/benchmarks';
import { Scenarios } from '@/components/dashboard/scenarios';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, AlertTriangle } from 'lucide-react';
import { mockMetrics, mockCategories } from '@/lib/mock-data';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';

export default function DashboardPage() {
  return (
    <LayoutWrapper>
      <div className="space-y-6">
      {/* Filtros do Dashboard */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Select defaultValue="setembro-2025">
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="setembro-2025">Setembro/2025</SelectItem>
            <SelectItem value="agosto-2025">Agosto/2025</SelectItem>
            <SelectItem value="julho-2025">Julho/2025</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="todas">
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="bb">Banco do Brasil</SelectItem>
            <SelectItem value="itau">Itaú</SelectItem>
            <SelectItem value="santander">Santander</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alertas Estratégicos */}
      <StrategicAlerts />

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockMetrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* Análises Temporais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart />
        <CashFlowChart />
      </div>

      {/* Comparações e Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetComparison />
        <Benchmarks />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de categorias */}
        <div className="lg:col-span-2">
          <CategoryChart categories={mockCategories} />
        </div>

        {/* Top Despesas */}
        <div>
          <TopExpenses />
        </div>
      </div>

      {/* Cenários e Projeções */}
      <Scenarios />

      {/* Transações e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transações Recentes */}
        <div className="lg:col-span-2">
          <RecentTransactions />
        </div>

        {/* Insights */}
        <div>
          <Insights />
        </div>
      </div>
      </div>
    </LayoutWrapper>
  );
}