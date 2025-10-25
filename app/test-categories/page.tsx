'use client';

import { useState } from 'react';
import { useCategories } from '@/hooks/use-categories';
import { Combobox } from '@/components/ui/combobox';

export default function TestCategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const { data: categories = [], isLoading, error } = useCategories({
    isActive: true,
    includeStats: false
  });

  // Transformar categorias para o formato do Combobox
  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
    type: category.type,
    color: category.colorHex,
    name: category.name,
    icon: category.icon
  }));

  console.log('Teste - Categories:', categories);
  console.log('Teste - Options:', categoryOptions);
  console.log('Teste - Loading:', isLoading);
  console.log('Teste - Error:', error);
  console.log('Teste - Selected:', selectedCategory);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Teste de Combobox de Categorias</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Combobox de Categorias</h2>
          <Combobox
            options={categoryOptions}
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            placeholder="Selecione uma categoria"
            searchPlaceholder="Buscar categoria..."
            emptyMessage={isLoading ? "Carregando categorias..." : "Nenhuma categoria encontrada"}
            disabled={isLoading}
          />

          {selectedCategory && (
            <p className="mt-2 text-sm text-muted-foreground">
              Selecionado: {selectedCategory}
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Informações</h2>
          {isLoading && <p>Carregando categorias...</p>}
          {error && <p className="text-red-500">Erro: {error.message}</p>}
          <p>Total de categorias: {categories.length}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Primeiras Categorias</h2>
          <div className="space-y-2">
            {categories.slice(0, 10).map((category) => (
              <div key={category.id} className="border p-2 rounded flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2 border-background flex-shrink-0"
                  style={{ backgroundColor: category.colorHex }}
                />
                <span>{category.icon}</span>
                <span>{category.name}</span>
                <span className="text-xs text-muted-foreground">({category.type})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}