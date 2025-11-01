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
    color = '',
    lineDetails?: any[],
    transactions?: number
  ) => {
    const variation = previousValue ? getVariation(value, previousValue) : null;
    const lineKey = `dre-line-${label.replace(/[^a-zA-Z0-9]/g, '')}`;
    const isExpanded = expandedCategories.includes(lineKey);
    const hasDetails = lineDetails && lineDetails.length > 0;

    return (
      <div className="space-y-1">
        <div
          className={`flex justify-between items-center py-2 px-3 rounded ${
            isResult ? (value >= 0 ? 'bg-success/10 dark:bg-success/10' : 'bg-destructive/10 dark:bg-destructive/10') : ''
          } ${indent > 0 ? `ml-${indent * 4}` : ''} ${
            hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''
          }`}
          style={color ? { color } : {}}
          onClick={() => {
            if (hasDetails) {
              toggleCategory(lineKey);
            }
          }}
        >
          <div className="flex items-center gap-2">
            {hasDetails && (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <Badge variant="secondary" className="text-xs">
                  {transactions || lineDetails.reduce((sum, item) => sum + (item.transactions || 0), 0)} trans
                </Badge>
              </>
            )}
            <span className={`${indent > 0 ? 'ml-8' : ''} font-medium ${
              isResult ? 'text-lg' : ''
            }`}>
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {variation && (
              <div className={`flex items-center gap-1 text-sm ${
                variation.isPositive ? 'text-success' : 'text-destructive'
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
              isResult ? (value >= 0 ? 'text-success' : 'text-destructive') : ''
            }`}>
              {value >= 0 ? '+' : ''}{formatCurrency(value)}
            </span>
          </div>
        </div>

        {isExpanded && hasDetails && (
          <div className="ml-8 mr-3 border-l-2 border-border bg-muted/30 p-4">
            <h4 className="font-medium mb-3 text-sm">
              Detalhamento por Categoria
            </h4>
            <div className="space-y-3">
              {lineDetails.map((item) => (
                <div key={item.label} className="border-b border-border pb-3 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.label}</span>
                    <span className={item.value >= 0 ? 'text-success' : 'text-destructive'}>
                      {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
                    </span>
                  </div>
                  {item.drilldown && item.drilldown.length > 0 && (
                    <div className="space-y-2 ml-4">
                      <div className="text-sm text-muted-foreground">
                        Transações ({item.drilldown.length}):
                      </div>
                      {item.drilldown.slice(0, 5).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0"
                        >
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-muted-foreground text-xs">
                              {new Date(transaction.date).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <span className={transaction.amount >= 0 ? 'text-success' : 'text-destructive'}>
                            {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))}
                      {item.drilldown.length > 5 && (
                        <div className="text-sm text-muted-foreground text-center py-1">
                          ... e mais {item.drilldown.length - 5} transações
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                {formatCurrency(data.grossRevenue || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground font-medium">Margem Contribuição</div>
              <div className="text-2xl font-bold text-success">
                {data.contributionMargin?.percentage ? formatPercentage(data.contributionMargin.percentage) : '0%'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground font-medium">Resultado Operacional</div>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(data.operationalResult || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground font-medium">Resultado Líquido</div>
              <div className={`text-2xl font-bold ${
                (data.netResult || 0) >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {formatCurrency(data.netResult || 0)}
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
            previousPeriod?.grossRevenue,
            0,
            '',
            data.lineDetails?.grossRevenue,
            data.lineDetails?.grossRevenue?.reduce((sum, item) => sum + (item.transactions || 0), 0)
          )}

          {formatDRELine(
            "(-) Impostos sobre Vendas",
            -data.taxes,
            false,
            previousPeriod?.taxes ? -previousPeriod.taxes : undefined,
            1,
            '',
            data.lineDetails?.taxes,
            data.lineDetails?.taxes?.reduce((sum, item) => sum + (item.transactions || 0), 0)
          )}

          {formatDRELine(
            "(-) Custos Financeiros",
            -data.financialCosts,
            false,
            previousPeriod?.financialCosts ? -previousPeriod.financialCosts : undefined,
            1,
            '',
            data.lineDetails?.financialCosts,
            data.lineDetails?.financialCosts?.reduce((sum, item) => sum + (item.transactions || 0), 0)
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
            1,
            '',
            data.lineDetails?.variableCosts,
            data.lineDetails?.variableCosts?.reduce((sum, item) => sum + (item.transactions || 0), 0)
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
            1,
            '',
            data.lineDetails?.fixedCosts,
            data.lineDetails?.fixedCosts?.reduce((sum, item) => sum + (item.transactions || 0), 0)
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
            "(+) RECEITAS NÃO OPERACIONAIS",
            data.nonOperational.revenue,
            false,
            previousPeriod?.nonOperational?.revenue,
            1,
            '',
            data.lineDetails?.nonOperationalRevenue,
            data.lineDetails?.nonOperationalRevenue?.reduce((sum, item) => sum + (item.transactions || 0), 0)
          )}

          {formatDRELine(
            "(-) DESPESAS NÃO OPERACIONAIS",
            -data.nonOperational.expenses,
            false,
            previousPeriod?.nonOperational?.expenses ? -previousPeriod.nonOperational.expenses : undefined,
            1,
            '',
            data.lineDetails?.nonOperationalExpenses,
            data.lineDetails?.nonOperationalExpenses?.reduce((sum, item) => sum + (item.transactions || 0), 0)
          )}

          {formatDRELine(
            "= RESULTADO NÃO OPERACIONAL",
            data.nonOperational.netResult,
            true,
            previousPeriod?.nonOperational?.netResult,
            0,
            data.nonOperational.netResult >= 0 ? 'text-success' : 'text-destructive'
          )}

          {formatDRELine(
            "= RESULTADO LÍQUIDO DE CAIXA",
            data.netResult,
            true,
            previousPeriod?.netResult,
            0,
            data.netResult >= 0 ? 'text-success' : 'text-destructive'
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