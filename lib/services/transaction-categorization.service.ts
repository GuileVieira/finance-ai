/**
 * Transaction Categorization Service
 *
 * Orquestra o pipeline hierárquico de categorização de transações:
 * 1. Cache → 2. Regras → 3. Histórico → 4. IA
 *
 * Cada camada tem critérios de confiança para passar para a próxima.
 */

import { db } from '@/lib/db/drizzle';
import { categoryRules, transactions, categories, accounts } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import categoryCacheService from './category-cache.service';
import { RuleScoringService } from './rule-scoring.service';
import type { TransactionContext } from './rule-scoring.service';
import { MovementTypeService } from './movement-type.service';
import type { MovementType } from './movement-type.service';
import { CategorizationValidators } from './categorization-validators';
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
  // PR3: Mínimo de transações no cluster para criar regra automaticamente
  // Subido de 2→5 para evitar regras baseadas em poucos exemplos (sistema financeiro)
  clusterSizeForAutoRule: 5,
  // PR3: Confidence mínima da IA para adicionar ao cluster
  // Subido de 70→85 para garantir qualidade dos clusters
  minConfidenceForClustering: 85,
  // Processar clusters pendentes periodicamente
  processClustersBatchSize: 10
};

// Re-exportar TransactionContext para outros módulos
export type { TransactionContext };

export type ReasonCode = 
  | 'EXACT_MATCH'         // Cache ou Regra exata
  | 'SIMILARITY_MATCH'    // Cache ou Histórico por similaridade
  | 'AI_INFERENCE'        // Inferência por LLM
  | 'RULE_APPLIED'        // Regra de negócio (Pattern Match)
  | 'MOVEMENT_RESTRICTION'// Restrição de tipo de movimento (Hard Validator)
  | 'MANUAL_FALLBACK'     // Falha na categorização automática
  | 'AMBIGUOUS_MATCH'     // Ambíguo (ex: SISPAG genérico)
  | 'LOW_CONFIDENCE'      // [PR1] Confiança abaixo do threshold
  | 'ACCOUNTING_CONSISTENCY_VIOLATION'; // [PR5] Violação de regras contábeis (Sinal/Tipo)

export interface CategorizationReason {
  code: ReasonCode;
  message: string;        // Mensagem legível para UI ("Regra aplicada: Fornecedor X")
  metadata?: Record<string, any>; // Metadados extras (ex: ruleId, confidence original)
}

export interface CategorizationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;           // 0-100
  source: 'cache' | 'cache-exact' | 'cache-similar' | 'rule' | 'history' | 'ai' | 'manual';
  ruleId?: string;             // Se foi categorizado por regra
  needsReview?: boolean;       // Se a categorização precisa de revisão
  suggestions?: any[];         // Sugestões para revisão
  movementType?: string;       // Tipo de movimento identificado
  reason?: CategorizationReason; // [NOVO] Razão estruturada
  reasoning?: string;          // [DEPRECATED] Manter compatibilidade temporária (será = reason.message)
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
    ambiguity?: {
      isAmbiguous: boolean;
      reason: string;
    };
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
    
    // 0. Detectar Tipo de Movimentação (PR4)
    const movementType = MovementTypeService.classify(context);
    console.log(`[DEBUG] Movement Type: ${movementType} for description "${context.description}"`);

    const attemptedSources: string[] = [];
    let result: CategorizationResult | null = null;

    // CAMADA 1: Cache
    if (!skipCache) {
      attemptedSources.push('cache');
      let cacheResult = await this.tryCache(context, companyId);

      if (cacheResult) {
        // [PR5] Hard Validation: Validar antes de aceitar
        cacheResult = await this.validateHardConstraints(cacheResult, context);

        if (cacheResult.confidence >= confidenceThreshold) {
          return {
            ...cacheResult,
            movementType,
            metadata: { ...cacheResult.metadata, attemptedSources }
          };
        }
        result = cacheResult;
      }
    }

    // CAMADA 2: Regras
    if (!skipRules) {
      attemptedSources.push('rules');
      let rulesResult = await this.tryRules(context, companyId, movementType);

      if (rulesResult) {
        // [PR5] Hard Validation
        rulesResult = await this.validateHardConstraints(rulesResult, context);

        if (rulesResult.confidence >= confidenceThreshold) {
          // Adicionar ao cache para acelerar futuras buscas
          categoryCacheService.addToCache(
            context.description,
            rulesResult.categoryId,
            rulesResult.categoryName,
            companyId,
            rulesResult.confidence / 100
          );

          return {
            ...rulesResult,
            movementType,
            metadata: { ...rulesResult.metadata, attemptedSources }
          };
        }
        
        // Se a regra é melhor que nada, guarda como sugestão
        if (!result || rulesResult.confidence > result.confidence) {
          result = rulesResult;
        }
      }
    }

    // CAMADA 3: Histórico
    if (!skipHistory) {
      attemptedSources.push('history');
      let historyResult = await this.tryHistory(context, companyId, historyDaysLimit);

      if (historyResult) {
         // [PR5] Hard Validation
         historyResult = await this.validateHardConstraints(historyResult, context);

         if (historyResult.confidence >= confidenceThreshold) {
          categoryCacheService.addToCache(
            context.description,
            historyResult.categoryId,
            historyResult.categoryName,
            companyId,
            historyResult.confidence / 100
          );

          return {
            ...historyResult,
            movementType,
            metadata: { ...historyResult.metadata, attemptedSources }
          };
        }

        if (!result || historyResult.confidence > result.confidence) {
          result = historyResult;
        }
      }
    }

    // CAMADA 4: IA
    if (!skipAI) {
      attemptedSources.push('ai');
      let aiResult = await this.tryAI(context, companyId);

      if (aiResult) {
        // [PR5] Hard Validation
        aiResult = await this.validateHardConstraints(aiResult, context);

        if (aiResult.confidence >= confidenceThreshold) {
          // Adicionar ao cache
          categoryCacheService.addToCache(
            context.description,
            aiResult.categoryId,
            aiResult.categoryName,
            companyId,
            aiResult.confidence / 100
          );

          // PASSO EXTRA: Auto-regra se confiança for altíssima
          if (!skipAutoLearning && aiResult.confidence >= 90) {
            this.tryAutoLearning(
              context.description,
              aiResult.categoryName,
              companyId,
              aiResult.confidence,
              aiResult.reasoning
            ).catch(err => console.warn('Auto-learning failed:', err));
          }

          return {
            ...aiResult,
            movementType,
            metadata: { ...aiResult.metadata, attemptedSources }
          };
        }

        if (!result || aiResult.confidence > result.confidence) {
          result = aiResult;
        }
      }
    }

    // Verificação de Ambiguidade no resultado final (se existir)
    if (result) {
      const isAmbiguous = this.checkAmbiguity(context.description);
      if (isAmbiguous) {
        result.metadata = {
          ...result.metadata,
          ambiguity: {
            isAmbiguous: true,
            reason: 'Descrição genérica. Verifique se há detalhes adicionais no comprovante.'
          }
        };
        result.confidence = Math.min(result.confidence, 60);
      }
    }

    // Se chegamos aqui sem resultado de alta confiança, retornar o que temos (ou fallback)
    // Se chegamos aqui sem resultado de alta confiança, retornar o que temos (ou fallback)
    let finalOutcome: CategorizationResult = result || {
      categoryId: '',
      categoryName: 'Não classificado',
      confidence: 0,
      needsReview: true,
      source: 'manual',
      reason: {
        code: 'MANUAL_FALLBACK',
        message: `Não foi possível categorizar com confiança >= ${confidenceThreshold}%`,
        metadata: { attemptedSources }
      },
      reasoning: `Nenhuma fonte atingiu threshold de ${confidenceThreshold}%`
    };

    // PR1: Hardening Critical - Garantir threshold absoluto
    // Independente da fonte (AI, Regra, etc), se a confiança final for menor que o threshold,
    // forçar needsReview=true.
    
    if (finalOutcome.confidence < confidenceThreshold) {
      if (finalOutcome.reason?.code === 'ACCOUNTING_CONSISTENCY_VIOLATION') {
        finalOutcome = {
          ...finalOutcome,
          needsReview: true
        };
      } else {
        finalOutcome = {
            ...finalOutcome,
            needsReview: true,
            reason: {
                code: 'LOW_CONFIDENCE',
                message: `Confiança insuficiente (${finalOutcome.confidence}% < ${confidenceThreshold}%)`,
                metadata: { 
                   originalReason: finalOutcome.reason,
                   threshold: confidenceThreshold,
                   actualConfidence: finalOutcome.confidence
                }
            },
            reasoning: `⚠️ Confiança insuficiente (${finalOutcome.confidence}%). Threshold: ${confidenceThreshold}%`
        };
      }
    }

    return {
      ...finalOutcome,
      movementType,
      metadata: { 
        ...finalOutcome.metadata, 
        attemptedSources 
      }
    };
  }

  /**
   * CAMADA 1: Verificar cache (segmentado por empresa)
   */
  private static async tryCache(
    context: TransactionContext,
    companyId: string
  ): Promise<CategorizationResult | null> {
    const cacheResult = categoryCacheService.findInCache(
      context.description,
      companyId,
      0.95 // 95% similaridade para cache
    );

    if (!cacheResult) {
      return null;
    }

    // O cache agora guarda categoryId diretamente — não precisa re-consultar o banco
    const isExact = cacheResult.source === 'cache-exact';
    const message = isExact 
      ? 'Encontrado no cache (exato)' 
      : `Encontrado no cache (similaridade de ${(cacheResult.confidence * 100).toFixed(0)}%)`;

    return {
      categoryId: cacheResult.categoryId,
      categoryName: cacheResult.categoryName,
      confidence: Math.round(cacheResult.confidence * 100),
      source: cacheResult.source,
      reason: {
        code: isExact ? 'EXACT_MATCH' : 'SIMILARITY_MATCH',
        message,
        metadata: { source: cacheResult.source }
      },
      reasoning: message
    };
  }

  /**
   * [PR5] Validador Duro: Garante integridade contábil
   * Bloquear resultados que violam regras contábeis básicas (DRE Reliability)
   */
  private static async validateHardConstraints(
    result: CategorizationResult,
    context: TransactionContext
  ): Promise<CategorizationResult> {
    // Se já foi invalidado ou não tem categoria, retorna como está
    if (!result.categoryId || !result.confidence || result.confidence < 60) {
      return result;
    }

    try {
      // Buscar metadados da categoria para validação
      const categoryMetadata = await db
        .select({
          type: categories.type,
          dreGroup: categories.dreGroup,
          isIgnored: categories.isIgnored
        })
        .from(categories)
        .where(eq(categories.id, result.categoryId))
        .limit(1);

      if (categoryMetadata && categoryMetadata.length > 0) {
        const validation = CategorizationValidators.validate(
          context,
          result,
          categoryMetadata[0]
        );

        if (!validation.isValid) {
            // Se inválido, rebaixar para needsReview e adicionar motivo
            return {
                ...result,
                confidence: 60, // [PR5] Downgrade forçado
                needsReview: true,
                reason: {
                  code: 'ACCOUNTING_CONSISTENCY_VIOLATION',
                  message: `Regra Contábil: ${validation.reason}`,
                  metadata: { originalReason: result.reason }
                },
                reasoning: `⚠️ ${validation.reason} [Original: ${result.reasoning || 'Auto'}]`
            };
        }
      }
    } catch (error) {
      console.error('Error in hard validation:', error);
      // Fail-safe: Em caso de erro de DB, não bloqueia, mas loga.
    }

    return result;
  }

  /**
   * CAMADA 2: Aplicar regras com scoring avançado
   */
  private static async tryRules(
    context: TransactionContext,
    companyId: string,
    movementType?: MovementType
  ): Promise<CategorizationResult | null> {
    try {
      // 1. Buscar todas as regras ativas da empresa
      const activeRules = await db
        .select()
        .from(categoryRules)
        .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
        .where(
          and(
            eq(categoryRules.active, true),
            eq(categoryRules.companyId, companyId),
            // PR2: Apenas regras maduras ou aceitas (status allowed)
             sql`${categoryRules.status} IN ('active', 'refined', 'consolidated')`
          )
        );

      // 2. Filtrar regras (Memória)
      let validRules = activeRules;
      
      // PR4: Filtrar regras que violam restrições de tipo de movimento
      if (movementType) {
        const allowedTypes = CategorizationValidators.getValidCategoryTypes(movementType);
        const forbiddenGroups = CategorizationValidators.getForbiddenCategoryGroups(movementType);
        
        validRules = activeRules.filter(r => {
          const cat = r.financeai_categories;
          
          // 1. Checar Whitelist de Tipos
          if (allowedTypes && !allowedTypes.includes(cat.type as any)) {
             return false;
          }

          // 2. Checar Blacklist de Grupos
          if (forbiddenGroups.length > 0 && cat.dreGroup && forbiddenGroups.includes(cat.dreGroup)) {
             return false;
          }

          return true;
        });
      }
      
      if (validRules.length === 0) return null;

      // 3. Match Logic
      // Converter para formato CategoryRule
      const rulesToCheck: CategoryRule[] = validRules.map(r => r.financeai_category_rules);
      
      // Usar o sistema de scoring para encontrar a melhor regra
      const bestMatch = RuleScoringService.findBestMatch(rulesToCheck, context);

      if (!bestMatch) {
         return null;
      }
      
      // Buscar info da categoria (já temos no join)
      const ruleWithCategory = validRules.find(r => r.financeai_category_rules.id === bestMatch.ruleId);
      const category = ruleWithCategory?.financeai_categories;

      if (!category) return null;

      // Registrar uso positivo da regra (atualiza contadores e avalia promoção)
      // Não bloqueia o retorno
      RuleLifecycleService.recordPositiveUse(bestMatch.ruleId).catch(err => {
        console.warn('Failed to record positive rule use:', err);
      });

      return {
        categoryId: bestMatch.categoryId,
        categoryName: category.name,
        confidence: bestMatch.score,
        source: 'rule',
        ruleId: bestMatch.ruleId,
        reason: {
          code: 'RULE_APPLIED',
          message: `Regra aplicada: "${bestMatch.pattern}"`,
          metadata: { ruleId: bestMatch.ruleId, pattern: bestMatch.pattern }
        },
        reasoning: `Matched rule pattern: "${bestMatch.pattern}"`,
        metadata: {
          matchedText: bestMatch.matchedText,
          scoringBreakdown: bestMatch.breakdown
        }
      };

    } catch (error) {
       console.error('Error in tryRules:', error);
       return null;
    }
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
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.companyId, companyId),
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

    const similarityPct = (bestMatch.similarity * 100).toFixed(1);
    const message = `Similar a transação anterior (${similarityPct}%)`;

    return {
      categoryId: bestMatch.transaction.categoryId || '',
      categoryName: bestMatch.transaction.categoryName || 'Unknown',
      confidence: Math.round(confidence),
      source: 'history',
      reason: {
        code: 'SIMILARITY_MATCH',
        message,
        metadata: { 
          similarTransactionId: bestMatch.transaction.id, 
          similarity: bestMatch.similarity 
        }
      },
      reasoning: message,
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

      if (!result) return null;

      // Buscar categoryId do nome retornado pela IA (filtrado por empresa)
      const category = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(
          and(
            eq(categories.name, result.category),
            eq(categories.companyId, companyId)
          )
        )
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
        reason: {
          code: 'AI_INFERENCE',
          message: result.reasoning || 'Sugestão automática via IA',
          metadata: { model: result.modelUsed }
        },
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
      .replace(/\d{6,}/g, '')          // Remove só sequências longas (>= 6 dígitos)
      .replace(/[^A-Z0-9\s]/g, ' ')    // Mantém letras E dígitos curtos
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

      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.name, categoryName),
            eq(categories.companyId, companyId)
          )
        )
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

  /**
   * Verifica se a transação é ambígua (ex: SISPAG genérico)
   */
  private static checkAmbiguity(description: string): boolean {
    const upper = description.toUpperCase();
    
    // SISPAG sem complemento claro é ambíguo
    if (upper.includes('SISPAG')) {
        // Se tiver termos específicos de tributos ou folha, não é ambíguo
        const specificTerms = ['DARF', 'GPS', 'FGTS', 'SALARIO', 'FOLHA', 'RESCISAO', 'FERIAS'];
        if (specificTerms.some(term => upper.includes(term))) {
           return false;
        }

        // Caso contrário, é ambíguo (Fornecedores, Concessionárias, etc)
        // Mesmo 'FORNECEDORES' é ambíguo pois não diz QUEM é o fornecedor.
        return true; 
    }

    return false;
  }
}

export default TransactionCategorizationService;
