import { db } from '@/lib/db/drizzle';
import { insightThresholds } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { InsightThresholds } from '@/lib/types';

// Thresholds padrão do sistema
export const DEFAULT_THRESHOLDS: InsightThresholds = {
  profitMargin: { low: 10, high: 30 },
  categoryConcentration: { warning: 40 },
  avgTransaction: { high: 5000 },
  dailyFrequency: { high: 10 },
  growth: { positive: 20, negative: -10 },
  anomaly: { zScore: 2 },
  recurrence: { valueTolerance: 0.1, daysTolerance: 3 },
  seasonality: { varianceThreshold: 0.2 },
};

export default class ThresholdService {
  /**
   * Obter thresholds configurados para uma empresa
   * Se não existir configuração, retorna os defaults
   */
  static async getThresholds(companyId?: string): Promise<InsightThresholds> {
    if (!companyId) {
      return DEFAULT_THRESHOLDS;
    }

    try {
      const customThresholds = await db
        .select()
        .from(insightThresholds)
        .where(
          and(
            eq(insightThresholds.companyId, companyId),
            eq(insightThresholds.isActive, true)
          )
        );

      if (customThresholds.length === 0) {
        return DEFAULT_THRESHOLDS;
      }

      // Mesclar thresholds customizados com defaults
      const result = { ...DEFAULT_THRESHOLDS };

      for (const threshold of customThresholds) {
        const { insightType, thresholdKey, thresholdValue } = threshold;
        const value = Number(thresholdValue);

        // Mapear para estrutura aninhada
        switch (insightType) {
          case 'profitMargin':
            if (thresholdKey === 'low' || thresholdKey === 'high') {
              result.profitMargin[thresholdKey] = value;
            }
            break;
          case 'categoryConcentration':
            if (thresholdKey === 'warning') {
              result.categoryConcentration.warning = value;
            }
            break;
          case 'avgTransaction':
            if (thresholdKey === 'high') {
              result.avgTransaction.high = value;
            }
            break;
          case 'dailyFrequency':
            if (thresholdKey === 'high') {
              result.dailyFrequency.high = value;
            }
            break;
          case 'growth':
            if (thresholdKey === 'positive' || thresholdKey === 'negative') {
              result.growth[thresholdKey] = value;
            }
            break;
          case 'anomaly':
            if (thresholdKey === 'zScore') {
              result.anomaly.zScore = value;
            }
            break;
          case 'recurrence':
            if (thresholdKey === 'valueTolerance' || thresholdKey === 'daysTolerance') {
              result.recurrence[thresholdKey] = value;
            }
            break;
          case 'seasonality':
            if (thresholdKey === 'varianceThreshold') {
              result.seasonality.varianceThreshold = value;
            }
            break;
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting thresholds:', error);
      return DEFAULT_THRESHOLDS;
    }
  }

  /**
   * Atualizar um threshold específico
   */
  static async updateThreshold(
    companyId: string,
    insightType: string,
    thresholdKey: string,
    value: number
  ): Promise<void> {
    try {
      // Verificar se já existe
      const existing = await db
        .select()
        .from(insightThresholds)
        .where(
          and(
            eq(insightThresholds.companyId, companyId),
            eq(insightThresholds.insightType, insightType),
            eq(insightThresholds.thresholdKey, thresholdKey)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Atualizar existente
        await db
          .update(insightThresholds)
          .set({
            thresholdValue: value.toString(),
            updatedAt: new Date()
          })
          .where(eq(insightThresholds.id, existing[0].id));
      } else {
        // Criar novo
        await db.insert(insightThresholds).values({
          companyId,
          insightType,
          thresholdKey,
          thresholdValue: value.toString(),
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
      throw new Error('Failed to update threshold');
    }
  }

  /**
   * Resetar thresholds para valores padrão
   */
  static async resetToDefaults(companyId: string): Promise<void> {
    try {
      await db
        .delete(insightThresholds)
        .where(eq(insightThresholds.companyId, companyId));
    } catch (error) {
      console.error('Error resetting thresholds:', error);
      throw new Error('Failed to reset thresholds');
    }
  }

  /**
   * Obter todos os thresholds customizados de uma empresa
   */
  static async getCustomThresholds(companyId: string) {
    try {
      return await db
        .select()
        .from(insightThresholds)
        .where(eq(insightThresholds.companyId, companyId));
    } catch (error) {
      console.error('Error getting custom thresholds:', error);
      return [];
    }
  }
}
