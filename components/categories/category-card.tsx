'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Category } from '@/lib/types';
import { Edit, Settings, Check, X, Eye } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
  onEdit: () => void;
  onRules: () => void;
  onUpdate?: (category: Category) => void;
  showViewButton?: boolean;
}

export function CategoryCard({ category, onEdit, onRules, onUpdate, showViewButton = false }: CategoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const handleSave = () => {
    if (onUpdate && editedName.trim() && editedName !== category.name) {
      onUpdate({ ...category, name: editedName.trim() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(category.name);
    setIsEditing(false);
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
        <div className="mb-1">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-sm h-7 px-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleSave}
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleCancel}
              >
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          ) : (
            <h3
              className="font-semibold text-sm line-clamp-2 cursor-text hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
              title="Clique para editar"
            >
              {category.name}
            </h3>
          )}
        </div>

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
          {showViewButton && (
            <Link href={`/categories/${category.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Ver
              </Button>
            </Link>
          )}
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