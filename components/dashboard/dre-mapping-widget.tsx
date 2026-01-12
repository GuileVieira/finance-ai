'use client';

import { useState, useMemo } from 'react';
import { useCategories, useUpdateCategory } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Filter } from 'lucide-react';
import { CategoryType } from '@/lib/api/categories';
import { toast } from 'sonner';

interface DREMappingWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
    revenue: 'Receitas',
    variable_cost: 'Custos Variáveis',
    fixed_cost: 'Custos Fixos / Despesas',
    non_operating: 'Não Operacional',
    financial_movement: 'Movimentação Financeira (Fora do DRE)',
    FINANCIAL_MOVEMENT: 'Movimentação Financeira (Fora do DRE)'
};

const TYPE_COLORS: Record<string, string> = {
    revenue: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    variable_cost: 'bg-amber-100 text-amber-800 border-amber-200',
    fixed_cost: 'bg-red-100 text-red-800 border-red-200',
    non_operating: 'bg-slate-100 text-slate-800 border-slate-200',
    financial_movement: 'bg-purple-100 text-purple-800 border-purple-200',
    FINANCIAL_MOVEMENT: 'bg-purple-100 text-purple-800 border-purple-200'
};

export function DREMappingWidget({ isOpen, onClose }: DREMappingWidgetProps) {
    const { data: categories, isLoading } = useCategories({
        sortBy: 'name',
        sortOrder: 'asc'
    });

    const updateCategoryMutation = useUpdateCategory();

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const filteredCategories = useMemo(() => {
        if (!categories) return [];
        return categories.filter(cat => {
            const matchesSearch = cat.name.toLowerCase().includes(search.toLowerCase());
            const matchesType = typeFilter === 'all' || cat.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [categories, search, typeFilter]);

    const handleTypeChange = (categoryId: string, newType: string) => {
        updateCategoryMutation.mutate({
            id: categoryId,
            type: newType as CategoryType
        }, {
            onSuccess: () => {
                toast.success('Categoria atualizada com sucesso');
            },
            onError: () => {
                toast.error('Erro ao atualizar categoria');
            }
        });
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl flex flex-col h-full">
                <SheetHeader className="mb-4">
                    <SheetTitle>Customização do Plano de Contas</SheetTitle>
                    <SheetDescription>
                        Configure como suas categorias são mapeadas no DRE (Demonstrativo do Resultado do Exercício).
                    </SheetDescription>
                </SheetHeader>

                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar categorias..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os tipos</SelectItem>
                            <SelectItem value="revenue">Receitas</SelectItem>
                            <SelectItem value="variable_cost">Custos Variáveis</SelectItem>
                            <SelectItem value="fixed_cost">Custos Fixos</SelectItem>
                            <SelectItem value="non_operating">Não Operacional</SelectItem>
                            <SelectItem value="financial_movement">Mov. Financeira</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 overflow-hidden border rounded-md">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
                            <p>Nenhuma categoria encontrada.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="divide-y">
                                {filteredCategories.map((category) => (
                                    <div key={category.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                                                style={{ backgroundColor: category.colorHex + '20', color: category.colorHex }}
                                            >
                                                {category.icon || '📊'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{category.name}</div>
                                                <Badge
                                                    variant="outline"
                                                    className={`mt-1 text-[10px] uppercase font-normal ${TYPE_COLORS[category.type] || 'bg-gray-100 text-gray-800'}`}
                                                >
                                                    {TYPE_LABELS[category.type] || category.type}
                                                </Badge>
                                            </div>
                                        </div>

                                        <Select
                                            value={category.type}
                                            onValueChange={(v) => handleTypeChange(category.id, v)}
                                            disabled={updateCategoryMutation.isPending}
                                        >
                                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent position="popper" align="end">
                                                <SelectItem value="revenue">Receitas</SelectItem>
                                                <SelectItem value="variable_cost">Custos Variáveis</SelectItem>
                                                <SelectItem value="fixed_cost">Custos Fixos / Despesas</SelectItem>
                                                <SelectItem value="non_operating">Não Operacional</SelectItem>
                                                <SelectItem value="financial_movement">Movimentação Financeira</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <div className="mt-4 text-xs text-muted-foreground text-center">
                    Alterações são salvas automaticamente e refletem no DRE em tempo real.
                </div>
            </SheetContent>
        </Sheet>
    );
}
