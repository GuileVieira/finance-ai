'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import DREStatement from '@/components/reports/dre-statement';
import CashFlowReport from '@/components/reports/cash-flow-report';
import CategoryAnalysis from '@/components/reports/category-analysis';
import PeriodComparison from '@/components/reports/period-comparison';
import InsightsCard from '@/components/reports/insights-card';
import {
  DREStatement as DREType,
  CashFlowReport as CashFlowType,
  Insight,
  CategoryRule,
  ReportPeriod
} from '@/lib/types';
import {
  mockDRECurrent,
  mockDREPrevious,
  mockCashFlow,
  mockInsights,
  mockCategoryRules,
  mockReportPeriods
} from '@/lib/mock-reports';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('dre');
  const [dreData, setDreData] = useState<DREType>();
  const [previousDreData, setPreviousDreData] = useState<DREType>();
  const [cashFlowData, setCashFlowData] = useState<CashFlowType>();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar dados iniciais (mockados por enquanto)
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simular loading delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        setDreData(mockDRECurrent);
        setPreviousDreData(mockDREPrevious);
        setCashFlowData(mockCashFlow);
        setInsights(mockInsights);
        setCategoryRules(mockCategoryRules);
      } catch (error) {
        console.error('Error loading reports data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const exportOptions = {
        format,
        includeDetails: true,
        includeCharts: true,
        period: mockReportPeriods[0],
        categories: []
      };

      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportOptions),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dre-${mockDRECurrent.period}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
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

  if (isLoading) {
    return (
      <LayoutWrapper>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="space-y-6">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="space-y-6">
          {dreData && (
            <DREStatement
              data={dreData}
              previousPeriod={previousDreData}
              onExport={handleExport}
            />
          )}
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-6">
          {cashFlowData && (
            <CashFlowReport
              data={cashFlowData}
              onExport={handleExport}
            />
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {dreData && (
            <CategoryAnalysis
              categories={dreData.categories}
              rules={categoryRules}
              onCategoryClick={handleCategoryClick}
              onRuleEdit={handleRuleEdit}
            />
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {dreData && (
            <PeriodComparison
              currentPeriod={dreData}
              previousPeriod={previousDreData}
              periods={mockReportPeriods}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Insights Financeiros - sempre visível */}
      <div className="mt-8">
        <InsightsCard
          insights={insights}
          onInsightClick={handleInsightClick}
        />
      </div>
      </div>
    </LayoutWrapper>
  );
}