import { db } from '@/lib/db/drizzle';
import { categoryRules, transactions, categories } from '@/lib/db/schema';
import { ilike, or, and, eq, desc } from 'drizzle-orm';

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

      // Buscar regras ativas ordenadas por prioridade (maior primeiro)
      const activeRules = await db
        .select({
          id: categoryRules.id,
          name: categoryRules.name,
          pattern: categoryRules.pattern,
          categoryId: categoryRules.categoryId,
          priority: categoryRules.priority,
          categoryName: categories.name,
        })
        .from(categoryRules)
        .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
        .where(eq(categoryRules.isActive, true))
        .orderBy(desc(categoryRules.priority));

      // Converter descrição para minúsculas para comparação
      const normalizedDescription = transactionDescription.toLowerCase().trim();

      // Testar cada regra em ordem de prioridade
      for (const rule of activeRules) {
        if (this.testRule(rule.pattern, normalizedDescription)) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            categoryId: rule.categoryId,
            categoryName: rule.categoryName,
            confidence: this.calculateConfidence(rule.pattern, normalizedDescription)
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
  static async categorizeUncategorizedTransactions(companyId?: string): Promise<number> {
    try {
      this.checkDatabaseConnection();

      // Buscar transações sem categoria
      const uncategorizedTransactions = await db
        .select({
          id: transactions.id,
          description: transactions.description,
        })
        .from(transactions)
        .where(
          and(
            companyId ? eq(transactions.companyId, companyId) : undefined,
            or(
              eq(transactions.categoryId, ''),
              // Verificar se categoryId é null ou string vazia
              // Note: Ajustar conforme a estrutura real do banco
            )
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
  private static testRule(pattern: string, text: string): boolean {
    try {
      // Converter padrão para expressão regular
      // Suporte a curingas: * e ?
      let regexPattern = pattern
        .replace(/\*/g, '.*') // * corresponde a qualquer sequência
        .replace(/\?/g, '.'); // ? corresponde a qualquer caractere

      // Adicionar âncoras se não tiver curingas no início/fim
      if (!pattern.startsWith('*')) {
        regexPattern = '^' + regexPattern;
      }
      if (!pattern.endsWith('*')) {
        regexPattern = regexPattern + '$';
      }

      const regex = new RegExp(regexPattern, 'i'); // case insensitive
      return regex.test(text);

    } catch {
      // Se falhar a regex, usa contain simples
      return text.includes(pattern.toLowerCase());
    }
  }

  /**
   * Calcular confiança da correspondência (0-100)
   */
  private static calculateConfidence(pattern: string, text: string): number {
    try {
      // Lógica simples de confiança baseada no padrão
      if (pattern.includes('*')) {
        // Padrões com curinga têm confiança menor
        return 70 + Math.random() * 20; // 70-90%
      } else {
        // Padrões exatos têm confiança maior
        return 85 + Math.random() * 15; // 85-100%
      }
    } catch {
      return 50; // Confiança padrão se não for possível calcular
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
        .where(eq(categoryRules.isActive, true));

      const conflicts = [];

      // Comparar cada par de regras
      for (let i = 0; i < allRules.length; i++) {
        for (let j = i + 1; j < allRules.length; j++) {
          const rule1 = allRules[i];
          const rule2 = allRules[j];

          // Calcular similaridade simples
          const similarity = this.calculatePatternSimilarity(rule1.pattern, rule2.pattern);

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
   * Estatísticas das regras
   */
  static async getRulesStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    rulesByPriority: Record<string, number>;
    averageConfidence: number;
  }> {
    try {
      this.checkDatabaseConnection();

      const [totalRules, activeRules, priorityStats] = await Promise.all([
        db.select().from(categoryRules).then(r => r.length),
        db.select().from(categoryRules).where(eq(categoryRules.isActive, true)).then(r => r.length),
        db.select().from(categoryRules).where(eq(categoryRules.isActive, true))
      ]);

      // Agrupar por prioridade
      const rulesByPriority = priorityStats.reduce((acc, rule) => {
        const priority = `Prioridade ${rule.priority}`;
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalRules,
        activeRules,
        rulesByPriority,
        averageConfidence: 85 // Valor fixo por enquanto
      };

    } catch (error) {
      console.error('Error getting rules statistics:', error);
      throw new Error('Failed to get rules statistics');
    }
  }
}