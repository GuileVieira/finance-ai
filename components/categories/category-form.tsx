'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CategoryFormData, Category } from '@/lib/types';
import { categoryTypes, categorySuggestions } from '@/lib/mock-categories';

interface CategoryFormProps {
  initialData?: Partial<Category>;
  onSave: (data: CategoryFormData) => void;
  onCancel: () => void;
}

export function CategoryForm({ initialData, onSave, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'revenue',
    color: initialData?.color || '#10B981',
    description: initialData?.description || '',
    active: initialData?.active ?? true,
    parent_category_id: initialData?.parent_category_id
  });

  const [examples, setExamples] = useState<string[]>(initialData?.examples || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, examples });
  };

  const handleInputChange = (field: keyof CategoryFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addExample = (example: string) => {
    if (example && !examples.includes(example)) {
      setExamples(prev => [...prev, example]);
    }
  };

  const removeExample = (index: number) => {
    setExamples(prev => prev.filter((_, i) => i !== index));
  };

  const [newExample, setNewExample] = useState('');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome da Categoria */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Categoria *</Label>
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
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Descreva a categoria..."
          rows={3}
        />
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <Label htmlFor="type">Tipo *</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => handleInputChange('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {categoryTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <div>{type.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {type.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Categoria Pai (Hierarquia) */}
      <div className="space-y-2">
        <Label htmlFor="parent_category_id">Categoria Pai (Opcional)</Label>
        <Select
          value={formData.parent_category_id || ''}
          onValueChange={(value) => handleInputChange('parent_category_id', value || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria pai (para subcategorias)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhuma (categoria principal)</SelectItem>
            {/* Aqui poderíamos carregar categorias do mesmo tipo */}
            <SelectItem value="1" disabled>Ex: Custos (em breve)</SelectItem>
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
            className="flex-1 font-mono"
          />
        </div>
        {/* Cores pré-definidas baseadas no tipo */}
        <div className="flex gap-2">
          {categoryTypes
            .find(t => t.value === formData.type)?.color
            ? [
                categoryTypes.find(t => t.value === formData.type)?.color,
                ...categorySuggestions.colors
              ].map((color, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-8 h-8 rounded border-2 border-muted hover:border-foreground transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color || '#10B981')}
                />
              ))
            : categorySuggestions.colors.map((color, index) => (
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

      {/* Exemplos */}
      <div className="space-y-2">
        <Label>Exemplos de Transações</Label>
        <div className="flex gap-2">
          <Input
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            placeholder="Ex: 'Venda Mercadorias'"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addExample(newExample);
                setNewExample('');
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              addExample(newExample);
              setNewExample('');
            }}
          >
            Adicionar
          </Button>
        </div>
        {examples.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {examples.map((example, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeExample(index)}
              >
                {example} ×
              </Badge>
            ))}
          </div>
        )}
        {/* Sugestões de exemplos baseadas no tipo */}
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Sugestões automáticas:</p>
          <div className="flex flex-wrap gap-1">
            {formData.type === 'revenue' && [
              'Venda Mercadorias', 'Receita Vendas', 'Faturamento', 'Receita Clientes'
            ].map((example, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-accent"
                onClick={() => addExample(example)}
              >
                +{example}
              </Badge>
            ))}
            {formData.type === 'fixed_cost' && [
              'ALUGUEL', 'SALARIOS', 'CONDOMÍNIO', 'INTERNET'
            ].map((example, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-accent"
                onClick={() => addExample(example)}
              >
                +{example}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="active"
          checked={formData.active}
          onCheckedChange={(checked) => handleInputChange('active', checked)}
        />
        <Label htmlFor="active">Categoria ativa</Label>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">
          {initialData?.id ? 'Salvar Alterações' : 'Criar Categoria'}
        </Button>
      </div>
    </form>
  );
}