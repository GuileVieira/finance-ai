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
import { Textarea } from '@/components/ui/textarea';
import { CreateCategoryData, CategoryType } from '@/lib/api/categories';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (category: CreateCategoryData) => void;
  initialData?: Partial<CreateCategoryData>;
}

export function CategoryDialog({ open, onOpenChange, onSave, initialData }: CategoryDialogProps) {
  const [formData, setFormData] = useState<CreateCategoryData>({
    name: initialData?.name || '',
    type: initialData?.type || 'revenue',
    colorHex: initialData?.colorHex || '#10B981',
    icon: initialData?.icon || '📊',
    description: initialData?.description || '',
    examples: initialData?.examples || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field: keyof CreateCategoryData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addExample = (example: string) => {
    if (example && !formData.examples?.includes(example)) {
      setFormData(prev => ({
        ...prev,
        examples: [...(prev.examples || []), example]
      }));
    }
  };

  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Categoria' : 'Nova Categoria Financeira'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Edite as informações da categoria existente.'
              : 'Crie uma nova categoria baseada em dados financeiros reais.'
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
              {['Vendas', 'Salários', 'Aluguel', 'Marketing', 'Transporte'].map((suggestion, index) => (
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
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva a categoria..."
              rows={2}
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: CategoryType) => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    Receitas
                  </div>
                </SelectItem>
                <SelectItem value="variable_cost">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    Custos Variáveis
                  </div>
                </SelectItem>
                <SelectItem value="fixed_cost">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    Custos Fixos
                  </div>
                </SelectItem>
                <SelectItem value="non_operational">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                    Não Operacionais
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ícone */}
          <div className="space-y-2">
            <Label htmlFor="icon">Ícone</Label>
            <div className="flex items-center gap-2">
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => handleInputChange('icon', e.target.value)}
                placeholder="📊"
                className="w-20"
                maxLength={2}
              />
              <div className="text-2xl">{formData.icon}</div>
            </div>
            {/* Ícones pré-definidos */}
            <div className="flex gap-2">
              {['📊', '💰', '🏢', '👥', '🚗', '🏠', '📈', '💡', '🛍️', '🍔'].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className="text-xl p-2 rounded border hover:bg-accent transition-colors"
                  onClick={() => handleInputChange('icon', icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label htmlFor="colorHex">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                id="colorHex"
                type="color"
                value={formData.colorHex}
                onChange={(e) => handleInputChange('colorHex', e.target.value)}
                className="w-20 h-10 p-1 border rounded"
              />
              <Input
                value={formData.colorHex}
                onChange={(e) => handleInputChange('colorHex', e.target.value)}
                placeholder="#10B981"
                className="flex-1"
              />
            </div>
            {/* Cores pré-definidas */}
            <div className="flex gap-2">
              {['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#059669'].map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-8 h-8 rounded border-2 border-muted hover:border-foreground transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('colorHex', color)}
                />
              ))}
            </div>
          </div>

          {/* Exemplos */}
          <div className="space-y-2">
            <Label>Exemplos de Transações</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar exemplo..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addExample(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    if (input?.value) {
                      addExample(input.value);
                      input.value = '';
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>
              {formData.examples && formData.examples.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.examples.map((example, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeExample(index)}
                    >
                      {example}
                      <span className="ml-1">×</span>
                    </Badge>
                  ))}
                </div>
              )}
              {/* Sugestões de exemplos */}
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Sugestões:</span>
                {[
                  formData.type === 'revenue' ? ['Venda', 'Recebimento', 'Faturamento'] :
                  formData.type === 'variable_cost' ? ['Compra', 'Material', 'Insumo'] :
                  formData.type === 'fixed_cost' ? ['Aluguel', 'Salário', 'Conta'] :
                  ['Imposto', 'Juros', 'Multas']
                ].map((suggestion, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-accent"
                    onClick={() => addExample(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
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