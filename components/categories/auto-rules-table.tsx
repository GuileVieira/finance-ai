'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AutoRule } from '@/lib/types';
import { Play, Pause, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoRulesTableProps {
  rules: AutoRule[];
}

export function AutoRulesTable({ rules }: AutoRulesTableProps) {
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 100) return 'bg-success/10 text-success border-success/20';
    if (accuracy >= 95) return 'bg-primary/10 text-primary border-primary/20';
    if (accuracy >= 90) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-danger/10 text-danger border-danger/20';
  };

  
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Padrão Real</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Acerto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {rule.category}
                </TableCell>
                <TableCell>
                  <code className="px-2 py-1 bg-muted rounded text-sm">
                    {rule.pattern}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant={rule.type === 'exact' ? 'default' : 'secondary'}>
                    {rule.type === 'exact' ? 'Exato' : 'Contém'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-full max-w-[60px] bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${rule.accuracy}%`,
                          backgroundColor: rule.accuracy >= 95 ? 'hsl(var(--success))' : rule.accuracy >= 90 ? 'hsl(var(--warning))' : 'hsl(var(--danger))'
                        }}
                      />
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getAccuracyColor(rule.accuracy))}
                    >
                      {rule.accuracy}%
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        rule.status === 'active' ? 'bg-success' : 'bg-muted-foreground'
                      )}
                    />
                    <span className="text-sm">
                      {rule.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => console.log('Toggle rule:', rule.id)}
                    >
                      {rule.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => console.log('Edit rule:', rule.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => console.log('Delete rule:', rule.id)}
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
          <span>Ativas: {rules.filter(r => r.status === 'active').length}</span>
          <span>Acurácia média: {Math.round(rules.reduce((acc, r) => acc + r.accuracy, 0) / rules.length)}%</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs">≥ 95%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs">90-94%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger" />
            <span className="text-xs">&lt; 90%</span>
          </div>
        </div>
      </div>
    </div>
  );
}