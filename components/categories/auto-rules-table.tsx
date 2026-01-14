'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Play, Pause, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

// Interface baseada no schema real da tabela
interface CategoryRule {
  id: string;
  rulePattern: string;
  ruleType: string;
  categoryId: string;
  categoryName: string;
  companyId?: string;
  confidenceScore: string;
  active: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AutoRulesTableProps {
  rules: CategoryRule[];
  onToggle?: (id: string, active: boolean) => void;
  onEdit?: (rule: CategoryRule) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function AutoRulesTable({
  rules,
  onToggle,
  onEdit,
  onDelete,
  loading = false
}: AutoRulesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  const getConfidenceColor = (confidenceScore: string) => {
    const confidence = parseFloat(confidenceScore);
    if (confidence >= 0.9) return 'bg-success/10 text-success border-success/20';
    if (confidence >= 0.7) return 'bg-primary/10 text-primary border-primary/20';
    if (confidence >= 0.5) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-muted/10 text-muted-foreground border-muted/20';
  };

  const getRuleTypeLabel = (ruleType: string) => {
    switch (ruleType) {
      case 'exact': return 'Exato';
      case 'contains': return 'Contém';
      case 'regex': return 'Expressão Regular';
      default: return ruleType;
    }
  };

  
  const ruleToDelete = rules.find(r => r.id === deleteDialogOpen);

  return (
    <div className="space-y-4">
      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteDialogOpen} onOpenChange={() => setDeleteDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Regra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a regra de categorização{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-sm">{ruleToDelete?.rulePattern}</code>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialogOpen) {
                  onDelete?.(deleteDialogOpen);
                  setDeleteDialogOpen(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Padrão</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id} className="hover:bg-muted/50">
                <TableCell>
                  <code className="px-2 py-1 bg-muted rounded text-sm break-all">
                    {rule.rulePattern}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {getRuleTypeLabel(rule.ruleType)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="font-medium">{rule.categoryName}</div>
                    <code className="text-xs text-muted-foreground">
                      {rule.categoryId.slice(0, 8)}...
                    </code>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', getConfidenceColor(rule.confidenceScore))}
                  >
                    {Math.round(parseFloat(rule.confidenceScore) * 100)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {rule.usageCount}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        rule.active ? 'bg-success' : 'bg-muted-foreground'
                      )}
                    />
                    <span className="text-sm">
                      {rule.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onToggle?.(rule.id, !rule.active)}
                      disabled={loading}
                      aria-label={rule.active ? `Desativar regra ${rule.rulePattern}` : `Ativar regra ${rule.rulePattern}`}
                    >
                      {rule.active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onEdit?.(rule)}
                      disabled={loading}
                      aria-label={`Editar regra ${rule.rulePattern}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteDialogOpen(rule.id)}
                      disabled={loading}
                      aria-label={`Excluir regra ${rule.rulePattern}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Resumo das regras */}
      <div className="flex items-center justify-between text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-6">
          <span>Total: {rules.length} regras</span>
          <span>Ativas: {rules.filter(r => r.active).length}</span>
          <span>Confiança média: {rules.length > 0 ? Math.round(rules.reduce((acc, r) => acc + parseFloat(r.confidenceScore), 0) / rules.length * 100) : 0}%</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs">Alta (≥90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs">Média (70-89%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs">Baixa (50-69%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}