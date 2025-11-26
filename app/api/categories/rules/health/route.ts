import { NextRequest, NextResponse } from 'next/server';
import CategoryRulesService from '@/lib/services/category-rules.service';
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';

/**
 * GET /api/categories/rules/health
 *
 * Retorna estatísticas de saúde do sistema de regras incluindo:
 * - Regras conflitantes
 * - Regras órfãs
 * - Estatísticas gerais
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId é obrigatório' },
        { status: 400 }
      );
    }

    // Executar todas as verificações em paralelo
    const [
      rulesStats,
      conflicts,
      orphanRules,
      systemHealth
    ] = await Promise.all([
      CategoryRulesService.getRulesStatistics(),
      CategoryRulesService.findConflictingRules(companyId),
      CategoryRulesService.findOrphanRules(companyId),
      TransactionCategorizationService.getSystemHealth(companyId)
    ]);

    // Calcular alertas
    const alerts: Array<{
      type: 'error' | 'warning' | 'info';
      title: string;
      description: string;
      count?: number;
      actionUrl?: string;
    }> = [];

    // Alertas de conflitos cross-category (grave)
    const crossCategoryConflicts = conflicts.filter(c => c.isCrossCategory);
    if (crossCategoryConflicts.length > 0) {
      alerts.push({
        type: 'error',
        title: 'Conflitos de Regras Detectados',
        description: `${crossCategoryConflicts.length} regra(s) com padrões similares apontam para categorias diferentes. Isso pode causar categorizações inconsistentes.`,
        count: crossCategoryConflicts.length,
        actionUrl: '/settings/categories?tab=conflicts'
      });
    }

    // Alertas de regras órfãs
    if (orphanRules.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Regras Órfãs Encontradas',
        description: `${orphanRules.length} regra(s) apontam para categorias que não existem mais.`,
        count: orphanRules.length,
        actionUrl: '/settings/categories?tab=orphans'
      });
    }

    // Alertas de regras com baixa performance
    const { byRecommendation } = systemHealth.rulesHealth;
    if (byRecommendation.deactivate > 0) {
      alerts.push({
        type: 'warning',
        title: 'Regras com Baixo Desempenho',
        description: `${byRecommendation.deactivate} regra(s) têm desempenho baixo e podem ser desativadas.`,
        count: byRecommendation.deactivate,
        actionUrl: '/settings/categories?tab=performance'
      });
    }

    // Alertas de regras para revisar
    if (byRecommendation.review > 0) {
      alerts.push({
        type: 'info',
        title: 'Regras para Revisão',
        description: `${byRecommendation.review} regra(s) precisam de revisão para melhorar a precisão.`,
        count: byRecommendation.review
      });
    }

    // Health score geral (0-100)
    const healthScore = calculateOverallHealthScore({
      conflicts: crossCategoryConflicts.length,
      orphans: orphanRules.length,
      lowPerformance: byRecommendation.deactivate,
      totalRules: rulesStats.totalRules,
      averageConfidence: rulesStats.averageConfidence,
      averageHealth: systemHealth.rulesHealth.averageHealth
    });

    return NextResponse.json({
      success: true,
      data: {
        healthScore,
        healthStatus: getHealthStatus(healthScore),
        alerts,
        statistics: {
          totalRules: rulesStats.totalRules,
          activeRules: rulesStats.activeRules,
          rulesByType: rulesStats.rulesByType,
          averageConfidence: rulesStats.averageConfidence
        },
        conflicts: {
          total: conflicts.length,
          crossCategory: crossCategoryConflicts.length,
          sameCategory: conflicts.length - crossCategoryConflicts.length,
          details: crossCategoryConflicts.slice(0, 10) // Limitar detalhes
        },
        orphanRules: {
          total: orphanRules.length,
          details: orphanRules.slice(0, 10)
        },
        performance: {
          byStatus: systemHealth.rulesHealth.byStatus,
          byRecommendation: systemHealth.rulesHealth.byRecommendation,
          averageHealth: Math.round(systemHealth.rulesHealth.averageHealth * 100),
          averagePrecision: Math.round(systemHealth.rulesHealth.averagePrecision * 100)
        },
        autoLearning: systemHealth.autoRulesStats,
        clustering: systemHealth.clusterStats
      }
    });

  } catch (error) {
    console.error('[RULES-HEALTH-API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao obter saúde das regras',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories/rules/health
 *
 * Executa manutenção no sistema de regras:
 * - Desativa regras órfãs
 * - Desativa regras com baixo desempenho
 * - Processa clusters pendentes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, actions } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId é obrigatório' },
        { status: 400 }
      );
    }

    const results: Record<string, number> = {};

    // Executar ações solicitadas
    if (actions?.includes('orphans') || actions?.includes('all')) {
      results.orphansDeactivated = await CategoryRulesService.deactivateOrphanRules(companyId);
    }

    if (actions?.includes('maintenance') || actions?.includes('all')) {
      const maintenanceResult = await TransactionCategorizationService.performMaintenance(companyId);
      results.clustersProcessed = maintenanceResult.clustersProcessed;
      results.rulesCreated = maintenanceResult.rulesCreated;
      results.rulesDeactivated = maintenanceResult.rulesDeactivated;
    }

    return NextResponse.json({
      success: true,
      message: 'Manutenção executada com sucesso',
      results
    });

  } catch (error) {
    console.error('[RULES-HEALTH-API] Maintenance error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao executar manutenção',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Helpers

function calculateOverallHealthScore(params: {
  conflicts: number;
  orphans: number;
  lowPerformance: number;
  totalRules: number;
  averageConfidence: number;
  averageHealth: number;
}): number {
  const { conflicts, orphans, lowPerformance, totalRules, averageConfidence, averageHealth } = params;

  if (totalRules === 0) return 100;

  // Começar com 100 e subtrair penalidades
  let score = 100;

  // Penalidade por conflitos (grave: -10 por conflito, max -30)
  score -= Math.min(30, conflicts * 10);

  // Penalidade por regras órfãs (-5 por regra, max -20)
  score -= Math.min(20, orphans * 5);

  // Penalidade por baixo desempenho (-3 por regra, max -15)
  score -= Math.min(15, lowPerformance * 3);

  // Bônus/penalidade pela confiança média
  if (averageConfidence >= 85) {
    score += 5;
  } else if (averageConfidence < 70) {
    score -= 10;
  }

  // Considerar saúde média das regras
  score = score * 0.7 + (averageHealth * 100) * 0.3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthStatus(score: number): {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  label: string;
  color: string;
} {
  if (score >= 90) {
    return { status: 'excellent', label: 'Excelente', color: 'green' };
  } else if (score >= 75) {
    return { status: 'good', label: 'Bom', color: 'blue' };
  } else if (score >= 60) {
    return { status: 'fair', label: 'Regular', color: 'yellow' };
  } else if (score >= 40) {
    return { status: 'poor', label: 'Ruim', color: 'orange' };
  } else {
    return { status: 'critical', label: 'Crítico', color: 'red' };
  }
}
