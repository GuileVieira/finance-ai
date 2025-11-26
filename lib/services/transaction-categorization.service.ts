/**
 * Transaction Categorization Service
 *
 * Orquestra o pipeline hierárquico de categorização de transações:
 * 1. Cache → 2. Regras → 3. Histórico → 4. IA
 *
 * Cada camada tem critérios de confiança para passar para a próxima.
 */

import { db } from '@/lib/db/drizzle';
import { categoryRules, transactions, categories } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import categoryCacheService from './category-cache.service';
import { RuleScoringService } from './rule-scoring.service';
import type { TransactionContext } from './rule-scoring.service';
import { RuleGenerationService } from './rule-generation.service';
import { RuleLifecycleService } from './rule-lifecycle.service';
import { TransactionClusteringService } from './transaction-clustering.service';
import type { CategoryRule } from '@/lib/db/schema';

// Configuração do sistema de auto-learning
const AUTO_LEARNING_CONFIG = {
  // Usar clustering em vez de criar regras diretamente
  // NOTA: Desabilitado por padrão para criar regras imediatamente
  // Habilite quando tiver volume maior de transações (100+)
  useClusteringFirst: false,
  // Mínimo de transações no cluster para criar regra automaticamente
  clusterSizeForAutoRule: 2, // Reduzido para ser mais agressivo
  // Confidence mínima da IA para adicionar ao cluster
  minConfidenceForClustering: 70,
  // Processar clusters pendentes periodicamente
  processClustersBatchSize: 10
};

// Re-exportar TransactionContext para outros módulos
export type { TransactionContext };

export interface CategorizationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;           // 0-100
  source: 'cache' | 'rule' | 'history' | 'ai' | 'manual';
  ruleId?: string;             // Se foi categorizado por regra
  reasoning?: string;
  metadata?: {
    matchedText?: string;
    scoringBreakdown?: {
      matchTypeScore: number;
      confidenceScore: number;
      usageBonus: number;
      finalScore: number;
    };
    similarTransactionId?: string;
    aiModel?: string;
    attemptedSources?: string[]; // Quais fontes foram tentadas
  };
}

export interface CategorizationOptions {
  companyId: string;
  accountId?: string;
  skipCache?: boolean;
  skipRules?: boolean;
  skipHistory?: boolean;
  skipAI?: boolean;
  skipAutoLearning?: boolean;    // Desabilitar criação automática de regras
  confidenceThreshold?: number;  // Mínimo para aceitar resultado (default: 70)
  historyDaysLimit?: number;     // Limitar busca de histórico (default: 90 dias)
}

/**
 * Interface para chamada de IA (será implementado externamente)
 */
export interface AICategorizationService {
  categorize(context: TransactionContext & { companyId: string }): Promise<{
    category: string;
    confidence: number;
    reasoning?: string;
    modelUsed?: string;
  }>;
}

export class TransactionCategorizationService {
  // Serviço de IA será injetado externamente para evitar dependências circulares
  private static aiService: AICategorizationService | null = null;

  /**
   * Configurar serviço de IA (dependency injection)
   */
  static setAIService(service: AICategorizationService): void {
    this.aiService = service;
  }

  /**
   * Pipeline principal de categorização
   */
  static async categorize(
    context: TransactionContext,
    options: CategorizationOptions
  ): Promise<CategorizationResult> {
    const {
      companyId,
      skipCache = false,
      skipRules = false,
      skipHistory = false,
      skipAI = false,
      skipAutoLearning = false,
      confidenceThreshold = 70,
      historyDaysLimit = 90
    } = options;

    const attemptedSources: string[] = [];
    let result: CategorizationResult | null = null;

    // CAMADA 1: Cache
    if (!skipCache) {
      attemptedSources.push('cache');
      result = await this.tryCache(context);

      if (result && result.confidence >= confidenceThreshold) {
        result.metadata = { ...result.metadata, attemptedSources };
        return result;
      }
    }

    // CAMADA 2: Regras
    if (!skipRules) {
      attemptedSources.push('rules');
      result = await this.tryRules(context, companyId);

      if (result && result.confidence >= confidenceThreshold) {
        result.metadata = { ...result.metadata, attemptedSources };

        // Adicionar ao cache para acelerar futuras buscas
        categoryCacheService.addToCache(
          context.description,
          result.categoryName,
          result.confidence / 100
        );

        return result;
      }
    }

    // CAMADA 3: Histórico
    if (!skipHistory) {
      attemptedSources.push('history');
      result = await this.tryHistory(context, companyId, historyDaysLimit);

      if (result && result.confidence >= confidenceThreshold) {
        result.metadata = { ...result.metadata, attemptedSources };

        // Adicionar ao cache
        categoryCacheService.addToCache(
          context.description,
          result.categoryName,
          result.confidence / 100
        );

        return result;
      }
    }

    // CAMADA 4: IA
    if (!skipAI) {
      attemptedSources.push('ai');
      result = await this.tryAI(context, companyId);

      if (result) {
        result.metadata = { ...result.metadata, attemptedSources };

        // Adicionar ao cache se confiança for alta
        if (result.confidence >= 80) {
          categoryCacheService.addToCache(
            context.description,
            result.categoryName,
            result.confidence / 100
          );
        }

        // CAMADA 5: Auto-aprendizado - Criar regra automática se confiança >= 75%
        if (!skipAutoLearning && result.confidence >= 75) {
          this.tryAutoLearning(
            context.description,
            result.categoryName,
            companyId,
            result.confidence,
            result.reasoning
          ).catch(err => {
            // Não bloquear o fluxo se auto-learning falhar
            console.warn('Auto-learning failed (non-blocking):', err);
          });
        }

        return result;
      }
    }

    // Se chegou aqui, não conseguiu categorizar
    throw new Error(
      `Unable to categorize transaction: ${context.description}. ` +
      `Tried: ${attemptedSources.join(', ')}`
    );
  }

  /**
   * CAMADA 1: Verificar cache
   */
  private static async tryCache(
    context: TransactionContext
  ): Promise<CategorizationResult | null> {
    const categoryName = categoryCacheService.findInCache(
      context.description,
      0.95 // 95% similaridade para cache
    );

    if (!categoryName) {
      return null;
    }

    // Buscar categoryId do nome
    const category = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.name, categoryName))
      .limit(1);

    if (category.length === 0) {
      console.warn(`Cache returned category "${categoryName}" but it doesn't exist in DB`);
      return null;
    }

    return {
      categoryId: category[0].id,
      categoryName: category[0].name,
      confidence: 95, // Cache tem alta confiança por padrão
      source: 'cache',
      reasoning: 'Found similar transaction in cache'
    };
  }

  /**
   * CAMADA 2: Aplicar regras com scoring avançado
   */
  private static async tryRules(
    context: TransactionContext,
    companyId: string
  ): Promise<CategorizationResult | null> {
    // Buscar todas as regras ativas da empresa
    const activeRules = await db
      .select()
      .from(categoryRules)
      .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
      .where(
        and(
          eq(categoryRules.active, true),
          eq(categoryRules.companyId, companyId)
        )
      );

    if (activeRules.length === 0) {
      return null;
    }

    // Converter para formato CategoryRule
    const rules: CategoryRule[] = activeRules.map(r => r.financeai_category_rules);

    // Usar o sistema de scoring para encontrar a melhor regra
    const bestMatch = RuleScoringService.findBestMatch(rules, context);

    if (!bestMatch) {
      return null;
    }

    // Buscar nome da categoria
    const category = activeRules.find(r => r.financeai_category_rules.id === bestMatch.ruleId);

    if (!category) {
      return null;
    }

    // Registrar uso positivo da regra (atualiza contadores e avalia promoção)
    RuleLifecycleService.recordPositiveUse(bestMatch.ruleId).catch(err => {
      console.warn('Failed to record positive rule use:', err);
    });

    return {
      categoryId: bestMatch.categoryId,
      categoryName: category.financeai_categories.name,
      confidence: bestMatch.score,
      source: 'rule',
      ruleId: bestMatch.ruleId,
      reasoning: `Matched rule pattern: "${bestMatch.pattern}"`,
      metadata: {
        matchedText: bestMatch.matchedText,
        scoringBreakdown: bestMatch.breakdown
      }
    };
  }

  /**
   * CAMADA 3: Buscar no histórico de transações similares
   */
  private static async tryHistory(
    context: TransactionContext,
    companyId: string,
    daysLimit: number
  ): Promise<CategorizationResult | null> {
    // Buscar transações similares nos últimos X dias
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit);

    const similarTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        confidence: transactions.confidence,
        transactionDate: transactions.transactionDate
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          sql`${transactions.transactionDate} >= ${cutoffDate.toISOString().split('T')[0]}`
        )
      )
      .limit(100); // Limitar para não sobrecarregar

    if (similarTransactions.length === 0) {
      return null;
    }

    // Calcular similaridade com Levenshtein (usar mesma lógica do cache)
    const normalized = this.normalizeDescription(context.description);
    let bestMatch: {
      transaction: typeof similarTransactions[0];
      similarity: number;
    } | null = null;

    for (const transaction of similarTransactions) {
      const similarity = this.calculateSimilarity(
        normalized,
        this.normalizeDescription(transaction.description)
      );

      if (similarity >= 0.85) { // 85% de similaridade para histórico
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { transaction, similarity };
        }
      }
    }

    if (!bestMatch) {
      return null;
    }

    // Confidence baseado na similaridade e confidence original
    const confidence = Math.min(
      95,
      bestMatch.similarity * 100 * 0.8 + // 80% peso da similaridade
      parseFloat(bestMatch.transaction.confidence || '0') * 0.2 // 20% peso da confidence original
    );

    return {
      categoryId: bestMatch.transaction.categoryId,
      categoryName: bestMatch.transaction.categoryName || 'Unknown',
      confidence: Math.round(confidence),
      source: 'history',
      reasoning: `Similar to previous transaction (${(bestMatch.similarity * 100).toFixed(1)}% similar)`,
      metadata: {
        similarTransactionId: bestMatch.transaction.id
      }
    };
  }

  /**
   * CAMADA 4: Categorizar com IA
   */
  private static async tryAI(
    context: TransactionContext,
    companyId: string
  ): Promise<CategorizationResult | null> {
    if (!this.aiService) {
      console.warn('AI service not configured. Skipping AI categorization.');
      return null;
    }

    try {
      const result = await this.aiService.categorize({
        ...context,
        companyId
      });

      // Buscar categoryId do nome retornado pela IA
      const category = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.name, result.category))
        .limit(1);

      if (category.length === 0) {
        console.warn(`AI returned category "${result.category}" but it doesn't exist in DB`);
        return null;
      }

      return {
        categoryId: category[0].id,
        categoryName: category[0].name,
        confidence: Math.round(result.confidence * 100),
        source: 'ai',
        reasoning: result.reasoning,
        metadata: {
          aiModel: result.modelUsed
        }
      };

    } catch (error) {
      console.error('AI categorization failed:', error);
      return null;
    }
  }

  /**
   * Normaliza descrição para comparação
   */
  private static normalizeDescription(description: string): string {
    return description
      .toUpperCase()
      .replace(/\d+/g, '')
      .replace(/[^A-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcula similaridade entre strings (0-1)
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
   * CAMADA 5: Auto-aprendizado com Clustering Inteligente
   *
   * Em vez de criar regras diretamente, agrupa transações similares em clusters.
   * Quando um cluster atinge tamanho suficiente, uma regra é gerada automaticamente
   * com base no padrão comum identificado.
   */
  private static async tryAutoLearning(
    description: string,
    categoryName: string,
    companyId: string,
    confidence: number,
    reasoning?: string
  ): Promise<void> {
    try {
      // Verificar se confidence atende o mínimo para clustering
      if (confidence < AUTO_LEARNING_CONFIG.minConfidenceForClustering) {
        console.log(
          `ℹ️ [AUTO-LEARNING-SKIP] Confidence ${confidence}% below threshold for clustering`
        );
        return;
      }

      // Buscar categoryId
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, categoryName))
        .limit(1);

      if (!category) {
        console.warn(`Category "${categoryName}" not found for auto-learning`);
        return;
      }

      // ESTRATÉGIA 1: Clustering (padrão)
      if (AUTO_LEARNING_CONFIG.useClusteringFirst) {
        const clusterResult = await TransactionClusteringService.addToCluster(
          description,
          category.id,
          categoryName,
          companyId
        );

        if (clusterResult.isNew) {
          console.log(
            `📦 [CLUSTERING] New cluster created for "${categoryName}"`
          );
        } else {
          console.log(
            `📦 [CLUSTERING] Added to cluster (size: ${clusterResult.clusterSize}) for "${categoryName}"`
          );
        }

        // Se cluster atingiu tamanho mínimo, processar para gerar regra
        if (clusterResult.clusterSize >= AUTO_LEARNING_CONFIG.clusterSizeForAutoRule) {
          // Processar clusters pendentes em background
          TransactionClusteringService.processPendingClusters(companyId).then(result => {
            if (result.rulesCreated > 0) {
              console.log(
                `🎓 [AUTO-LEARNING] Generated ${result.rulesCreated} rules from clusters`
              );
            }
          }).catch(err => {
            console.warn('Failed to process pending clusters:', err);
          });
        }

        return;
      }

      // ESTRATÉGIA 2: Criação direta de regra (fallback ou configuração)
      const result = await RuleGenerationService.generateAndCreateRule(
        description,
        categoryName,
        companyId,
        confidence,
        reasoning
      );

      if (result.success) {
        console.log(
          `🎓 [AUTO-LEARNING] Created rule: "${result.rule?.pattern}" → ${categoryName}`
        );
      } else {
        console.log(
          `ℹ️ [AUTO-LEARNING-SKIP] ${result.error}`
        );
      }
    } catch (error) {
      console.error('[AUTO-LEARNING-ERROR]', error);
      // Não lançar erro - auto-learning é opcional
    }
  }

  /**
   * Processa clusters pendentes e limpa regras de baixo desempenho
   * Deve ser chamado periodicamente (cron job ou após batch de uploads)
   */
  static async performMaintenance(companyId: string): Promise<{
    clustersProcessed: number;
    rulesCreated: number;
    rulesDeactivated: number;
    orphanRulesDeactivated: number;
  }> {
    try {
      // Importar dinamicamente para evitar dependência circular
      const { CategoryRulesService } = await import('./category-rules.service');

      // 1. Processar clusters pendentes
      const clusterResult = await TransactionClusteringService.processPendingClusters(companyId);

      // 2. Desativar regras com baixo desempenho
      const deactivatedCount = await RuleLifecycleService.deactivateLowPerformingRules(companyId);

      // 3. Desativar regras órfãs (categoria deletada)
      const orphanCount = await CategoryRulesService.deactivateOrphanRules(companyId);

      console.log(
        `🔧 [MAINTENANCE] Company ${companyId}: ` +
        `${clusterResult.processed} clusters processed, ` +
        `${clusterResult.rulesCreated} rules created, ` +
        `${deactivatedCount} low-performing rules deactivated, ` +
        `${orphanCount} orphan rules deactivated`
      );

      return {
        clustersProcessed: clusterResult.processed,
        rulesCreated: clusterResult.rulesCreated,
        rulesDeactivated: deactivatedCount,
        orphanRulesDeactivated: orphanCount
      };
    } catch (error) {
      console.error('[MAINTENANCE-ERROR]', error);
      return {
        clustersProcessed: 0,
        rulesCreated: 0,
        rulesDeactivated: 0,
        orphanRulesDeactivated: 0
      };
    }
  }

  /**
   * Estatísticas de saúde do sistema de categorização
   */
  static async getSystemHealth(companyId: string): Promise<{
    rulesHealth: Awaited<ReturnType<typeof RuleLifecycleService.getRulesHealthStats>>;
    clusterStats: Awaited<ReturnType<typeof TransactionClusteringService.getClusterStats>>;
    autoRulesStats: Awaited<ReturnType<typeof RuleGenerationService.getAutoRulesStats>>;
  }> {
    const [rulesHealth, clusterStats, autoRulesStats] = await Promise.all([
      RuleLifecycleService.getRulesHealthStats(companyId),
      TransactionClusteringService.getClusterStats(companyId),
      RuleGenerationService.getAutoRulesStats(companyId)
    ]);

    return {
      rulesHealth,
      clusterStats,
      autoRulesStats
    };
  }

  /**
   * Estatísticas de categorização de um upload
   */
  static async getUploadStats(uploadId: string): Promise<{
    total: number;
    bySource: Record<string, number>;
    averageConfidence: Record<string, number>;
  }> {
    const uploadTransactions = await db
      .select({
        categorizationSource: transactions.categorizationSource,
        confidence: transactions.confidence
      })
      .from(transactions)
      .where(eq(transactions.uploadId, uploadId));

    const bySource: Record<string, number> = {};
    const confidenceSum: Record<string, number> = {};
    const confidenceCount: Record<string, number> = {};

    for (const t of uploadTransactions) {
      const source = t.categorizationSource || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;

      const conf = parseFloat(t.confidence || '0');
      confidenceSum[source] = (confidenceSum[source] || 0) + conf;
      confidenceCount[source] = (confidenceCount[source] || 0) + 1;
    }

    const averageConfidence: Record<string, number> = {};
    for (const source in confidenceSum) {
      averageConfidence[source] = confidenceSum[source] / confidenceCount[source];
    }

    return {
      total: uploadTransactions.length,
      bySource,
      averageConfidence
    };
  }
}

export default TransactionCategorizationService;
