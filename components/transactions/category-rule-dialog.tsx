'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, AlertCircle, Zap, Clock, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CategoryRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
    categoryName?: string;
  };
  selectedCategory: {
    id: string;
    name: string;
  };
  companyId: string;
  onConfirm: (options: {
    createRule: boolean;
    applyRetroactive: boolean;
    rulePattern: string;
    ruleType: string;
  }) => Promise<void>;
}

type RuleOption = 'only-this' | 'create-rule' | 'create-rule-retroactive';

export function CategoryRuleDialog({
  open,
  onOpenChange,
  transaction,
  selectedCategory,
  companyId,
  onConfirm,
}: CategoryRuleDialogProps) {
  const [selectedOption, setSelectedOption] = useState<RuleOption>('only-this');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<{
    totalAffected: number;
    newlyCategorized: number;
    financialImpact?: {
      income: number;
      expenses: number;
      total: number;
    };
    sampleTransactions?: Array<{
      id: string;
      description: string;
      amount: number;
      date: string;
      currentCategory: string;
      willChange: boolean;
    }>;
    message: string;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [customPattern, setCustomPattern] = useState(transaction.description);
  const [ruleType, setRuleType] = useState('contains');

  // Carregar preview quando mudar as opções
  useEffect(() => {
    if (open && (selectedOption === 'create-rule-retroactive' || selectedOption === 'create-rule')) {
      loadPreview();
    } else {
      setPreview(null);
    }
  }, [open, selectedOption, customPattern, ruleType]);

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch('/api/transaction-rules/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          rulePattern: customPattern,
          ruleType,
          categoryId: selectedCategory.id,
          applyToAll: selectedOption === 'create-rule-retroactive',
          limit: 5,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setPreview(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({
        createRule: selectedOption !== 'only-this',
        applyRetroactive: selectedOption === 'create-rule-retroactive',
        rulePattern: customPattern,
        ruleType,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao confirmar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOptionDescription = (option: RuleOption) => {
    switch (option) {
      case 'only-this':
        return 'Apenas alterará esta transação';
      case 'create-rule':
        return 'Criará regra para transações futuras';
      case 'create-rule-retroactive':
        return 'Criará regra e aplicará em transações passadas';
      default:
        return '';
    }
  };

  const getOptionIcon = (option: RuleOption) => {
    switch (option) {
      case 'only-this':
        return CheckCircle;
      case 'create-rule':
        return Zap;
      case 'create-rule-retroactive':
        return Clock;
      default:
        return CheckCircle;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterar Categoria</DialogTitle>
          <DialogDescription>
            Você está alterando a categoria de <strong>"{transaction.description}"</strong> para{" "}
            <Badge variant="secondary">{selectedCategory.name}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da transação */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  Categoria atual: {transaction.categoryName || 'Sem categoria'}
                </p>
              </div>
              <div className={`text-lg font-bold ${
                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
              </div>
            </div>
          </div>

          {/* Opções de regra */}
          <div className="space-y-4">
            <Label className="text-base font-medium">O que você gostaria de fazer?</Label>

            <RadioGroup value={selectedOption} onValueChange={(value) => setSelectedOption(value as RuleOption)}>
              {(['only-this', 'create-rule', 'create-rule-retroactive'] as RuleOption[]).map((option) => {
                const Icon = getOptionIcon(option);
                return (
                  <div key={option} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="flex-1 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">
                          {option === 'only-this' && 'Apenas esta transação'}
                          {option === 'create-rule' && 'Criar regra automática'}
                          {option === 'create-rule-retroactive' && 'Criar regra e aplicar retroativamente'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getOptionDescription(option)}
                      </p>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Configuração da regra */}
          {(selectedOption === 'create-rule' || selectedOption === 'create-rule-retroactive') && (
            <>
              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Configuração da Regra</Label>

                <div className="space-y-2">
                  <Label htmlFor="pattern">Padrão de correspondência</Label>
                  <input
                    id="pattern"
                    type="text"
                    value={customPattern}
                    onChange={(e) => setCustomPattern(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Texto para identificar transações"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de correspondência</Label>
                  <RadioGroup value={ruleType} onValueChange={setRuleType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="contains" id="contains" />
                      <Label htmlFor="contains">Contém (se o padrão estiver em qualquer parte da descrição)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="exact" id="exact" />
                      <Label htmlFor="exact">Exato (descrição deve ser idêntica)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Preview do impacto */}
              {isLoadingPreview ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Analisando impacto...</span>
                </div>
              ) : preview && (
                <div className="space-y-4">
                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Previsão de Impacto
                    </Label>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {preview.message}
                      </AlertDescription>
                    </Alert>

                    {preview.totalAffected > 0 && (
                      <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total afetado:</span>
                            <span className="ml-2 font-medium">{preview.totalAffected} transações</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Novas categorizações:</span>
                            <span className="ml-2 font-medium">{preview.newlyCategorized}</span>
                          </div>
                        </div>

                        {preview.financialImpact && (
                          <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                            <div>
                              <span className="text-muted-foreground">Receitas:</span>
                              <span className="ml-2 font-medium text-green-600">
                                +{formatCurrency(preview.financialImpact.income)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Despesas:</span>
                              <span className="ml-2 font-medium text-red-600">
                                -{formatCurrency(preview.financialImpact.expenses)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Amostra de transações */}
                    {preview.sampleTransactions && preview.sampleTransactions.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Exemplos de transações que serão afetadas:</Label>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {preview.sampleTransactions.map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm">
                              <span className="truncate mr-2">{t.description}</span>
                              <div className="flex items-center space-x-2">
                                {t.willChange && (
                                  <Badge variant="secondary" className="text-xs">Nova</Badge>
                                )}
                                <span className={t.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrency(t.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (isLoadingPreview && (selectedOption === 'create-rule' || selectedOption === 'create-rule-retroactive'))}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedOption === 'only-this' && 'Confirmar Alteração'}
            {selectedOption === 'create-rule' && 'Criar Regra'}
            {selectedOption === 'create-rule-retroactive' && 'Criar e Aplicar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}