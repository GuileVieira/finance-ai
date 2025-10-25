'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCategories } from '@/hooks/use-categories';

// Usando a interface correta da API
import { CategoryRule } from '@/lib/api/categories';

interface CategoryRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Partial<CategoryRule>;
}

export function CategoryRuleDialog({ open, onOpenChange, onSave, initialData }: CategoryRuleDialogProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    pattern: initialData?.pattern || '',
    categoryId: initialData?.categoryId || '',
    priority: initialData?.priority || 5,
    isActive: initialData?.isActive ?? true,
  });

  const [testPattern, setTestPattern] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Carregar categorias ativas para o select
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.pattern.trim() || !formData.categoryId) {
      return;
    }

    onSave(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Testar se o padrão corresponde a um texto
  const testRulePattern = (pattern: string, text: string): boolean => {
    try {
      // Converter padrão simples para regex
      const regexPattern = pattern
        .replace(/\*/g, '.*') // * corresponde a qualquer coisa
        .replace(/\?/g, '.'); // ? corresponde a qualquer caractere

      const regex = new RegExp(regexPattern, 'i'); // case insensitive
      return regex.test(text);
    } catch {
      // Se falhar, usa contain simples
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  };

  const handleTestPattern = () => {
    if (testPattern && formData.pattern) {
      const result = testRulePattern(formData.pattern, testPattern);
      setTestResult(result);
    }
  };

  // Padrões sugeridos baseados no tipo de categoria
  const getSuggestedPatterns = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return [];

    const suggestions = {
      revenue: ['*VENDA*', '*RECEB*', '*FATUR*', '*CLIENTE*'],
      variable_cost: ['*COMPRA*', '*MATERIAL*', '*INSUMO*', '*FORNECEDOR*'],
      fixed_cost: ['*ALUGUEL*', '*SALÁRIO*', '*CONTA*', '*MENSAL*'],
      non_operational: ['*IMPOSTO*', '*JUROS*', '*MULTA*', '*BANCO*']
    };

    return suggestions[category.type as keyof typeof suggestions] || [];
  };

  useEffect(() => {
    if (testPattern) {
      handleTestPattern();
    }
  }, [testPattern, formData.pattern]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Regra Automática' : 'Nova Regra Automática'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Edite a regra de categorização automática.'
              : 'Crie uma nova regra para categorizar transações automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Regra</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: Categorizar Vendas"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva quando esta regra deve ser aplicada..."
              rows={2}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoria de Destino</Label>
            <Combobox
              options={categoryOptions}
              value={formData.categoryId}
              onValueChange={(value) => handleInputChange('categoryId', value)}
              placeholder="Selecione a categoria"
              searchPlaceholder="Buscar categoria..."
              emptyMessage={isLoadingCategories ? "Carregando categorias..." : "Nenhuma categoria encontrada"}
              disabled={isLoadingCategories}
            />
            {formData.categoryId && (
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const selected = categories.find(cat => cat.id === formData.categoryId);
                  if (!selected) return '';
                  return `${selected.icon} ${
                    selected.type === 'revenue' ? 'Receita' :
                    selected.type === 'variable_cost' ? 'Custo Variável' :
                    selected.type === 'fixed_cost' ? 'Custo Fixo' : 'Não Operacional'
                  }`;
                })()}
              </div>
            )}
          </div>

          {/* Padrão */}
          <div className="space-y-2">
            <Label htmlFor="pattern">Padrão de Correspondência</Label>
            <Input
              id="pattern"
              value={formData.pattern}
              onChange={(e) => handleInputChange('pattern', e.target.value)}
              placeholder="Ex: *VENDA* ou SALÁRIO"
              required
            />
            <div className="text-xs text-muted-foreground">
              Use * para coringa (ex: *VENDA* corresponde a "VENDA MERCADORIA")
            </div>

            {/* Sugestões de padrão */}
            {formData.categoryId && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Sugestões:</span>
                {getSuggestedPatterns(formData.categoryId).map((pattern, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-accent"
                    onClick={() => handleInputChange('pattern', pattern)}
                  >
                    {pattern}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Teste de Padrão */}
          <div className="space-y-2">
            <Label>Testar Padrão</Label>
            <div className="flex gap-2">
              <Input
                value={testPattern}
                onChange={(e) => setTestPattern(e.target.value)}
                placeholder="Digite um texto para testar..."
              />
              {testResult !== null && (
                <Badge
                  variant={testResult ? "default" : "destructive"}
                  className="text-xs"
                >
                  {testResult ? "✓ Corresponde" : "✗ Não corresponde"}
                </Badge>
              )}
            </div>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={String(formData.priority)}
              onValueChange={(value) => handleInputChange('priority', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Mais Baixa</SelectItem>
                <SelectItem value="3">3 - Baixa</SelectItem>
                <SelectItem value="5">5 - Média (Padrão)</SelectItem>
                <SelectItem value="7">7 - Alta</SelectItem>
                <SelectItem value="9">9 - Mais Alta</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Regras com prioridade maior são aplicadas primeiro
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Regra ativa</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.name.trim() || !formData.pattern.trim() || !formData.categoryId || isLoadingCategories}>
              {initialData ? 'Salvar Alterações' : 'Criar Regra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}