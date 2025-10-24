import { CacheEntry, ClassificationResult } from '@/lib/agent/types';
import { createPersist } from 'node-persist';

// Sistema de cache inteligente para reduzir chamadas à IA
export class ClassificationCache {
  private static instance: ClassificationCache;
  private cache: Map<string, CacheEntry> = new Map();
  private persist: any;
  private readonly CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 dias
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly STORAGE_KEY = 'classification_cache';

  private constructor() {
    this.initializeStorage();
  }

  static getInstance(): ClassificationCache {
    if (!ClassificationCache.instance) {
      ClassificationCache.instance = new ClassificationCache();
    }
    return ClassificationCache.instance;
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Verificar se está em ambiente de navegador
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const entries: Array<[string, CacheEntry]> = JSON.parse(stored);
          this.cache = new Map(entries);
        }
      } else {
        // Usar node-persist no servidor Node.js
        this.persist = await createPersist({
          dir: '.cache',
          stringify: JSON.stringify,
          parse: JSON.parse,
          encoding: 'utf8',
          ttl: this.CACHE_TTL
        });
        await this.persist.init();
        this.loadCache();
      }
    } catch (error) {
      console.error('Erro ao inicializar armazenamento:', error);
      this.cache = new Map();
    }
  }

  private async loadCache(): Promise<void> {
    try {
      if (this.persist) {
        const stored = await this.persist.getItem(this.STORAGE_KEY);
        if (stored) {
          const entries: Array<[string, CacheEntry]> = stored;
          this.cache = new Map(entries);
          this.cleanup(); // Limpar entradas expiradas
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
      this.cache = new Map();
    }
  }

  private async saveCache(): Promise<void> {
    try {
      if (this.persist) {
        const entries = Array.from(this.cache.entries());
        await this.persist.setItem(this.STORAGE_KEY, entries);
      } else if (typeof localStorage !== 'undefined') {
        const entries = Array.from(this.cache.entries());
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      }
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }

  // Gerar chave de cache baseada na descrição e valor
  private generateCacheKey(description: string, value?: number): string {
    const normalizedDesc = description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return value
      ? `${normalizedDesc}_${Math.round(value)}`
      : normalizedDesc;
  }

  // Limpar cache expirado
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const entryTime = new Date(entry.timestamp).getTime();
      if (now - entryTime > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }

    // Remover entradas menos usadas se exceder o limite
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sorted = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.accessCount - b.accessCount);

      const toDelete = sorted.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  // Obter do cache
  async get(description: string, value?: number): Promise<ClassificationResult | null> {
    const key = this.generateCacheKey(description, value);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Verificar se não está expirado
    const entryTime = new Date(entry.timestamp).getTime();
    if (Date.now() - entryTime > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    // Atualizar contador de acesso
    entry.accessCount++;
    this.cache.set(key, entry);

    // Salvar assincronamente (não bloquear)
    this.saveCache().catch(console.error);

    return entry.result;
  }

  // Adicionar ao cache
  async set(
    description: string,
    result: ClassificationResult,
    value?: number
  ): Promise<void> {
    const key = this.generateCacheKey(description, value);

    const entry: CacheEntry = {
      key,
      result,
      timestamp: new Date().toISOString(),
      accessCount: 1
    };

    this.cache.set(key, entry);
    this.cleanup();
    await this.saveCache();
  }

  // Busca por similaridade (usando fuzzy matching)
  async findSimilar(description: string, threshold: number = 0.8): Promise<ClassificationResult | null> {
    const normalizedDesc = description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalizedDesc.split(/\s+/);

    for (const [key, entry] of this.cache.entries()) {
      const cachedDesc = key.split('_')[0]; // Remover valor se tiver
      const cachedWords = cachedDesc.split(/\s+/);

      // Calcular similaridade Jaccard
      const intersection = new Set(
        words.filter(word => cachedWords.includes(word))
      ).size;

      const union = new Set([...words, ...cachedWords]).size;
      const similarity = intersection / union;

      if (similarity >= threshold && entry.result.confidence > 0.8) {
        entry.accessCount++;
        this.cache.set(key, entry);
        await this.saveCache();
        return entry.result;
      }
    }

    return null;
  }

  // Buscar por padrão
  async findByPattern(pattern: string, type: 'exact' | 'contains' = 'contains'): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    const lowerPattern = pattern.toLowerCase();

    for (const [key, entry] of this.cache.entries()) {
      const description = key.split('_')[0];

      if (type === 'exact' && description === lowerPattern) {
        results.push(entry.result);
      } else if (type === 'contains' && description.includes(lowerPattern)) {
        results.push(entry.result);
      }
    }

    // Ordenar por confiança
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  // Invalidar entrada específica
  async invalidate(description: string, value?: number): Promise<void> {
    const key = this.generateCacheKey(description, value);
    this.cache.delete(key);
    await this.saveCache();
  }

  // Invalidar por padrão
  async invalidateByPattern(pattern: string): Promise<void> {
    const lowerPattern = pattern.toLowerCase();
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      const description = key.split('_')[0];
      if (description.includes(lowerPattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    await this.saveCache();
  }

  // Limpar todo o cache
  async clear(): Promise<void> {
    this.cache.clear();
    await this.saveCache();
  }

  // Obter estatísticas
  getStats(): {
    totalEntries: number;
    totalAccessCount: number;
    averageConfidence: number;
    oldestEntry: Date;
    newestEntry: Date;
    topAccessed: Array<{ key: string; accessCount: number; confidence: number }>;
  } {
    if (this.cache.size === 0) {
      return {
        totalEntries: 0,
        totalAccessCount: 0,
        averageConfidence: 0,
        oldestEntry: new Date(),
        newestEntry: new Date(),
        topAccessed: []
      };
    }

    const entries = Array.from(this.cache.entries());
    const totalAccessCount = entries.reduce((sum, [, entry]) => sum + entry.accessCount, 0);
    const averageConfidence = entries.reduce(
      (sum, [, entry]) => sum + entry.result.confidence, 0
    ) / entries.length;

    const timestamps = entries.map(([, entry]) => new Date(entry.timestamp).getTime());
    const oldestEntry = new Date(Math.min(...timestamps));
    const newestEntry = new Date(Math.max(...timestamps));

    const topAccessed = entries
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        confidence: entry.result.confidence
      }));

    return {
      totalEntries: this.cache.size,
      totalAccessCount,
      averageConfidence,
      oldestEntry,
      newestEntry,
      topAccessed
    };
  }

  // Exportar cache
  async exportCache(): Promise<Array<{ key: string; entry: CacheEntry }>> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
  }

  // Importar cache
  async importCache(entries: Array<{ key: string; entry: CacheEntry }>): Promise<void> {
    for (const { key, entry } of entries) {
      this.cache.set(key, entry);
    }
    this.cleanup();
    await this.saveCache();
  }

  // Forçar salvamento
  async forceSave(): Promise<void> {
    await this.saveCache();
  }
}