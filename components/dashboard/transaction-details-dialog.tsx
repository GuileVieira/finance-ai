'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction } from '@/lib/types';
import { useAllCategories } from '@/hooks/use-all-categories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";

interface TransactionDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction | null;
    onCategoryChange: (transactionId: string, categoryId: string) => Promise<void>;
}

export function TransactionDetailsDialog({
    open,
    onOpenChange,
    transaction,
    onCategoryChange
}: TransactionDetailsDialogProps) {
    // Debug logging
    console.log("TransactionDetailsDialog Render:", { open, transactionId: transaction?.id });

    // Ensure we have a transaction object or use a safe fallback for debugging if needed
    // In production, transaction should always be present when open is true
    const activeTransaction = transaction || {
        id: 'debug',
        description: 'Debug Transaction',
        amount: 0,
        transactionDate: new Date().toISOString(),
        categoryId: '',
        name: '',
        memo: '',
        bankName: '',
        account: { name: '' },
        categoryName: ''
    } as Transaction;

    const { categoryOptions } = useAllCategories('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
    const [isUpdating, setIsUpdating] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        if (activeTransaction) {
            setSelectedCategoryId(activeTransaction.categoryId || undefined);
        }
    }, [activeTransaction]);

    const handleSave = async () => {
        if (!activeTransaction || !selectedCategoryId) return;

        try {
            setIsUpdating(true);
            await onCategoryChange(activeTransaction.id, selectedCategoryId);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to update category', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const currentCategoryName = categoryOptions.find((c: { value: string; label: string }) => c.value === selectedCategoryId)?.label ||
        activeTransaction.categoryName ||
        (activeTransaction as any).category ||
        'Sem categoria';

    // Only render if open. Note: Radix Dialog handles open state, but if transaction is null, we might want to return null?
    // We are using activeTransaction now, so it will render the default if null.
    // However, if open is false, we can just let Radix handle it.

    // If we want to strictly force render for debug even if transaction provided is null:
    // if (!transaction && open) { console.warn("TransactionDetailsDialog open but no transaction!"); }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] z-[100]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>📝 Detalhes da Transação</span>
                    </DialogTitle>
                    <DialogDescription>
                        Visualize e edite os detalhes desta transação.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    {/* Left Column: Transaction Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Informações da Transação</h3>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label className="text-xs text-muted-foreground">Data</Label>
                                <div className="font-medium">
                                    {format(new Date(activeTransaction.transactionDate), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Nome</Label>
                                <div className="font-medium">{activeTransaction.name || '-'}</div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Descrição</Label>
                                <div className="text-sm break-words">{activeTransaction.description}</div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Memo</Label>
                                <div className="text-sm text-muted-foreground break-words">{activeTransaction.memo || '-'}</div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Banco</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline">{activeTransaction.bankName || activeTransaction.account?.name || 'Banco Desconhecido'}</Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Values and Category */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-medium text-muted-foreground">Valores e Categoria</h3>

                        <div>
                            <Label className="text-xs text-muted-foreground">Valor</Label>
                            <div className={cn(
                                "text-2xl font-bold mt-1",
                                activeTransaction.amount >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                                {activeTransaction.amount >= 0 ? '+' : ''}
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(activeTransaction.amount))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Categoria Atual</Label>
                            <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
                                {currentCategoryName}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Alterar categoria:</Label>
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCombobox}
                                        className="w-full justify-between"
                                    >
                                        {categoryOptions.find((category: { value: string; label: string }) => category.value === selectedCategoryId)?.label || "Selecione uma categoria..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar categoria..." />
                                        <CommandList>
                                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                            <CommandGroup>
                                                {categoryOptions.map((category: { value: string; label: string }) => (
                                                    <CommandItem
                                                        key={category.value}
                                                        value={category.label}
                                                        onSelect={() => {
                                                            setSelectedCategoryId(category.value);
                                                            setOpenCombobox(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedCategoryId === category.value ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {category.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isUpdating || selectedCategoryId === activeTransaction.categoryId}>
                        {isUpdating ? 'Salvando...' : 'Aplicar Alteração'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
