'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CategoryFormData } from '@/lib/types';
import { categorySuggestions } from '@/lib/mock-categories';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (category: CategoryFormData) => void;
  initialData?: Partial<CategoryFormData>;
}

export function CategoryDialog({ open, onOpenChange, onSave, initialData }: CategoryDialogProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'revenue',
    color: initialData?.color || '#10B981',
    description: initialData?.description || '',
    active: initialData?.active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field: keyof CategoryFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Categoria' : 'Nova Categoria (Base XMIND)'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Edite as informações da categoria existente.'
              : 'Crie uma nova categoria baseada nas rúbricas reais do XMIND.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: Vendas de Produtos"
              required
            />
            {/* Sugestões */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">Sugestões:</span>
              {categorySuggestions.names.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-accent"
                  onClick={() => handleInputChange('name', suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva a categoria..."
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600" />
                    Receitas
                  </div>
                </SelectItem>
                <SelectItem value="variable_cost">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-600" />
                    Custos Variáveis
                  </div>
                </SelectItem>
                <SelectItem value="fixed_cost">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    Custos Fixos
                  </div>
                </SelectItem>
                <SelectItem value="non_operating">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-600" />
                    Não Operacionais
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                className="w-20 h-10 p-1 border rounded"
              />
              <Input
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                placeholder="#10B981"
                className="flex-1"
              />
            </div>
            {/* Cores pré-definidas */}
            <div className="flex gap-2">
              {categorySuggestions.colors.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-8 h-8 rounded border-2 border-muted hover:border-foreground transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                />
              ))}
            </div>
          </div>

          {/* Exemplos Reais (XMIND) */}
          <div className="space-y-2">
            <Label>Exemplos Reais (XMIND)</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Venda Mercadorias',
                'Receita Vendas',
                'Faturamento',
                'Receita Clientes'
              ].map((example, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox id={`example-${index}`} defaultChecked={index < 2} />
                  <Label
                    htmlFor={`example-${index}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {example}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => handleInputChange('active', checked)}
            />
            <Label htmlFor="active">Categoria ativa</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Salvar Alterações' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}