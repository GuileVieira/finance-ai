/**
 * Transaction Clustering Service
 *
 * Agrupa transações similares para:
 * - Gerar regras mais inteligentes baseadas em múltiplos exemplos
 * - Identificar padrões comuns antes de criar regras
 * - Evitar criação de regras redundantes
 */

import { db } from '@/lib/db/drizzle';
import { transactionClusters, transactions, categories } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('tx-clustering');
import { RuleGenerationService } from './rule-generation.service';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface ClusteredTransaction {
  id: string;
  description: string;
  normalizedDescription: string;
  amount?: number;
  transactionDate?: string;
  categoryId?: string | null;
}

export interface TransactionCluster {
  id: string;
  centroidDescription: string;
  commonPattern: string | null;
  transactionCount: number;
  transactions: ClusteredTransaction[];
  commonTokens: string[];
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  status: 'pending' | 'processed' | 'archived';
}

export interface ClusterQuality {
  clusterId: string;
  cohesion: number;        // 0-1 (quão similares são as transações)
  separation: number;      // 0-1 (quão diferente de outros clusters)
  readyForRule: boolean;   // pronto para gerar regra?
  suggestedPattern: string | null;
}

export interface SimilarTransaction {
  id: string;
  description: string;
  similarity: number;
  categoryId?: string | null;
  categoryName?: string | null;
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const CLUSTERING_CONFIG = {
  // Similaridade mínima para agrupar (Jaccard)
  similarityThreshold: 0.6,

  // Mínimo de transações para formar cluster válido
  minimumClusterSize: 3,

  // Máximo de transações por cluster
  maximumClusterSize: 50,

  // Dias para buscar transações para clustering
  lookbackDays: 90
};

// ============================================================================
// SERVICE
// ============================================================================

export class TransactionClusteringService {
  /**
   * Verifica se o banco está disponível
   */
  private static checkDatabase(): void {
    if (!db) {
      throw new Error('Database not available');
    }
  }

  // ============================================================================
  // NORMALIZAÇÃO E TOKENIZAÇÃO
  // ============================================================================

  /**
   * Normaliza descrição para comparação
   */
  static normalizeDescription(description: string): string {
    return description
      .toUpperCase()
      .replace(/\d+/g, ' ')           // Remove números
      .replace(/[^A-Z\s]/g, ' ')       // Remove caracteres especiais
      .replace(/\s+/g, ' ')            // Normaliza espaços
      .trim();
  }

  /**
   * Tokeniza descrição em palavras
   */
  static tokenize(description: string): string[] {
    const normalized = this.normalizeDescription(description);
    return normalized.split(' ').filter(w => w.length > 2);
  }

  /**
   * Calcula similaridade de Jaccard entre dois conjuntos de tokens
   */
  static jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  // ============================================================================
  // CLUSTERING
  // ============================================================================

  /**
   * Encontra ou cria cluster para uma transação
   */
  static async addToCluster(
    description: string,
    categoryId: string,
    categoryName: string,
    companyId: string
  ): Promise<{ clusterId: string; isNew: boolean; clusterSize: number }> {
    try {
      this.checkDatabase();

      const normalized = this.normalizeDescription(description);
      const tokens = this.tokenize(description);

      // Buscar clusters existentes da mesma categoria/empresa
      const existingClusters = await db!
        .select()
        .from(transactionClusters)
        .where(
          and(
            eq(transactionClusters.companyId, companyId),
            eq(transactionClusters.categoryId, categoryId),
            eq(transactionClusters.status, 'pending')
          )
        );

      // Tentar encontrar cluster similar
      for (const cluster of existingClusters) {
        const clusterTokens = (cluster.commonTokens as string[]) || [];
        const similarity = this.jaccardSimilarity(tokens, clusterTokens);

        if (similarity >= CLUSTERING_CONFIG.similarityThreshold) {
          // Adicionar ao cluster existente
          const transactionIds = (cluster.transactionIds as string[]) || [];

          // Verificar tamanho máximo
          if (transactionIds.length >= CLUSTERING_CONFIG.maximumClusterSize) {
            continue;
          }

          // Atualizar tokens comuns (interseção)
          const newCommonTokens = tokens.filter(t => clusterTokens.includes(t));

          await db!
            .update(transactionClusters)
            .set({
              transactionCount: sql`${transactionClusters.transactionCount} + 1`,
              commonTokens: newCommonTokens.length > 0 ? newCommonTokens : clusterTokens,
              // Não atualizar transactionIds aqui para performance
            })
            .where(eq(transactionClusters.id, cluster.id));

          return {
            clusterId: cluster.id,
            isNew: false,
            clusterSize: (cluster.transactionCount || 0) + 1
          };
        }
      }

      // Criar novo cluster
      const [newCluster] = await db!
        .insert(transactionClusters)
        .values({
          companyId,
          centroidDescription: normalized,
          categoryId,
          categoryName,
          transactionCount: 1,
          commonTokens: tokens,
          transactionIds: [],
          status: 'pending',
          confidence: '0.00',
          createdAt: new Date()
        })
        .returning();

      return {
        clusterId: newCluster.id,
        isNew: true,
        clusterSize: 1
      };
    } catch (error) {
      log.error({ err: error }, 'Error adding to cluster');
      throw error;
    }
  }

  /**
   * Busca transações similares a uma descrição
   */
  static async findSimilarTransactions(
    description: string,
    companyId: string,
    limit: number = 10
  ): Promise<SimilarTransaction[]> {
    try {
      this.checkDatabase();

      const tokens = this.tokenize(description);

      // Buscar transações recentes
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CLUSTERING_CONFIG.lookbackDays);

      const recentTransactions = await db!
        .select({
          id: transactions.id,
          description: transactions.description,
          categoryId: transactions.categoryId,
          categoryName: categories.name
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          sql`${transactions.transactionDate} >= ${cutoffDate.toISOString().split('T')[0]}`
        )
        .limit(500); // Limitar para performance

      // Calcular similaridade
      const similar: SimilarTransaction[] = [];

      for (const tx of recentTransactions) {
        const txTokens = this.tokenize(tx.description);
        const similarity = this.jaccardSimilarity(tokens, txTokens);

        if (similarity >= CLUSTERING_CONFIG.similarityThreshold) {
          similar.push({
            id: tx.id,
            description: tx.description,
            similarity,
            categoryId: tx.categoryId,
            categoryName: tx.categoryName
          });
        }
      }

      // Ordenar por similaridade e limitar
      return similar
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      log.error({ err: error }, 'Error finding similar transactions');
      return [];
    }
  }

  // ============================================================================
  // EXTRAÇÃO DE PADRÕES
  // ============================================================================

  /**
   * Extrai padrão comum de um cluster
   */
  static extractClusterPattern(cluster: {
    commonTokens: string[] | null;
    centroidDescription: string;
    transactionCount: number;
  }): { pattern: string; confidence: number } {
    const tokens = cluster.commonTokens || [];

    if (tokens.length === 0) {
      // Fallback: usar extração do centróide
      const extraction = RuleGenerationService.extractPattern(cluster.centroidDescription);
      return {
        pattern: extraction.pattern,
        confidence: 0.6
      };
    }

    // Filtrar tokens discriminantes usando o novo sistema de scoring
    const discriminantTokens = tokens.filter(token => {
      const score = RuleGenerationService.scoreWord(token, tokens);
      return score.isDiscriminant;
    });

    if (discriminantTokens.length === 0) {
      // Se não houver discriminantes, usar os primeiros tokens
      const pattern = tokens.slice(0, 3).join(' ');
      return { pattern, confidence: 0.5 };
    }

    // Gerar padrão com tokens discriminantes
    if (discriminantTokens.length === 1) {
      return {
        pattern: discriminantTokens[0],
        confidence: 0.7
      };
    }

    // Múltiplos discriminantes: usar wildcard
    const pattern = `${discriminantTokens[0]}*${discriminantTokens[discriminantTokens.length - 1]}`;
    return {
      pattern,
      confidence: 0.75
    };
  }

  /**
   * Avalia qualidade de um cluster
   */
  static async evaluateClusterQuality(clusterId: string): Promise<ClusterQuality | null> {
    try {
      this.checkDatabase();

      const [cluster] = await db!
        .select()
        .from(transactionClusters)
        .where(eq(transactionClusters.id, clusterId))
        .limit(1);

      if (!cluster) return null;

      const transactionCount = cluster.transactionCount || 0;
      const commonTokens = (cluster.commonTokens as string[]) || [];

      // Cohesion: baseado na quantidade de tokens comuns e tamanho do cluster
      const cohesion = Math.min(1, commonTokens.length / 5) *
                       Math.min(1, transactionCount / CLUSTERING_CONFIG.minimumClusterSize);

      // Separation: simplificado (assumimos bom se tem tokens discriminantes)
      const hasDiscriminants = commonTokens.some(token => {
        const score = RuleGenerationService.scoreWord(token, commonTokens);
        return score.isDiscriminant;
      });
      const separation = hasDiscriminants ? 0.8 : 0.4;

      // Pronto para regra se atender critérios mínimos
      const readyForRule = transactionCount >= CLUSTERING_CONFIG.minimumClusterSize &&
                          cohesion >= 0.5 &&
                          separation >= 0.5;

      // Sugerir padrão se pronto
      const suggestedPattern = readyForRule
        ? this.extractClusterPattern(cluster).pattern
        : null;

      return {
        clusterId,
        cohesion,
        separation,
        readyForRule,
        suggestedPattern
      };
    } catch (error) {
      log.error({ err: error }, 'Error evaluating cluster quality');
      return null;
    }
  }

  // ============================================================================
  // PROCESSAMENTO DE CLUSTERS
  // ============================================================================

  /**
   * Processa clusters pendentes e gera regras quando prontos
   */
  static async processPendingClusters(companyId: string): Promise<{
    processed: number;
    rulesCreated: number;
  }> {
    try {
      this.checkDatabase();

      const pendingClusters = await db!
        .select()
        .from(transactionClusters)
        .where(
          and(
            eq(transactionClusters.companyId, companyId),
            eq(transactionClusters.status, 'pending')
          )
        );

      let processed = 0;
      let rulesCreated = 0;

      for (const cluster of pendingClusters) {
        const quality = await this.evaluateClusterQuality(cluster.id);

        if (quality?.readyForRule && quality.suggestedPattern) {
          // Gerar regra do cluster
          const result = await RuleGenerationService.generateAndCreateRule(
            cluster.centroidDescription,
            cluster.categoryName || '',
            companyId,
            80, // Confidence fixa para clusters
            `Generated from cluster with ${cluster.transactionCount} transactions`
          );

          if (result.success) {
            rulesCreated++;
          }

          // Marcar cluster como processado
          await db!
            .update(transactionClusters)
            .set({
              status: 'processed',
              commonPattern: quality.suggestedPattern,
              processedAt: new Date()
            })
            .where(eq(transactionClusters.id, cluster.id));

          processed++;
        }
      }

      if (processed > 0) {
        log.info({ processed, rulesCreated }, 'Cluster processing progress');
      }

      return { processed, rulesCreated };
    } catch (error) {
      log.error({ err: error }, 'Error processing pending clusters');
      return { processed: 0, rulesCreated: 0 };
    }
  }

  /**
   * Obtém estatísticas de clusters
   */
  static async getClusterStats(companyId: string): Promise<{
    total: number;
    pending: number;
    processed: number;
    averageSize: number;
    readyForRule: number;
  }> {
    try {
      this.checkDatabase();

      const clusters = await db!
        .select()
        .from(transactionClusters)
        .where(eq(transactionClusters.companyId, companyId));

      const pending = clusters.filter(c => c.status === 'pending').length;
      const processed = clusters.filter(c => c.status === 'processed').length;

      const totalSize = clusters.reduce((sum, c) => sum + (c.transactionCount || 0), 0);
      const averageSize = clusters.length > 0 ? totalSize / clusters.length : 0;

      // Contar quantos estão prontos para regra
      let readyForRule = 0;
      for (const cluster of clusters.filter(c => c.status === 'pending')) {
        const quality = await this.evaluateClusterQuality(cluster.id);
        if (quality?.readyForRule) {
          readyForRule++;
        }
      }

      return {
        total: clusters.length,
        pending,
        processed,
        averageSize,
        readyForRule
      };
    } catch (error) {
      log.error({ err: error }, 'Error getting cluster stats');
      return {
        total: 0,
        pending: 0,
        processed: 0,
        averageSize: 0,
        readyForRule: 0
      };
    }
  }
}

export default TransactionClusteringService;
