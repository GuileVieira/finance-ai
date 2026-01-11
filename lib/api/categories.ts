export interface Category {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  type: CategoryType;
  parentType?: string;
  parentCategoryId?: string;
  colorHex: string;
  icon: string;
  examples?: string[];
  isSystem: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithStats extends Category {
  transactionCount: number;
  totalAmount: number;
  percentage: number;
  averageAmount: number;
}

export interface CategoryRule {
  id: string;
  name: string;
  description?: string;
  pattern: string;
  categoryId: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRuleDB {
  id: string;
  rulePattern: string;
  ruleType: string;
  categoryId: string;
  categoryName: string;
  companyId?: string;
  confidenceScore: string;
  active: boolean;
  usageCount: number;
  priority?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operating';

export interface CategoryFilters {
  type?: CategoryType | 'all';
  companyId?: string;
  isActive?: boolean;
  includeStats?: boolean;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'transactionCount' | 'totalAmount';
  sortOrder?: 'asc' | 'desc';
  id?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  type: CategoryType;
  parentType?: string;
  parentCategoryId?: string;
  colorHex: string;
  icon: string;
  examples?: string[];
  companyId?: string;
  active?: boolean;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string;
}

export interface CategorySummary {
  totalCategories: number;
  activeCategories: number;
  categoriesByType: {
    revenue: number;
    variable_cost: number;
    fixed_cost: number;
    non_operating: number;
  };
  mostUsedCategories: CategoryWithStats[];
  recentCategories: Category[];
}

export const API_BASE = '/api';

// Helper para detectar se estamos no server-side
function getApiUrl(endpoint: string): string {
  // Se estiver no server-side, não pode usar URLs relativas
  if (typeof window === 'undefined') {
    // Server-side - precisamos da URL completa
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}${endpoint}`;
  }
  // Client-side - pode usar URL relativa
  return endpoint;
}

export class CategoriesAPI {
  /**
   * Buscar categorias com filtros opcionais
   */
  static async getCategories(filters: CategoryFilters = {}): Promise<CategoryWithStats[]> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const url = `${API_BASE}/categories${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(getApiUrl(url));
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Buscar categoria por ID
   */
  static async getCategoryById(id: string): Promise<CategoryWithStats> {
    const response = await fetch(getApiUrl(`${API_BASE}/categories/${id}`));

    if (!response.ok) {
      throw new Error('Failed to fetch category');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Criar nova categoria
   */
  static async createCategory(categoryData: CreateCategoryData): Promise<Category> {
    const response = await fetch(getApiUrl(`${API_BASE}/categories`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      throw new Error('Failed to create category');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Atualizar categoria existente
   */
  static async updateCategory(categoryData: UpdateCategoryData): Promise<Category> {
    const { id, ...updateData } = categoryData;

    const response = await fetch(getApiUrl(`${API_BASE}/categories/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error('Failed to update category');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Deletar categoria
   */
  static async deleteCategory(id: string): Promise<void> {
    const response = await fetch(getApiUrl(`${API_BASE}/categories/${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete category');
    }
  }

  /**
   * Buscar resumo das categorias
   */
  static async getCategoriesSummary(filters: CategoryFilters = {}): Promise<CategorySummary> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const url = `${API_BASE}/categories/summary${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(getApiUrl(url));
    if (!response.ok) {
      throw new Error('Failed to fetch categories summary');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Buscar regras de categorização
   */
  static async getCategoryRules(filters: { categoryId?: string; isActive?: boolean } = {}): Promise<CategoryRuleDB[]> {
    const params = new URLSearchParams();

    // Transform isActive to active for backend
    const backendFilters: Record<string, string> = {};
    if (filters.categoryId) backendFilters.categoryId = filters.categoryId;
    if (filters.isActive !== undefined) backendFilters.active = String(filters.isActive);

    Object.entries(backendFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const url = `${API_BASE}/categories/rules${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(getApiUrl(url));
    if (!response.ok) {
      throw new Error('Failed to fetch category rules');
    }

    const data = await response.json();
    // Return database format as-is (needed by AutoRulesTable)
    // Transformation happens in the page when passing to edit dialog
    return data.data;
  }

  /**
   * Criar regra de categorização
   */
  static async createCategoryRule(ruleData: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CategoryRule> {
    // Transform from dialog format to database format
    const dbFormat = {
      rulePattern: ruleData.pattern,
      ruleType: 'contains', // Default type
      categoryId: ruleData.categoryId,
      confidenceScore: 0.95, // Default confidence
      active: ruleData.isActive,
      description: ruleData.name,
      priority: ruleData.priority
    };

    const response = await fetch(getApiUrl(`${API_BASE}/categories/rules`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dbFormat),
    });

    if (!response.ok) {
      throw new Error('Failed to create category rule');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Atualizar regra de categorização
   */
  static async updateCategoryRule(id: string, ruleData: Partial<Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CategoryRule> {
    // Transform from dialog format to database format
    const dbFormat: Record<string, unknown> = {};

    if (ruleData.pattern !== undefined) {
      dbFormat.rulePattern = ruleData.pattern;
    }
    if (ruleData.isActive !== undefined) {
      dbFormat.active = ruleData.isActive;
    }
    if (ruleData.name !== undefined) {
      dbFormat.description = ruleData.name;
    }
    if (ruleData.priority !== undefined) {
      dbFormat.priority = ruleData.priority;
    }
    if (ruleData.categoryId !== undefined) {
      dbFormat.categoryId = ruleData.categoryId;
    }

    const response = await fetch(getApiUrl(`${API_BASE}/categories/rules/${id}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dbFormat),
    });

    if (!response.ok) {
      throw new Error('Failed to update category rule');
    }

    const data = await response.json();
    // Transform response back to dialog format
    const rule = data.data;
    return {
      id: rule.id,
      name: rule.description || rule.name || `Regra para ${rule.rulePattern}`,
      description: rule.description,
      pattern: rule.rulePattern || rule.pattern,
      categoryId: rule.categoryId,
      priority: rule.priority || 5,
      isActive: rule.active ?? rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    };
  }

  /**
   * Deletar regra de categorização
   */
  static async deleteCategoryRule(id: string): Promise<void> {
    const response = await fetch(getApiUrl(`${API_BASE}/categories/rules/${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete category rule');
    }
  }

  /**
   * Ativar/desativar categoria
   */
  static async toggleCategoryActive(id: string, active: boolean): Promise<Category> {
    return this.updateCategory({ id, active });
  }

  /**
   * Ativar/desativar regra de categorização
   */
  static async toggleCategoryRuleActive(id: string, isActive: boolean): Promise<CategoryRule> {
    return this.updateCategoryRule(id, { isActive });
  }

  /**
   * Buscar categorias com transações associadas (nova implementação)
   */
  static async getCategoriesWithTransactions(filters: CategoryFilters = {}): Promise<CategoryWithStats[]> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    // Garantir que incluímos estatísticas
    if (!params.has('includeStats')) {
      params.append('includeStats', 'true');
    }

    const url = `${API_BASE}/categories/with-transactions${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(getApiUrl(url));
    if (!response.ok) {
      throw new Error('Failed to fetch categories with transactions');
    }

    const data = await response.json();
    return data.data;
  }
}

export default CategoriesAPI;