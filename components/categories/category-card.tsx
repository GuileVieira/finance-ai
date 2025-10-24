'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Category } from '@/lib/types';
import { Edit, Settings } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
  onEdit: () => void;
  onRules: () => void;
}

export function CategoryCard({ category, onEdit, onRules }: CategoryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardContent className="p-4">
        {/* Header com cor e ícone */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <div className="flex items-center gap-1">
              {category.icon && (
                <span className="text-lg">{category.icon}</span>
              )}
            </div>
          </div>
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: `${category.color}20`,
              color: category.color,
              borderColor: category.color
            }}
          >
            {category.transactions} transações
          </Badge>
        </div>

        {/* Nome da categoria */}
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">
          {category.name}
        </h3>

        {/* Valor */}
        <div className="text-lg font-bold mb-3" style={{ color: category.color }}>
          {formatCurrency(category.amount)}
        </div>

        {/* Percentual */}
        <div className="text-xs text-muted-foreground mb-4">
          {category.percentage}% do total
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1 h-8 text-xs"
          >
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRules}
            className="flex-1 h-8 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Regras
          </Button>
        </div>

        {/* Exemplos (se existirem) */}
        {category.examples && category.examples.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Exemplos:</p>
            <div className="flex flex-wrap gap-1">
              {category.examples.slice(0, 2).map((example, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-1 py-0"
                >
                  {example}
                </Badge>
              ))}
              {category.examples.length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{category.examples.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}