'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { DREStatement, DRECategory } from '@/lib/types';

interface DREStatementProps {
  data: DREStatement;
  previousPeriod?: DREStatement;
  onExport?: (format: 'pdf' | 'excel') => void;
}

export default function DREStatementComponent({
  data,
  previousPeriod,
  onExport
}: DREStatementProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getVariation = (current: number, previous: number) => {
    if (!previous || previous === 0) return { value: 0, isPositive: true };
    const variation = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(variation),
      isPositive: variation >= 0
    };
  };

  const formatDRELine = (
    label: string,
    value: number,
    isResult = false,
    previousValue?: number,
    indent = 0,
    color = ''
  ) => {
    const variation = previousValue ? getVariation(value, previousValue) : null;

    return (
      <div className="space-y-1">
        <div
          className={`flex justify-between items-center py-2 px-3 rounded ${
            isResult ? (value >= 0 ? 'bg-success/10' : 'bg-danger/10') : ''
          } ${indent > 0 ? `ml-${indent * 4}` : ''}`}
          style={color ? { color } : {}}
        >
          <span className={`${indent > 0 ? 'ml-8' : ''} font-medium ${
            isResult ? 'text-lg' : ''
          }`}>
            {label}
          </span>
          <div className="flex items-center gap-2">
            {variation && (
              <div className={`flex items-center gap-1 text-sm ${
                variation.isPositive ? 'text-success' : 'text-danger'
              }`}>
                {variation.isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {formatPercentage(variation.value)}
              </div>
            )}
            <span className={`font-bold ${
              isResult ? (value >= 0 ? 'text-success' : 'text-danger') : ''
            }`}>
              {value >= 0 ? '+' : ''}{formatCurrency(value)}
            </span>
          </div>
        </div>
        {indent === 0 && <Separator />}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Demonstrativo de Resultado de Exercício</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            DRE de Caixa - {data.period}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.('excel')}
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.('pdf')}
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resumo Principal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground font-medium">Receita Bruta</div>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(data.grossRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground font-medium">Margem Contribuição</div>
              <div className="text-2xl font-bold text-success">
                {formatPercentage(data.contributionMargin.percentage)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground font-medium">Resultado Operacional</div>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(data.operationalResult)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground font-medium">Resultado Líquido</div>
              <div className={`text-2xl font-bold ${
                data.netResult >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {formatCurrency(data.netResult)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DRE Detalhado */}
        <div className="bg-muted rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">DRE Detalhado</h3>

          {formatDRELine(
            "RECEITA BRUTA",
            data.grossRevenue,
            false,
            previousPeriod?.grossRevenue
          )}

          {formatDRELine(
            "(-) Impostos sobre Vendas",
            -data.taxes,
            false,
            previousPeriod?.taxes ? -previousPeriod.taxes : undefined,
            1
          )}

          {formatDRELine(
            "(-) Custos Financeiros",
            -data.financialCosts,
            false,
            previousPeriod?.financialCosts ? -previousPeriod.financialCosts : undefined,
            1
          )}

          {formatDRELine(
            "= RECEITA LÍQUIDA",
            data.netRevenue,
            true,
            previousPeriod?.netRevenue,
            0,
            'hsl(var(--success))'
          )}

          {formatDRELine(
            "(-) CUSTO VARIÁVEL",
            -data.variableCosts,
            false,
            previousPeriod?.variableCosts ? -previousPeriod.variableCosts : undefined,
            1
          )}

          {formatDRELine(
            "= MARGEM DE CONTRIBUIÇÃO",
            data.contributionMargin.value,
            true,
            previousPeriod?.contributionMargin.value,
            0,
            'hsl(var(--primary-600))'
          )}

          {formatDRELine(
            `(${formatPercentage(data.contributionMargin.percentage)})`,
            0,
            false,
            undefined,
            2,
            'hsl(var(--muted-foreground))'
          )}

          {formatDRELine(
            "(-) CUSTO FIXO",
            -data.fixedCosts,
            false,
            previousPeriod?.fixedCosts ? -previousPeriod.fixedCosts : undefined,
            1
          )}

          {formatDRELine(
            "= RESULTADO OPERACIONAL",
            data.operationalResult,
            true,
            previousPeriod?.operationalResult,
            0,
            'hsl(var(--primary-700))'
          )}

          {formatDRELine(
            "(-) DESPESAS NÃO OPERACIONAIS",
            -data.nonOperationalExpenses,
            false,
            previousPeriod?.nonOperationalExpenses ? -previousPeriod.nonOperationalExpenses : undefined,
            1
          )}

          {formatDRELine(
            "= RESULTADO LÍQUIDO DE CAIXA",
            data.netResult,
            true,
            previousPeriod?.netResult,
            0,
            data.netResult >= 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))'
          )}
        </div>

        {/* Detalhamento por Categorias */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detalhamento por Categorias</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.categories.map((category) => (
              <Card key={category.name} className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {category.transactions} trans
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {formatCurrency(category.value)}
                        </span>
                        {expandedCategories.includes(category.name) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatPercentage(category.percentage)} do total
                    </div>
                  </div>

                  {expandedCategories.includes(category.name) && category.drilldown && (
                    <div className="border-t border-border bg-muted p-4 max-h-64 overflow-y-auto">
                      <h4 className="font-medium mb-3 text-sm">
                        Transações ({category.drilldown.length})
                      </h4>
                      <div className="space-y-2">
                        {category.drilldown.slice(0, 10).map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0"
                          >
                            <div>
                              <div className="font-medium">{transaction.description}</div>
                              <div className="text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <span className={transaction.amount >= 0 ? 'text-success' : 'text-danger'}>
                              {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                            </span>
                          </div>
                        ))}
                        {category.drilldown.length > 10 && (
                          <div className="text-sm text-muted-foreground text-center py-2">
                            ... e mais {category.drilldown.length - 10} transações
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}