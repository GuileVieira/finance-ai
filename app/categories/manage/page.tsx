'use client';

import { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryForm } from '@/components/categories/category-form';
import { CategoryRulesManager } from '@/components/categories/category-rules-manager';
import { mockCategories, categoryTypes } from '@/lib/mock-categories';
import { Category, CategoryFormData } from '@/lib/types';
import { Plus, Edit, Trash2, Settings, Search, Filter, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CategoriesManagePage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [managingRules, setManagingRules] = useState<Category | null>(null);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  // Filtrar categorias
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || category.type === filterType;
    return matchesSearch && matchesType;
  });

  // Criar nova categoria
  const handleCreateCategory = (data: CategoryFormData) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: data.name,
      type: data.type,
      color: data.color,
      description: data.description,
      amount: 0,
      transactions: 0,
      percentage: 0,
      active: data.active ?? true,
      examples: []
    };

    setCategories(prev => [...prev, newCategory]);
    setIsCreateDialogOpen(false);

    toast({
      title: 'Categoria Criada',
      description: `${newCategory.name} foi adicionada com sucesso!`,
    });
  };

  // Editar categoria
  const handleEditCategory = (data: CategoryFormData) => {
    if (!editingCategory) return;

    setCategories(prev => prev.map(cat =>
      cat.id === editingCategory.id
        ? { ...cat, ...data }
        : cat
    ));

    setEditingCategory(null);

    toast({
      title: 'Categoria Atualizada',
      description: 'As alterações foram salvas com sucesso!',
    });
  };

  // Excluir categoria
  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    setCategories(prev => prev.filter(cat => cat.id !== categoryId));

    toast({
      title: 'Categoria Excluída',
      description: `${category.name} foi removida com sucesso!`,
    });
  };

  // Toggle status ativo/inativo
  const handleToggleActive = (categoryId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, active: !cat.active }
        : cat
    ));
  };

  const getTypeColor = (type: string) => {
    const typeConfig = categoryTypes.find(t => t.value === type);
    return typeConfig?.color || '#6B7280';
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = categoryTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Categorias</h1>
            <p className="text-muted-foreground">
              Gerencie todas as categorias financeiras do sistema
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Nova Categoria Financeira</DialogTitle>
              </DialogHeader>
              <CategoryForm
                onSave={handleCreateCategory}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar categorias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {categoryTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle>
              Categorias ({filteredCategories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Transações</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma categoria encontrada.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id} className={!category.active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <p className="font-medium">{category.name}</p>
                            {category.description && (
                              <p className="text-sm text-muted-foreground">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: `${getTypeColor(category.type)}20`,
                            color: getTypeColor(category.type),
                          }}
                        >
                          {getTypeLabel(category.type)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-mono">
                            {category.color}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{category.transactions}</p>
                          <p className="text-muted-foreground">
                            {category.percentage}% do total
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={category.active ? 'default' : 'secondary'}>
                          {category.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingCategory(category)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Dialog open={!!editingCategory?.id === category.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCategory(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Editar Categoria</DialogTitle>
                              </DialogHeader>
                              {editingCategory && (
                                <CategoryForm
                                  initialData={editingCategory}
                                  onSave={handleEditCategory}
                                  onCancel={() => setEditingCategory(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          <Dialog open={!!managingRules?.id === category.id} onOpenChange={(open) => !open && setManagingRules(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setManagingRules(category)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px]">
                              <DialogHeader>
                                <DialogTitle>Regras de Categorização</DialogTitle>
                              </DialogHeader>
                              {managingRules && (
                                <CategoryRulesManager
                                  category={managingRules}
                                  onClose={() => setManagingRules(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(category.id)}
                          >
                            {category.active ? 'Desativar' : 'Ativar'}
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir ${category.name}?`)) {
                                handleDeleteCategory(category.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog open={!!viewingCategory} onOpenChange={() => setViewingCategory(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Detalhes da Categoria</DialogTitle>
            </DialogHeader>
            {viewingCategory && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: viewingCategory.color }}
                  />
                  <div>
                    <h3 className="font-semibold">{viewingCategory.name}</h3>
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: `${getTypeColor(viewingCategory.type)}20`,
                        color: getTypeColor(viewingCategory.type),
                      }}
                    >
                      {getTypeLabel(viewingCategory.type)}
                    </Badge>
                  </div>
                </div>

                {viewingCategory.description && (
                  <div>
                    <p className="text-sm font-medium">Descrição</p>
                    <p className="text-muted-foreground">{viewingCategory.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Transações</p>
                    <p className="text-2xl font-bold">{viewingCategory.transactions}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Percentual</p>
                    <p className="text-2xl font-bold">{viewingCategory.percentage}%</p>
                  </div>
                </div>

                {viewingCategory.examples && viewingCategory.examples.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Exemplos</p>
                    <div className="flex flex-wrap gap-1">
                      {viewingCategory.examples.map((example, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWrapper>
  );
}