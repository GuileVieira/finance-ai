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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('dre');
  const [filters, setFilters] = useState({
    period: 'all',
    accountId: 'all',
    companyId: 'all'
  });

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
      setFilters(prev => {
        if (prev.period === 'all') return prev;
        return { ...prev, period: 'all' };
      });
      return;
    }

    setFilters(prev => {
      if (prev.period !== 'all' && availablePeriods.some(period => period.id === prev.period)) {
        return prev;
      }
      if (prev.period === availablePeriods[0]?.id) return prev;
      return { ...prev, period: availablePeriods[0].id };
    });
  }, [isLoadingPeriods, availablePeriods.length, availablePeriods[0]?.id]);

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
    setFilters(prev => ({ ...prev, [key]: value }));
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
    } catch (error) {
      console.error('Export error:', error);
      // TODO: Mostrar toast de erro
    }
  };

  const handleCategoryClick = (category: any) => {
    console.log('Category clicked:', category);
    // TODO: Implementar drill-down da categoria
  };

  const handleRuleEdit = (rule: CategoryRule) => {
    console.log('Rule edit:', rule);
    // TODO: Implementar edição de regras
  };

  const handleInsightClick = (insight: Insight) => {
    console.log('Insight clicked:', insight);
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
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Select
              value={filters.period}
              onValueChange={(value) => handleFilterChange('period', value)}
              disabled={isLoadingPeriods}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={isLoadingPeriods ? 'Carregando períodos...' : 'Selecione o período'} />
              </SelectTrigger>
              <SelectContent>
                {!isLoadingPeriods && availablePeriods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
                <SelectItem value="all">Todos os períodos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.accountId} onValueChange={(value) => handleFilterChange('accountId', value)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="bb">Banco do Brasil</SelectItem>
                <SelectItem value="itau">Itaú</SelectItem>
                <SelectItem value="santander">Santander</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
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
