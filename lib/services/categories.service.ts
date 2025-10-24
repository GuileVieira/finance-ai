import { mockCategories } from '@/lib/mock-categories';

// Interface para categoria dinâmica
export interface Category {
  id: string;
  name: string;
  type: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operating';
  color: string;
  description: string;
  examples: string[];
  icon?: string;
}

// Serviço para gerenciar categorias dinâmicas
class CategoriesService {
  private static instance: CategoriesService;
  private categories: Map<string, Category> = new Map();

  private constructor() {
    // Inicializar com categorias mockadas (do banco)
    mockCategories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  public static getInstance(): CategoriesService {
    if (!CategoriesService.instance) {
      CategoriesService.instance = new CategoriesService();
    }
    return CategoriesService.instance;
  }

  // Obter todas as categorias
  public getAllCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  // Obter categoria por ID
  public getCategoryById(id: string): Category | undefined {
    return this.categories.get(id);
  }

  // Buscar categorias por tipo
  public getCategoriesByType(type: Category['type']): Category[] {
    return Array.from(this.categories.values()).filter(cat => cat.type === type);
  }

  // Buscar categorias por termo (nome, descrição, exemplos)
  public searchCategories(query: string): Category[] {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
      return this.getAllCategories();
    }

    return Array.from(this.categories.values()).filter(category =>
      category.name.toLowerCase().includes(searchTerm) ||
      category.description.toLowerCase().includes(searchTerm) ||
      category.examples.some(example =>
        example.toLowerCase().includes(searchTerm)
      )
    );
  }

  // Obter lista formatada para o prompt da IA
  public getCategoriesForPrompt(): string {
    const categories = this.getAllCategories();

    return categories.map(category =>
      `ID: ${category.id} | Nome: ${category.name} | Tipo: ${category.type} | Descrição: ${category.description} | Exemplos: ${category.examples.join(', ')}`
    ).join('\n');
  }

  // Adicionar nova categoria (para uso futuro)
  public addCategory(category: Category): void {
    this.categories.set(category.id, category);
  }

  // Atualizar categoria existente
  public updateCategory(id: string, updates: Partial<Category>): void {
    const existingCategory = this.categories.get(id);
    if (existingCategory) {
      this.categories.set(id, { ...existingCategory, ...updates });
    }
  }

  // Remover categoria
  public removeCategory(id: string): boolean {
    return this.categories.delete(id);
  }
}

export default CategoriesService;