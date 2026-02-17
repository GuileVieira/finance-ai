/**
 * Rule Generation Service
 *
 * Gera regras automaticamente baseado em padrões aprendidos com a IA.
 * Implementa auto-aprendizado para reduzir custos e melhorar performance.
 *
 * v2.0 - Sistema de extração inteligente de padrões com:
 * - Classificação de palavras por relevância
 * - Detecção automática de entidades (empresas, pessoas)
 * - Geração de wildcards inteligentes
 * - Ciclo de vida de regras (candidate → active)
 */

import { db } from '@/lib/db/drizzle';
import { categoryRules, categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('rule-generation');

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface GeneratedRule {
  pattern: string;
  ruleType: 'contains' | 'wildcard';
  categoryId: string;
  categoryName: string;
  confidence: number;
  sourceType: 'ai';
  examples: string[];
  reasoning: string;
  strategy?: PatternStrategy;
}

export interface PatternExtractionResult {
  pattern: string;
  isValid: boolean;
  reason?: string;
  normalized: string;
  removedElements: string[];
  strategy?: PatternStrategy;
  alternativePatterns?: GeneratedPattern[];
}

export interface WordScore {
  word: string;
  score: number;           // 0-1 (maior = mais relevante)
  category: 'entity' | 'action' | 'generic' | 'identifier' | 'preposition';
  isDiscriminant: boolean; // palavra única/diferenciadora
}

export interface EntityExtraction {
  entityName: string;
  entityType: 'company' | 'person' | 'service' | 'bank' | 'unknown';
  confidence: number;
  position: number;        // índice no array de palavras
}

export type PatternStrategy =
  | 'entity_only'      // "*CRIATIVA*" - apenas entidade principal
  | 'prefix_entity'    // "PIX*CRIATIVA" - tipo + entidade
  | 'entity_suffix'    // "CRIATIVA*LTDA" - entidade + sufixo legal
  | 'multi_keyword'    // "FORNECEDORES*LABORATORIOS" - múltiplas palavras-chave
  | 'single_keyword'   // "NETFLIX" - palavra única discriminante
  | 'fallback';        // texto normalizado (fallback)

export interface GeneratedPattern {
  pattern: string;
  strategy: PatternStrategy;
  confidence: number;
  genericityScore: number;  // 0-1 (0=muito específico, 1=muito genérico)
  ruleType: 'contains' | 'wildcard';
}

// ============================================================================
// DICIONÁRIO DE PALAVRAS GENÉRICAS (CATEGORIZADO)
// ============================================================================

/**
 * Palavras categorizadas por tipo - substituem o antigo STOP_WORDS
 */
const GENERIC_WORDS = {
  // Tipos de transação bancária
  transaction_types: [
    'PAGAMENTOS', 'PAGAMENTO', 'PAG', 'PGTO', 'TRANSF', 'TRANSFERENCIA', 'TRANSFERENCIAS',
    'DEPOSITO', 'DEPOSITOS', 'DEP', 'SAQUE', 'SAQUES', 'CREDITO', 'DEBITO', 'DEB', 'CRED',
    'PIX', 'TED', 'DOC', 'BOLETO', 'COMPRA', 'COMPRAS', 'VENDA', 'VENDAS',
    'TARIFA', 'TAR', 'IOF', 'JUROS', 'ESTORNO', 'ESTORNOS', 'DEVOLUCAO',
    'ENVIADO', 'RECEBIDO', 'RECEB', 'ENV', 'ENVIO', 'RECEBIMENTO',
    'LIQUIDACAO', 'LIQ', 'LANCAMENTO', 'LANC', 'FATURA', 'FAT'
  ],

  // Formas jurídicas e sufixos empresariais
  legal_forms: [
    'LTDA', 'SA', 'S/A', 'ME', 'MEI', 'EIRELI', 'EPP', 'SS', 'CIA', 'INC',
    'SOCIEDADE', 'EMPRESA', 'EMPRESAS', 'FILIAL', 'MATRIZ', 'HOLDING'
  ],

  // Palavras genéricas de negócio
  business_generic: [
    'COMERCIO', 'COMERCIAL', 'SERVICOS', 'SERVICO', 'REPRESENTACAO', 'REPRESENTACOES',
    'INDUSTRIA', 'INDUSTRIAL', 'DISTRIBUIDORA', 'DISTRIBUIDOR', 'DISTRIBUICAO',
    'IMPORTACAO', 'EXPORTACAO', 'IMPORTADORA', 'EXPORTADORA', 'BRASIL', 'BRASILEIRA',
    'INTERNACIONAL', 'NACIONAL', 'ATACADO', 'VAREJO', 'ATACADISTA', 'VAREJISTA',
    'FORNECEDORES', 'FORNECEDOR', 'CLIENTES', 'CLIENTE', 'PARCEIRO', 'PARCEIROS',
    'PRODUTOS', 'PRODUTO', 'MATERIAIS', 'MATERIAL', 'EQUIPAMENTOS', 'EQUIPAMENTO',
    'CONSULTORIA', 'ASSESSORIA', 'ADMINISTRACAO', 'GESTAO', 'SOLUCOES', 'TECNOLOGIA'
  ],

  // Prefixos e termos bancários
  bank_prefixes: [
    'SISPAG', 'EST', 'CARTEIRA', 'COBRANCA', 'COBRANCAS', 'QUANT', 'QUANTIDADE',
    'EVENTOS', 'EVENTO', 'OPERACAO', 'OPERACOES', 'CONTA', 'CC', 'CP', 'POUPANCA',
    'CORRENTE', 'INVESTIMENTO', 'CDB', 'RDB', 'LCI', 'LCA', 'TESOURO'
  ],

  // Preposições e artigos
  prepositions: [
    'DE', 'DA', 'DO', 'DAS', 'DOS', 'A', 'O', 'AS', 'OS', 'E', 'OU',
    'PARA', 'PRA', 'COM', 'EM', 'POR', 'NO', 'NA', 'NOS', 'NAS',
    'AO', 'AOS', 'UM', 'UMA', 'UNS', 'UMAS', 'PELO', 'PELA', 'PELOS', 'PELAS'
  ],

  // Termos de data/tempo
  temporal: [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
    'JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
    'MENSAL', 'SEMANAL', 'DIARIO', 'ANUAL', 'PARCELA', 'PARCELAS', 'REF'
  ],

  // Palavras extremamente genéricas (nunca usar como pattern)
  extremely_generic: [
    'PAGAMENTO', 'COMPRA', 'VENDA', 'CREDITO', 'DEBITO', 'TRANSFERENCIA',
    'OUTROS', 'OUTRAS', 'DIVERSOS', 'DIVERSAS', 'GERAL', 'GERAIS'
  ]
};

/**
 * Lista consolidada de todas as palavras genéricas (para checagem rápida)
 */
const ALL_GENERIC_WORDS = new Set([
  ...GENERIC_WORDS.transaction_types,
  ...GENERIC_WORDS.legal_forms,
  ...GENERIC_WORDS.business_generic,
  ...GENERIC_WORDS.bank_prefixes,
  ...GENERIC_WORDS.prepositions,
  ...GENERIC_WORDS.temporal,
  ...GENERIC_WORDS.extremely_generic
].map(w => w.toUpperCase()));

/**
 * Palavras que indicam entidades conhecidas (bancos, serviços)
 */
const KNOWN_ENTITIES = {
  banks: [
    'ITAU', 'BRADESCO', 'SANTANDER', 'CAIXA', 'CEF', 'BB', 'BANCO DO BRASIL',
    'NUBANK', 'INTER', 'C6', 'BTG', 'SAFRA', 'SICOOB', 'SICREDI', 'ORIGINAL',
    'PAN', 'NEXT', 'NEON', 'PICPAY', 'MERCADOPAGO', 'PAGSEGURO', 'STONE'
  ],
  services: [
    'NETFLIX', 'SPOTIFY', 'AMAZON', 'GOOGLE', 'APPLE', 'MICROSOFT', 'UBER', 'IFOOD',
    'MERCADOLIVRE', 'MAGAZINELUIZA', 'AMERICANAS', 'SUBMARINO', 'SHOPEE', 'ALIEXPRESS',
    'CLARO', 'VIVO', 'TIM', 'OI', 'SKY', 'NET', 'GLOBO', 'DEEZER', 'HBO', 'DISNEY',
    'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'TELEGRAM', 'ZOOM', 'SLACK'
  ],
  utilities: [
    'CEMIG', 'COPASA', 'SABESP', 'LIGHT', 'ENEL', 'CPFL', 'ENERGISA', 'COELBA',
    'CELESC', 'ELETROPAULO', 'COMGAS', 'NATURGY', 'SANEPAR', 'CORSAN'
  ]
};

/**
 * Set de entidades conhecidas para checagem rápida
 */
const ALL_KNOWN_ENTITIES = new Set([
  ...KNOWN_ENTITIES.banks,
  ...KNOWN_ENTITIES.services,
  ...KNOWN_ENTITIES.utilities
].map(e => e.toUpperCase()));

/**
 * Confidence padrão para regras geradas pela IA (0.75-0.85, conforme definido)
 */
const AI_RULE_CONFIDENCE = {
  min: 0.75,
  max: 0.85,
  default: 0.80
};

export class RuleGenerationService {
  // ============================================================================
  // FUNÇÕES DE SCORING E CLASSIFICAÇÃO DE PALAVRAS
  // ============================================================================

  /**
   * Verifica se uma palavra é genérica
   */
  private static isGenericWord(word: string): boolean {
    return ALL_GENERIC_WORDS.has(word.toUpperCase());
  }

  /**
   * Verifica se uma palavra é uma entidade conhecida
   */
  private static isKnownEntity(word: string): boolean {
    return ALL_KNOWN_ENTITIES.has(word.toUpperCase());
  }

  /**
   * Identifica o tipo de uma palavra genérica
   */
  private static getGenericWordType(word: string): string | null {
    const upper = word.toUpperCase();
    for (const [type, words] of Object.entries(GENERIC_WORDS)) {
      if ((words as string[]).map(w => w.toUpperCase()).includes(upper)) {
        return type;
      }
    }
    return null;
  }

  /**
   * Calcula score de relevância de uma palavra (0-1)
   */
  static scoreWord(word: string, allWords: string[]): WordScore {
    const upper = word.toUpperCase();
    const wordLength = word.length;

    // 1. Verificar se é preposição (score muito baixo)
    if (GENERIC_WORDS.prepositions.map(w => w.toUpperCase()).includes(upper)) {
      return {
        word,
        score: 0.05,
        category: 'preposition',
        isDiscriminant: false
      };
    }

    // 2. Verificar se é entidade conhecida (score alto)
    if (this.isKnownEntity(upper)) {
      return {
        word,
        score: 0.95,
        category: 'entity',
        isDiscriminant: true
      };
    }

    // 3. Verificar se é palavra extremamente genérica
    if (GENERIC_WORDS.extremely_generic.map(w => w.toUpperCase()).includes(upper)) {
      return {
        word,
        score: 0.1,
        category: 'generic',
        isDiscriminant: false
      };
    }

    // 4. Verificar se é tipo de transação
    if (GENERIC_WORDS.transaction_types.map(w => w.toUpperCase()).includes(upper)) {
      return {
        word,
        score: 0.25,
        category: 'action',
        isDiscriminant: false
      };
    }

    // 5. Verificar se é forma jurídica
    if (GENERIC_WORDS.legal_forms.map(w => w.toUpperCase()).includes(upper)) {
      return {
        word,
        score: 0.15,
        category: 'generic',
        isDiscriminant: false
      };
    }

    // 6. Verificar se é genérica de negócio
    if (GENERIC_WORDS.business_generic.map(w => w.toUpperCase()).includes(upper)) {
      return {
        word,
        score: 0.3,
        category: 'generic',
        isDiscriminant: false
      };
    }

    // 7. Verificar se é termo bancário
    if (GENERIC_WORDS.bank_prefixes.map(w => w.toUpperCase()).includes(upper)) {
      return {
        word,
        score: 0.2,
        category: 'generic',
        isDiscriminant: false
      };
    }

    // 8. Verificar se é temporal
    if (GENERIC_WORDS.temporal.map(w => w.toUpperCase()).includes(upper)) {
      return {
        word,
        score: 0.1,
        category: 'generic',
        isDiscriminant: false
      };
    }

    // 9. Palavra não genérica - calcular score baseado em características
    let score = 0.6; // Base para palavras não genéricas

    // Palavras mais longas tendem a ser mais específicas
    if (wordLength >= 6) score += 0.15;
    else if (wordLength >= 4) score += 0.1;
    else if (wordLength <= 2) score -= 0.2;

    // Verificar unicidade no contexto
    const occurrences = allWords.filter(w => w.toUpperCase() === upper).length;
    if (occurrences === 1) score += 0.1; // Palavra única no contexto

    // Palavras que parecem nomes próprios (não genéricas e com tamanho médio)
    if (!this.isGenericWord(upper) && wordLength >= 4 && wordLength <= 15) {
      score += 0.1;
    }

    return {
      word,
      score: Math.min(1, Math.max(0, score)),
      category: 'entity',
      isDiscriminant: score >= 0.7
    };
  }

  // ============================================================================
  // FUNÇÕES DE EXTRAÇÃO DE ENTIDADES
  // ============================================================================

  /**
   * Extrai entidades (empresas, pessoas, serviços) de uma lista de palavras
   */
  static extractEntities(words: string[]): EntityExtraction[] {
    const entities: EntityExtraction[] = [];
    const upperWords = words.map(w => w.toUpperCase());

    // 1. Detectar entidades conhecidas
    words.forEach((word, index) => {
      const upper = word.toUpperCase();

      // Verificar bancos
      if (KNOWN_ENTITIES.banks.map(b => b.toUpperCase()).includes(upper)) {
        entities.push({
          entityName: word,
          entityType: 'bank',
          confidence: 0.95,
          position: index
        });
        return;
      }

      // Verificar serviços
      if (KNOWN_ENTITIES.services.map(s => s.toUpperCase()).includes(upper)) {
        entities.push({
          entityName: word,
          entityType: 'service',
          confidence: 0.95,
          position: index
        });
        return;
      }

      // Verificar utilities
      if (KNOWN_ENTITIES.utilities.map(u => u.toUpperCase()).includes(upper)) {
        entities.push({
          entityName: word,
          entityType: 'service',
          confidence: 0.95,
          position: index
        });
      }
    });

    // 2. Detectar nome de empresa (palavras antes de LTDA, SA, ME, etc.)
    const legalFormIndexes = upperWords.map((w, i) =>
      GENERIC_WORDS.legal_forms.map(lf => lf.toUpperCase()).includes(w) ? i : -1
    ).filter(i => i > 0);

    for (const legalFormIdx of legalFormIndexes) {
      // Pegar palavras antes da forma jurídica que não sejam genéricas
      const companyWords: string[] = [];
      for (let i = legalFormIdx - 1; i >= 0 && i >= legalFormIdx - 4; i--) {
        const word = words[i];
        if (!this.isGenericWord(word) && word.length > 2) {
          companyWords.unshift(word);
        } else if (this.isGenericWord(word) && GENERIC_WORDS.business_generic.map(b => b.toUpperCase()).includes(word.toUpperCase())) {
          // Parar se encontrar palavra de negócio genérica
          break;
        }
      }

      if (companyWords.length > 0) {
        // Usar a palavra mais discriminante como nome da entidade
        const discriminant = companyWords.find(w => this.scoreWord(w, words).isDiscriminant) || companyWords[0];
        if (!entities.some(e => e.entityName.toUpperCase() === discriminant.toUpperCase())) {
          entities.push({
            entityName: discriminant,
            entityType: 'company',
            confidence: 0.85,
            position: words.findIndex(w => w.toUpperCase() === discriminant.toUpperCase())
          });
        }
      }
    }

    // 3. Detectar entidade após tipo de transação (PIX ENVIADO <ENTIDADE>)
    const transactionTypeIndexes = upperWords.map((w, i) =>
      GENERIC_WORDS.transaction_types.map(tt => tt.toUpperCase()).includes(w) ? i : -1
    ).filter(i => i >= 0);

    for (const txIdx of transactionTypeIndexes) {
      // Pegar próximas 1-3 palavras após o tipo de transação
      for (let i = txIdx + 1; i <= Math.min(txIdx + 3, words.length - 1); i++) {
        const word = words[i];
        const score = this.scoreWord(word, words);

        if (score.isDiscriminant && !entities.some(e => e.entityName.toUpperCase() === word.toUpperCase())) {
          entities.push({
            entityName: word,
            entityType: 'unknown',
            confidence: 0.75,
            position: i
          });
          break; // Pegar apenas a primeira entidade discriminante
        }
      }
    }

    // 4. Detectar palavras discriminantes não capturadas
    words.forEach((word, index) => {
      const score = this.scoreWord(word, words);
      if (score.isDiscriminant && !entities.some(e => e.entityName.toUpperCase() === word.toUpperCase())) {
        entities.push({
          entityName: word,
          entityType: 'unknown',
          confidence: score.score,
          position: index
        });
      }
    });

    // Ordenar por confidence
    return entities.sort((a, b) => b.confidence - a.confidence);
  }

  // ============================================================================
  // FUNÇÕES DE GERAÇÃO DE PADRÕES INTELIGENTES
  // ============================================================================

  /**
   * Gera múltiplos padrões candidatos para uma descrição
   */
  static generateSmartPatterns(words: string[], originalDescription: string): GeneratedPattern[] {
    const patterns: GeneratedPattern[] = [];
    const entities = this.extractEntities(words);
    const upperWords = words.map(w => w.toUpperCase());

    // Encontrar palavras discriminantes
    const discriminantWords = words.filter(w => {
      const score = this.scoreWord(w, words);
      return score.isDiscriminant;
    });

    // Encontrar tipo de transação (se existir)
    const transactionType = words.find(w =>
      GENERIC_WORDS.transaction_types.map(tt => tt.toUpperCase()).includes(w.toUpperCase())
    );

    // Estratégia 1: Entidade única conhecida (serviço, banco) - MAIOR PRIORIDADE
    const knownEntity = entities.find(e => e.entityType === 'service' || e.entityType === 'bank');
    if (knownEntity) {
      patterns.push({
        pattern: knownEntity.entityName.toUpperCase(),
        strategy: 'single_keyword',
        confidence: 0.95,
        genericityScore: 0.2,
        ruleType: 'contains'
      });
    }

    // Estratégia 2: Entidade de empresa detectada
    const companyEntity = entities.find(e => e.entityType === 'company');
    if (companyEntity) {
      patterns.push({
        pattern: companyEntity.entityName.toUpperCase(),
        strategy: 'entity_only',
        confidence: 0.85,
        genericityScore: 0.25,
        ruleType: 'contains'
      });
    }

    // Estratégia 3: Tipo de transação + Entidade (wildcard)
    if (transactionType && entities.length > 0) {
      const mainEntity = entities[0];
      const wildcardPattern = `${transactionType.toUpperCase()}*${mainEntity.entityName.toUpperCase()}`;
      patterns.push({
        pattern: wildcardPattern,
        strategy: 'prefix_entity',
        confidence: 0.80,
        genericityScore: 0.35,
        ruleType: 'wildcard'
      });
    }

    // Estratégia 4: Múltiplas palavras discriminantes (wildcard)
    if (discriminantWords.length >= 2) {
      const first = discriminantWords[0].toUpperCase();
      const last = discriminantWords[discriminantWords.length - 1].toUpperCase();

      if (first !== last) {
        const wildcardPattern = `${first}*${last}`;
        patterns.push({
          pattern: wildcardPattern,
          strategy: 'multi_keyword',
          confidence: 0.75,
          genericityScore: 0.4,
          ruleType: 'wildcard'
        });
      }
    }

    // Estratégia 5: Palavra discriminante única (se só tiver uma)
    if (discriminantWords.length === 1 && discriminantWords[0].length >= 4) {
      patterns.push({
        pattern: discriminantWords[0].toUpperCase(),
        strategy: 'single_keyword',
        confidence: 0.70,
        genericityScore: 0.3,
        ruleType: 'contains'
      });
    }

    // Estratégia 6: Fallback - primeiras palavras discriminantes concatenadas
    if (patterns.length === 0 && discriminantWords.length > 0) {
      const fallbackPattern = discriminantWords.slice(0, 3).join(' ').toUpperCase();
      if (fallbackPattern.length >= 4) {
        patterns.push({
          pattern: fallbackPattern,
          strategy: 'fallback',
          confidence: 0.65,
          genericityScore: 0.5,
          ruleType: 'contains'
        });
      }
    }

    // Ordenar por confidence (maior primeiro), depois por genericityScore (menor primeiro)
    return patterns.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.genericityScore - b.genericityScore;
    });
  }

  /**
   * Seleciona o melhor padrão da lista de candidatos
   */
  private static selectBestPattern(patterns: GeneratedPattern[]): GeneratedPattern | null {
    if (patterns.length === 0) return null;

    // Filtrar padrões válidos
    const validPatterns = patterns.filter(p =>
      p.pattern.length >= 3 &&
      p.pattern.length <= 50 &&
      p.confidence >= 0.65 &&
      p.genericityScore <= 0.6
    );

    return validPatterns[0] || patterns[0];
  }

  // ============================================================================
  // FUNÇÕES PRINCIPAIS DE EXTRAÇÃO
  // ============================================================================

  /**
   * Extrai pattern de uma descrição usando sistema inteligente
   */
  static extractPattern(description: string): PatternExtractionResult {
    const original = description.trim();
    const removedElements: string[] = [];

    // 1. Converter para uppercase e normalizar
    let text = original.toUpperCase();

    // 2. Remover números e armazenar
    const numbersRemoved = text.match(/\d+/g);
    if (numbersRemoved) {
      removedElements.push(...numbersRemoved);
    }
    text = text.replace(/\d+/g, ' ');

    // 3. Remover datas (dd/mm/yyyy, dd-mm-yyyy, etc)
    text = text.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, ' ');

    // 4. Remover caracteres especiais (exceto espaços e letras)
    text = text.replace(/[^A-Z\s]/g, ' ');

    // 5. Normalizar múltiplos espaços
    text = text.replace(/\s+/g, ' ').trim();

    // 6. Tokenizar
    const words = text.split(' ').filter(w => w.length > 0);

    // 7. NOVA LÓGICA: Gerar padrões inteligentes
    const smartPatterns = this.generateSmartPatterns(words, original);
    const bestPattern = this.selectBestPattern(smartPatterns);

    if (bestPattern) {
      return {
        pattern: bestPattern.pattern,
        isValid: true,
        reason: undefined,
        normalized: bestPattern.pattern.toLowerCase(),
        removedElements,
        strategy: bestPattern.strategy,
        alternativePatterns: smartPatterns.slice(0, 5) // Top 5 alternativas
      };
    }

    // 8. Fallback: Lógica original simplificada
    const discriminantWords = words.filter(w =>
      !this.isGenericWord(w) && w.length > 2
    );

    const fallbackPattern = discriminantWords.slice(0, 3).join(' ');

    // Validar pattern
    const isValid = this.validatePattern(fallbackPattern || text);
    const reason = isValid ? undefined : this.getValidationReason(fallbackPattern || text);

    return {
      pattern: (fallbackPattern || text).trim(),
      isValid,
      reason,
      normalized: (fallbackPattern || text).toLowerCase().trim(),
      removedElements,
      strategy: 'fallback'
    };
  }

  /**
   * Valida se um pattern é adequado para criar regra
   */
  private static validatePattern(pattern: string): boolean {
    // Remover wildcards para validação
    const cleanPattern = pattern.replace(/\*/g, '').trim();

    // Mínimo 3 caracteres (excluindo wildcards)
    if (cleanPattern.length < 3) {
      return false;
    }

    // Mínimo 1 palavra significativa
    const words = cleanPattern.split(' ').filter(w => w.length > 2);
    if (words.length === 0) {
      return false;
    }

    // Não pode ser apenas palavras genéricas
    const hasSignificantWord = words.some(word =>
      !this.isGenericWord(word)
    );
    if (!hasSignificantWord) {
      return false;
    }

    // Não pode ser palavra extremamente genérica sozinha
    if (words.length === 1 && GENERIC_WORDS.extremely_generic.map(w => w.toUpperCase()).includes(words[0].toUpperCase())) {
      return false;
    }

    return true;
  }

  /**
   * Retorna motivo da invalidação do pattern
   */
  private static getValidationReason(pattern: string): string {
    const cleanPattern = pattern.replace(/\*/g, '').trim();

    if (cleanPattern.length < 3) {
      return 'Pattern muito curto (mínimo 3 caracteres)';
    }

    const words = cleanPattern.split(' ').filter(w => w.length > 2);
    if (words.length === 0) {
      return 'Pattern não contém palavras significativas';
    }

    const hasSignificantWord = words.some(word =>
      !this.isGenericWord(word)
    );
    if (!hasSignificantWord) {
      return 'Pattern contém apenas palavras genéricas';
    }

    if (words.length === 1 && GENERIC_WORDS.extremely_generic.map(w => w.toUpperCase()).includes(words[0].toUpperCase())) {
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
    // PR3: Remover clamp artificial. Retornar confidence real.
    // Antes: Mapeava 0-100 para 0.75-0.85
    // Agora: Mapeia 0-100 para 0.0-1.0 direto
    return aiConfidence / 100;
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
    // PR3: Threshold conservador para sistema financeiro
    // Subido de 20%→70% para evitar regras baseadas em inferências fracas
    if (aiConfidence < 70) {
      return {
        shouldCreate: false,
        reason: `Confiança da IA muito baixa: ${aiConfidence}% (Mínimo 70%)`
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

      const [category] = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(
          and(
            eq(categories.name, categoryName),
            eq(categories.companyId, companyId)
          )
        )
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

      // 6. Determinar tipo de regra (wildcard se tiver *, senão contains)
      const ruleType = extraction.pattern.includes('*') ? 'wildcard' : 'contains';
      const strategy = extraction.strategy || 'fallback';

      // 7. Criar regra no banco
      // Regras de IA com alta confiança nascem ativas.
      // O feedback negativo (rule-lifecycle.service.ts) cuida de desativar regras ruins.
      await db
        .insert(categoryRules)
        .values({
          rulePattern: extraction.pattern,
          ruleType,
          categoryId: category.id,
          companyId,
          confidenceScore: ruleConfidence.toFixed(2),
          active: true,
          usageCount: 0,
          sourceType: 'ai',
          matchFields: ['description', 'memo', 'name'],
          examples: [description],
          patternStrategy: strategy,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });

      log.info(
        { pattern: extraction.pattern, ruleType, strategy, categoryName, confidence: (ruleConfidence * 100).toFixed(0) },
        'Auto-rule created'
      );

      return {
        success: true,
        rule: {
          pattern: extraction.pattern,
          ruleType,
          categoryId: category.id,
          categoryName: category.name,
          confidence: ruleConfidence,
          sourceType: 'ai',
          examples: [description],
          reasoning: aiReasoning || `Auto-generated from AI categorization (${aiConfidence}% confidence)`,
          strategy
        }
      };

    } catch (error) {
      log.error({ err: error }, 'Error creating auto-rule');
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
      log.warn({ ruleId }, 'Rule not found');
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
