/**
 * Rule Generation Service
 *
 * Gera regras automaticamente baseado em padrões aprendidos com a IA.
 * Implementa auto-aprendizado para reduzir custos e melhorar performance.
 */

import { db } from '@/lib/db/drizzle';
import { categoryRules, categories } from '@/lib/db/schema';
import { eq, and, ilike } from 'drizzle-orm';

export interface GeneratedRule {
  pattern: string;
  ruleType: 'contains';  // Sempre 'contains' para regras auto-geradas
  categoryId: string;
  categoryName: string;
  confidence: number;     // 0.75-0.85 (médio, conforme definido)
  sourceType: 'ai';
  examples: string[];
  reasoning: string;
}

export interface PatternExtractionResult {
  pattern: string;
  isValid: boolean;
  reason?: string;
  normalized: string;
  removedElements: string[];
}

/**
 * Palavras muito comuns que não devem ser usadas como patterns
 */
const STOP_WORDS = [
  'de', 'da', 'do', 'a', 'o', 'e', 'para', 'com', 'em', 'por', 'no', 'na',
  'dos', 'das', 'ao', 'aos', 'um', 'uma', 'pix', 'ted', 'doc', 'transf', 'transferencia'
];

/**
 * Confidence padrão para regras geradas pela IA (0.75-0.85, conforme definido)
 */
const AI_RULE_CONFIDENCE = {
  min: 0.75,
  max: 0.85,
  default: 0.80
};

export class RuleGenerationService {
  /**
   * Extrai pattern de uma descrição removendo elementos variáveis
   */
  static extractPattern(description: string): PatternExtractionResult {
    const original = description.trim();
    const removedElements: string[] = [];

    // 1. Converter para uppercase e normalizar
    let pattern = original.toUpperCase();

    // 2. Remover números (mas manter palavras)
    const numbersRemoved = pattern.match(/\d+/g);
    if (numbersRemoved) {
      removedElements.push(...numbersRemoved);
    }
    pattern = pattern.replace(/\d+/g, ' ');

    // 3. Remover datas (dd/mm/yyyy, dd-mm-yyyy, etc)
    pattern = pattern.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, ' ');

    // 4. Remover caracteres especiais (exceto espaços e letras)
    pattern = pattern.replace(/[^A-Z\s]/g, ' ');

    // 5. Normalizar múltiplos espaços
    pattern = pattern.replace(/\s+/g, ' ').trim();

    // 6. Remover stop words
    const words = pattern.split(' ').filter(word => {
      const isStopWord = STOP_WORDS.includes(word.toLowerCase());
      if (isStopWord) {
        removedElements.push(word);
      }
      return !isStopWord && word.length > 0;
    });

    pattern = words.join(' ');

    // Validar pattern
    const isValid = this.validatePattern(pattern);
    const reason = isValid ? undefined : this.getValidationReason(pattern);

    return {
      pattern: pattern.trim(),
      isValid,
      reason,
      normalized: pattern.toLowerCase().trim(),
      removedElements
    };
  }

  /**
   * Valida se um pattern é adequado para criar regra
   */
  private static validatePattern(pattern: string): boolean {
    // Mínimo 3 caracteres
    if (pattern.length < 3) {
      return false;
    }

    // Mínimo 1 palavra significativa
    const words = pattern.split(' ').filter(w => w.length > 2);
    if (words.length === 0) {
      return false;
    }

    // Não pode ser apenas stop words
    const hasSignificantWord = words.some(word =>
      !STOP_WORDS.includes(word.toLowerCase())
    );
    if (!hasSignificantWord) {
      return false;
    }

    // Não pode ser muito genérico (ex: "COMPRA", "VENDA")
    const genericPatterns = ['COMPRA', 'VENDA', 'PAGAMENTO', 'CREDITO', 'DEBITO'];
    if (genericPatterns.includes(pattern.trim())) {
      return false;
    }

    return true;
  }

  /**
   * Retorna motivo da invalidação do pattern
   */
  private static getValidationReason(pattern: string): string {
    if (pattern.length < 3) {
      return 'Pattern muito curto (mínimo 3 caracteres)';
    }

    const words = pattern.split(' ').filter(w => w.length > 2);
    if (words.length === 0) {
      return 'Pattern não contém palavras significativas';
    }

    const hasSignificantWord = words.some(word =>
      !STOP_WORDS.includes(word.toLowerCase())
    );
    if (!hasSignificantWord) {
      return 'Pattern contém apenas stop words';
    }

    const genericPatterns = ['COMPRA', 'VENDA', 'PAGAMENTO', 'CREDITO', 'DEBITO'];
    if (genericPatterns.includes(pattern.trim())) {
      return 'Pattern muito genérico';
    }

    return 'Pattern inválido';
  }

  /**
   * Detecta se já existe regra similar (para evitar duplicatas)
   */
  static async detectDuplicateRule(
    pattern: string,
    categoryId: string,
    companyId: string
  ): Promise<{
    isDuplicate: boolean;
    existingRule?: any;
    similarity?: number;
  }> {
    // Buscar regras da mesma categoria e empresa
    const existingRules = await db
      .select()
      .from(categoryRules)
      .where(
        and(
          eq(categoryRules.categoryId, categoryId),
          eq(categoryRules.companyId, companyId),
          eq(categoryRules.active, true)
        )
      );

    if (existingRules.length === 0) {
      return { isDuplicate: false };
    }

    const normalizedPattern = pattern.toLowerCase().trim();

    // Verificar match exato
    for (const rule of existingRules) {
      if (rule.rulePattern.toLowerCase().trim() === normalizedPattern) {
        return {
          isDuplicate: true,
          existingRule: rule,
          similarity: 1.0
        };
      }
    }

    // Verificar similaridade (Levenshtein)
    for (const rule of existingRules) {
      const similarity = this.calculateSimilarity(
        normalizedPattern,
        rule.rulePattern.toLowerCase().trim()
      );

      // Se similaridade > 90%, considerar duplicata
      if (similarity > 0.90) {
        return {
          isDuplicate: true,
          existingRule: rule,
          similarity
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Calcula similaridade entre duas strings (Levenshtein)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Distância de Levenshtein
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str1.length][str2.length];
  }

  /**
   * Calcula confidence para a regra baseado na confidence da IA
   */
  private static calculateRuleConfidence(aiConfidence: number): number {
    // Mapear confidence da IA (0-100) para range definido (0.75-0.85)
    const normalized = aiConfidence / 100; // 0-1

    // Se IA tem alta confiança (>90%), dar confidence maior
    if (normalized >= 0.90) {
      return AI_RULE_CONFIDENCE.max; // 0.85
    }

    // Se IA tem confiança média-alta (75-90%), escalar proporcionalmente
    if (normalized >= 0.75) {
      const range = AI_RULE_CONFIDENCE.max - AI_RULE_CONFIDENCE.min; // 0.10
      const factor = (normalized - 0.75) / 0.15; // 0-1
      return AI_RULE_CONFIDENCE.min + (range * factor);
    }

    // Se confiança < 75%, usar mínimo
    return AI_RULE_CONFIDENCE.min; // 0.75
  }

  /**
   * Decide se deve criar regra baseado no contexto
   */
  static shouldCreateRule(
    aiConfidence: number,
    description: string,
    categoryName: string
  ): {
    shouldCreate: boolean;
    reason: string;
  } {
    // Regra 1: IA deve ter confiança >= 75%
    if (aiConfidence < 75) {
      return {
        shouldCreate: false,
        reason: `Confiança da IA muito baixa: ${aiConfidence}%`
      };
    }

    // Regra 2: Pattern deve ser válido
    const extraction = this.extractPattern(description);
    if (!extraction.isValid) {
      return {
        shouldCreate: false,
        reason: extraction.reason || 'Pattern inválido'
      };
    }

    return {
      shouldCreate: true,
      reason: `Pattern válido "${extraction.pattern}" com confiança ${aiConfidence}%`
    };
  }

  /**
   * Gera e cria regra automática no banco de dados
   */
  static async generateAndCreateRule(
    description: string,
    categoryName: string,
    companyId: string,
    aiConfidence: number,
    aiReasoning?: string
  ): Promise<{
    success: boolean;
    rule?: GeneratedRule;
    error?: string;
  }> {
    try {
      // 1. Verificar se deve criar regra
      const decision = this.shouldCreateRule(aiConfidence, description, categoryName);
      if (!decision.shouldCreate) {
        return {
          success: false,
          error: decision.reason
        };
      }

      // 2. Extrair pattern
      const extraction = this.extractPattern(description);
      if (!extraction.isValid) {
        return {
          success: false,
          error: extraction.reason
        };
      }

      // 3. Buscar categoryId
      const [category] = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.name, categoryName))
        .limit(1);

      if (!category) {
        return {
          success: false,
          error: `Categoria "${categoryName}" não encontrada`
        };
      }

      // 4. Verificar duplicatas
      const duplicateCheck = await this.detectDuplicateRule(
        extraction.pattern,
        category.id,
        companyId
      );

      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          error: `Regra similar já existe: "${duplicateCheck.existingRule.rulePattern}"`
        };
      }

      // 5. Calcular confidence
      const ruleConfidence = this.calculateRuleConfidence(aiConfidence);

      // 6. Criar regra no banco
      const [newRule] = await db
        .insert(categoryRules)
        .values({
          rulePattern: extraction.pattern,
          ruleType: 'contains',
          categoryId: category.id,
          companyId,
          confidenceScore: ruleConfidence.toFixed(2),
          active: true,
          usageCount: 0,
          sourceType: 'ai',
          matchFields: ['description', 'memo', 'name'],
          examples: [description],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(
        `🤖 [AUTO-RULE-CREATED] Pattern: "${extraction.pattern}" → ${categoryName} ` +
        `(confidence: ${(ruleConfidence * 100).toFixed(0)}%)`
      );

      return {
        success: true,
        rule: {
          pattern: extraction.pattern,
          ruleType: 'contains',
          categoryId: category.id,
          categoryName: category.name,
          confidence: ruleConfidence,
          sourceType: 'ai',
          examples: [description],
          reasoning: aiReasoning || `Auto-generated from AI categorization (${aiConfidence}% confidence)`
        }
      };

    } catch (error) {
      console.error('Error creating auto-rule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Atualiza regra existente com novo exemplo
   */
  static async updateRuleWithExample(
    ruleId: string,
    newExample: string
  ): Promise<void> {
    const [rule] = await db
      .select()
      .from(categoryRules)
      .where(eq(categoryRules.id, ruleId))
      .limit(1);

    if (!rule) {
      console.warn(`Rule ${ruleId} not found`);
      return;
    }

    const currentExamples = (rule.examples as string[]) || [];
    const updatedExamples = [...currentExamples, newExample].slice(-10); // Manter últimos 10

    await db
      .update(categoryRules)
      .set({
        examples: updatedExamples,
        updatedAt: new Date()
      })
      .where(eq(categoryRules.id, ruleId));
  }

  /**
   * Estatísticas de regras auto-geradas
   */
  static async getAutoRulesStats(companyId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    averageUsage: number;
    topRules: Array<{
      pattern: string;
      categoryName: string;
      usageCount: number;
    }>;
  }> {
    const autoRules = await db
      .select({
        id: categoryRules.id,
        pattern: categoryRules.rulePattern,
        categoryId: categoryRules.categoryId,
        categoryName: categories.name,
        usageCount: categoryRules.usageCount
      })
      .from(categoryRules)
      .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
      .where(
        and(
          eq(categoryRules.companyId, companyId),
          eq(categoryRules.sourceType, 'ai'),
          eq(categoryRules.active, true)
        )
      );

    const byCategory: Record<string, number> = {};
    let totalUsage = 0;

    for (const rule of autoRules) {
      byCategory[rule.categoryName] = (byCategory[rule.categoryName] || 0) + 1;
      totalUsage += rule.usageCount || 0;
    }

    const averageUsage = autoRules.length > 0 ? totalUsage / autoRules.length : 0;

    const topRules = autoRules
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 10)
      .map(r => ({
        pattern: r.pattern,
        categoryName: r.categoryName,
        usageCount: r.usageCount || 0
      }));

    return {
      total: autoRules.length,
      byCategory,
      averageUsage,
      topRules
    };
  }
}

export default RuleGenerationService;
