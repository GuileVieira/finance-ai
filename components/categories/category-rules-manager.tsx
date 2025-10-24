'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Category, AutoRule } from '@/lib/types';
import { Plus, Edit, Trash2, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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

export function CategoryRulesManager({ category, onClose }: CategoryRulesManagerProps) {
  const [rules, setRules] = useState<AutoRule[]>([
    // Regras mock baseadas na categoria
    {
      id: '1',
      category: category.name,
      pattern: category.name.toUpperCase(),
      type: 'contains',
      accuracy: 95,
      status: 'active',
      confidence_score: 0.95
    }
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoRule | null>(null);
  const [testPattern, setTestPattern] = useState('');
  const [testResult, setTestResult] = useState<{ matched: boolean; confidence: number } | null>(null);
  const { toast } = useToast();

  // Criar nova regra
  const handleCreateRule = (data: RuleFormData) => {
    const newRule: AutoRule = {
      id: Date.now().toString(),
      category: category.name,
      pattern: data.pattern,
      type: data.rule_type,
      confidence_score: data.confidence_score,
      status: data.active ? 'active' : 'inactive',
      accuracy: Math.round(data.confidence_score * 100)
    };

    setRules(prev => [...prev, newRule]);
    setIsCreateDialogOpen(false);

    toast({
      title: 'Regra Criada',
      description: `Nova regra para ${category.name} foi adicionada!`,
    });
  };

  // Editar regra
  const handleEditRule = (data: RuleFormData) => {
    if (!editingRule) return;

    setRules(prev => prev.map(rule =>
      rule.id === editingRule.id
        ? {
            ...rule,
            pattern: data.pattern,
            type: data.rule_type,
            confidence_score: data.confidence_score,
            status: data.active ? 'active' : 'inactive',
            accuracy: Math.round(data.confidence_score * 100)
          }
        : rule
    ));

    setEditingRule(null);

    toast({
      title: 'Regra Atualizada',
      description: 'As alterações foram salvas com sucesso!',
    });
  };

  // Excluir regra
  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));

    toast({
      title: 'Regra Excluída',
      description: 'A regra foi removida com sucesso!',
    });
  };

  // Toggle status da regra
  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === ruleId
        ? {
            ...rule,
            status: rule.status === 'active' ? 'inactive' : 'active'
          }
        : rule
    ));
  };

  // Testar padrão
  const handleTestPattern = () => {
    if (!testPattern) return;

    // Simular teste de padrão
    const matched = testPattern.toLowerCase().includes(category.name.toLowerCase());
    const confidence = matched ? 0.85 + Math.random() * 0.15 : Math.random() * 0.3;

    setTestResult({
      matched,
      confidence: Math.round(confidence * 100)
    });
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
          {rules.length === 0 ? (
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
  onSave: (data: RuleFormData) => void;
  onCancel: () => void;
}

function RuleForm({ initialData, onSave, onCancel }: RuleFormProps) {
  const [formData, setFormData] = useState<RuleFormData>({
    pattern: initialData?.pattern || '',
    rule_type: initialData?.rule_type || 'contains',
    confidence_score: initialData?.confidence_score || 0.8,
    active: initialData?.active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field: keyof RuleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Padrão */}
      <div className="space-y-2">
        <Label htmlFor="pattern">Padrão *</Label>
        <Input
          id="pattern"
          value={formData.pattern}
          onChange={(e) => handleInputChange('pattern', e.target.value)}
          placeholder="Ex: SALARIOS ou VENDAS"
          required
        />
        <p className="text-xs text-muted-foreground">
          Texto que será buscado na descrição das transações
        </p>
      </div>

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
        <Button type="submit">
          {initialData?.pattern ? 'Salvar Alterações' : 'Criar Regra'}
        </Button>
      </div>
    </form>
  );
}