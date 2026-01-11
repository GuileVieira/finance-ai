import { db } from '@/lib/db/drizzle';
import { categories, transactions, categoryRules, companies } from '@/lib/db/schema';
import {
  Category,
  CategoryWithStats,
  CategoryRule,
  CategoryFilters,
  CreateCategoryData,
  UpdateCategoryData,
  CategorySummary,
  CategoryType
} from '@/lib/api/categories';
import {
  eq,
  and,
  ilike,
  desc,
  asc,
  sql,
  count,
  sum,
  avg,
  gt,
  gte,
  isNotNull
} from 'drizzle-orm';
import { nanoid } from 'nanoid';

export default class CategoriesService {
  /**
   * Verificar se o banco de dados está disponível
   */
  private static checkDatabaseConnection(): void {
    if (!db) {
      throw new Error('Banco de dados não está disponível. Verifique a configuração do DATABASE_URL.');
    }
  }

  /**
   * Buscar categorias com filtros e estatísticas (otimizado)
   */
  static async getCategories(filters: CategoryFilters = {}): Promise<CategoryWithStats[]> {
    try {
      this.checkDatabaseConnection();

      const whereConditions = [];

      // Filtro por tipo
      if (filters.type && filters.type !== 'all') {
        whereConditions.push(eq(categories.type, filters.type));
      }

      // Filtro por empresa
      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(categories.companyId, filters.companyId));
      }

      // Filtro por status ativo
      if (filters.isActive !== undefined) {
        whereConditions.push(eq(categories.active, filters.isActive));
      }

      // Filtro por busca textual
      if (filters.search) {
        whereConditions.push(
          ilike(categories.name, `%${filters.search}%`)
        );
      }

      // Filtro por ID
      if (filters.id) {
        whereConditions.push(eq(categories.id, filters.id));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Buscar categorias básicas primeiro (sem JOIN para performance)
      const basicCategories = await db
        .select()
        .from(categories)
        .where(whereClause);

      if (basicCategories.length === 0) {
        return [];
      }

      // Buscar estatísticas separadamente apenas se necessário
      let categoryStats: any[] = [];

      if (filters.includeStats) {
        // Buscar estatísticas em uma consulta separada para melhor performance
        const statsQuery = await db
          .select({
            categoryId: categories.id,
            transactionCount: count(transactions.id).mapWith(Number),
            totalAmount: sum(sql`ABS(${transactions.amount})`).mapWith(Number),
            averageAmount: avg(sql`ABS(${transactions.amount})`).mapWith(Number),
          })
          .from(categories)
          .leftJoin(transactions, eq(categories.id, transactions.categoryId))
          .where(whereClause)
          .groupBy(categories.id);

        // Criar mapa de estatísticas para lookup rápido
        const statsMap = new Map();
        statsQuery.forEach(stat => {
          statsMap.set(stat.categoryId, {
            transactionCount: stat.transactionCount || 0,
            totalAmount: stat.totalAmount || 0,
            averageAmount: stat.averageAmount || 0,
          });
        });

        // Combinar categorias com estatísticas
        categoryStats = basicCategories.map(category => {
          const stats = statsMap.get(category.id) || {
            transactionCount: 0,
            totalAmount: 0,
            averageAmount: 0,
          };

          return {
            ...category,
            transactionCount: stats.transactionCount,
            totalAmount: stats.totalAmount,
            averageAmount: stats.averageAmount,
          };
        });
      } else {
        // Sem estatísticas, apenas retornar categorias básicas
        categoryStats = basicCategories.map(category => ({
          ...category,
          transactionCount: 0,
          totalAmount: 0,
          averageAmount: 0,
        }));
      }

      // Aplicar ordenação
      if (filters.sortBy) {
        categoryStats.sort((a, b) => {
          let comparison = 0;

          switch (filters.sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'createdAt':
              comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              break;
            case 'transactionCount':
              comparison = (a.transactionCount || 0) - (b.transactionCount || 0);
              break;
            case 'totalAmount':
              comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
              break;
            default:
              comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          }

          return filters.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Calcular totais para percentuais
      const totalAmount = categoryStats.reduce((sum, cat) => sum + (cat.totalAmount || 0), 0);

      // Formatar resultado final
      return categoryStats.map(cat => ({
        id: cat.id,
        companyId: cat.companyId,
        name: cat.name,
        description: cat.description,
        type: cat.type as CategoryType,
        parentType: cat.parentType,
        parentCategoryId: cat.parentCategoryId,
        colorHex: cat.colorHex,
        icon: cat.icon,
        examples: cat.examples as string[] | undefined,
        isSystem: cat.isSystem,
        active: cat.active,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        transactionCount: cat.transactionCount || 0,
        totalAmount: cat.totalAmount || 0,
        percentage: totalAmount > 0 ? ((cat.totalAmount || 0) / totalAmount) * 100 : 0,
        averageAmount: cat.averageAmount || 0,
      }));

    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  /**
   * Buscar categoria por ID
   */
  static async getCategoryById(id: string): Promise<Category> {
    try {
      this.checkDatabaseConnection();

      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!category || category.length === 0) {
        throw new Error('Category not found');
      }

      return {
        id: category[0].id,
        companyId: category[0].companyId,
        name: category[0].name,
        description: category[0].description,
        type: category[0].type as CategoryType,
        parentType: category[0].parentType,
        parentCategoryId: category[0].parentCategoryId,
        colorHex: category[0].colorHex,
        icon: category[0].icon,
        examples: category[0].examples as string[] | undefined,
        isSystem: category[0].isSystem,
        active: category[0].active,
        createdAt: category[0].createdAt,
        updatedAt: category[0].updatedAt,
      };

    } catch (error) {
      console.error('Error getting category by ID:', error);
      throw new Error('Failed to fetch category');
    }
  }

  /**
   * Criar nova categoria
   */
  static async createCategory(categoryData: CreateCategoryData): Promise<Category> {
    try {
      this.checkDatabaseConnection();

      // Buscar primeira empresa disponível se não for especificada
      let companyId = categoryData.companyId;
      if (!companyId) {
        const [company] = await db
          .select()
          .from(companies)
          .limit(1);

        if (!company) {
          throw new Error('No company found to associate with category');
        }
        companyId = company.id;
      }

      const result = await db
        .insert(categories)
        .values({
          id: nanoid(),
          companyId,
          name: categoryData.name,
          description: categoryData.description,
          type: categoryData.type,
          parentType: categoryData.parentType,
          parentCategoryId: categoryData.parentCategoryId,
          colorHex: categoryData.colorHex,
          icon: categoryData.icon,
          examples: categoryData.examples,
          isSystem: false,
          active: true,
        })
        .returning();

      const newCategory = (result as any[])[0];

      return {
        id: newCategory.id,
        companyId: newCategory.companyId,
        name: newCategory.name,
        description: newCategory.description,
        type: newCategory.type as CategoryType,
        parentType: newCategory.parentType,
        parentCategoryId: newCategory.parentCategoryId,
        colorHex: newCategory.colorHex,
        icon: newCategory.icon,
        examples: newCategory.examples as string[] | undefined,
        isSystem: newCategory.isSystem,
        active: newCategory.active,
        createdAt: newCategory.createdAt,
        updatedAt: newCategory.updatedAt,
      };

    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error('Failed to create category');
    }
  }

  /**
   * Atualizar categoria existente
   */
  static async updateCategory(categoryData: UpdateCategoryData): Promise<Category> {
    try {
      this.checkDatabaseConnection();

      const { id, ...updateData } = categoryData;

      const [updatedCategory] = await db
        .update(categories)
        .set({
          ...updateData,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(categories.id, id))
        .returning();

      if (!updatedCategory) {
        throw new Error('Category not found');
      }

      return {
        id: updatedCategory.id,
        companyId: updatedCategory.companyId,
        name: updatedCategory.name,
        description: updatedCategory.description,
        type: updatedCategory.type as CategoryType,
        parentType: updatedCategory.parentType,
        parentCategoryId: updatedCategory.parentCategoryId,
        colorHex: updatedCategory.colorHex,
        icon: updatedCategory.icon,
        examples: updatedCategory.examples as string[] | undefined,
        isSystem: updatedCategory.isSystem,
        active: updatedCategory.active,
        createdAt: updatedCategory.createdAt,
        updatedAt: updatedCategory.updatedAt,
      };

    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error('Failed to update category');
    }
  }

  /**
   * Deletar categoria
   */
  static async deleteCategory(id: string): Promise<void> {
    try {
      this.checkDatabaseConnection();

      // Verificar se existem transações associadas
      const [transactionCount] = await db
        .select({ count: count(transactions.id) })
        .from(transactions)
        .where(eq(transactions.categoryId, id));

      if (transactionCount && transactionCount.count > 0) {
        // Em vez de deletar, desativar a categoria
        await this.updateCategory({ id, active: false });
        return;
      }

      await db
        .delete(categories)
        .where(eq(categories.id, id));

    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Failed to delete category');
    }
  }

  /**
   * Buscar resumo das categorias
   */
  static async getCategoriesSummary(filters: CategoryFilters = {}): Promise<CategorySummary> {
    try {
      this.checkDatabaseConnection();

      const whereConditions = [];

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(categories.companyId, filters.companyId));
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(categories.active, filters.isActive));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Totais por tipo
      const categoriesByType = await db
        .select({
          type: categories.type,
          count: count(categories.id).mapWith(Number),
        })
        .from(categories)
        .where(whereClause)
        .groupBy(categories.type);

      // Categorias mais usadas (consulta otimizada sem JOIN complexo)
      const mostUsedCategoriesQuery = await db
        .select({
          id: categories.id,
          companyId: categories.companyId,
          name: categories.name,
          description: categories.description,
          type: categories.type,
          parentType: categories.parentType,
          parentCategoryId: categories.parentCategoryId,
          colorHex: categories.colorHex,
          icon: categories.icon,
          examples: categories.examples,
          isSystem: categories.isSystem,
          active: categories.active,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
          transactionCount: count(transactions.id).mapWith(Number),
          totalAmount: sum(sql`ABS(${transactions.amount})`).mapWith(Number),
          averageAmount: avg(sql`ABS(${transactions.amount})`).mapWith(Number),
        })
        .from(categories)
        .leftJoin(transactions, eq(categories.id, transactions.categoryId))
        .where(whereClause)
        .groupBy(categories.id)
        .orderBy(desc(count(transactions.id)))
        .limit(10);

      const totalAmount = mostUsedCategoriesQuery.reduce((sum, cat) => sum + (cat.totalAmount || 0), 0);

      const mostUsedCategories = mostUsedCategoriesQuery.map(cat => ({
        id: cat.id,
        companyId: cat.companyId,
        name: cat.name,
        description: cat.description,
        type: cat.type as CategoryType,
        parentType: cat.parentType,
        parentCategoryId: cat.parentCategoryId,
        colorHex: cat.colorHex,
        icon: cat.icon,
        examples: cat.examples as string[] | undefined,
        isSystem: cat.isSystem,
        active: cat.active,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        transactionCount: cat.transactionCount || 0,
        totalAmount: cat.totalAmount || 0,
        percentage: totalAmount > 0 ? ((cat.totalAmount || 0) / totalAmount) * 100 : 0,
        averageAmount: cat.averageAmount || 0,
      }));

      // Categorias recentes
      const recentCategories = await db
        .select()
        .from(categories)
        .where(whereClause)
        .orderBy(desc(categories.createdAt))
        .limit(5);

      // Formatar resultado
      const typeSummary = categoriesByType.reduce((acc, item) => {
        acc[item.type as CategoryType] = item.count || 0;
        return acc;
      }, {
        revenue: 0,
        variable_cost: 0,
        fixed_cost: 0,
        non_operating: 0,
      } as Record<CategoryType, number>);

      const totalCategories = categoriesByType.reduce((sum, item) => sum + (item.count || 0), 0);
      const activeCategories = filters.isActive !== false
        ? totalCategories
        : categoriesByType.filter(item => item.count && item.count > 0).reduce((sum, item) => sum + (item.count || 0), 0);

      return {
        totalCategories,
        activeCategories,
        categoriesByType: typeSummary,
        mostUsedCategories: mostUsedCategories.slice(0, 10), // Top 10
        recentCategories: recentCategories.map(cat => ({
          id: cat.id,
          companyId: cat.companyId,
          name: cat.name,
          description: cat.description,
          type: cat.type as CategoryType,
          parentType: cat.parentType,
          parentCategoryId: cat.parentCategoryId,
          colorHex: cat.colorHex,
          icon: cat.icon,
          examples: cat.examples as string[] | undefined,
          isSystem: cat.isSystem,
          active: cat.active,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
        })),
      };

    } catch (error) {
      console.error('Error getting categories summary:', error);
      throw new Error('Failed to fetch categories summary');
    }
  }

  /**
   * Buscar regras de categorização
   */
  static async getCategoryRules(filters: { categoryId?: string; isActive?: boolean } = {}): Promise<CategoryRule[]> {
    try {
      this.checkDatabaseConnection();

      const whereConditions = [];

      if (filters.categoryId) {
        whereConditions.push(eq(categoryRules.categoryId, filters.categoryId));
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(categoryRules.active, filters.isActive));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const rules = await db
        .select()
        .from(categoryRules)
        .where(whereClause)
        .orderBy(desc(categoryRules.usageCount), desc(categoryRules.createdAt));

      return rules.map(rule => ({
        id: rule.id,
        name: `Regra: ${rule.rulePattern}`,
        description: undefined,
        pattern: rule.rulePattern,
        categoryId: rule.categoryId || '',
        priority: 5, // Default priority
        isActive: rule.active ?? true,
        createdAt: rule.createdAt ? rule.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: rule.updatedAt ? rule.updatedAt.toISOString() : new Date().toISOString(),
      }));

    } catch (error) {
      console.error('Error getting category rules:', error);
      throw new Error('Failed to fetch category rules');
    }
  }

  /**
   * Criar regra de categorização
   */
  static async createCategoryRule(ruleData: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CategoryRule> {
    try {
      this.checkDatabaseConnection();

      const [newRule] = await db
        .insert(categoryRules)
        .values({
          id: nanoid(),
          rulePattern: ruleData.pattern,
          ruleType: 'contains', // Default type
          confidenceScore: '0.95',
          active: ruleData.isActive,
          usageCount: 0,
          categoryId: ruleData.categoryId,
          companyId: null, // Should ideally be passed in
          sourceType: 'manual',
          status: 'active'
        })
        .returning();

      return {
        id: newRule.id,
        name: `Regra: ${newRule.rulePattern}`,
        description: undefined,
        pattern: newRule.rulePattern,
        categoryId: newRule.categoryId || '',
        priority: 5,
        isActive: newRule.active ?? true,
        createdAt: newRule.createdAt ? newRule.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: newRule.updatedAt ? newRule.updatedAt.toISOString() : new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error creating category rule:', error);
      throw new Error('Failed to create category rule');
    }
  }

  /**
   * Atualizar regra de categorização
   */
  static async updateCategoryRule(id: string, ruleData: Partial<Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CategoryRule> {
    try {
      this.checkDatabaseConnection();

      const [updatedRule] = await db
        .update(categoryRules)
        .set({
          ...ruleData.pattern ? { rulePattern: ruleData.pattern } : {},
          ...ruleData.isActive !== undefined ? { active: ruleData.isActive } : {},
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(categoryRules.id, id))
        .returning();

      if (!updatedRule) {
        throw new Error('Category rule not found');
      }

      return {
        id: updatedRule.id,
        name: `Regra: ${updatedRule.rulePattern}`,
        description: undefined,
        pattern: updatedRule.rulePattern,
        categoryId: updatedRule.categoryId || '',
        priority: 5,
        isActive: updatedRule.active ?? true,
        createdAt: updatedRule.createdAt ? updatedRule.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updatedRule.updatedAt ? updatedRule.updatedAt.toISOString() : new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error updating category rule:', error);
      throw new Error('Failed to update category rule');
    }
  }

  /**
   * Deletar regra de categorização
   */
  static async deleteCategoryRule(id: string): Promise<void> {
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
}