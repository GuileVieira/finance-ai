import { ClassificationRecord, ClassificationPattern } from '@/lib/agent/types';
import Fuse from 'fuse.js';
import { createPersist } from 'node-persist';

// Classe para gerenciar o histórico de classificações e aprendizado
export class ClassificationHistory {
  private static instance: ClassificationHistory;
  private history: ClassificationRecord[] = [];
  private patterns: ClassificationPattern[] = [];
  private fuseSearch: Fuse<ClassificationPattern>;
  private persist: any;
  private readonly STORAGE_KEY = 'classification_history';
  private readonly PATTERNS_KEY = 'classification_patterns';
  private readonly SIMILARITY_THRESHOLD = 0.7;

  private constructor() {
    this.initializeStorage();
  }

  static getInstance(): ClassificationHistory {
    if (!ClassificationHistory.instance) {
      ClassificationHistory.instance = new ClassificationHistory();
    }
    return ClassificationHistory.instance;
  }

  private async initializeStorage(): Promise<void> {
    try {
      this.persist = await createPersist({
        dir: '.history',
        stringify: JSON.stringify,
        parse: JSON.parse,
        encoding: 'utf8'
      });
      await this.persist.init();
      this.loadHistory();
      this.loadPatterns();
      this.setupFuseSearch();
    } catch (error) {
      console.error('Erro ao inicializar armazenamento:', error);
      this.history = [];
      this.patterns = [];
      this.setupFuseSearch();
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      const stored = await this.persist.getItem(this.STORAGE_KEY);
      if (stored) {
        this.history = stored;
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      this.history = [];
    }
  }

  private async loadPatterns(): Promise<void> {
    try {
      const stored = await this.persist.getItem(this.PATTERNS_KEY);
      if (stored) {
        this.patterns = stored;
      }
    } catch (error) {
      console.error('Erro ao carregar padrões:', error);
      this.patterns = [];
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await this.persist.setItem(this.STORAGE_KEY, this.history);
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }

  private async savePatterns(): Promise<void> {
    try {
      await this.persist.setItem(this.PATTERNS_KEY, this.patterns);
    } catch (error) {
      console.error('Erro ao salvar padrões:', error);
    }
  }

  private setupFuseSearch(): void {
    this.fuseSearch = new Fuse(this.patterns, {
      keys: [
        { name: 'pattern', weight: 0.5 },
        { name: 'examples', weight: 0.3 },
        { name: 'macroCategory', weight: 0.1 },
        { name: 'microCategory', weight: 0.1 }
      ],
      threshold: this.SIMILARITY_THRESHOLD,
      includeScore: true,
      includeMatches: true
    });
  }

  // Busca exata no histórico
  findExactMatch(description: string, value?: number): ClassificationRecord | null {
    const normalizedDesc = this.normalizeDescription(description);

    const match = this.history.find(record => {
      const descMatch = record.normalizedDescription === normalizedDesc;
      const valueMatch = !value || Math.abs(record.value - value) / record.value < 0.1; // 10% tolerance
      return descMatch && valueMatch;
    });

    return match || null;
  }

  // Busca por similaridade
  findSimilarMatch(description: string, threshold: number = 0.7): ClassificationRecord | null {
    const normalizedDesc = this.normalizeDescription(description);

    const searchFuse = new Fuse(this.history, {
      keys: [
        { name: 'normalizedDescription', weight: 0.6 },
        { name: 'originalDescription', weight: 0.4 }
      ],
      threshold: 1 - threshold,
      includeScore: true
    });

    const results = searchFuse.search(normalizedDesc);

    if (results.length > 0 && results[0].score && results[0].score < 0.3) {
      return results[0].item;
    }

    return null;
  }

  // Busca por padrões conhecidos
  findPatternMatch(description: string): ClassificationPattern | null {
    const normalizedDesc = this.normalizeDescription(description);

    // Primeiro tenta match exato
    let pattern = this.patterns.find(p =>
      p.type === 'exact' && p.pattern.toLowerCase() === normalizedDesc.toLowerCase()
    );

    if (pattern) return pattern;

    // Depois tenta contains
    pattern = this.patterns.find(p =>
      p.type === 'contains' &&
      normalizedDesc.toLowerCase().includes(p.pattern.toLowerCase())
    );

    if (pattern) return pattern;

    // Finalmente busca fuzzy
    const fuseResults = this.fuseSearch.search(normalizedDesc);
    if (fuseResults.length > 0 && fuseResults[0].score && fuseResults[0].score < 0.3) {
      return fuseResults[0].item;
    }

    return null;
  }

  // Adicionar nova classificação ao histórico
  addClassification(record: Omit<ClassificationRecord, 'id' | 'timestamp'>): ClassificationRecord {
    const newRecord: ClassificationRecord = {
      ...record,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    };

    this.history.push(newRecord);
    this.saveHistory();
    this.updatePatterns(newRecord);

    return newRecord;
  }

  // Atualizar feedback e acurácia
  updateFeedback(recordId: string, isCorrect: boolean): void {
    const record = this.history.find(r => r.id === recordId);
    if (record) {
      record.feedbackCount++;
      if (isCorrect) {
        record.accuracy = (record.accuracy * (record.feedbackCount - 1) + 1) / record.feedbackCount;
      } else {
        record.accuracy = (record.accuracy * (record.feedbackCount - 1)) / record.feedbackCount;
      }
      this.saveHistory();
      this.updatePatterns(record);
    }
  }

  // Atualizar padrões baseado no histórico
  private updatePatterns(record: ClassificationRecord): void {
    const normalizedDesc = record.normalizedDescription.toLowerCase();

    // Extrair palavras-chave da descrição
    const keywords = this.extractKeywords(normalizedDesc);

    for (const keyword of keywords) {
      let pattern = this.patterns.find(p => p.pattern.toLowerCase() === keyword);

      if (!pattern) {
        // Criar novo padrão
        pattern = {
          id: this.generateId(),
          pattern: keyword,
          macroCategory: record.macroCategory,
          microCategory: record.microCategory,
          matchCount: 1,
          accuracy: record.accuracy,
          lastUsed: new Date().toISOString(),
          examples: [record.originalDescription],
          type: 'contains'
        };
        this.patterns.push(pattern);
      } else {
        // Atualizar padrão existente
        if (pattern.macroCategory === record.macroCategory &&
            pattern.microCategory === record.microCategory) {
          pattern.matchCount++;
          pattern.accuracy = (pattern.accuracy * (pattern.matchCount - 1) + record.accuracy) / pattern.matchCount;
          pattern.lastUsed = new Date().toISOString();

          if (!pattern.examples.includes(record.originalDescription)) {
            pattern.examples.push(record.originalDescription);
          }
        }
      }
    }

    this.savePatterns();
    this.setupFuseSearch(); // Reindexar busca
  }

  // Normalizar descrição para busca
  normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remover caracteres especiais
      .replace(/\s+/g, ' ') // Unificar espaços
      .trim();
  }

  // Extrair palavras-chave
  private extractKeywords(description: string): string[] {
    const stopWords = ['de', 'da', 'do', 'em', 'para', 'com', 'sem', 'por', 'pelo', 'pela', 'ao', 'aos'];
    const words = description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return [...new Set(words)]; // Remover duplicados
  }

  // Gerar ID único
  private generateId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Obter estatísticas
  getStats(): {
    totalRecords: number;
    totalPatterns: number;
    averageAccuracy: number;
    topPatterns: ClassificationPattern[];
  } {
    const totalRecords = this.history.length;
    const totalPatterns = this.patterns.length;
    const averageAccuracy = totalRecords > 0
      ? this.history.reduce((sum, r) => sum + r.accuracy, 0) / totalRecords
      : 0;

    const topPatterns = this.patterns
      .sort((a, b) => (b.matchCount * b.accuracy) - (a.matchCount * a.accuracy))
      .slice(0, 10);

    return {
      totalRecords,
      totalPatterns,
      averageAccuracy,
      topPatterns
    };
  }

  // Exportar dados
  exportHistory(): ClassificationRecord[] {
    return [...this.history];
  }

  exportPatterns(): ClassificationPattern[] {
    return [...this.patterns];
  }

  // Importar dados
  importHistory(records: ClassificationRecord[]): void {
    this.history = [...this.history, ...records];
    this.saveHistory();
    records.forEach(record => this.updatePatterns(record));
  }
}