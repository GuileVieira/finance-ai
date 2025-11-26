'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Category, AutoRule } from '@/lib/types';
import { Plus, Edit, Trash2, TestTube, CheckCircle, XCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CategoryRulesManagerProps {
  category: Category;
  onClose: () => void;
}

interface RuleFormData {
  pattern: string;
  rule_type: 'exact' | 'contains' | 'regex';
  confidence_score: number;
  active: boolean;
}

interface CategoryRule {
  id: string;
  categoryId: string;
  companyId: string | null;
  rulePattern: string;
  ruleType: 'exact' | 'contains' | 'regex';
  confidenceScore: string;
  active: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function CategoryRulesManager({ category }: CategoryRulesManagerProps) {
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoRule | null>(null);
  const [testPattern, setTestPattern] = useState('');
  const [testResult, setTestResult] = useState<{ matched: boolean; confidence: number } | null>(null);
  const { toast } = useToast();

  // Buscar companyId
  useEffect(() => {
    async function fetchCompanyId() {
      try {
        const response = await fetch('/api/companies');
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          setCompanyId(result.data[0].id);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
      }
    }
    fetchCompanyId();
  }, []);

  // Buscar regras da API
  const fetchRules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/categories/rules?categoryId=${category.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Converter para formato AutoRule
        const autoRules: AutoRule[] = result.data.map((rule: CategoryRule) => ({
          id: rule.id,
          category: category.name,
          pattern: rule.rulePattern,
          type: rule.ruleType,
          confidence_score: parseFloat(rule.confidenceScore),
          status: rule.active ? 'active' : 'inactive',
          accuracy: Math.round(parseFloat(rule.confidenceScore) * 100)
        }));
        setRules(autoRules);
      }
    } catch (error) {
      console.error('Erro ao buscar regras:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as regras',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [category.id]);

  // Criar nova regra
  const handleCreateRule = async (data: RuleFormData) => {
    try {
      const response = await fetch('/api/categories/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: category.id,
          rulePattern: data.pattern,
          ruleType: data.rule_type,
          confidenceScore: data.confidence_score,
          active: data.active
        })
      });

      const result = await response.json();

      if (result.success) {
        // Mostrar warnings se houver
        if (result.warnings && result.warnings.length > 0) {
          toast({
            title: 'Regra Criada (com alertas)',
            description: result.warnings[0],
            variant: 'default'
          });
        } else {
          toast({
            title: 'Regra Criada',
            description: `Nova regra para ${category.name} foi adicionada!`,
          });
        }
        setIsCreateDialogOpen(false);
        fetchRules(); // Recarregar regras
      } else {
        // Verificar se é erro de duplicata
        if (result.isDuplicate) {
          toast({
            title: 'Regra Duplicada',
            description: result.message || 'Já existe uma regra com este padrão',
            variant: 'destructive'
          });
        } else {
          throw new Error(result.error || result.message);
        }
      }
    } catch (error) {
      console.error('Erro ao criar regra:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar a regra',
        variant: 'destructive'
      });
    }
  };

  // Editar regra
  const handleEditRule = async (data: RuleFormData) => {
    if (!editingRule) return;

    try {
      const response = await fetch(`/api/categories/rules/${editingRule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rulePattern: data.pattern,
          ruleType: data.rule_type,
          confidenceScore: data.confidence_score,
          active: data.active
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Regra Atualizada',
          description: 'As alterações foram salvas com sucesso!',
        });
        setEditingRule(null);
        fetchRules(); // Recarregar regras
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar regra:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a regra',
        variant: 'destructive'
      });
    }
  };

  // Excluir regra
  const handleDeleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/categories/rules/${ruleId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Regra Excluída',
          description: 'A regra foi removida com sucesso!',
        });
        fetchRules(); // Recarregar regras
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao excluir regra:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a regra',
        variant: 'destructive'
      });
    }
  };

  // Toggle status da regra
  const handleToggleRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    try {
      const response = await fetch(`/api/categories/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: rule.status !== 'active'
        })
      });

      const result = await response.json();

      if (result.success) {
        fetchRules(); // Recarregar regras
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao alternar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da regra',
        variant: 'destructive'
      });
    }
  };

  // Testar padrão
  const handleTestPattern = async () => {
    if (!testPattern) return;

    try {
      // Usar API para testar o padrão
      const response = await fetch('/api/categories/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: category.companyId,
          description: testPattern
        })
      });

      const result = await response.json();

      if (result.success && result.data.suggestions.length > 0) {
        const bestMatch = result.data.suggestions[0];
        setTestResult({
          matched: bestMatch.categoryId === category.id,
          confidence: Math.round(bestMatch.confidence * 100)
        });
      } else {
        setTestResult({
          matched: false,
          confidence: 0
        });
      }
    } catch (error) {
      console.error('Erro ao testar padrão:', error);
      setTestResult({
        matched: false,
        confidence: 0
      });
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'exact': return 'Exato';
      case 'contains': return 'Contém';
      case 'regex': return 'Expressão Regular';
      default: return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regras para {category.name}</h3>
          <p className="text-sm text-muted-foreground">
            Configure regras automáticas de categorização
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nova Regra de Categorização</DialogTitle>
            </DialogHeader>
            <RuleForm
              categoryId={category.id}
              companyId={companyId || undefined}
              onSave={handleCreateRule}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Testador de Padrões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testador de Padrões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Digite uma descrição para testar..."
              value={testPattern}
              onChange={(e) => setTestPattern(e.target.value)}
            />
            <Button onClick={handleTestPattern} disabled={!testPattern}>
              Testar
            </Button>
          </div>

          {testResult && (
            <div className="mt-3 p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                {testResult.matched ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">
                  {testResult.matched ? 'Correspondência encontrada' : 'Sem correspondência'}
                </span>
                <Badge variant="outline">
                  {testResult.confidence}% confiança
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Regras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Regras Configuradas ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando regras...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma regra configurada para esta categoria.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Padrão</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Acurácia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {rule.pattern}
                      </code>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {getRuleTypeLabel(rule.type)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.accuracy}%</span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              rule.accuracy >= 90
                                ? 'bg-green-500'
                                : rule.accuracy >= 70
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${rule.accuracy}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(rule.status)}
                        <span className="text-sm">
                          {rule.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog open={editingRule?.id === rule.id} onOpenChange={(open) => !open && setEditingRule(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingRule(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Editar Regra</DialogTitle>
                            </DialogHeader>
                            <RuleForm
                              initialData={{
                                pattern: rule.pattern,
                                rule_type: rule.type as 'exact' | 'contains' | 'regex',
                                confidence_score: rule.confidence_score || 0.8,
                                active: rule.status === 'active'
                              }}
                              onSave={handleEditRule}
                              onCancel={() => setEditingRule(null)}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRule(rule.id)}
                        >
                          {rule.status === 'active' ? 'Desativar' : 'Ativar'}
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir esta regra?')) {
                              handleDeleteRule(rule.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estatísticas da Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{category.transactions}</p>
              <p className="text-sm text-muted-foreground">Transações</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{rules.length}</p>
              <p className="text-sm text-muted-foreground">Regras Ativas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {rules.length > 0
                  ? Math.round(rules.reduce((acc, rule) => acc + rule.accuracy, 0) / rules.length)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Acurácia Média</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de formulário de regras
interface RuleFormProps {
  initialData?: Partial<RuleFormData>;
  categoryId?: string;
  companyId?: string;
  onSave: (data: RuleFormData) => void;
  onCancel: () => void;
}

interface ValidationResult {
  canCreate: boolean;
  hasExactDuplicate: boolean;
  hasSimilarRules: boolean;
  hasCrossConflict: boolean;
  warnings: string[];
  similarRules: Array<{
    id: string;
    rulePattern: string;
    categoryName: string;
    similarity: number;
    isConflict: boolean;
  }>;
}

function RuleForm({ initialData, categoryId, companyId, onSave, onCancel }: RuleFormProps) {
  const [formData, setFormData] = useState<RuleFormData>({
    pattern: initialData?.pattern || '',
    rule_type: initialData?.rule_type || 'contains',
    confidence_score: initialData?.confidence_score || 0.8,
    active: initialData?.active ?? true
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Validar padrão com debounce
  useEffect(() => {
    if (!formData.pattern || formData.pattern.length < 3 || !categoryId) {
      setValidation(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      try {
        const response = await fetch('/api/categories/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId,
            companyId,
            rulePattern: formData.pattern,
            ruleType: formData.rule_type,
            validateOnly: true
          })
        });

        const result = await response.json();
        if (result.validation) {
          setValidation(result.validation);
        }
      } catch (error) {
        console.error('Erro ao validar:', error);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.pattern, categoryId, companyId, formData.rule_type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validation?.hasExactDuplicate) {
      return; // Não permitir submit se for duplicata
    }
    onSave(formData);
  };

  const handleInputChange = (field: keyof RuleFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Padrão */}
      <div className="space-y-2">
        <Label htmlFor="pattern">Padrão *</Label>
        <div className="relative">
          <Input
            id="pattern"
            value={formData.pattern}
            onChange={(e) => handleInputChange('pattern', e.target.value)}
            placeholder="Ex: SALARIOS ou VENDAS"
            required
            className={validation?.hasExactDuplicate ? 'border-red-500' : validation?.hasCrossConflict ? 'border-yellow-500' : ''}
          />
          {isValidating && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Texto que será buscado na descrição das transações
        </p>
      </div>

      {/* Alertas de validação */}
      {validation && (validation.hasExactDuplicate || validation.hasCrossConflict || validation.hasSimilarRules) && (
        <div className={`p-3 rounded-lg border ${validation.hasExactDuplicate ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900'}`}>
          <div className="flex items-start gap-2">
            {validation.hasExactDuplicate ? (
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${validation.hasExactDuplicate ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                {validation.hasExactDuplicate ? 'Regra duplicada' : 'Regras similares encontradas'}
              </p>
              {validation.warnings.length > 0 && (
                <ul className="text-xs mt-1 space-y-1">
                  {validation.warnings.map((warning, i) => (
                    <li key={i} className="text-muted-foreground">{warning}</li>
                  ))}
                </ul>
              )}
              {validation.similarRules.length > 0 && !validation.hasExactDuplicate && (
                <div className="mt-2 space-y-1">
                  {validation.similarRules.slice(0, 3).map((rule) => (
                    <div key={rule.id} className="flex items-center gap-2 text-xs">
                      <code className="bg-muted px-1 rounded">{rule.rulePattern}</code>
                      <span className="text-muted-foreground">→</span>
                      <span className={rule.isConflict ? 'text-red-600' : 'text-muted-foreground'}>
                        {rule.categoryName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(rule.similarity * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tipo de Regra */}
      <div className="space-y-2">
        <Label htmlFor="rule_type">Tipo de Regra *</Label>
        <Select
          value={formData.rule_type}
          onValueChange={(value: 'exact' | 'contains' | 'regex') => handleInputChange('rule_type', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exact">Exato - Correspondência exata</SelectItem>
            <SelectItem value="contains">Contém - Contém o texto</SelectItem>
            <SelectItem value="regex">Regex - Expressão regular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Score de Confiança */}
      <div className="space-y-2">
        <Label htmlFor="confidence_score">
          Nível de Confiança: {Math.round(formData.confidence_score * 100)}%
        </Label>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={formData.confidence_score}
          onChange={(e) => handleInputChange('confidence_score', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>50% (Baixo)</span>
          <span>75% (Médio)</span>
          <span>100% (Alto)</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => handleInputChange('active', e.target.checked)}
        />
        <Label htmlFor="active">Regra ativa</Label>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={validation?.hasExactDuplicate || isValidating}
        >
          {isValidating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validando...
            </>
          ) : (
            initialData?.pattern ? 'Salvar Alterações' : 'Criar Regra'
          )}
        </Button>
      </div>
    </form>
  );
}