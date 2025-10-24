'use client';

import { useState } from 'react';
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
import { RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DREStatement as DREType,
  CashFlowReport as CashFlowType,
  Insight,
  CategoryRule,
  ReportPeriod
} from '@/lib/types';
import { useReportsData, useFinancialInsights } from '@/hooks/use-reports';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('dre');
  const [filters, setFilters] = useState({
    period: '2025-10',
    accountId: 'all',
    companyId: 'all'
  });

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

  // Para comparação, vamos buscar DRE do período anterior
  const { dreData: previousDreData } = useReportsData({
    ...filters,
    period: '2025-09' // TODO: Calcular período anterior dinamicamente
  }, {
    enabled: false // Desabilitado por enquanto
  });

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

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Filtros e Ações */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-10">Outubro/2025</SelectItem>
                <SelectItem value="2025-09">Setembro/2025</SelectItem>
                <SelectItem value="2025-08">Agosto/2025</SelectItem>
                <SelectItem value="2025-07">Julho/2025</SelectItem>
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
            <TabsTrigger value="dre">DRE</TabsTrigger>
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
                periods={[ // TODO: Implementar períodos dinâmicos
                  { value: '2025-10', label: 'Outubro/2025' },
                  { value: '2025-09', label: 'Setembro/2025' },
                  { value: '2025-08', label: 'Agosto/2025' }
                ]}
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