import { db } from '@/lib/db/drizzle';
import { categoryRules, transactions, categories } from '@/lib/db/schema';
import { ilike, or, and, eq, desc, isNull } from 'drizzle-orm';

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  categoryId: string;
  categoryName: string;
  confidence: number;
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
   */
  static async applyRulesToTransaction(transactionDescription: string): Promise<RuleMatch | null> {
    try {
      this.checkDatabaseConnection();

      // Buscar regras ativas ordenadas por confidenceScore (maior primeiro)
      const activeRules = await db
        .select({
          id: categoryRules.id,
          rulePattern: categoryRules.rulePattern,
          ruleType: categoryRules.ruleType,
          categoryId: categoryRules.categoryId,
          confidenceScore: categoryRules.confidenceScore,
          categoryName: categories.name,
        })
        .from(categoryRules)
        .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
        .where(eq(categoryRules.active, true))
        .orderBy(desc(categoryRules.confidenceScore));

      // Converter descrição para minúsculas para comparação
      const normalizedDescription = transactionDescription.toLowerCase().trim();

      // Testar cada regra em ordem de confiança
      for (const rule of activeRules) {
        if (this.testRule(rule.rulePattern, rule.ruleType, normalizedDescription)) {
          return {
            ruleId: rule.id,
            ruleName: `Regra ${rule.id}`, // Como não existe campo name, usamos ID
            categoryId: rule.categoryId,
            categoryName: rule.categoryName,
            confidence: this.calculateConfidence(
              parseFloat(rule.confidenceScore),
              rule.rulePattern,
              normalizedDescription
            )
          };
        }
      }

      return null; // Nenhuma regra correspondeu

    } catch (error) {
      console.error('Error applying category rules:', error);
      throw new Error('Failed to apply category rules');
    }
  }

  /**
   * Aplicar regras em múltiplas transações
   */
  static async applyRulesToTransactions(transactions: Array<{ id: string; description: string }>): Promise<Array<{ transactionId: string; match: RuleMatch | null }>> {
    try {
      this.checkDatabaseConnection();

      const results = [];

      for (const transaction of transactions) {
        const match = await this.applyRulesToTransaction(transaction.description);
        results.push({
          transactionId: transaction.id,
          match
        });
      }

      return results;

    } catch (error) {
      console.error('Error applying rules to multiple transactions:', error);
      throw new Error('Failed to apply rules to transactions');
    }
  }

  /**
   * Categorizar automaticamente transações sem categoria
   */
  static async categorizeUncategorizedTransactions(): Promise<number> {
    try {
      this.checkDatabaseConnection();

      // Buscar transações sem categoria (categoryId é null)
      const uncategorizedTransactions = await db
        .select({
          id: transactions.id,
          description: transactions.description,
        })
        .from(transactions)
        .where(
          or(
            isNull(transactions.categoryId),
            // Se categoryId for string vazia, também considera sem categoria
            eq(transactions.categoryId, '')
          )
        );

      let categorizedCount = 0;

      for (const transaction of uncategorizedTransactions) {
        const match = await this.applyRulesToTransaction(transaction.description);

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
      console.error('Error categorizing uncategorized transactions:', error);
      throw new Error('Failed to categorize uncategorized transactions');
    }
  }

  /**
   * Testar se um padrão corresponde a um texto
   */
  private static testRule(pattern: string, ruleType: string, text: string): boolean {
    try {
      switch (ruleType) {
        case 'exact':
          return text.toLowerCase() === pattern.toLowerCase();

        case 'contains':
          return text.toLowerCase().includes(pattern.toLowerCase());

        case 'regex':
          const regex = new RegExp(pattern, 'i'); // case insensitive
          return regex.test(text);

        default:
          // Fallback para 'contains' se tipo não for reconhecido
          return text.toLowerCase().includes(pattern.toLowerCase());
      }
    } catch {
      // Se falhar, usa contain simples como fallback
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  /**
   * Calcular confiança da correspondência (0-100)
   * Agora usa o confidenceScore da regra como base
   */
  private static calculateConfidence(confidenceScore: number, pattern: string, text: string): number {
    try {
      // Converter confidenceScore do banco (0.80) para percentual (80)
      let baseConfidence = confidenceScore * 100;

      // Ajuste fino baseado no tipo de correspondência
      if (text.toLowerCase() === pattern.toLowerCase()) {
        // Correspondência exata ganha um bônus
        baseConfidence = Math.min(100, baseConfidence + 10);
      }

      return Math.round(baseConfidence);
    } catch {
      return 80; // Confiança padrão se não for possível calcular
    }
  }

  /**
   * Encontrar regras conflitantes (mesmo padrão ou similar)
   */
  static async findConflictingRules(): Promise<Array<{ rule1: any; rule2: any; similarity: number }>> {
    try {
      this.checkDatabaseConnection();

      // Buscar todas as regras ativas
      const allRules = await db
        .select()
        .from(categoryRules)
        .where(eq(categoryRules.active, true));

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
              rule1,
              rule2,
              similarity
            });
          }
        }
      }

      return conflicts;

    } catch (error) {
      console.error('Error finding conflicting rules:', error);
      throw new Error('Failed to find conflicting rules');
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
      console.error('Error fetching category rules:', error);
      throw new Error('Failed to fetch category rules');
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
  }): Promise<any> {
    try {
      this.checkDatabaseConnection();

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

      return newRule;

    } catch (error) {
      console.error('Error creating category rule:', error);
      throw new Error('Failed to create category rule');
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
      console.error('Error updating category rule:', error);
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
      console.error('Error deleting category rule:', error);
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
      console.error('Error getting rules statistics:', error);
      throw new Error('Failed to get rules statistics');
    }
  }
}

export default CategoryRulesService;