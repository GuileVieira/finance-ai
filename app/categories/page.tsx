'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { CategoryTabs } from '@/components/categories/category-tabs';
import { CategoryCard } from '@/components/categories/category-card';
import { AutoRulesTable } from '@/components/categories/auto-rules-table';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { mockCategories, mockAutoRules, categoryTypes } from '@/lib/mock-categories';
import { Plus, Settings, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CategoryFormData } from '@/lib/types';

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categories] = useState(mockCategories);
  const { toast } = useToast();

  // Filtrar categorias por tipo
  const filteredCategories = activeTab === 'all'
    ? categories
    : categories.filter(cat => cat.type === activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Principal */}
      <Header />

      {/* Navegação por Tabs */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <CategoryTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              categoryTypes={categoryTypes}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: 'Importar XMIND',
                    description: 'Buscando arquivo XMIND para importação...',
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Importar XMIND
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-6">
        {/* Cards de Categorias */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Baseado em {categories.length} categorias reais do XMIND
            </h2>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma categoria encontrada para este filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={() => {
                    toast({
                      title: 'Editar Categoria',
                      description: `Abrindo editor para ${category.name}...`,
                    });
                  }}
                  onRules={() => {
                    toast({
                      title: 'Regras Automáticas',
                      description: `Verificando regras para ${category.name}...`,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tabela de Regras Automáticas */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Regras Automáticas (Base XMIND)</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: 'Nova Regra Automática',
                    description: 'Abrindo formulário para criar nova regra...',
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: 'Configurar Regras',
                    description: 'Abrindo configurações avançadas...',
                  });
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </div>
          </div>

          <AutoRulesTable rules={mockAutoRules} />
        </div>

        {/* Insights */}
        <div className="mt-6 bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">💡 Insights Baseados nos Dados Reais:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Salários representam 51.8% dos custos fixos</li>
            <li>• Categorias XMIND importadas: 47/53 mapeadas</li>
            <li>• 94% de acurácia na categorização automática</li>
          </ul>
        </div>
      </div>

      {/* Dialog para Nova Categoria */}
      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={(category: CategoryFormData) => {
          toast({
            title: 'Categoria Criada',
            description: `${category.name} foi adicionada com sucesso!`,
          });
          setIsDialogOpen(false);
        }}
      />

      {/* Toaster para notificações */}
      <Toaster />
    </div>
  );
}