'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { CategoryWithStats } from '@/lib/api/categories';
import { Edit, Settings, Check, X, Eye, Trash2, Power, PowerOff } from 'lucide-react';

interface CategoryCardProps {
  category: CategoryWithStats;
  onEdit: () => void;
  onRules: () => void;
  onUpdate?: (category: CategoryWithStats) => void;
  onToggle?: (active: boolean) => void;
  onDelete?: () => void;
  showViewButton?: boolean;
  loading?: boolean;
}

export function CategoryCard({
  category,
  onEdit,
  onRules,
  onUpdate,
  onToggle,
  onDelete,
  showViewButton = false,
  loading = false
}: CategoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!category.active);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setDeleteDialogOpen(false);
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${!category.active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        {/* Header com cor e ícone */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.colorHex }}
            />
            <div className="flex items-center gap-1">
              {category.icon && (
                <span className="text-lg">{category.icon}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Badge de status */}
            <Badge
              variant={category.active ? "default" : "secondary"}
              className="text-xs"
            >
              {category.active ? 'Ativo' : 'Inativo'}
            </Badge>
            {/* Badge de transações */}
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                backgroundColor: `${category.colorHex}20`,
                color: category.colorHex,
                borderColor: category.colorHex
              }}
            >
              {category.transactionCount} transações
            </Badge>
          </div>
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
        <div className="text-lg font-bold mb-3" style={{ color: category.colorHex }}>
          {formatCurrency(category.totalAmount)}
        </div>

        {/* Percentual */}
        <div className="text-xs text-muted-foreground mb-4">
          {category.percentage.toFixed(1)}% do total
        </div>

        {/* Média por transação */}
        {category.transactionCount > 0 && (
          <div className="text-xs text-muted-foreground mb-4">
            Média: {formatCurrency(category.averageAmount)}
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {showViewButton && (
            <Link href={`/categories/${category.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                disabled={loading}
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
            disabled={loading}
          >
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRules}
            className="flex-1 h-8 text-xs"
            disabled={loading}
          >
            <Settings className="h-3 w-3 mr-1" />
            Regras
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className="flex-1 h-8 text-xs"
            disabled={loading}
            title={category.active ? 'Desativar categoria' : 'Ativar categoria'}
          >
            {category.active ? (
              <PowerOff className="h-3 w-3 mr-1" />
            ) : (
              <Power className="h-3 w-3 mr-1" />
            )}
            {category.active ? 'Inativar' : 'Ativar'}
          </Button>
          {!category.isSystem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="flex-1 h-8 text-xs text-destructive hover:text-destructive"
              disabled={loading}
              title="Excluir categoria"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Excluir
            </Button>
          )}
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

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{category.name}"?
              {category.transactionCount > 0 && (
                <>
                  <br /><br />
                  <strong>Atenção:</strong> Esta categoria possui {category.transactionCount} transações associadas.
                  A categoria será desativada em vez de excluída para manter o histórico.
                </>
              )}
              {category.transactionCount === 0 && (
                <>
                  <br /><br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}