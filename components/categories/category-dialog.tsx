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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CreateCategoryData } from '@/lib/api/categories';
import { cn } from '@/lib/utils';

// Tipo interno para opções do select (inclui subtipos para non_operational)
interface CategoryTypeOption {
  id: string; // Chave única para React
  value: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational';
  label: string;
  description: string;
  suggestedColor: string;
  suggestedIcon: string;
  dreGroup: string;
}

// 5 tipos de categoria com descrições claras para usuários leigos
const categoryTypeOptions: CategoryTypeOption[] = [
  {
    id: 'revenue',
    value: 'revenue',
    label: '💵 Receitas Operacionais',
    description: 'Dinheiro que entra das vendas e serviços',
    suggestedColor: '#10B981',
    suggestedIcon: '💰',
    dreGroup: 'RoB'
  },
  {
    id: 'fixed_cost',
    value: 'fixed_cost',
    label: '🏠 Custos Fixos',
    description: 'Gastos mensais fixos (aluguel, salários, internet)',
    suggestedColor: '#EF4444',
    suggestedIcon: '📋',
    dreGroup: 'CF'
  },
  {
    id: 'variable_cost',
    value: 'variable_cost',
    label: '📦 Custos Variáveis',
    description: 'Custos que variam com as vendas (matéria-prima, comissões)',
    suggestedColor: '#F59E0B',
    suggestedIcon: '🛒',
    dreGroup: 'MP'
  },
  {
    id: 'non_operational_revenue',
    value: 'non_operational',
    label: '📈 Receitas Não Operacionais',
    description: 'Rendimentos, juros recebidos, aluguéis de imóveis',
    suggestedColor: '#8B5CF6',
    suggestedIcon: '📈',
    dreGroup: 'RNOP'
  },
  {
    id: 'non_operational_expense',
    value: 'non_operational',
    label: '🏛️ Despesas Não Operacionais',
    description: 'Impostos, juros pagos, multas, tarifas bancárias',
    suggestedColor: '#6B7280',
    suggestedIcon: '🏛️',
    dreGroup: 'DNOP'
  }
];

// Ícones organizados por contexto do tipo
const iconsByTypeId: Record<string, string[]> = {
  revenue: ['💰', '💵', '🛒', '📈', '🏷️', '🧾'],
  fixed_cost: ['📋', '🏠', '💼', '👥', '💡', '📞'],
  variable_cost: ['🛒', '📦', '🚚', '📣', '🔧', '✈️'],
  non_operational_revenue: ['📈', '💹', '🏦', '💳', '📊', '🏠'],
  non_operational_expense: ['🏛️', '📄', '⚖️', '💳', '📊', '🏦']
};

// Cores vinculadas ao tipo (4 opções por tipo)
const colorsByTypeId: Record<string, { hex: string; name: string }[]> = {
  revenue: [
    { hex: '#10B981', name: 'Verde' },
    { hex: '#059669', name: 'Esmeralda' },
    { hex: '#0EA5E9', name: 'Azul Céu' },
    { hex: '#6366F1', name: 'Índigo' }
  ],
  fixed_cost: [
    { hex: '#EF4444', name: 'Vermelho' },
    { hex: '#F87171', name: 'Coral' },
    { hex: '#DC2626', name: 'Carmesim' },
    { hex: '#EC4899', name: 'Rosa' }
  ],
  variable_cost: [
    { hex: '#F59E0B', name: 'Âmbar' },
    { hex: '#FBBF24', name: 'Amarelo' },
    { hex: '#F97316', name: 'Laranja' },
    { hex: '#FB923C', name: 'Tangerina' }
  ],
  non_operational_revenue: [
    { hex: '#8B5CF6', name: 'Violeta' },
    { hex: '#A78BFA', name: 'Lavanda' },
    { hex: '#7C3AED', name: 'Roxo' },
    { hex: '#C4B5FD', name: 'Lilás' }
  ],
  non_operational_expense: [
    { hex: '#6B7280', name: 'Cinza' },
    { hex: '#9CA3AF', name: 'Prata' },
    { hex: '#4B5563', name: 'Chumbo' },
    { hex: '#374151', name: 'Escuro' }
  ]
};

// Sugestões de nome por tipo
const nameSuggestionsByTypeId: Record<string, string[]> = {
  revenue: ['Vendas', 'Serviços', 'Faturamento'],
  fixed_cost: ['Aluguel', 'Salários', 'Internet'],
  variable_cost: ['Matéria-prima', 'Comissões', 'Frete'],
  non_operational_revenue: ['Rendimentos', 'Juros Recebidos', 'Aluguel Recebido'],
  non_operational_expense: ['Impostos', 'Juros', 'Tarifas Bancárias']
};

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (category: CreateCategoryData & { dreGroup?: string }) => void;
  initialData?: Partial<CreateCategoryData & { dreGroup?: string }>;
}

export function CategoryDialog({ open, onOpenChange, onSave, initialData }: CategoryDialogProps) {
  // Determinar o tipo selecionado (id interno) baseado nos dados iniciais
  const getInitialTypeId = (): string => {
    if (!initialData?.type) return 'revenue';
    if (initialData.type === 'non_operational') {
      // Determinar se é receita ou despesa NOP baseado no dreGroup
      return initialData.dreGroup === 'RNOP' ? 'non_operational_revenue' : 'non_operational_expense';
    }
    return initialData.type;
  };

  const [selectedTypeId, setSelectedTypeId] = useState(getInitialTypeId());
  const [formData, setFormData] = useState<CreateCategoryData & { dreGroup?: string }>({
    name: initialData?.name || '',
    type: initialData?.type || 'revenue',
    colorHex: initialData?.colorHex || '#10B981',
    icon: initialData?.icon || '💰',
    description: initialData?.description || '',
    dreGroup: initialData?.dreGroup || 'RoB'
  });

  // Atualizar formData quando o tipo muda
  const handleTypeChange = (typeId: string) => {
    const selectedOption = categoryTypeOptions.find(opt => opt.id === typeId);
    if (!selectedOption) return;

    setSelectedTypeId(typeId);
    setFormData(prev => ({
      ...prev,
      type: selectedOption.value,
      colorHex: selectedOption.suggestedColor,
      icon: selectedOption.suggestedIcon,
      dreGroup: selectedOption.dreGroup
    }));
  };

  const handleInputChange = (field: keyof typeof formData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Atualizar estado quando initialData muda (modo edição)
  useEffect(() => {
    if (initialData) {
      setSelectedTypeId(getInitialTypeId());
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'revenue',
        colorHex: initialData.colorHex || '#10B981',
        icon: initialData.icon || '💰',
        description: initialData.description || '',
        dreGroup: initialData.dreGroup || 'RoB'
      });
    }
  }, [initialData]);

  const selectedOption = categoryTypeOptions.find(opt => opt.id === selectedTypeId);
  const currentIcons = iconsByTypeId[selectedTypeId] || iconsByTypeId.revenue;
  const currentColors = colorsByTypeId[selectedTypeId] || colorsByTypeId.revenue;
  const currentNameSuggestions = nameSuggestionsByTypeId[selectedTypeId] || [];

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
              : 'Crie uma categoria para organizar suas transações.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Categoria */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Categoria *</Label>
            <Select
              value={selectedTypeId}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {categoryTypeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: option.suggestedColor }}
                      />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Descrição do tipo selecionado */}
            {selectedOption && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-muted-foreground/60">ℹ️</span>
                {selectedOption.description}
              </p>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: Vendas de Produtos"
              required
            />
            {/* Sugestões baseadas no tipo */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">Sugestões:</span>
              {currentNameSuggestions.map((suggestion, index) => (
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
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Para que serve essa categoria?"
              rows={2}
            />
          </div>

          {/* Personalização - Ícone e Cor */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Personalização</p>

            <div className="grid grid-cols-2 gap-4">
              {/* Ícone */}
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-1">
                  {currentIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={cn(
                        "text-lg p-1.5 rounded border transition-colors",
                        formData.icon === icon
                          ? "border-primary bg-accent"
                          : "border-muted hover:bg-accent"
                      )}
                      onClick={() => handleInputChange('icon', icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cor */}
              <div className="space-y-2">
                <Label>
                  Cor
                  <span className="text-xs text-muted-foreground ml-1">(recomendada: {currentColors[0]?.name})</span>
                </Label>
                <div className="flex flex-wrap gap-1">
                  {currentColors.map((color, index) => (
                    <button
                      key={color.hex}
                      type="button"
                      className={cn(
                        "w-7 h-7 rounded border-2 transition-colors relative",
                        formData.colorHex === color.hex
                          ? "border-foreground ring-2 ring-offset-1 ring-offset-background ring-primary"
                          : "border-muted hover:border-foreground"
                      )}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => handleInputChange('colorHex', color.hex)}
                      title={color.name}
                    >
                      {index === 0 && (
                        <span className="absolute -top-1 -right-1 text-[10px]">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
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