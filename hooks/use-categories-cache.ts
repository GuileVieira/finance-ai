import { useState, useEffect } from 'react';

interface Category {
  name: string;
  type: string;
  id: string;
}

interface CategoriesCache {
  categories: Category[];
  timestamp: number;
  source: 'database' | 'fallback';
}

const CACHE_KEY = 'financeai_categories_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

export function useCategoriesCache() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'database' | 'fallback'>('database');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Tentar usar cache do localStorage
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const cacheData: CategoriesCache = JSON.parse(cached);
          const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;

          if (!isExpired) {
            console.log('📋 Usando categorias do cache localStorage:', cacheData.categories.length, 'categorias');
            setCategories(cacheData.categories);
            setSource(cacheData.source);
            setLoading(false);
            return;
          } else {
            console.log('🕐 Cache expirado, buscando novas categorias');
            localStorage.removeItem(CACHE_KEY);
          }
        } catch (parseError) {
          console.warn('⚠️ Erro ao fazer parse do cache:', parseError);
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // Buscar categorias da API
      console.log('🌐 Buscando categorias da API...');
      const response = await fetch('/api/ai/work-categorize');

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.categories && Array.isArray(data.categories)) {
        const newCategories = data.categories.map((name: string, index: number) => ({
          name,
          type: 'unknown', // Tipo não disponível na API
          id: `cat-${index}-${name.replace(/\s+/g, '-').toLowerCase()}`
        }));

        // Salvar no localStorage
        const cacheData: CategoriesCache = {
          categories: newCategories,
          timestamp: Date.now(),
          source: data.categoriesSource || 'database'
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

        console.log('✅ Categorias carregadas e cacheadas:', newCategories.length, 'categorias');
        setCategories(newCategories);
        setSource(cacheData.source);
      } else {
        throw new Error('Resposta da API não contém categorias válidas');
      }

    } catch (err) {
      console.error('❌ Erro ao carregar categorias:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');

      // Tentar usar cache expirado como fallback
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const cacheData: CategoriesCache = JSON.parse(cached);
          console.log('🔄 Usando cache expirado como fallback');
          setCategories(cacheData.categories);
          setSource(cacheData.source);
          setError(null); // Limpar erro pois temos fallback
        } catch (parseError) {
          console.error('❌ Erro no fallback cache:', parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshCategories = async () => {
    localStorage.removeItem(CACHE_KEY);
    await loadCategories();
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Não classificado';
  };

  const searchCategories = (query: string): Category[] => {
    if (!query.trim()) return categories;

    const searchTerm = query.toLowerCase();
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm)
    );
  };

  return {
    categories,
    loading,
    error,
    source,
    refreshCategories,
    getCategoryName,
    searchCategories,
    isCached: localStorage.getItem(CACHE_KEY) !== null
  };
}