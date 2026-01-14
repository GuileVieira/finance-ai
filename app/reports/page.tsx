'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import DREStatement from '@/components/reports/dre-statement';
import CashFlowReport from '@/components/reports/cash-flow-report';
import CategoryAnalysis from '@/components/reports/category-analysis';
import PeriodComparison from '@/components/reports/period-comparison';
import InsightsCard from '@/components/reports/insights-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Download, AlertTriangle, FileUp, Upload, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateFilterSelect } from '@/components/shared/date-filter-select';
import { FilterBar } from '@/components/shared/filter-bar';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { DashboardAPI } from '@/lib/api/dashboard';
import { DateRange } from 'react-day-picker';
import { DREMappingWidget } from '@/components/dashboard/dre-mapping-widget';
import { Settings } from 'lucide-react';
import {
  DREStatement as DREType,
  CashFlowReport as CashFlowType,
  Insight,
  CategoryRule,
  ReportPeriod
} from '@/lib/types';
import { useReportsData, useFinancialInsights } from '@/hooks/use-reports';
import { useAvailablePeriods } from '@/hooks/use-periods';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('dre');
  const { filters, setFilters, setFilterValue } = usePersistedFilters();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [isDREWidgetOpen, setIsDREWidgetOpen] = useState(false);

  const { data: periodsResponse, isLoading: isLoadingPeriods } = useAvailablePeriods({ companyId: filters.companyId });
  const availablePeriods = useMemo<ReportPeriod[]>(() => {
    return (periodsResponse?.periods || []).map(period => ({
      id: period.id,
      name: period.label.replace('/', ' '),
      startDate: period.startDate,
      endDate: period.endDate,
      type: period.type,
    }));
  }, [periodsResponse]);

  useEffect(() => {
    if (isLoadingPeriods) return;

    if (availablePeriods.length === 0) {
      if (filters.period !== 'all') {
        setFilterValue('period', 'all');
      }
      return;
    }

    if (filters.period !== 'all' && availablePeriods.some(period => period.id === filters.period)) {
      return;
    }

    // Default to 'all' if current is not valid and not 'all'
    if (filters.period !== 'all') {
      // setFilterValue('period', 'all');
    }
  }, [isLoadingPeriods, availablePeriods, filters.period, setFilterValue]);

  // Usar hooks do TanStack Query para buscar dados dos relatórios
  const {
    dreData,
    cashFlowData,
    insightsData,
    isLoading,
    hasError,
    firstError,
    refetchAll,
    exportDRE,
    exportCashFlow
  } = useReportsData(filters, {
    enabled: true,
    refetchInterval: 1000 * 60 * 15, // Atualizar a cada 15 minutos
  });

  // dreData agora contém { current, comparison } automaticamente via useDREComparison

  const handleFilterChange = (key: string, value: string) => {
    setFilterValue(key as any, value);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    // Só atualiza os filtros quando ambas as datas estiverem selecionadas
    if (range?.from && range?.to) {
      setFilters({
        ...filters,
        period: 'custom',
        startDate: range.from.toISOString().split('T')[0],
        endDate: range.to.toISOString().split('T')[0]
      });
    }
  };

  const handleRefresh = () => {
    refetchAll();
  };

  const handleExport = async (format: 'pdf' | 'excel', reportType: 'dre' | 'cashflow') => {
    try {
      if (reportType === 'dre') {
        await exportDRE(format, filters);
      } else {
        await exportCashFlow(format, filters);
      }
      toast.success('Exportação concluída com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar relatório. Tente novamente.');
    }
  };

  const handleCategoryClick = (_category: unknown) => {
    // TODO: Implementar drill-down da categoria
  };

  const handleRuleEdit = (_rule: CategoryRule) => {
    // TODO: Implementar edição de regras
  };

  const handleInsightClick = (_insight: Insight) => {
    // TODO: Implementar ação de insight
  };

  // Verificar se não há dados (primeira vez)
  const isEmpty = !isLoading && !dreData && !cashFlowData && availablePeriods.length === 0;

  // Se não há dados, mostrar tela de boas-vindas
  if (isEmpty) {
    return (
      <LayoutWrapper>
        <div className="space-y-6">
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="rounded-full bg-muted p-6 mb-6">
                <FileUp className="h-12 w-12 text-muted-foreground" />
              </div>

              <h3 className="text-xl font-semibold mb-2">Nenhum relatório disponível</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Importe seus extratos bancários para começar a gerar relatórios financeiros como DRE, fluxo de caixa e análises por categoria.
              </p>

              <Link href="/upload">
                <Button size="lg" className="gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Extratos OFX
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Filtros e Ações */}
        {/* Filtros e Ações */}
        <div className="flex flex-col gap-4">
          <FilterBar
            period={filters.period}
            accountId={filters.accountId}
            companyId={filters.companyId}
            dateRange={dateRange}
            onPeriodChange={(value) => handleFilterChange('period', value)}
            onAccountChange={(value) => handleFilterChange('accountId', value)}
            onCompanyChange={(value) => handleFilterChange('companyId', value)}
            onDateRangeChange={handleDateRangeChange}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          >
            {/* Add any extra buttons here if needed, or keeping Refresh as internal to FilterBar */}
          </FilterBar>
        </div>

        {/* Mensagem de Erro */}
        {hasError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Erro ao carregar relatórios:</strong> {firstError?.message || 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dre">DRE - Demonstrativo Financeiro</TabsTrigger>
            <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          </TabsList>

          <TabsContent value="dre" className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-96 w-full" />
              </div>
            ) : dreData ? (
              <DREStatement
                data={dreData?.current}
                previousPeriod={dreData?.comparison}
                onExport={(format) => handleExport(format, 'dre')}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum dado DRE encontrado para o período selecionado.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-96 w-full" />
              </div>
            ) : cashFlowData ? (
              <CashFlowReport
                data={cashFlowData}
                onExport={(format) => handleExport(format, 'cashflow')}
                companyId={filters.companyId}
                accountId={filters.accountId}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum dado de fluxo de caixa encontrado para o período selecionado.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            ) : dreData?.current ? (
              <CategoryAnalysis
                categories={dreData.current.categories}
                rules={[]} // TODO: Implementar regras de categorização
                onCategoryClick={handleCategoryClick}
                onRuleEdit={handleRuleEdit}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhuma categoria encontrada para o período selecionado.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-96 w-full" />
              </div>
            ) : dreData?.current && dreData?.comparison ? (
              <PeriodComparison
                currentPeriod={dreData.current}
                previousPeriod={dreData.comparison}
                periods={availablePeriods}
                onPeriodChange={(periodId) => handleFilterChange('period', periodId)}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Dados insuficientes para comparação de períodos.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Insights Financeiros - sempre visível */}
        <div className="mt-8">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : insightsData?.insights && insightsData.insights.length > 0 ? (
            <InsightsCard
              insights={insightsData.insights}
              onInsightClick={handleInsightClick}
            />
          ) : (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <p className="text-gray-500">Nenhum insight disponível no momento.</p>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}
