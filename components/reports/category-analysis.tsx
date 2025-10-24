'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Search,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { DRECategory, CategoryRule } from '@/lib/types';

interface CategoryAnalysisProps {
  categories: DRECategory[];
  rules: CategoryRule[];
  onCategoryClick?: (category: DRECategory) => void;
  onRuleEdit?: (rule: CategoryRule) => void;
}

export default function CategoryAnalysis({
  categories,
  rules,
  onCategoryClick,
  onRuleEdit
}: CategoryAnalysisProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [sortBy, setSortBy] = useState<'value' | 'percentage' | 'transactions'>('value');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const sortedCategories = useMemo(() => {
    const sorted = [...filteredCategories];
    return sorted.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.value - a.value;
        case 'percentage':
          return b.percentage - a.percentage;
        case 'transactions':
          return b.transactions - a.transactions;
        default:
          return 0;
      }
    });
  }, [filteredCategories, sortBy]);

  const pieChartData = sortedCategories.map(category => ({
    name: category.name,
    value: category.value,
    color: category.color
  }));

  const barChartData = sortedCategories.map(category => ({
    name: category.name.length > 15 ? category.name.substring(0, 15) + '...' : category.name,
    value: category.value,
    percentage: category.percentage,
    transactions: category.transactions,
    color: category.color
  }));

  const getCategoryTypeLabel = (type: DRECategory['type']) => {
    switch (type) {
      case 'variable':
        return 'Custo Variável';
      case 'fixed':
        return 'Custo Fixo';
      case 'non_operating':
        return 'Não Operacional';
      default:
        return 'Desconhecido';
    }
  };

  const getCategoryTypeColor = (type: DRECategory['type']) => {
    switch (type) {
      case 'variable':
        return 'bg-orange-100 text-orange-800';
      case 'fixed':
        return 'bg-red-100 text-red-800';
      case 'non_operating':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getRulesForCategory = (categoryName: string) => {
    return rules.filter(rule => rule.category === categoryName);
  };

  const totalValue = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.value, 0);
  }, [categories]);

  const renderPieChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5" />
          Distribuição por Categoria
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualização percentual dos custos
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: R$ ${value.toLocaleString('pt-BR')}`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Valor']}
              labelFormatter={(label) => `Categoria: ${label}`}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          <h4 className="font-medium text-sm">Legenda</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {sortedCategories.slice(0, 6).map((category) => (
              <div key={category.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="truncate">{category.name}</span>
              </div>
            ))}
            {sortedCategories.length > 6 && (
              <div className="text-sm text-muted-foreground col-span-2 md:col-span-3">
                ... e mais {sortedCategories.length - 6} categorias
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBarChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Comparação de Categorias
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Valores absolutos e percentuais
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={barChartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'value' ? formatCurrency(value) : value,
                name === 'value' ? 'Valor' : name === 'percentage' ? '%' : 'Trans'
              ]}
            />
            <Bar dataKey="value" fill="#8884d8">
              {barChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Análise de Categorias</h2>
          <p className="text-muted-foreground">
            Análise detalhada das {categories.length} categorias identificadas
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Buscar categorias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
            prefix={<Search className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Geral</div>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Categorias</div>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Maior Categoria</div>
            <div className="text-lg font-semibold">
              {sortedCategories[0]?.name || '-'}
            </div>
            {sortedCategories[0] && (
              <div className="text-sm text-muted-foreground">
                {formatCurrency(sortedCategories[0].value)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Regras Ativas</div>
            <div className="text-2xl font-bold">
              {rules.filter(r => r.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">
              de {rules.length} totais
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tipo de Visualização */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Visualização:</span>
        <div className="flex gap-2">
          <Button
            variant={viewType === 'pie' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('pie')}
          >
            <PieChartIcon className="w-4 h-4 mr-2" />
            Pizza
          </Button>
          <Button
            variant={viewType === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('bar')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Barras
          </Button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium">Ordenar por:</span>
          <Button
            variant={sortBy === 'value' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('value')}
          >
            Valor
          </Button>
          <Button
            variant={sortBy === 'percentage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('percentage')}
          >
            Percentual
          </Button>
          <Button
            variant={sortBy === 'transactions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('transactions')}
          >
            Transações
          </Button>
        </div>
      </div>

      {/* Gráficos */}
      {viewType === 'pie' ? renderPieChart() : renderBarChart()}

      {/* Lista Detalhada de Categorias */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento das Categorias</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filteredCategories.length} de {categories.length} categorias
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedCategories.map((category) => (
              <div
                key={category.name}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onCategoryClick?.(category)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <h3 className="font-semibold">{category.name}</h3>
                      <Badge className={getCategoryTypeColor(category.type)}>
                        {getCategoryTypeLabel(category.type)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Valor</div>
                        <div className="font-semibold text-lg">
                          {formatCurrency(category.value)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Percentual</div>
                        <div className="font-semibold text-lg">
                          {formatPercentage(category.percentage)}
                        </div>
                        <Progress
                          value={category.percentage}
                          className="mt-1"
                          style={{
                            backgroundColor: `${category.color}20`
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-muted-foreground">Transações</div>
                        <div className="font-semibold text-lg">{category.transactions}</div>
                      </div>
                    </div>

                    {/* Regras da Categoria */}
                    {getRulesForCategory(category.name).length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm font-medium mb-2">Regras Automáticas</div>
                        <div className="flex flex-wrap gap-1">
                          {getRulesForCategory(category.name).slice(0, 3).map((rule) => (
                            <Badge
                              key={rule.id}
                              variant="outline"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRuleEdit?.(rule);
                              }}
                            >
                              "{rule.pattern}" ({rule.accuracy}%)
                            </Badge>
                          ))}
                          {getRulesForCategory(category.name).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{getRulesForCategory(category.name).length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}