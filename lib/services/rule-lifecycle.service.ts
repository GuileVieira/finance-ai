/**
 * Rule Lifecycle Service
 *
 * Gerencia o ciclo de vida das regras de categorização:
 * - candidate → active → refined → consolidated
 * - Registro de validações positivas/negativas
 * - Promoção/rebaixamento automático
 * - Desativação de regras com baixo desempenho
 */

import { db } from '@/lib/db/drizzle';
import { categoryRules, ruleFeedback, transactions, categories } from '@/lib/db/schema';
import { eq, and, sql, desc, lt, gt } from 'drizzle-orm';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type RuleStatus = 'candidate' | 'active' | 'refined' | 'consolidated' | 'inactive';

export interface RuleStatusChange {
  ruleId: string;
  oldStatus: RuleStatus;
  newStatus: RuleStatus;
  reason: string;
}

export interface RuleHealthScore {
  ruleId: string;
  health: number;           // 0-1 (saúde geral)
  precision: number;        // validationCount / (validationCount + negativeCount)
  usage: number;           // usageCount normalizado
  recency: number;         // baseado em lastUsedAt
  recommendation: 'keep' | 'review' | 'deactivate';
}

export interface FeedbackResult {
  success: boolean;
  action: 'created' | 'updated' | 'ignored';
  ruleId?: string;
  newStatus?: RuleStatus;
  reason: string;
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const LIFECYCLE_CONFIG = {
  // Threshold para promover de candidate para active
  validationThresholdDefault: 3,

  // Ratio negativo/positivo para rebaixar para inactive
  negativeRatioThreshold: 2.0,

  // Dias sem uso para considerar regra obsoleta
  daysUntilObsolete: 90,

  // Mínimo de usos para avaliar performance
  minimumUsageForEvaluation: 5
};

// ============================================================================
// SERVICE
// ============================================================================

export class RuleLifecycleService {
  /**
   * Verifica se o banco está disponível
   */
  private static checkDatabase(): void {
    if (!db) {
      throw new Error('Database not available');
    }
  }

  // ============================================================================
  // REGISTRO DE FEEDBACK
  // ============================================================================

  /**
   * Registra uso positivo de uma regra (categorização aceita)
   */
  static async recordPositiveUse(
    ruleId: string,
    transactionId?: string
  ): Promise<FeedbackResult> {
    try {
      this.checkDatabase();

      // Atualizar contadores da regra
      await db!
        .update(categoryRules)
        .set({
          usageCount: sql`COALESCE(${categoryRules.usageCount}, 0) + 1`,
          validationCount: sql`COALESCE(${categoryRules.validationCount}, 0) + 1`,
          lastUsedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(categoryRules.id, ruleId));

      // Registrar feedback
      await db!
        .insert(ruleFeedback)
        .values({
          ruleId,
          transactionId: transactionId || null,
          feedbackType: 'positive',
          createdAt: new Date()
        });

      // Verificar se deve promover
      const statusChange = await this.evaluateRuleStatus(ruleId);

      return {
        success: true,
        action: 'updated',
        ruleId,
        newStatus: statusChange?.newStatus,
        reason: statusChange ? statusChange.reason : 'Positive feedback recorded'
      };
    } catch (error) {
      console.error('Error recording positive use:', error);
      return {
        success: false,
        action: 'ignored',
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Registra uso negativo de uma regra (categorização corrigida pelo usuário)
   */
  static async recordNegativeUse(
    ruleId: string,
    transactionId: string,
    oldCategoryId: string,
    newCategoryId: string,
    description?: string
  ): Promise<FeedbackResult> {
    try {
      this.checkDatabase();

      // Atualizar contadores da regra
      await db!
        .update(categoryRules)
        .set({
          negativeCount: sql`COALESCE(${categoryRules.negativeCount}, 0) + 1`,
          updatedAt: new Date()
        })
        .where(eq(categoryRules.id, ruleId));

      // Registrar feedback
      await db!
        .insert(ruleFeedback)
        .values({
          ruleId,
          transactionId,
          feedbackType: 'correction',
          oldCategoryId,
          newCategoryId,
          description,
          createdAt: new Date()
        });

      // Verificar se deve rebaixar
      const statusChange = await this.evaluateRuleStatus(ruleId);

      return {
        success: true,
        action: 'updated',
        ruleId,
        newStatus: statusChange?.newStatus,
        reason: statusChange ? statusChange.reason : 'Negative feedback recorded'
      };
    } catch (error) {
      console.error('Error recording negative use:', error);
      return {
        success: false,
        action: 'ignored',
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // AVALIAÇÃO E PROMOÇÃO/REBAIXAMENTO
  // ============================================================================

  /**
   * Avalia status de uma regra e promove/rebaixa se necessário
   */
  static async evaluateRuleStatus(ruleId: string): Promise<RuleStatusChange | null> {
    try {
      this.checkDatabase();

      const [rule] = await db!
        .select()
        .from(categoryRules)
        .where(eq(categoryRules.id, ruleId))
        .limit(1);

      if (!rule) return null;

      const currentStatus = (rule.status || 'active') as RuleStatus;
      const validationCount = rule.validationCount || 0;
      const negativeCount = rule.negativeCount || 0;
      const threshold = rule.validationThreshold || LIFECYCLE_CONFIG.validationThresholdDefault;

      let newStatus: RuleStatus = currentStatus;
      let reason = '';

      // Lógica de promoção: candidate → active
      if (currentStatus === 'candidate' && validationCount >= threshold) {
        newStatus = 'active';
        reason = `Promoted to active: ${validationCount} validations (threshold: ${threshold})`;
      }

      // Lógica de rebaixamento: active → inactive
      if (currentStatus === 'active' && negativeCount > 0) {
        const ratio = negativeCount / Math.max(1, validationCount);
        if (ratio >= LIFECYCLE_CONFIG.negativeRatioThreshold) {
          newStatus = 'inactive';
          reason = `Deactivated: negative ratio ${ratio.toFixed(2)} exceeds threshold`;
        }
      }

      // Aplicar mudança se houver
      if (newStatus !== currentStatus) {
        await db!
          .update(categoryRules)
          .set({
            status: newStatus,
            active: newStatus !== 'inactive',
            updatedAt: new Date()
          })
          .where(eq(categoryRules.id, ruleId));

        console.log(`📊 [RULE-STATUS-CHANGE] ${ruleId}: ${currentStatus} → ${newStatus} (${reason})`);

        return {
          ruleId,
          oldStatus: currentStatus,
          newStatus,
          reason
        };
      }

      return null;
    } catch (error) {
      console.error('Error evaluating rule status:', error);
      return null;
    }
  }

  /**
   * Promove regra manualmente de candidate para active
   */
  static async promoteToActive(ruleId: string): Promise<RuleStatusChange | null> {
    try {
      this.checkDatabase();

      const [rule] = await db!
        .select()
        .from(categoryRules)
        .where(eq(categoryRules.id, ruleId))
        .limit(1);

      if (!rule) return null;

      const currentStatus = (rule.status || 'candidate') as RuleStatus;

      if (currentStatus !== 'candidate') {
        return null; // Só pode promover candidates
      }

      await db!
        .update(categoryRules)
        .set({
          status: 'active',
          active: true,
          updatedAt: new Date()
        })
        .where(eq(categoryRules.id, ruleId));

      return {
        ruleId,
        oldStatus: currentStatus,
        newStatus: 'active',
        reason: 'Manually promoted to active'
      };
    } catch (error) {
      console.error('Error promoting rule:', error);
      return null;
    }
  }

  /**
   * Desativa regra manualmente
   */
  static async deactivateRule(ruleId: string, reason: string = 'Manual deactivation'): Promise<boolean> {
    try {
      this.checkDatabase();

      await db!
        .update(categoryRules)
        .set({
          status: 'inactive',
          active: false,
          updatedAt: new Date()
        })
        .where(eq(categoryRules.id, ruleId));

      console.log(`🚫 [RULE-DEACTIVATED] ${ruleId}: ${reason}`);
      return true;
    } catch (error) {
      console.error('Error deactivating rule:', error);
      return false;
    }
  }

  // ============================================================================
  // ANÁLISE DE SAÚDE
  // ============================================================================

  /**
   * Calcula score de saúde de uma regra
   */
  static calculateRuleHealth(rule: {
    id: string;
    validationCount?: number | null;
    negativeCount?: number | null;
    usageCount?: number | null;
    lastUsedAt?: Date | null;
  }): RuleHealthScore {
    const validationCount = rule.validationCount || 0;
    const negativeCount = rule.negativeCount || 0;
    const usageCount = rule.usageCount || 0;
    const lastUsedAt = rule.lastUsedAt;

    // Precisão: validações / (validações + negativas)
    const totalFeedback = validationCount + negativeCount;
    const precision = totalFeedback > 0 ? validationCount / totalFeedback : 0.5;

    // Uso: normalizado logaritmicamente (max = 100 usos)
    const usage = Math.min(1, Math.log10(usageCount + 1) / 2);

    // Recência: baseado em dias desde último uso
    let recency = 1;
    if (lastUsedAt) {
      const daysSinceUse = (Date.now() - lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
      recency = Math.max(0, 1 - daysSinceUse / LIFECYCLE_CONFIG.daysUntilObsolete);
    }

    // Health combinado (precisão tem maior peso)
    const health = precision * 0.5 + usage * 0.3 + recency * 0.2;

    // Recomendação
    let recommendation: 'keep' | 'review' | 'deactivate' = 'keep';
    if (health < 0.3 || precision < 0.4) {
      recommendation = 'deactivate';
    } else if (health < 0.6 || precision < 0.7) {
      recommendation = 'review';
    }

    return {
      ruleId: rule.id,
      health,
      precision,
      usage,
      recency,
      recommendation
    };
  }

  /**
   * Desativa regras com baixo desempenho para uma empresa
   */
  static async deactivateLowPerformingRules(companyId: string): Promise<number> {
    try {
      this.checkDatabase();

      // Buscar regras ativas com mínimo de usos
      const rules = await db!
        .select()
        .from(categoryRules)
        .where(
          and(
            eq(categoryRules.companyId, companyId),
            eq(categoryRules.active, true),
            gt(categoryRules.usageCount, LIFECYCLE_CONFIG.minimumUsageForEvaluation)
          )
        );

      let deactivatedCount = 0;

      for (const rule of rules) {
        const health = this.calculateRuleHealth(rule);

        if (health.recommendation === 'deactivate') {
          await this.deactivateRule(
            rule.id,
            `Low performance: health=${health.health.toFixed(2)}, precision=${health.precision.toFixed(2)}`
          );
          deactivatedCount++;
        }
      }

      if (deactivatedCount > 0) {
        console.log(`🧹 [CLEANUP] Deactivated ${deactivatedCount} low-performing rules for company ${companyId}`);
      }

      return deactivatedCount;
    } catch (error) {
      console.error('Error deactivating low performing rules:', error);
      return 0;
    }
  }

  // ============================================================================
  // ESTATÍSTICAS
  // ============================================================================

  /**
   * Obtém estatísticas de saúde das regras
   */
  static async getRulesHealthStats(companyId: string): Promise<{
    total: number;
    byStatus: Record<RuleStatus, number>;
    byRecommendation: Record<string, number>;
    averageHealth: number;
    averagePrecision: number;
  }> {
    try {
      this.checkDatabase();

      const rules = await db!
        .select()
        .from(categoryRules)
        .where(eq(categoryRules.companyId, companyId));

      const byStatus: Record<RuleStatus, number> = {
        candidate: 0,
        active: 0,
        refined: 0,
        consolidated: 0,
        inactive: 0
      };

      const byRecommendation: Record<string, number> = {
        keep: 0,
        review: 0,
        deactivate: 0
      };

      let totalHealth = 0;
      let totalPrecision = 0;

      for (const rule of rules) {
        const status = (rule.status || 'active') as RuleStatus;
        byStatus[status] = (byStatus[status] || 0) + 1;

        const health = this.calculateRuleHealth(rule);
        byRecommendation[health.recommendation]++;
        totalHealth += health.health;
        totalPrecision += health.precision;
      }

      return {
        total: rules.length,
        byStatus,
        byRecommendation,
        averageHealth: rules.length > 0 ? totalHealth / rules.length : 0,
        averagePrecision: rules.length > 0 ? totalPrecision / rules.length : 0
      };
    } catch (error) {
      console.error('Error getting rules health stats:', error);
      return {
        total: 0,
        byStatus: { candidate: 0, active: 0, refined: 0, consolidated: 0, inactive: 0 },
        byRecommendation: { keep: 0, review: 0, deactivate: 0 },
        averageHealth: 0,
        averagePrecision: 0
      };
    }
  }
}

export default RuleLifecycleService;
