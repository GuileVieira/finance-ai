/**
 * Serviço de Cache para Categorização de Transações
 *
 * v2.0 - Multi-tenant seguro:
 *   - Chave de cache inclui companyId (isolamento obrigatório)
 *   - Guarda categoryId (não apenas nome)
 *   - Normalização menos destrutiva (preserva dígitos curtos)
 *
 * Evita chamadas desnecessárias para IA cacheando descrições similares
 */

export interface CachedCategory {
  categoryId: string;    // ID da categoria no banco
  categoryName: string;  // Nome legível (para logs)
  companyId: string;     // Isolamento multi-tenant
  confidence: number;
  timestamp: Date;
  hitCount: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  hitRate: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  byCompany: Record<string, number>;
}

export interface CacheLookupResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  source: 'cache-exact' | 'cache-similar';
}

class CategoryCacheService {
  private cache = new Map<string, CachedCategory>();
  private totalHits = 0;
  private totalLookups = 0;

  /**
   * Normaliza descrição da transação para matching.
   *
   * v2.0 - Menos destrutiva:
   *   - Remove apenas sequências de 6+ dígitos (IDs, NSUs, protocolos)
   *   - Mantém dígitos curtos (13º, 3G, PIX 1234)
   *   - Preserva tokens discriminantes
   */
  private normalizeDescription(description: string): string {
    return description
      .toUpperCase()
      .replace(/\d{6,}/g, '')          // Remove só sequências longas (>= 6 dígitos)
      .replace(/[^A-Z0-9\s]/g, ' ')    // Mantém letras E dígitos curtos
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Gera chave de cache segmentada por empresa.
   * Formato: "companyId::normalizedDescription"
   */
  private generateCacheKey(description: string, companyId: string): string {
    const normalized = this.normalizeDescription(description);
    return `${companyId}::${normalized}`;
  }

  /**
   * Calcula distância de Levenshtein entre duas strings
   * Usado para medir similaridade
   */
  private levenshteinDistance(str1: string, str2: string): number {
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
   * Extrai o sufixo de descrição normalizada da chave (remove prefixo companyId::)
   */
  private getDescriptionFromKey(key: string): string {
    const separatorIndex = key.indexOf('::');
    return separatorIndex >= 0 ? key.substring(separatorIndex + 2) : key;
  }

  /**
   * Extrai o companyId do prefixo da chave
   */
  private getCompanyIdFromKey(key: string): string {
    const separatorIndex = key.indexOf('::');
    return separatorIndex >= 0 ? key.substring(0, separatorIndex) : '';
  }

  /**
   * Busca categoria no cache (match exato ou por similaridade)
   * SEGURO: filtra obrigatoriamente por companyId
   *
   * @param description - Descrição original da transação
   * @param companyId - ID da empresa (obrigatório para isolamento)
   * @param similarityThreshold - Threshold de similaridade (padrão: 0.90)
   * @returns Resultado encontrado ou null
   */
  public findInCache(
    description: string,
    companyId: string,
    similarityThreshold = 0.90
  ): CacheLookupResult | null {
    this.totalLookups++;

    const cacheKey = this.generateCacheKey(description, companyId);
    const normalized = this.normalizeDescription(description);

    // 1. Match exato (rápido)
    if (this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      entry.hitCount++;
      this.totalHits++;

      console.log(`💾 [CACHE-HIT-EXACT] [${companyId.slice(0,8)}] "${description}" → "${entry.categoryName}" (hit #${entry.hitCount})`);
      return {
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        confidence: entry.confidence,
        source: 'cache-exact'
      };
    }

    // 2. Busca por similaridade (apenas dentro da mesma empresa)
    let bestMatch: { key: string; similarity: number; entry: CachedCategory } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      // ISOLAMENTO: só comparar com entradas da mesma empresa
      if (this.getCompanyIdFromKey(key) !== companyId) continue;

      const cachedDescription = this.getDescriptionFromKey(key);
      const similarity = this.calculateSimilarity(normalized, cachedDescription);

      if (similarity >= similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { key, similarity, entry };
        }
      }
    }

    if (bestMatch) {
      bestMatch.entry.hitCount++;
      this.totalHits++;

      console.log(
        `💾 [CACHE-HIT-SIMILAR] [${companyId.slice(0,8)}] "${description}" → "${bestMatch.entry.categoryName}" ` +
        `(${(bestMatch.similarity * 100).toFixed(1)}% similar, hit #${bestMatch.entry.hitCount})`
      );

      return {
        categoryId: bestMatch.entry.categoryId,
        categoryName: bestMatch.entry.categoryName,
        confidence: bestMatch.entry.confidence * bestMatch.similarity, // Desconta pela similaridade
        source: 'cache-similar'
      };
    }

    // 3. Cache miss
    console.log(`❌ [CACHE-MISS] [${companyId.slice(0,8)}] "${description}" (não encontrado)`);
    return null;
  }

  /**
   * Adiciona entrada no cache
   * SEGURO: sempre vinculada a um companyId
   *
   * @param description - Descrição da transação
   * @param categoryId - ID da categoria no banco (não apenas nome)
   * @param categoryName - Nome legível da categoria (para logs)
   * @param companyId - ID da empresa (obrigatório)
   * @param confidence - Confiança da classificação (0-1)
   */
  public addToCache(
    description: string,
    categoryId: string,
    categoryName: string,
    companyId: string,
    confidence: number
  ): void {
    // Só cachear se tiver alta confiança (>= 0.8)
    if (confidence < 0.8) {
      console.log(`⚠️ [CACHE-SKIP] Confiança baixa (${confidence}), não cacheando: "${description}"`);
      return;
    }

    const cacheKey = this.generateCacheKey(description, companyId);

    // Atualizar timestamp se já existir
    if (this.cache.has(cacheKey)) {
      const existing = this.cache.get(cacheKey)!;
      existing.timestamp = new Date();
      existing.categoryId = categoryId;
      existing.categoryName = categoryName;
      console.log(`🔄 [CACHE-UPDATE] [${companyId.slice(0,8)}] "${description}" → "${categoryName}"`);
      return;
    }

    // Adicionar nova entrada
    this.cache.set(cacheKey, {
      categoryId,
      categoryName,
      companyId,
      confidence,
      timestamp: new Date(),
      hitCount: 0
    });

    console.log(`✅ [CACHE-ADD] [${companyId.slice(0,8)}] "${description}" → "${categoryName}" (confidence: ${confidence})`);
  }

  /**
   * Obtém estatísticas do cache
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const byCompany: Record<string, number> = {};

    for (const entry of entries) {
      byCompany[entry.companyId] = (byCompany[entry.companyId] || 0) + 1;
    }

    return {
      totalEntries: this.cache.size,
      totalHits: this.totalHits,
      hitRate: this.totalLookups > 0 ? (this.totalHits / this.totalLookups) * 100 : 0,
      oldestEntry: entries.length > 0
        ? new Date(Math.min(...entries.map(e => e.timestamp.getTime())))
        : null,
      newestEntry: entries.length > 0
        ? new Date(Math.max(...entries.map(e => e.timestamp.getTime())))
        : null,
      byCompany
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
   * Limpa cache apenas de uma empresa específica
   */
  public clearByCompany(companyId: string): number {
    let removed = 0;
    for (const key of this.cache.keys()) {
      if (this.getCompanyIdFromKey(key) === companyId) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`🗑️ [CACHE-CLEAR-COMPANY] ${removed} entradas removidas para empresa ${companyId.slice(0,8)}`);
    }
    return removed;
  }

  /**
   * Remove entradas antigas do cache (> 30 dias)
   */
  public cleanOldEntries(maxAgeDays = 30): number {
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
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

    // Entradas por empresa
    const companyCounts = Object.entries(stats.byCompany);
    if (companyCounts.length > 0) {
      console.log(`   Empresas no cache: ${companyCounts.length}`);
      companyCounts.forEach(([companyId, count]) => {
        console.log(`     - ${companyId.slice(0,8)}...: ${count} entradas`);
      });
    }

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
        const desc = this.getDescriptionFromKey(key);
        console.log(`   ${index + 1}. [${value.companyId.slice(0,8)}] "${desc}" → ${value.categoryName} (${value.hitCount} hits)`);
      });
    }

    console.log('───────────────────────────────────────\n');
  }
}

// Singleton
export default new CategoryCacheService();
