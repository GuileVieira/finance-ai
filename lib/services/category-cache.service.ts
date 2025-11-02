/**
 * Serviço de Cache para Categorização de Transações
 *
 * Evita chamadas desnecessárias para IA cacheando descrições similares
 * Economia estimada: 30% das transações podem usar cache
 */

export interface CachedCategory {
  category: string;
  confidence: number;
  timestamp: Date;
  hitCount: number; // Quantas vezes foi reutilizado
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  hitRate: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

class CategoryCacheService {
  private cache = new Map<string, CachedCategory>();
  private totalHits = 0;
  private totalLookups = 0;

  /**
   * Normaliza descrição da transação para matching
   * Remove números, caracteres especiais e normaliza espaços
   */
  private normalizeDescription(description: string): string {
    return description
      .toUpperCase()
      .replace(/\d+/g, '') // Remove todos números
      .replace(/[^A-Z\s]/g, ' ') // Remove caracteres especiais, mantém espaços
      .replace(/\s+/g, ' ') // Normaliza múltiplos espaços
      .trim();
  }

  /**
   * Calcula distância de Levenshtein entre duas strings
   * Usado para medir similaridade
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Inicializar matriz
    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    // Preencher matriz
    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substituição
            matrix[i][j - 1] + 1,     // inserção
            matrix[i - 1][j] + 1      // remoção
          );
        }
      }
    }

    return matrix[str1.length][str2.length];
  }

  /**
   * Calcula similaridade entre duas strings (0-1)
   * 1.0 = idênticas, 0.0 = completamente diferentes
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Busca categoria no cache (match exato ou por similaridade)
   *
   * @param description - Descrição original da transação
   * @param similarityThreshold - Threshold de similaridade (padrão: 0.90)
   * @returns Categoria encontrada ou null
   */
  public findInCache(
    description: string,
    similarityThreshold = 0.90
  ): string | null {
    this.totalLookups++;

    const normalized = this.normalizeDescription(description);

    // 1. Tentar match exato primeiro (mais rápido)
    if (this.cache.has(normalized)) {
      const entry = this.cache.get(normalized)!;
      entry.hitCount++;
      this.totalHits++;

      console.log(`💾 [CACHE-HIT-EXACT] "${description}" → "${entry.category}" (hit #${entry.hitCount})`);
      return entry.category;
    }

    // 2. Buscar por similaridade (mais lento, mas efetivo)
    let bestMatch: {key: string; similarity: number; category: string} | null = null;

    for (const [key, value] of this.cache.entries()) {
      const similarity = this.calculateSimilarity(normalized, key);

      if (similarity >= similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            key,
            similarity,
            category: value.category
          };
        }
      }
    }

    if (bestMatch) {
      const entry = this.cache.get(bestMatch.key)!;
      entry.hitCount++;
      this.totalHits++;

      console.log(
        `💾 [CACHE-HIT-SIMILAR] "${description}" → "${entry.category}" ` +
        `(${(bestMatch.similarity * 100).toFixed(1)}% similar, hit #${entry.hitCount})`
      );

      return entry.category;
    }

    // 3. Cache miss
    console.log(`❌ [CACHE-MISS] "${description}" (não encontrado)`);
    return null;
  }

  /**
   * Adiciona entrada no cache
   *
   * @param description - Descrição da transação
   * @param category - Categoria identificada
   * @param confidence - Confiança da classificação (0-1)
   */
  public addToCache(
    description: string,
    category: string,
    confidence: number
  ): void {
    // Só cachear se tiver alta confiança (>= 0.8)
    if (confidence < 0.8) {
      console.log(`⚠️ [CACHE-SKIP] Confiança baixa (${confidence}), não cacheando: "${description}"`);
      return;
    }

    const normalized = this.normalizeDescription(description);

    // Verificar se já existe (atualizar timestamp se existir)
    if (this.cache.has(normalized)) {
      const existing = this.cache.get(normalized)!;
      existing.timestamp = new Date();
      console.log(`🔄 [CACHE-UPDATE] "${description}" → "${category}"`);
      return;
    }

    // Adicionar nova entrada
    this.cache.set(normalized, {
      category,
      confidence,
      timestamp: new Date(),
      hitCount: 0
    });

    console.log(`✅ [CACHE-ADD] "${description}" → "${category}" (confidence: ${confidence})`);
  }

  /**
   * Obtém estatísticas do cache
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());

    return {
      totalEntries: this.cache.size,
      totalHits: this.totalHits,
      hitRate: this.totalLookups > 0 ? (this.totalHits / this.totalLookups) * 100 : 0,
      oldestEntry: entries.length > 0
        ? new Date(Math.min(...entries.map(e => e.timestamp.getTime())))
        : null,
      newestEntry: entries.length > 0
        ? new Date(Math.max(...entries.map(e => e.timestamp.getTime())))
        : null
    };
  }

  /**
   * Limpa cache (útil para testes ou reset)
   */
  public clear(): void {
    const beforeSize = this.cache.size;
    this.cache.clear();
    this.totalHits = 0;
    this.totalLookups = 0;
    console.log(`🗑️ [CACHE-CLEAR] ${beforeSize} entradas removidas`);
  }

  /**
   * Remove entradas antigas do cache (> 30 dias)
   */
  public cleanOldEntries(maxAgeDays = 30): number {
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // dias para ms
    let removed = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp.getTime() > maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🗑️ [CACHE-CLEAN] ${removed} entradas antigas removidas (>${maxAgeDays} dias)`);
    }

    return removed;
  }

  /**
   * Log estatísticas do cache
   */
  public logStats(): void {
    const stats = this.getStats();

    console.log('\n📊 [CACHE-STATS] ─────────────────────────');
    console.log(`   Entradas no cache: ${stats.totalEntries}`);
    console.log(`   Total de buscas: ${this.totalLookups}`);
    console.log(`   Total de hits: ${stats.totalHits}`);
    console.log(`   Taxa de acerto: ${stats.hitRate.toFixed(2)}%`);

    if (stats.oldestEntry) {
      console.log(`   Entrada mais antiga: ${stats.oldestEntry.toLocaleDateString()}`);
    }
    if (stats.newestEntry) {
      console.log(`   Entrada mais recente: ${stats.newestEntry.toLocaleDateString()}`);
    }

    // Top 10 mais reutilizadas
    const topEntries = Array.from(this.cache.entries())
      .sort((a, b) => b[1].hitCount - a[1].hitCount)
      .slice(0, 10);

    if (topEntries.length > 0) {
      console.log('\n   🏆 Top 10 mais reutilizadas:');
      topEntries.forEach(([key, value], index) => {
        console.log(`   ${index + 1}. "${key}" → ${value.category} (${value.hitCount} hits)`);
      });
    }

    console.log('───────────────────────────────────────\n');
  }
}

// Singleton
export default new CategoryCacheService();
