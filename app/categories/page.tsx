'use client';

import { useState } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { CategoryCard } from '@/components/categories/category-card';
import { AutoRulesTable } from '@/components/categories/auto-rules-table';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { CategoryRuleDialog } from '@/components/categories/category-rule-dialog';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Plus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useCategoriesWithTransactions,
  useCategoryRules,
  useCreateCategoryRule,
  useUpdateCategoryRule,
  useDeleteCategoryRule,
  useToggleCategoryActive,
  useToggleCategoryRuleActive
} from '@/hooks/use-categories';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategoriesOperations
} from '@/hooks/use-categories';
import { CategoryType, CategoryRule } from '@/lib/api/categories';

// Tipos de categorias disponíveis
const categoryTypes = [
  { value: 'all', label: 'Todos' },
  { value: 'revenue', label: 'Receitas' },
  { value: 'variable_cost', label: 'Custos Variáveis' },
  { value: 'fixed_cost', label: 'Custos Fixos' },
  { value: 'non_operational', label: 'Não Operacionais' },
];

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<CategoryType | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CategoryRule | undefined>();
  const { toast } = useToast();

  // Buscar categorias com transações usando TanStack Query
  const {
    data: categories = [],
    isLoading,
    error,
    refetch
  } = useCategoriesWithTransactions({
    type: activeTab !== 'all' ? activeTab : undefined,
    includeStats: true,
    sortBy: 'totalAmount',
    sortOrder: 'desc'
  });

  // Buscar regras automáticas
  const { data: autoRules, isLoading: isLoadingRules, refetch: refetchRules } = useCategoryRules({ isActive: true });

  // Hook combinado para operações com categorias
  const categoryOps = useCategoriesOperations({
    type: activeTab !== 'all' ? activeTab : undefined
  });

  // Hooks para mutações de regras
  const createRule = useCreateCategoryRule();
  const updateRule = useUpdateCategoryRule();
  const deleteRule = useDeleteCategoryRule();
  const toggleRule = useToggleCategoryRuleActive();

  // Tratamento de erros
  if (error) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Erro ao carregar categorias
            </h3>
            <p className="text-muted-foreground mb-4">
              {error.message}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Tentar novamente
            </Button>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  // Handlers para operações com categorias
  const handleCreateCategory = (categoryData: any) => {
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A criação de categorias será implementada em breve.',
    });
  };

  const handleUpdateCategory = (updatedCategory: any) => {
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A atualização de categorias será implementada em breve.',
    });
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A exclusão de categorias será implementada em breve.',
    });
  };

  const handleToggleCategory = (categoryId: string, active: boolean, categoryName: string) => {
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A alteração de status será implementada em breve.',
    });
  };

  // Handlers para operações com regras
  const handleCreateRule = (ruleData: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    createRule(ruleData, {
      onSuccess: () => {
        toast({
          title: 'Regra Criada',
          description: `${ruleData.name} foi criada com sucesso!`,
        });
        setIsRuleDialogOpen(false);
        setEditingRule(undefined);
      }
    });
  };

  const handleEditRule = (rule: CategoryRule) => {
    setEditingRule(rule);
    setIsRuleDialogOpen(true);
  };

  const handleUpdateRule = (ruleData: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRule) {
      updateRule({ id: editingRule.id, ...ruleData }, {
        onSuccess: () => {
          toast({
            title: 'Regra Atualizada',
            description: `${ruleData.name} foi atualizada com sucesso!`,
          });
          setIsRuleDialogOpen(false);
          setEditingRule(undefined);
        }
      });
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    deleteRule(ruleId, {
      onSuccess: () => {
        toast({
          title: 'Regra Excluída',
          description: 'A regra foi excluída com sucesso!',
        });
      }
    });
  };

  const handleToggleRule = (ruleId: string, isActive: boolean) => {
    toggleRule({ id: ruleId, isActive }, {
      onSuccess: () => {
        toast({
          title: `Regra ${isActive ? 'Ativada' : 'Desativada'}`,
          description: `A regra foi ${isActive ? 'ativada' : 'desativada'} com sucesso!`,
        });
      }
    });
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">

        {/* Filtro por Tipo de Categoria */}
        <div className="flex items-center gap-2">
          {categoryTypes.map((type) => (
            <Button
              key={type.value}
              variant={activeTab === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(type.value as CategoryType | 'all')}
              disabled={isLoading}
            >
              {type.label}
            </Button>
          ))}
        </div>

        {/* Conteúdo Principal */}
        {/* Cards de Categorias */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {isLoading ? 'Carregando categorias...' :
               categoryOps.summary ?
                 `Baseado em ${categoryOps.summary.totalCategories} categorias financeiras (${categoryOps.summary.activeCategories} ativas)` :
                 `Baseado em ${categories.length} categorias financeiras`}
            </h2>
            <Button onClick={() => setIsDialogOpen(true)} disabled={categoryOps.isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando categorias...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {activeTab === 'all' ?
                  'Nenhuma categoria encontrada. Crie sua primeira categoria!' :
                  'Nenhuma categoria encontrada para este filtro.'}
              </p>
              {activeTab === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)} disabled={categoryOps.isCreating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Categoria
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  showViewButton={true}
                  loading={categoryOps.isToggling || categoryOps.isDeleting}
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
                  onToggle={(active) => {
                    handleToggleCategory(category.id, active, category.name);
                  }}
                  onUpdate={(updatedCategory) => {
                    handleUpdateCategory(updatedCategory);
                  }}
                  onDelete={() => {
                    handleDeleteCategory(category.id, category.name);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tabela de Regras Automáticas */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Regras Automáticas Inteligentes
              {autoRules && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({autoRules.length} regras ativas)
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingRule(undefined);
                  setIsRuleDialogOpen(true);
                }}
                disabled={createRule.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchRules()}
                disabled={isLoadingRules}
              >
                <Settings className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          {isLoadingRules ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando regras...</p>
            </div>
          ) : autoRules && autoRules.length > 0 ? (
            <AutoRulesTable
              rules={autoRules}
              onToggle={handleToggleRule}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              loading={createRule.isPending || updateRule.isPending || deleteRule.isPending || toggleRule.isPending}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                Nenhuma regra automática encontrada.
              </p>
            </div>
          )}
        </div>

        {/* Insights Baseados em Dados Reais */}
        {categoryOps.summary && (
          <div className="mt-6 bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">💡 Insights Baseados nos Dados Reais:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Total de categorias: {categoryOps.summary.totalCategories} ({categoryOps.summary.activeCategories} ativas)</li>
              <li>• Distribuição por tipo:</li>
              <li>  - Receitas: {categoryOps.summary.categoriesByType.revenue}</li>
              <li>  - Custos Variáveis: {categoryOps.summary.categoriesByType.variable_cost}</li>
              <li>  - Custos Fixos: {categoryOps.summary.categoriesByType.fixed_cost}</li>
              <li>  - Não Operacionais: {categoryOps.summary.categoriesByType.non_operational}</li>
              {categoryOps.summary.mostUsedCategories.length > 0 && (
                <li>• Categoria mais usada: {categoryOps.summary.mostUsedCategories[0].name} ({categoryOps.summary.mostUsedCategories[0].transactionCount} transações)</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Dialog para Nova Categoria */}
      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateCategory}
      />

      {/* Dialog para Nova/Editar Regra */}
      <CategoryRuleDialog
        open={isRuleDialogOpen}
        onOpenChange={setIsRuleDialogOpen}
        onSave={editingRule ? handleUpdateRule : handleCreateRule}
        initialData={editingRule}
      />

      {/* Toaster para notificações */}
      <Toaster />
    </LayoutWrapper>
  );
}