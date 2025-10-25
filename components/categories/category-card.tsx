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
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: CategoryWithStats;
  onEdit?: (category: CategoryWithStats) => void;
  onRules?: () => void;
  onUpdate?: (category: CategoryWithStats) => void;
  onToggle?: (active: boolean) => void;
  onDelete?: () => void;
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
  const handleNameDoubleClick = () => {
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
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleSave}
                title="Salvar alterações"
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleCancel}
                title="Cancelar alterações"
              >
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          ) : (
            <h3
              className="font-semibold text-sm line-clamp-2 cursor-text hover:text-primary transition-colors"
              onClick={handleNameDoubleClick}
              title="Duplo-clique para editar"
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
        <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {showEditButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-7 px-2 text-xs flex-shrink-0"
              disabled={loading}
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRules}
            className="h-7 px-2 text-xs flex-shrink-0"
            disabled={loading}
          >
            <Settings className="h-3 w-3 mr-1" />
            Regras
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className="h-7 px-2 text-xs flex-shrink-0"
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
              className="h-7 px-2 text-xs text-destructive hover:text-destructive flex-shrink-0"
              disabled={loading}
              title="Excluir categoria"
            >
              <Trash2 className="h-3 w-3 mr-1" />
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