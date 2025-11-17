/**
 * Rule Scoring Service
 *
 * Implementa sistema de scoring avançado para regras de categorização.
 * Combina múltiplos fatores: tipo de match, confidence score e histórico de uso.
 */

import type { CategoryRule } from '@/lib/db/schema';

export interface ScoringBreakdown {
  matchTypeScore: number;     // 0-1 baseado no tipo (exact=1.0, contains=0.85, regex=0.75)
  confidenceScore: number;    // 0-1 do confidence da regra
  usageBonus: number;         // 0-0.15 baseado no usageCount (logarítmico)
  finalScore: number;         // 0-100 (score combinado normalizado)
}

export interface ScoredRule {
  ruleId: string;
  categoryId: string;
  categoryName?: string;
  pattern: string;
  ruleType: string;
  matchedText: string;
  score: number;              // 0-100
  breakdown: ScoringBreakdown;
}

export interface TransactionContext {
  description: string;
  memo?: string | null;
  name?: string | null;
  amount?: number;
}

/**
 * Pesos para cada tipo de match (0-1)
 */
const MATCH_TYPE_WEIGHTS = {
  exact: 1.0,      // Match exato tem peso máximo
  contains: 0.85,  // Contains tem penalidade leve
  regex: 0.75      // Regex tem penalidade maior (mais genérico)
} as const;

/**
 * Configuração do bônus por uso
 */
const USAGE_BONUS_CONFIG = {
  maxBonus: 0.15,        // Máximo 15% de bônus
  scaleFactor: 10,       // Fator de escala logarítmica
  enabled: true
} as const;

export class RuleScoringService {
  /**
   * Calcula score combinado para uma regra que fez match
   */
  static calculateScore(
    rule: CategoryRule,
    matchedText: string,
    context: TransactionContext
  ): ScoredRule {
    // 1. Score do tipo de match (0-1)
    const matchTypeScore = this.getMatchTypeWeight(rule.ruleType);

    // 2. Confidence da regra (0-1)
    const confidenceScore = parseFloat(rule.confidenceScore || '0.80');

    // 3. Bônus por uso (0-0.15)
    const usageBonus = this.calculateUsageBonus(rule.usageCount || 0);

    // 4. Score final combinado
    // Fórmula: (matchType * 0.4 + confidence * 0.5 + usageBonus * 0.1) * 100
    // Isso garante que confidence tem maior peso, seguido por tipo de match
    const rawScore = (
      matchTypeScore * 0.4 +
      confidenceScore * 0.5 +
      usageBonus * 0.1
    );

    // Normalizar para 0-100
    const finalScore = Math.min(100, Math.max(0, rawScore * 100));

    const breakdown: ScoringBreakdown = {
      matchTypeScore,
      confidenceScore,
      usageBonus,
      finalScore
    };

    return {
      ruleId: rule.id,
      categoryId: rule.categoryId,
      pattern: rule.rulePattern,
      ruleType: rule.ruleType,
      matchedText,
      score: finalScore,
      breakdown
    };
  }

  /**
   * Retorna peso do tipo de match
   */
  private static getMatchTypeWeight(ruleType: string): number {
    const type = ruleType.toLowerCase() as keyof typeof MATCH_TYPE_WEIGHTS;
    return MATCH_TYPE_WEIGHTS[type] || 0.5;
  }

  /**
   * Calcula bônus logarítmico baseado no usageCount
   * Evita que regras muito usadas dominem completamente
   */
  private static calculateUsageBonus(usageCount: number): number {
    if (!USAGE_BONUS_CONFIG.enabled || usageCount <= 0) {
      return 0;
    }

    // Fórmula logarítmica: log10(usageCount + 1) / scaleFactor
    // Exemplos:
    // - usageCount = 0  → 0.00
    // - usageCount = 9  → 0.10
    // - usageCount = 99 → 0.20
    // - usageCount = 999 → 0.30
    const logBonus = Math.log10(usageCount + 1) / USAGE_BONUS_CONFIG.scaleFactor;

    // Limitar ao máximo configurado
    return Math.min(USAGE_BONUS_CONFIG.maxBonus, logBonus);
  }

  /**
   * Testa se uma descrição faz match com uma regra
   */
  static testRuleMatch(
    rule: CategoryRule,
    context: TransactionContext
  ): { matched: boolean; matchedText: string } {
    const pattern = rule.rulePattern.toLowerCase();
    const type = rule.ruleType.toLowerCase();

    // Buscar em todos os campos disponíveis (description, memo, name)
    const searchTexts = [
      context.description,
      context.memo || '',
      context.name || ''
    ].filter(Boolean);

    for (const text of searchTexts) {
      const normalized = text.toLowerCase().trim();

      try {
        switch (type) {
          case 'exact':
            if (normalized === pattern) {
              return { matched: true, matchedText: text };
            }
            break;

          case 'contains':
            if (normalized.includes(pattern)) {
              return { matched: true, matchedText: text };
            }
            break;

          case 'regex':
            const regex = new RegExp(pattern, 'i');
            if (regex.test(normalized)) {
              return { matched: true, matchedText: text };
            }
            break;
        }
      } catch (error) {
        // Regex inválido - ignorar
        console.warn(`Invalid regex pattern in rule ${rule.id}:`, pattern);
        continue;
      }
    }

    return { matched: false, matchedText: '' };
  }

  /**
   * Encontra e rankeia todas as regras que fazem match com a transação
   * Retorna array ordenado por score (maior primeiro)
   */
  static rankMatchingRules(
    rules: CategoryRule[],
    context: TransactionContext
  ): ScoredRule[] {
    const scoredRules: ScoredRule[] = [];

    for (const rule of rules) {
      if (!rule.active) continue;

      const { matched, matchedText } = this.testRuleMatch(rule, context);

      if (matched) {
        const scored = this.calculateScore(rule, matchedText, context);
        scoredRules.push(scored);
      }
    }

    // Ordenar por score (maior primeiro)
    return scoredRules.sort((a, b) => b.score - a.score);
  }

  /**
   * Retorna a melhor regra (maior score) ou null se nenhuma fez match
   */
  static findBestMatch(
    rules: CategoryRule[],
    context: TransactionContext
  ): ScoredRule | null {
    const ranked = this.rankMatchingRules(rules, context);
    return ranked.length > 0 ? ranked[0] : null;
  }

  /**
   * Retorna todas as regras com score acima do threshold
   */
  static findMatchesAboveThreshold(
    rules: CategoryRule[],
    context: TransactionContext,
    threshold: number = 70
  ): ScoredRule[] {
    const ranked = this.rankMatchingRules(rules, context);
    return ranked.filter(r => r.score >= threshold);
  }

  /**
   * Debug: Explica por que uma regra teve determinado score
   */
  static explainScore(scoredRule: ScoredRule): string {
    const { breakdown } = scoredRule;

    return `
Score Final: ${breakdown.finalScore.toFixed(2)}%

Breakdown:
- Match Type (${scoredRule.ruleType}): ${(breakdown.matchTypeScore * 100).toFixed(2)}% (peso 40%)
- Confidence: ${(breakdown.confidenceScore * 100).toFixed(2)}% (peso 50%)
- Usage Bonus: ${(breakdown.usageBonus * 100).toFixed(2)}% (peso 10%)

Fórmula: (${breakdown.matchTypeScore.toFixed(2)} * 0.4 + ${breakdown.confidenceScore.toFixed(2)} * 0.5 + ${breakdown.usageBonus.toFixed(2)} * 0.1) * 100
    `.trim();
  }
}
