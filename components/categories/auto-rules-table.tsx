'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryRule } from '@/lib/api/categories';
import { Play, Pause, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoRulesTableProps {
  rules: CategoryRule[];
  onToggle?: (id: string, isActive: boolean) => void;
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

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-success/10 text-success border-success/20';
    if (priority >= 5) return 'bg-primary/10 text-primary border-primary/20';
    if (priority >= 3) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-muted/10 text-muted-foreground border-muted/20';
  };

  
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead>ID Categoria</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    {rule.description && (
                      <div className="text-sm text-muted-foreground">{rule.description}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="px-2 py-1 bg-muted rounded text-sm">
                    {rule.pattern}
                  </code>
                </TableCell>
                <TableCell>
                  <code className="text-xs text-muted-foreground">
                    {rule.categoryId.slice(0, 8)}...
                  </code>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', getPriorityColor(rule.priority))}
                  >
                    Prioridade {rule.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        rule.isActive ? 'bg-success' : 'bg-muted-foreground'
                      )}
                    />
                    <span className="text-sm">
                      {rule.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onToggle?.(rule.id, !rule.isActive)}
                      disabled={loading}
                      title={rule.isActive ? 'Desativar regra' : 'Ativar regra'}
                    >
                      {rule.isActive ? (
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
                      title="Editar regra"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDelete?.(rule.id)}
                      disabled={loading}
                      title="Excluir regra"
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
          <span>Ativas: {rules.filter(r => r.isActive).length}</span>
          <span>Prioridade média: {rules.length > 0 ? Math.round(rules.reduce((acc, r) => acc + r.priority, 0) / rules.length) : 0}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs">Alta (≥8)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs">Média (5-7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs">Baixa (3-4)</span>
          </div>
        </div>
      </div>
    </div>
  );
}