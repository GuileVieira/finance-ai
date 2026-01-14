'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wand2, AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { useCategories } from '@/hooks/use-categories';
import { cn } from '@/lib/utils';

// Usando a interface correta da API
import { CategoryRule } from '@/lib/api/categories';

// Interface para padrões sugeridos pela API
interface SuggestedPattern {
  pattern: string;
  strategy: string;
  confidence: number;
  genericityScore: number;
  ruleType: 'contains' | 'wildcard';
}

// Interface para transações afetadas
interface AffectedTransaction {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  currentCategory: string | null;
}

// Interface para resposta do preview
interface PreviewResponse {
  success: boolean;
  data: {
    suggestedPatterns: SuggestedPattern[];
    bestPattern: {
      pattern: string;
      strategy: string;
      ruleType: string;
      confidence: number;
    } | null;
    affectedTransactions: AffectedTransaction[];
    validation: {
      isValid: boolean;
      reason?: string;
    };
  };
  meta: {
    description: string;
    testedPattern: string;
    testedRuleType: string;
    affectedCount: number;
    suggestedPatternsCount: number;
  };
}

interface CategoryRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Partial<CategoryRule>;
  // Descrição inicial para gerar padrões (quando criando regra a partir de transação)
  initialDescription?: string;
}

export function CategoryRuleDialog({ open, onOpenChange, onSave, initialData, initialDescription }: CategoryRuleDialogProps) {
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

  // Estado para preview inteligente
  const [previewData, setPreviewData] = useState<PreviewResponse['data'] | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('manual');

  // Buscar preview de padrões inteligentes
  const fetchPreview = useCallback(async (description: string) => {
    if (!description || description.length < 5) {
      setPreviewData(null);
      return;
    }

    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const response = await fetch('/api/categories/rules/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      const data: PreviewResponse = await response.json();

      if (data.success) {
        setPreviewData(data.data);
      } else {
        setPreviewError('Erro ao gerar sugestões');
      }
    } catch (error) {
      setPreviewError('Erro ao conectar com a API');
      console.error('Preview error:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  // Buscar transações afetadas quando o padrão muda
  const fetchAffectedTransactions = useCallback(async (pattern: string) => {
    if (!pattern || pattern.length < 3) return;

    try {
      const ruleType = pattern.includes('*') ? 'wildcard' : 'contains';
      const response = await fetch(
        `/api/categories/rules/preview?pattern=${encodeURIComponent(pattern)}&ruleType=${ruleType}&limit=10`
      );

      const data = await response.json();

      if (data.success && data.data.matches) {
        setPreviewData(prev => prev ? {
          ...prev,
          affectedTransactions: data.data.matches
        } : null);
      }
    } catch (error) {
      console.error('Error fetching affected transactions:', error);
    }
  }, []);

  // Carregar categorias ativas para o select
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories({
    isActive: true,
    includeStats: false
  });

  // Atualizar formData quando initialData mudar ou dialog abrir
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        pattern: initialData.pattern || '',
        categoryId: initialData.categoryId || '',
        priority: initialData.priority || 5,
        isActive: initialData.isActive ?? true,
      });
      setActiveTab('manual');
    } else if (open && !initialData) {
      // Reset para valores padrão quando criar nova regra
      setFormData({
        name: '',
        description: '',
        pattern: '',
        categoryId: '',
        priority: 5,
        isActive: true,
      });

      // Se tem descrição inicial, mudar para aba inteligente
      if (initialDescription) {
        setActiveTab('smart');
        fetchPreview(initialDescription);
      } else {
        setActiveTab('manual');
      }
    }
    // Reset preview data quando dialog fecha
    if (!open) {
      setPreviewData(null);
      setPreviewError(null);
    }
  }, [open, initialData, initialDescription, fetchPreview]);

  // Selecionar um padrão sugerido
  const selectSuggestedPattern = (suggested: SuggestedPattern) => {
    setFormData(prev => ({
      ...prev,
      pattern: suggested.pattern
    }));
    // Buscar transações afetadas pelo novo padrão
    fetchAffectedTransactions(suggested.pattern);
  };

  // Aplicar o melhor padrão automaticamente
  const applyBestPattern = () => {
    if (previewData?.bestPattern) {
      setFormData(prev => ({
        ...prev,
        pattern: previewData.bestPattern!.pattern
      }));
      fetchAffectedTransactions(previewData.bestPattern.pattern);
    }
  };

  // Formatar estratégia para exibição
  const formatStrategy = (strategy: string): string => {
    const strategyLabels: Record<string, string> = {
      'entity_only': 'Entidade Principal',
      'prefix_entity': 'Tipo + Entidade',
      'entity_suffix': 'Entidade + Sufixo',
      'multi_keyword': 'Múltiplas Palavras',
      'single_keyword': 'Palavra-chave Única',
      'fallback': 'Padrão Genérico'
    };
    return strategyLabels[strategy] || strategy;
  };

  // Cor do badge de confiança
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.85) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

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
      non_operational: ['*IMPOSTO*', '*JUROS*', '*MULTA*', '*BANCO*'],
      financial_movement: ['*ANTECIP*', '*FIDC*', '*TRANSFER*']
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            {initialData ? 'Editar Regra Automática' : 'Nova Regra Automática'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Edite a regra de categorização automática.'
              : 'Crie uma nova regra para categorizar transações automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="smart" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Inteligente
            </TabsTrigger>
          </TabsList>

          {/* Aba de criação inteligente */}
          <TabsContent value="smart" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Geração Inteligente de Padrões
                </CardTitle>
                <CardDescription className="text-xs">
                  Cole uma descrição de transação e o sistema sugerirá padrões inteligentes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrição da Transação</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: PIX ENVIADO NETFLIX SERVICOS LTDA"
                      defaultValue={initialDescription || ''}
                      onBlur={(e) => fetchPreview(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          fetchPreview((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isLoadingPreview}
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input?.value) fetchPreview(input.value);
                      }}
                    >
                      {isLoadingPreview ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Analisar'
                      )}
                    </Button>
                  </div>
                </div>

                {previewError && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {previewError}
                  </div>
                )}

                {previewData && (
                  <div className="space-y-4">
                    {/* Melhor padrão sugerido */}
                    {previewData.bestPattern && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                Melhor Sugestão
                              </span>
                              <Badge className={cn("text-xs", getConfidenceColor(previewData.bestPattern.confidence))}>
                                {(previewData.bestPattern.confidence * 100).toFixed(0)}% confiança
                              </Badge>
                            </div>
                            <code className="text-lg font-mono font-bold text-green-900">
                              {previewData.bestPattern.pattern}
                            </code>
                            <div className="text-xs text-green-700 mt-1">
                              Estratégia: {formatStrategy(previewData.bestPattern.strategy)} |
                              Tipo: {previewData.bestPattern.ruleType}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={applyBestPattern}
                          >
                            Usar Este
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Outras sugestões */}
                    {previewData.suggestedPatterns && previewData.suggestedPatterns.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Outras Sugestões ({previewData.suggestedPatterns.length})
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {previewData.suggestedPatterns.map((pattern, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className={cn(
                                "cursor-pointer hover:bg-accent transition-colors py-1.5 px-3",
                                formData.pattern === pattern.pattern && "bg-accent"
                              )}
                              onClick={() => selectSuggestedPattern(pattern)}
                            >
                              <span className="font-mono">{pattern.pattern}</span>
                              <span className="ml-2 text-xs opacity-70">
                                ({formatStrategy(pattern.strategy)})
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transações afetadas */}
                    {previewData.affectedTransactions && previewData.affectedTransactions.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Transações que seriam afetadas ({previewData.affectedTransactions.length})
                        </Label>
                        <div className="max-h-32 overflow-y-auto border rounded-md">
                          <table className="w-full text-xs">
                            <tbody>
                              {previewData.affectedTransactions.slice(0, 5).map((tx, index) => (
                                <tr key={index} className="border-b last:border-b-0">
                                  <td className="p-2 font-mono truncate max-w-[300px]">
                                    {tx.description}
                                  </td>
                                  <td className="p-2 text-right">
                                    R$ {tx.amount.toFixed(2)}
                                  </td>
                                  <td className="p-2 text-muted-foreground">
                                    {tx.currentCategory || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {previewData.affectedTransactions.length > 5 && (
                            <div className="text-xs text-center py-1 text-muted-foreground">
                              +{previewData.affectedTransactions.length - 5} mais...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Validação */}
                    {!previewData.validation.isValid && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                        <AlertCircle className="h-4 w-4" />
                        {previewData.validation.reason}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de criação manual */}
          <TabsContent value="manual" className="space-y-4">
            {/* O formulário manual existente */}
          </TabsContent>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

            {/* Sugestões de padrão baseadas na categoria */}
            {formData.categoryId && activeTab === 'manual' && (
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
                  className="text-xs whitespace-nowrap"
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