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
import { CategoryGroup, DreGroupType } from '@/lib/types';

// Tipo interno para opções do select
interface CategoryTypeOption {
  id: string;
  value: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational' | 'financial_movement';
  label: string;
  description: string;
  suggestedColor: string;
  suggestedIcon: string;
}

// Mapeamento categoryGroup → dreGroup (automático)
const categoryGroupToDreGroup: Record<CategoryGroup, DreGroupType> = {
  'RECEITAS BRUTAS': 'RoB',
  'RECEITAS NOP': 'RNOP',
  'VENDAS': 'CV',
  'CPV/CMV': 'CV',
  'PESSOAL': 'CF',
  'DIRETORIA': 'CF',
  'VEÍCULOS': 'CF',
  'OCUPAÇÃO': 'CF',
  'UTILIDADES': 'CF',
  'COMUNICAÇÃO': 'CF',
  'SERVIÇOS': 'CF',
  'MANUTENÇÃO': 'CF',
  'MATERIAIS': 'CF',
  'OUTROS CF': 'CF',
  'TRIBUTOS': 'TDCF',
  'CUSTO FINANCEIRO': 'TDCF',
  'DESPESAS NOP': 'DNOP',
  'EMPRÉSTIMOS': 'EMP',
  'TRANSFERÊNCIAS': 'TRANSF',
};

// categoryGroups disponíveis por tipo de categoria
const categoryGroupsByType: Record<string, { value: CategoryGroup; label: string }[]> = {
  revenue: [
    { value: 'RECEITAS BRUTAS', label: 'Receitas Brutas (Faturamento, Vendas)' },
  ],
  variable_cost: [
    { value: 'VENDAS', label: 'Vendas (Comissões, Fretes, Promoções)' },
    { value: 'CPV/CMV', label: 'CPV/CMV (Matéria-prima, Embalagem, Produto)' },
  ],
  fixed_cost: [
    { value: 'PESSOAL', label: 'Pessoal (Salários, Benefícios, FGTS)' },
    { value: 'DIRETORIA', label: 'Diretoria (Pró-labore)' },
    { value: 'VEÍCULOS', label: 'Veículos (Combustível, IPVA, Seguro)' },
    { value: 'OCUPAÇÃO', label: 'Ocupação (Aluguel, Condomínio, IPTU)' },
    { value: 'UTILIDADES', label: 'Utilidades (Energia, Água, Gás)' },
    { value: 'COMUNICAÇÃO', label: 'Comunicação (Telefone, Internet)' },
    { value: 'SERVIÇOS', label: 'Serviços (Contabilidade, TI, Limpeza)' },
    { value: 'MANUTENÇÃO', label: 'Manutenção (Predial, Equipamentos)' },
    { value: 'MATERIAIS', label: 'Materiais (Copa, Escritório)' },
    { value: 'OUTROS CF', label: 'Outros Custos Fixos' },
  ],
  non_operational: [
    { value: 'RECEITAS NOP', label: 'Receitas NOP (Rendimentos, Juros Recebidos)' },
    { value: 'TRIBUTOS', label: 'Tributos (PIS, COFINS, ICMS, ISS)' },
    { value: 'CUSTO FINANCEIRO', label: 'Custo Financeiro (Tarifas, Juros Pagos)' },
    { value: 'DESPESAS NOP', label: 'Despesas NOP (Multas, Inadimplência)' },
  ],
  financial_movement: [
    { value: 'EMPRÉSTIMOS', label: 'Empréstimos (Entrada/Saída)' },
    { value: 'TRANSFERÊNCIAS', label: 'Transferências (Entre Contas)' },
  ],
};

// 5 tipos de categoria com descrições claras para usuários leigos
const categoryTypeOptions: CategoryTypeOption[] = [
  {
    id: 'revenue',
    value: 'revenue',
    label: '💵 Receitas Operacionais',
    description: 'Dinheiro que entra das vendas e serviços',
    suggestedColor: '#10B981',
    suggestedIcon: '💰',
  },
  {
    id: 'variable_cost',
    value: 'variable_cost',
    label: '📦 Custos Variáveis',
    description: 'Custos que variam com as vendas (matéria-prima, comissões)',
    suggestedColor: '#F59E0B',
    suggestedIcon: '🛒',
  },
  {
    id: 'fixed_cost',
    value: 'fixed_cost',
    label: '🏠 Custos Fixos',
    description: 'Gastos mensais fixos (aluguel, salários, internet)',
    suggestedColor: '#EF4444',
    suggestedIcon: '📋',
  },
  {
    id: 'non_operational',
    value: 'non_operational',
    label: '🏛️ Não Operacionais',
    description: 'Impostos, tarifas bancárias, rendimentos, juros',
    suggestedColor: '#8B5CF6',
    suggestedIcon: '🏛️',
  },
  {
    id: 'financial_movement',
    value: 'financial_movement',
    label: '🔄 Movimentações Financeiras',
    description: 'Empréstimos, transferências entre contas',
    suggestedColor: '#06B6D4',
    suggestedIcon: '🔄',
  },
];

// Ícones organizados por tipo
const iconsByType: Record<string, string[]> = {
  revenue: ['💰', '💵', '🛒', '📈', '🏷️', '🧾'],
  fixed_cost: ['📋', '🏠', '💼', '👥', '💡', '📞'],
  variable_cost: ['🛒', '📦', '🚚', '📣', '🔧', '✈️'],
  non_operational: ['🏛️', '📄', '⚖️', '💳', '📊', '🏦'],
  financial_movement: ['🔄', '💳', '🏦', '📤', '📥', '💱'],
};

// Cores por tipo
const colorsByType: Record<string, { hex: string; name: string }[]> = {
  revenue: [
    { hex: '#10B981', name: 'Verde' },
    { hex: '#059669', name: 'Esmeralda' },
    { hex: '#0EA5E9', name: 'Azul Céu' },
    { hex: '#22C55E', name: 'Verde Claro' }
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
  non_operational: [
    { hex: '#8B5CF6', name: 'Violeta' },
    { hex: '#6B7280', name: 'Cinza' },
    { hex: '#7C3AED', name: 'Roxo' },
    { hex: '#64748B', name: 'Ardósia' }
  ],
  financial_movement: [
    { hex: '#06B6D4', name: 'Ciano' },
    { hex: '#14B8A6', name: 'Teal' },
    { hex: '#0EA5E9', name: 'Azul Céu' },
    { hex: '#0891B2', name: 'Cyan' }
  ],
};

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (category: CreateCategoryData & { dreGroup?: string; categoryGroup?: string }) => void;
  initialData?: Partial<CreateCategoryData & { dreGroup?: string; categoryGroup?: string }>;
}

export function CategoryDialog({ open, onOpenChange, onSave, initialData }: CategoryDialogProps) {
  const [selectedType, setSelectedType] = useState<string>(initialData?.type || 'revenue');
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<CategoryGroup | ''>(
    (initialData?.categoryGroup as CategoryGroup) || ''
  );
  const [formData, setFormData] = useState<CreateCategoryData & { dreGroup?: string; categoryGroup?: string }>({
    name: initialData?.name || '',
    type: initialData?.type || 'revenue',
    colorHex: initialData?.colorHex || '#10B981',
    icon: initialData?.icon || '💰',
    description: initialData?.description || '',
    dreGroup: initialData?.dreGroup || '',
    categoryGroup: initialData?.categoryGroup || '',
  });

  // Atualizar formData quando o tipo muda
  const handleTypeChange = (typeId: string) => {
    const selectedOption = categoryTypeOptions.find(opt => opt.id === typeId);
    if (!selectedOption) return;

    setSelectedType(typeId);
    setSelectedCategoryGroup(''); // Resetar categoryGroup quando muda o tipo

    // Pegar primeiro categoryGroup do tipo como padrão
    const groups = categoryGroupsByType[typeId] || [];
    const defaultGroup = groups[0]?.value || '';
    const defaultDreGroup = defaultGroup ? categoryGroupToDreGroup[defaultGroup] : '';

    setFormData(prev => ({
      ...prev,
      type: selectedOption.value,
      colorHex: selectedOption.suggestedColor,
      icon: selectedOption.suggestedIcon,
      categoryGroup: defaultGroup,
      dreGroup: defaultDreGroup,
    }));
    setSelectedCategoryGroup(defaultGroup);
  };

  // Atualizar quando categoryGroup muda
  const handleCategoryGroupChange = (group: CategoryGroup) => {
    setSelectedCategoryGroup(group);
    const dreGroup = categoryGroupToDreGroup[group];
    setFormData(prev => ({
      ...prev,
      categoryGroup: group,
      dreGroup: dreGroup,
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
      setSelectedType(initialData.type || 'revenue');
      setSelectedCategoryGroup((initialData.categoryGroup as CategoryGroup) || '');
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'revenue',
        colorHex: initialData.colorHex || '#10B981',
        icon: initialData.icon || '💰',
        description: initialData.description || '',
        dreGroup: initialData.dreGroup || '',
        categoryGroup: initialData.categoryGroup || '',
      });
    }
  }, [initialData]);

  // Reset quando abre o dialog para criar nova categoria
  useEffect(() => {
    if (open && !initialData) {
      const defaultType = 'revenue';
      const defaultOption = categoryTypeOptions.find(opt => opt.id === defaultType);
      const groups = categoryGroupsByType[defaultType] || [];
      const defaultGroup = groups[0]?.value || '';
      const defaultDreGroup = defaultGroup ? categoryGroupToDreGroup[defaultGroup] : '';

      setSelectedType(defaultType);
      setSelectedCategoryGroup(defaultGroup);
      setFormData({
        name: '',
        type: defaultOption?.value || 'revenue',
        colorHex: defaultOption?.suggestedColor || '#10B981',
        icon: defaultOption?.suggestedIcon || '💰',
        description: '',
        dreGroup: defaultDreGroup,
        categoryGroup: defaultGroup,
      });
    }
  }, [open, initialData]);

  const selectedOption = categoryTypeOptions.find(opt => opt.id === selectedType);
  const currentIcons = iconsByType[selectedType] || iconsByType.revenue;
  const currentColors = colorsByType[selectedType] || colorsByType.revenue;
  const availableCategoryGroups = categoryGroupsByType[selectedType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Categoria' : 'Nova Categoria Financeira'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Edite as informações da categoria existente.'
              : 'Crie uma categoria para organizar suas transações no plano de contas.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Categoria */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Categoria *</Label>
            <Select
              value={selectedType}
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
            {selectedOption && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-muted-foreground/60">ℹ️</span>
                {selectedOption.description}
              </p>
            )}
          </div>

          {/* Grupo da Categoria (categoryGroup) */}
          <div className="space-y-2">
            <Label htmlFor="categoryGroup">
              Grupo no Plano de Contas *
              {formData.dreGroup && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  DRE: {formData.dreGroup}
                </Badge>
              )}
            </Label>
            <Select
              value={selectedCategoryGroup}
              onValueChange={(value) => handleCategoryGroupChange(value as CategoryGroup)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                {availableCategoryGroups.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O grupo define onde esta categoria aparece nos relatórios DRE e Fluxo de Caixa.
            </p>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: ALUGUEL, SALÁRIOS, FATURAMENTO"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva para que serve essa categoria (ajuda na categorização automática)"
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
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-1">
                  {currentColors.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      className={cn(
                        "w-7 h-7 rounded border-2 transition-colors",
                        formData.colorHex === color.hex
                          ? "border-foreground ring-2 ring-offset-1 ring-offset-background ring-primary"
                          : "border-muted hover:border-foreground"
                      )}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => handleInputChange('colorHex', color.hex)}
                      title={color.name}
                    />
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
            <Button type="submit" disabled={!selectedCategoryGroup}>
              {initialData ? 'Salvar Alterações' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
