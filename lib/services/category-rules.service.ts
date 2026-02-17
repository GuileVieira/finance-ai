import { db } from '@/lib/db/drizzle';
import { categoryRules, transactions, categories, accounts } from '@/lib/db/schema';
import { ilike, or, and, eq, desc, isNull, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('category-rules');

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  categoryId: string;
  categoryName: string;
  categoryType: string;
  confidence: number;
  rulePattern: string;
  ruleType: string;
  reasoning?: string;
}

export class CategoryRulesService {
  /**
   * Verificar se o banco de dados está disponível
   */
  private static checkDatabaseConnection(): void {
    if (!db) {
      throw new Error('Banco de dados não está disponível. Verifique a configuração do DATABASE_URL.');
    }
  }

  /**
   * Aplicar regras de categorização em uma transação
   * @param transactionDescription - Descrição da transação
   * @param companyId - ID da empresa (OBRIGATÓRIO para filtrar regras corretas)
   */
  static async applyRulesToTransaction(
    transactionDescription: string,
    companyId: string
  ): Promise<RuleMatch | null> {
    try {
      this.checkDatabaseConnection();

      // Construir condições de filtro
      const conditions = [
        eq(categoryRules.active, true),
        // PR1: Filtrar apenas regras com status maduro (mesmo filtro do pipeline principal)
        sql`${categoryRules.status} IN ('active', 'refined', 'consolidated')`,
        // Filtrar por empresa para evitar cross-contamination
        eq(categoryRules.companyId, companyId),
      ];

      // Buscar regras ativas ordenadas por confidenceScore (maior primeiro)
      const activeRules = await db
        .select({
          id: categoryRules.id,
          rulePattern: categoryRules.rulePattern,
          ruleType: categoryRules.ruleType,
          categoryId: categoryRules.categoryId,
          confidenceScore: categoryRules.confidenceScore,
          categoryName: categories.name,
          categoryType: categories.type,
        })
        .from(categoryRules)
        .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(categoryRules.confidenceScore));

      // Converter descrição para minúsculas para comparação
      const normalizedDescription = transactionDescription.toLowerCase().trim();

      // Testar cada regra em ordem de confiança
      for (const rule of activeRules) {
        if (this.testRule(rule.rulePattern, rule.ruleType, normalizedDescription)) {
          const confidence = this.calculateConfidence(
            parseFloat(rule.confidenceScore),
            rule.rulePattern,
            normalizedDescription,
            rule.ruleType
          );

          return {
            ruleId: rule.id,
            ruleName: `Regra ${rule.id}`,
            categoryId: rule.categoryId,
            categoryName: rule.categoryName,
            categoryType: rule.categoryType || 'unknown',
            confidence,
            rulePattern: rule.rulePattern,
            ruleType: rule.ruleType,
            reasoning: `Correspondência com regra "${rule.rulePattern}" (tipo: ${rule.ruleType})`
          };
        }
      }

      return null; // Nenhuma regra correspondeu

    } catch (error) {
      log.error({ err: error }, 'Error applying category rules');
      throw new Error('Failed to apply category rules');
    }
  }

  /**
   * Aplicar regras em múltiplas transações
   * @param transactions - Array de transações com id e description
   * @param companyId - ID da empresa (OBRIGATÓRIO para filtrar regras corretas)
   */
  static async applyRulesToTransactions(
    transactions: Array<{ id: string; description: string }>,
    companyId: string
  ): Promise<Array<{ transactionId: string; match: RuleMatch | null }>> {
    try {
      this.checkDatabaseConnection();

      const results = [];

      for (const transaction of transactions) {
        const match = await this.applyRulesToTransaction(transaction.description, companyId);
        results.push({
          transactionId: transaction.id,
          match
        });
      }

      return results;

    } catch (error) {
      log.error({ err: error }, 'Error applying rules to multiple transactions');
      throw new Error('Failed to apply rules to transactions');
    }
  }

  /**
   * Categorizar automaticamente transações sem categoria
   * @param companyId - ID da empresa (OBRIGATÓRIO)
   */
  static async categorizeUncategorizedTransactions(companyId: string): Promise<number> {
    try {
      this.checkDatabaseConnection();

      // Buscar transações sem categoria (categoryId é null) da empresa
      // Transações não têm companyId direto, filtramos via join com accounts
      const uncategorizedTransactions = await db
        .select({
          id: transactions.id,
          description: transactions.description,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(accounts.companyId, companyId),
            or(
              isNull(transactions.categoryId),
              eq(transactions.categoryId, '')
            )
          )
        );

      let categorizedCount = 0;

      for (const transaction of uncategorizedTransactions) {
        const match = await this.applyRulesToTransaction(transaction.description, companyId);

        if (match) {
          // Atualizar a transação com a categoria encontrada
          await db
            .update(transactions)
            .set({ categoryId: match.categoryId })
            .where(eq(transactions.id, transaction.id));

          categorizedCount++;
        }
      }

      return categorizedCount;

    } catch (error) {
      log.error({ err: error }, 'Error categorizing uncategorized transactions');
      throw new Error('Failed to categorize uncategorized transactions');
    }
  }

  /**
   * Testar se um padrão corresponde a um texto
   * Suporta: exact, contains, wildcard, regex
   */
  private static testRule(pattern: string, ruleType: string, text: string): boolean {
    try {
      const normalizedText = text.toLowerCase();
      const normalizedPattern = pattern.toLowerCase();

      switch (ruleType) {
        case 'exact':
          return normalizedText === normalizedPattern;

        case 'contains':
          return normalizedText.includes(normalizedPattern);

        case 'wildcard':
          // Converter wildcard para regex:
          // * → .* (zero ou mais caracteres)
          // ? → . (exatamente um caractere)
          const wildcardRegex = normalizedPattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escapar caracteres regex especiais
            .replace(/\*/g, '.*')                  // * → .*
            .replace(/\?/g, '.');                  // ? → .
          return new RegExp(wildcardRegex, 'i').test(text);

        case 'tokens':
          // Matching por tokens/palavras
          return this.testTokenMatch(pattern, text);

        case 'fuzzy':
          // Matching fuzzy com Levenshtein
          return this.testFuzzyMatch(pattern, text, 0.85);

        case 'regex':
          const regex = new RegExp(pattern, 'i'); // case insensitive
          return regex.test(text);

        default:
          // Fallback para 'contains' se tipo não for reconhecido
          return normalizedText.includes(normalizedPattern);
      }
    } catch {
      // Se falhar, usa contain simples como fallback
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  /**
   * Matching por tokens/palavras
   * Verifica se todos os tokens do pattern existem no texto
   */
  private static testTokenMatch(pattern: string, text: string): boolean {
    const patternTokens = pattern.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const textTokens = new Set(text.toLowerCase().split(/\s+/).filter(t => t.length > 0));

    // Todos os tokens do pattern devem existir no texto
    return patternTokens.every(token => textTokens.has(token));
  }

  /**
   * Matching fuzzy usando Levenshtein
   * Verifica se o pattern é similar o suficiente ao texto
   */
  private static testFuzzyMatch(pattern: string, text: string, threshold: number = 0.85): boolean {
    const normalizedPattern = pattern.toLowerCase();
    const normalizedText = text.toLowerCase();

    // Se o texto contém o pattern exatamente, é match
    if (normalizedText.includes(normalizedPattern)) {
      return true;
    }

    // Procurar o pattern em substrings do texto
    const words = normalizedText.split(/\s+/);

    // Verificar similaridade do pattern com combinações de palavras do texto
    for (let windowSize = 1; windowSize <= Math.min(5, words.length); windowSize++) {
      for (let i = 0; i <= words.length - windowSize; i++) {
        const substring = words.slice(i, i + windowSize).join(' ');
        const similarity = this.calculatePatternSimilarity(normalizedPattern, substring);
        if (similarity >= threshold) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calcular confiança da correspondência (0-100)
   * Considera o tipo de matching para ajustar o score
   */
  private static calculateConfidence(
    confidenceScore: number,
    pattern: string,
    text: string,
    ruleType: string = 'contains'
  ): number {
    try {
      // Converter confidenceScore do banco (0.80) para percentual (80)
      let baseConfidence = confidenceScore * 100;

      // Ajustes baseados no tipo de matching
      const normalizedText = text.toLowerCase();
      const normalizedPattern = pattern.toLowerCase().replace(/\*/g, '');

      // Bônus para correspondência exata
      if (normalizedText === normalizedPattern) {
        baseConfidence = Math.min(100, baseConfidence + 10);
      }
      // Bônus menor para contains exato (sem wildcards)
      else if (ruleType === 'contains' && normalizedText.includes(normalizedPattern)) {
        baseConfidence = Math.min(100, baseConfidence + 5);
      }

      // Penalidades por tipo de matching menos preciso
      const matchTypePenalties: Record<string, number> = {
        'exact': 0,
        'contains': 0,
        'wildcard': -2,   // Wildcard é um pouco menos preciso
        'tokens': -5,     // Tokens podem perder contexto
        'fuzzy': -8,      // Fuzzy é o menos preciso
        'regex': -3       // Regex pode ser muito genérico
      };

      const penalty = matchTypePenalties[ruleType] || 0;
      baseConfidence = Math.max(50, baseConfidence + penalty);

      return Math.round(baseConfidence);
    } catch {
      return 80; // Confiança padrão se não for possível calcular
    }
  }

  /**
   * Encontrar regras conflitantes (mesmo padrão ou similar)
   * @param companyId - ID da empresa para filtrar regras
   */
  static async findConflictingRules(companyId?: string): Promise<Array<{
    rule1: { id: string; rulePattern: string; categoryId: string };
    rule2: { id: string; rulePattern: string; categoryId: string };
    similarity: number;
    isCrossCategory: boolean;
  }>> {
    try {
      this.checkDatabaseConnection();

      // Construir condições
      const conditions = [eq(categoryRules.active, true)];
      if (companyId) {
        conditions.push(eq(categoryRules.companyId, companyId));
      }

      // Buscar todas as regras ativas
      const allRules = await db
        .select()
        .from(categoryRules)
        .where(and(...conditions));

      const conflicts = [];

      // Comparar cada par de regras
      for (let i = 0; i < allRules.length; i++) {
        for (let j = i + 1; j < allRules.length; j++) {
          const rule1 = allRules[i];
          const rule2 = allRules[j];

          // Calcular similaridade simples
          const similarity = this.calculatePatternSimilarity(rule1.rulePattern, rule2.rulePattern);

          if (similarity > 0.8) { // 80% de similaridade considera conflito
            conflicts.push({
              rule1: { id: rule1.id, rulePattern: rule1.rulePattern, categoryId: rule1.categoryId },
              rule2: { id: rule2.id, rulePattern: rule2.rulePattern, categoryId: rule2.categoryId },
              similarity,
              // Conflito cross-category é mais grave (mesmo pattern → categorias diferentes)
              isCrossCategory: rule1.categoryId !== rule2.categoryId
            });
          }
        }
      }

      return conflicts;

    } catch (error) {
      log.error({ err: error }, 'Error finding conflicting rules');
      throw new Error('Failed to find conflicting rules');
    }
  }

  /**
   * Encontrar e desativar regras órfãs (categoria foi deletada)
   * @param companyId - ID da empresa
   */
  static async findOrphanRules(companyId?: string): Promise<Array<{ id: string; rulePattern: string; categoryId: string }>> {
    try {
      this.checkDatabaseConnection();

      // Construir condições
      const conditions = [eq(categoryRules.active, true)];
      if (companyId) {
        conditions.push(eq(categoryRules.companyId, companyId));
      }

      // Buscar regras com LEFT JOIN para identificar órfãs
      const rulesWithCategories = await db
        .select({
          ruleId: categoryRules.id,
          rulePattern: categoryRules.rulePattern,
          categoryId: categoryRules.categoryId,
          categoryName: categories.name,
        })
        .from(categoryRules)
        .leftJoin(categories, eq(categoryRules.categoryId, categories.id))
        .where(and(...conditions));

      // Filtrar regras sem categoria (órfãs)
      const orphanRules = rulesWithCategories
        .filter(r => !r.categoryName)
        .map(r => ({
          id: r.ruleId,
          rulePattern: r.rulePattern,
          categoryId: r.categoryId
        }));

      return orphanRules;

    } catch (error) {
      log.error({ err: error }, 'Error finding orphan rules');
      return [];
    }
  }

  /**
   * Desativar regras órfãs (categoria foi deletada)
   * @param companyId - ID da empresa
   */
  static async deactivateOrphanRules(companyId?: string): Promise<number> {
    try {
      const orphanRules = await this.findOrphanRules(companyId);

      if (orphanRules.length === 0) {
        return 0;
      }

      // Desativar cada regra órfã
      for (const rule of orphanRules) {
        await db
          .update(categoryRules)
          .set({
            active: false,
            status: 'inactive',
            updatedAt: new Date()
          })
          .where(eq(categoryRules.id, rule.id));
      }

      log.info({ count: orphanRules.length }, '[ORPHAN-CLEANUP] Desativadas regras orfas');
      return orphanRules.length;

    } catch (error) {
      log.error({ err: error }, 'Error deactivating orphan rules');
      return 0;
    }
  }

  /**
   * Calcular similaridade entre dois padrões
   */
  private static calculatePatternSimilarity(pattern1: string, pattern2: string): number {
    // Implementação simples de similaridade de strings
    const longer = pattern1.length > pattern2.length ? pattern1 : pattern2;
    const shorter = pattern1.length > pattern2.length ? pattern2 : pattern1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcular distância de Levenshtein entre duas strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
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

    return matrix[str2.length][str1.length];
  }

  /**
   * Buscar regras de categorização
   */
  static async getRules(filters: { categoryId?: string; active?: boolean } = {}): Promise<any[]> {
    try {
      this.checkDatabaseConnection();

      let query = db
        .select({
          id: categoryRules.id,
          rulePattern: categoryRules.rulePattern,
          ruleType: categoryRules.ruleType,
          confidenceScore: categoryRules.confidenceScore,
          categoryId: categoryRules.categoryId,
          companyId: categoryRules.companyId,
          active: categoryRules.active,
          usageCount: categoryRules.usageCount,
          createdAt: categoryRules.createdAt,
          updatedAt: categoryRules.updatedAt,
          categoryName: categories.name,
        })
        .from(categoryRules)
        .innerJoin(categories, eq(categoryRules.categoryId, categories.id));

      // Aplicar filtros
      const conditions = [];
      if (filters.categoryId) {
        conditions.push(eq(categoryRules.categoryId, filters.categoryId));
      }
      if (filters.active !== undefined) {
        conditions.push(eq(categoryRules.active, filters.active));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(categoryRules.confidenceScore));

    } catch (error) {
      log.error({ err: error }, 'Error fetching category rules');
      throw new Error('Failed to fetch category rules');
    }
  }

  /**
   * Encontrar regras similares a um padrão
   * Útil para validar antes de criar uma nova regra
   * @param pattern - Padrão a verificar
   * @param companyId - ID da empresa
   * @param threshold - Limiar de similaridade (0-1, default 0.7)
   * @param excludeRuleId - ID de regra para excluir (útil ao editar)
   */
  static async findSimilarRules(
    pattern: string,
    companyId?: string,
    threshold: number = 0.7,
    excludeRuleId?: string
  ): Promise<Array<{
    id: string;
    rulePattern: string;
    categoryId: string;
    categoryName: string;
    similarity: number;
    isExact: boolean;
    isSameCategory: boolean;
  }>> {
    try {
      this.checkDatabaseConnection();

      // Construir condições
      const conditions = [eq(categoryRules.active, true)];
      if (companyId) {
        conditions.push(eq(categoryRules.companyId, companyId));
      }

      const allRules = await db
        .select({
          id: categoryRules.id,
          rulePattern: categoryRules.rulePattern,
          categoryId: categoryRules.categoryId,
          categoryName: categories.name,
        })
        .from(categoryRules)
        .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
        .where(and(...conditions));

      const normalizedPattern = pattern.toLowerCase().trim();
      const similarRules = [];

      for (const rule of allRules) {
        // Pular a regra sendo editada
        if (excludeRuleId && rule.id === excludeRuleId) continue;

        const normalizedRulePattern = rule.rulePattern.toLowerCase().trim();

        // Verificar match exato
        const isExact = normalizedPattern === normalizedRulePattern;

        // Calcular similaridade
        const similarity = this.calculatePatternSimilarity(normalizedPattern, normalizedRulePattern);

        if (isExact || similarity >= threshold) {
          similarRules.push({
            id: rule.id,
            rulePattern: rule.rulePattern,
            categoryId: rule.categoryId,
            categoryName: rule.categoryName,
            similarity: Math.round(similarity * 100) / 100,
            isExact,
            isSameCategory: false // Será preenchido pelo chamador
          });
        }
      }

      // Ordenar por similaridade (maior primeiro)
      return similarRules.sort((a, b) => b.similarity - a.similarity);

    } catch (error) {
      log.error({ err: error }, 'Error finding similar rules');
      return [];
    }
  }

  /**
   * Validar se pode criar uma regra (verifica duplicatas e conflitos)
   * @returns Objeto com validação e alertas
   */
  static async validateRuleCreation(
    pattern: string,
    categoryId: string,
    companyId?: string,
    excludeRuleId?: string
  ): Promise<{
    canCreate: boolean;
    hasExactDuplicate: boolean;
    hasSimilarRules: boolean;
    hasCrossConflict: boolean;
    warnings: string[];
    similarRules: Array<{
      id: string;
      rulePattern: string;
      categoryName: string;
      similarity: number;
      isConflict: boolean;
    }>;
  }> {
    try {
      const similarRules = await this.findSimilarRules(pattern, companyId, 0.7, excludeRuleId);

      const warnings: string[] = [];
      let hasExactDuplicate = false;
      let hasCrossConflict = false;

      const detailedSimilar = similarRules.map(rule => {
        const isConflict = rule.categoryId !== categoryId;
        const isExact = rule.isExact;

        if (isExact) {
          hasExactDuplicate = true;
          if (isConflict) {
            hasCrossConflict = true;
            warnings.push(`Já existe regra idêntica "${rule.rulePattern}" para categoria "${rule.categoryName}"`);
          } else {
            warnings.push(`Regra duplicada: "${rule.rulePattern}" já existe para esta categoria`);
          }
        } else if (rule.similarity >= 0.9) {
          if (isConflict) {
            hasCrossConflict = true;
            warnings.push(`Regra muito similar "${rule.rulePattern}" (${Math.round(rule.similarity * 100)}%) aponta para "${rule.categoryName}"`);
          }
        }

        return {
          id: rule.id,
          rulePattern: rule.rulePattern,
          categoryName: rule.categoryName,
          similarity: rule.similarity,
          isConflict
        };
      });

      return {
        canCreate: !hasExactDuplicate, // Não permitir duplicatas exatas
        hasExactDuplicate,
        hasSimilarRules: similarRules.length > 0,
        hasCrossConflict,
        warnings,
        similarRules: detailedSimilar
      };

    } catch (error) {
      log.error({ err: error }, 'Error validating rule creation');
      return {
        canCreate: true, // Em caso de erro, permitir (fail-safe)
        hasExactDuplicate: false,
        hasSimilarRules: false,
        hasCrossConflict: false,
        warnings: [],
        similarRules: []
      };
    }
  }

  /**
   * Criar nova regra de categorização
   */
  static async createRule(ruleData: {
    rulePattern: string;
    ruleType: string;
    categoryId: string;
    companyId?: string;
    confidenceScore?: number;
    active?: boolean;
    skipValidation?: boolean;
  }): Promise<{ rule: ReturnType<typeof db.insert> extends Promise<infer T> ? T : never; validation?: Awaited<ReturnType<typeof CategoryRulesService.validateRuleCreation>> }> {
    try {
      this.checkDatabaseConnection();

      // Validar antes de criar (a menos que seja explicitamente pulado)
      let validation;
      if (!ruleData.skipValidation) {
        validation = await this.validateRuleCreation(
          ruleData.rulePattern,
          ruleData.categoryId,
          ruleData.companyId
        );

        // Bloquear se for duplicata exata
        if (validation.hasExactDuplicate) {
          throw new Error(`Regra duplicada: já existe uma regra com o padrão "${ruleData.rulePattern}"`);
        }
      }

      const [newRule] = await db
        .insert(categoryRules)
        .values({
          rulePattern: ruleData.rulePattern,
          ruleType: ruleData.ruleType,
          categoryId: ruleData.categoryId,
          companyId: ruleData.companyId || null,
          confidenceScore: ruleData.confidenceScore || 0.80,
          active: ruleData.active !== undefined ? ruleData.active : true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return { rule: newRule, validation };

    } catch (error) {
      log.error({ err: error }, 'Error creating category rule');
      throw error instanceof Error ? error : new Error('Failed to create category rule');
    }
  }

  /**
   * Atualizar regra de categorização
   */
  static async updateRule(id: string, updateData: Partial<{
    rulePattern: string;
    ruleType: string;
    categoryId: string;
    confidenceScore: number;
    active: boolean;
  }>): Promise<any> {
    try {
      this.checkDatabaseConnection();

      const [updatedRule] = await db
        .update(categoryRules)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(categoryRules.id, id))
        .returning();

      if (!updatedRule) {
        throw new Error('Rule not found');
      }

      return updatedRule;

    } catch (error) {
      log.error({ err: error }, 'Error updating category rule');
      throw new Error('Failed to update category rule');
    }
  }

  /**
   * Deletar regra de categorização
   */
  static async deleteRule(id: string): Promise<void> {
    try {
      this.checkDatabaseConnection();

      await db
        .delete(categoryRules)
        .where(eq(categoryRules.id, id));

    } catch (error) {
      log.error({ err: error }, 'Error deleting category rule');
      throw new Error('Failed to delete category rule');
    }
  }

  /**
   * Estatísticas das regras
   */
  static async getRulesStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    rulesByType: Record<string, number>;
    averageConfidence: number;
  }> {
    try {
      this.checkDatabaseConnection();

      const [totalRules, activeRules, activeRulesData] = await Promise.all([
        db.select().from(categoryRules).then(r => r.length),
        db.select().from(categoryRules).where(eq(categoryRules.active, true)).then(r => r.length),
        db.select().from(categoryRules).where(eq(categoryRules.active, true))
      ]);

      // Agrupar por tipo de regra
      const rulesByType = activeRulesData.reduce((acc, rule) => {
        const type = rule.ruleType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calcular confiança média
      const averageConfidence = activeRulesData.length > 0
        ? activeRulesData.reduce((sum, rule) => sum + parseFloat(rule.confidenceScore), 0) / activeRulesData.length * 100
        : 0;

      return {
        totalRules,
        activeRules,
        rulesByType,
        averageConfidence: Math.round(averageConfidence)
      };

    } catch (error) {
      log.error({ err: error }, 'Error getting rules statistics');
      throw new Error('Failed to get rules statistics');
    }
  }
}

export default CategoryRulesService;