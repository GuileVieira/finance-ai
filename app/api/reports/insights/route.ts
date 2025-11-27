import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import InsightsService from '@/lib/services/insights.service';
import type { InsightPriority } from '@/lib/types';
import { requireAuth } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
  try {
    const { companyId: sessionCompanyId } = await requireAuth();
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    const category = searchParams.get('category') || undefined;
    const type = searchParams.get('type') as 'alert' | 'recommendation' | 'positive' | 'trend' | undefined;
    const companyId = sessionCompanyId; // Usar companyId da sessão
    const accountId = searchParams.get('accountId') || undefined;
    const extended = searchParams.get('extended') === 'true'; // Novo parâmetro para usar getAllInsights

    console.log('📊 [INSIGHTS-API] Buscando insights com filtros:', { period, category, type, companyId, accountId, extended });

    if (extended) {
      // Usar o novo método que inclui sazonalidade, recorrência e anomalias
      const allInsightsData = await InsightsService.getAllInsights({
        period,
        category,
        type,
        companyId,
        accountId
      });

      // Filtrar por categoria se especificado
      let filteredInsights = allInsightsData.insights;
      if (category) {
        filteredInsights = filteredInsights.filter(insight =>
          insight.category?.toLowerCase().includes(category.toLowerCase())
        );
      }

      // Filtrar por tipo se especificado
      if (type) {
        filteredInsights = filteredInsights.filter(insight => insight.type === type);
      }

      return NextResponse.json({
        success: true,
        data: {
          insights: filteredInsights,
          criticalInsights: allInsightsData.criticalInsights,
          total: filteredInsights.length,
          period: allInsightsData.period,
          sources: {
            deterministic: filteredInsights.filter(i => i.source === 'deterministic').length,
            seasonality: filteredInsights.filter(i => i.source === 'seasonality').length,
            recurrence: filteredInsights.filter(i => i.source === 'recurrence').length,
            anomaly: filteredInsights.filter(i => i.source === 'anomaly').length
          }
        }
      });
    }

    // Comportamento original para compatibilidade
    const insightsData = await InsightsService.getFinancialInsights({
      period,
      category,
      type,
      companyId,
      accountId
    });

    return NextResponse.json({
      success: true,
      data: insightsData
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch insights'
      },
      { status: 500 }
    );
  }
}