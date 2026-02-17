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
import { useToast } from '@/hooks/use-toast';
import { cn, formatCurrencyCompact } from '@/lib/utils';

interface CategoryCardProps {
  category: CategoryWithStats;
  onEdit?: (category: CategoryWithStats) => void;
  onRules?: () => void;
  onUpdate?: (category: CategoryWithStats) => void;
  onToggle?: (active: boolean) => void;
  onDelete?: () => void;
  onView?: () => void;
  showViewButton?: boolean;
  showEditButton?: boolean; // Novo prop opcional
  loading?: boolean;
}

export function CategoryCard({
  category,
  onEdit,
  onRules,
  onUpdate,
  onToggle,
  onDelete,
  onView,
  showViewButton = false,
  showEditButton = true, // Por padrão mostra botão editar
  loading = false
}: CategoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Darken pastel hex colors for better text contrast on white backgrounds
  const darkenColor = (hex: string | null | undefined, amount = 0.25): string => {
    if (!hex) return 'currentColor';
    const clean = hex.replace('#', '');
    const r = Math.max(0, Math.round(parseInt(clean.substring(0, 2), 16) * (1 - amount)));
    const g = Math.max(0, Math.round(parseInt(clean.substring(2, 4), 16) * (1 - amount)));
    const b = Math.max(0, Math.round(parseInt(clean.substring(4, 6), 16) * (1 - amount)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (editedName.trim() && editedName !== category.name) {
      onUpdate?.({ ...category, name: editedName.trim() });
      toast({
        title: 'Categoria Atualizada',
        description: `Nome alterado de "${category.name}" para "${editedName.trim()}"`,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(category.name);
    setIsEditing(false);
  };

  // Função para editar inline
  const handleNameDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showEditButton !== false) {
      setIsEditing(true);
    }
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

  const handleCardClick = (e: React.MouseEvent) => {
    if (!onView || isEditing) return;

    const target = e.target as HTMLElement;
    // Ignora cliques em botões, inputs ou elementos interativos
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }

    onView();
  };

  return (
    <Card
      className={`group transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 ${!category.active ? 'opacity-60' : ''} ${onView ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-5">
        {/* Header com cor e ícone */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background"
              style={{ backgroundColor: category.colorHex, boxShadow: `0 0 8px ${category.colorHex}40`, '--tw-ring-color': `${category.colorHex}30` } as React.CSSProperties}
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
              className="text-[10px] px-2 py-0.5 font-medium"
            >
              {category.active ? 'Ativo' : 'Inativo'}
            </Badge>
            {/* Badge de transações */}
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 font-medium"
              style={{
                backgroundColor: `${category.colorHex}10`,
                color: category.colorHex,
                borderColor: `${category.colorHex}30`
              }}
            >
              {category.transactionCount} transações
            </Badge>
          </div>
        </div>

        {/* Nome da categoria */}
        <div className="mb-1">
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-sm h-7 px-2 flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                onBlur={handleSave} // Salva automaticamente ao perder foco
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleSave}
                title="Salvar alterações"
              >
                <Check className="h-3 w-3 text-success" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleCancel}
                title="Cancelar alterações"
              >
                <X className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ) : (
            <h3
              className="font-semibold text-sm line-clamp-2 cursor-text hover:text-primary transition-colors duration-200 capitalize"
              onClick={handleNameDoubleClick}
              title="Clique para editar"
            >
              {category.name}
            </h3>
          )}
        </div>

        {/* Grupo da categoria (categoryGroup) */}
        {category.categoryGroup && (
          <div className="mb-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {category.categoryGroup}
            </span>
          </div>
        )}

        {/* Valor */}
        <div className="text-xl font-bold mb-2 cursor-help tracking-tight" style={{ color: darkenColor(category.colorHex) }} title={formatCurrency(category.totalAmount)}>
          {formatCurrencyCompact(category.totalAmount)}
        </div>

        {/* Percentual */}
        <div className="text-xs text-muted-foreground/70 mb-3">
          {category.percentage.toFixed(1)}% do total
        </div>

        {/* Média por transação */}
        {category.transactionCount > 0 && (
          <div className="text-xs text-muted-foreground/70 mb-3">
            Média: {formatCurrency(category.averageAmount)}
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 pt-1 border-t border-border/30">
          {showViewButton && onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="h-7 px-2.5 text-xs flex-shrink-0 rounded-lg"
              disabled={loading}
            >
              <Eye className="h-3 w-3 mr-1" strokeWidth={1.5} />
              Ver
            </Button>
          )}
          {showEditButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(category)}
              className="h-7 px-2.5 text-xs flex-shrink-0 rounded-lg"
              disabled={loading}
            >
              <Edit className="h-3 w-3 mr-1" strokeWidth={1.5} />
              Editar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRules}
            className="h-7 px-2.5 text-xs flex-shrink-0 rounded-lg"
            disabled={loading}
          >
            <Settings className="h-3 w-3 mr-1" strokeWidth={1.5} />
            Regras
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className="h-7 px-2.5 text-xs flex-shrink-0 rounded-lg"
            disabled={loading}
            title={category.active ? 'Desativar categoria' : 'Ativar categoria'}
          >
            {category.active ? (
              <PowerOff className="h-3 w-3 mr-1" strokeWidth={1.5} />
            ) : (
              <Power className="h-3 w-3 mr-1" strokeWidth={1.5} />
            )}
            {category.active ? 'Inativar' : 'Ativar'}
          </Button>
          {!category.isSystem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-7 px-2.5 text-xs text-destructive/70 hover:text-destructive flex-shrink-0 rounded-lg"
              disabled={loading}
              title="Excluir categoria"
            >
              <Trash2 className="h-3 w-3 mr-1" strokeWidth={1.5} />
              Excluir
            </Button>
          )}
        </div>
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
