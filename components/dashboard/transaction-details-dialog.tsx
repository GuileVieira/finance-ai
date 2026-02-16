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
import { ChevronsUpDown, Plus, Trash2, Split, Check } from "lucide-react";
import { Input } from '@/components/ui/input';
import { useTransactions } from '@/hooks/use-transactions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TransactionDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction | null;
    onCategoryChange: (transactionId: string, categoryId: string) => Promise<void>;
    companyId?: string;
}

export function TransactionDetailsDialog({
    open,
    onOpenChange,
    transaction,
    onCategoryChange,
    companyId = ''
}: TransactionDetailsDialogProps) {
    // Debug logging
    console.log("TransactionDetailsDialog Render:", { open, transactionId: transaction?.id });

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

    const { categoryOptions } = useAllCategories(companyId);
    const { updateTransactionSplits } = useTransactions({ companyId });
    
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
    const [isUpdating, setIsUpdating] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);
    
    // Split State
    const [showSplitEditor, setShowSplitEditor] = useState(false);
    const [splits, setSplits] = useState<any[]>([]);
    const [isLoadingSplits, setIsLoadingSplits] = useState(false);

    useEffect(() => {
        if (activeTransaction && activeTransaction.id !== 'debug') {
            setSelectedCategoryId(activeTransaction.categoryId || undefined);
            
            // Reset split state
            setShowSplitEditor(false);
            setSplits([]);
            
            // Fetch existing splits
            if (open) {
                fetchSplits(activeTransaction.id);
            }
        }
        if (!open) {
            setOpenCombobox(false);
        }
    }, [activeTransaction.id, open]);

    const fetchSplits = async (txId: string) => {
        try {
            setIsLoadingSplits(true);
            const response = await fetch(`/api/transactions/${txId}/splits`);
            const result = await response.json();
            if (result.success && result.data.length > 0) {
                setSplits(result.data.map((s: any) => ({
                    ...s,
                    amount: Math.abs(Number(s.amount))
                })));
                setShowSplitEditor(true);
            }
        } catch (error) {
            console.error('Failed to fetch splits:', error);
        } finally {
            setIsLoadingSplits(false);
        }
    };

    const handleSave = async () => {
        if (!activeTransaction) return;

        try {
            setIsUpdating(true);
            
            if (showSplitEditor) {
                // Validar soma dos splits
                const totalSplits = splits.reduce((sum, s) => sum + Number(s.amount), 0);
                const txAmount = Math.abs(Number(activeTransaction.amount));
                
                // Pequena margem de erro para floats
                if (Math.abs(totalSplits - txAmount) > 0.01) {
                    toast.error(`A soma dos desmembramentos (R$ ${totalSplits.toFixed(2)}) deve ser igual ao valor total da transação (R$ ${txAmount.toFixed(2)})`);
                    setIsUpdating(false);
                    return;
                }

                // Salvar splits
                await updateTransactionSplits.mutateAsync({
                    transactionId: activeTransaction.id,
                    splits: splits.map(s => ({
                        categoryId: s.categoryId,
                        amount: activeTransaction.amount < 0 ? -Math.abs(s.amount) : Math.abs(s.amount),
                        description: s.description || activeTransaction.description
                    }))
                });
                
                toast.success('Transação desmembrada com sucesso');
            } else {
                if (!selectedCategoryId) return;
                await onCategoryChange(activeTransaction.id, selectedCategoryId);
                toast.success('Categoria atualizada com sucesso');
            }
            
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to update transaction', error);
            toast.error('Erro ao atualizar transação');
        } finally {
            setIsUpdating(false);
        }
    };

    const addSplit = () => {
        const currentTotal = splits.reduce((sum, s) => sum + Number(s.amount), 0);
        const txAmount = Math.abs(Number(activeTransaction.amount));
        const remaining = Math.max(0, txAmount - currentTotal);
        
        setSplits([...splits, {
            id: crypto.randomUUID(),
            categoryId: activeTransaction.categoryId || (categoryOptions[0]?.value),
            amount: remaining,
            description: ''
        }]);
    };

    const removeSplit = (id: string) => {
        setSplits(splits.filter(s => s.id !== id));
    };

    const updateSplit = (id: string, field: string, value: any) => {
        setSplits(splits.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const currentCategoryName = categoryOptions.find((c: { value: string; label: string }) => c.value === selectedCategoryId)?.label ||
        activeTransaction.categoryName ||
        (activeTransaction as any).category ||
        'Sem categoria';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>📝 Detalhes da Transação</span>
                        {splits.length > 0 && <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-500 border-blue-500/20">Desmembrada</Badge>}
                    </DialogTitle>
                    <DialogDescription>
                        Visualize e edite os detalhes desta transação. Use o desmembramento para dividir em múltiplas categorias.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    {/* Left Column: Transaction Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Informações da Transação</h3>

                        <div className="grid grid-cols-1 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                            <div>
                                <Label className="text-xs text-muted-foreground">Data</Label>
                                <div className="font-medium">
                                    {format(new Date(activeTransaction.transactionDate), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Nome / Estabelecimento</Label>
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
                                <Label className="text-xs text-muted-foreground">Conta / Banco</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="bg-background">{activeTransaction.bankName || activeTransaction.account?.name || 'Banco Desconhecido'}</Badge>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Valor Total</Label>
                            <div className={cn(
                                "text-3xl font-bold mt-1",
                                activeTransaction.amount >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                                {activeTransaction.amount >= 0 ? '+' : ''}
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(activeTransaction.amount))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Values and Category / Splits */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                {showSplitEditor ? 'Desmembramento' : 'Categorização'}
                            </h3>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={cn(
                                    "h-8 gap-1.5 text-xs",
                                    showSplitEditor ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                )}
                                onClick={() => {
                                    if (!showSplitEditor && splits.length === 0) {
                                        // Inicializar com a categoria atual se for novo split
                                        setSplits([{
                                            id: crypto.randomUUID(),
                                            categoryId: selectedCategoryId || '',
                                            amount: Math.abs(activeTransaction.amount),
                                            description: activeTransaction.description
                                        }]);
                                    }
                                    setShowSplitEditor(!showSplitEditor);
                                }}
                            >
                                {showSplitEditor ? (
                                    <> <Trash2 className="w-3.5 h-3.5" /> Cancelar Divisão</>
                                ) : (
                                    <> <Split className="w-3.5 h-3.5" /> Desmembrar Transação</>
                                )}
                            </Button>
                        </div>

                        {!showSplitEditor ? (
                            <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Categoria Atual</Label>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                            {currentCategoryName}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Alterar para:</Label>
                                    <Popover open={openCombobox} onOpenChange={setOpenCombobox} modal={true}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCombobox}
                                                className="w-full justify-between bg-background"
                                            >
                                                {categoryOptions.find((category: { value: string; label: string }) => category.value === selectedCategoryId)?.label || "Selecione uma categoria..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0 z-[200]">
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
                                                                <Check className={cn("mr-2 h-4 w-4", selectedCategoryId === category.value ? "opacity-100" : "opacity-0")} />
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
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    {splits.map((split, index) => (
                                        <div key={split.id} className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 relative group">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex-1">
                                                    <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Categoria do Item {index + 1}</Label>
                                                    <Select 
                                                        value={split.categoryId} 
                                                        onValueChange={(val) => updateSplit(split.id, 'categoryId', val)}
                                                    >
                                                        <SelectTrigger className="h-9 bg-background">
                                                            <SelectValue placeholder="Selecione..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categoryOptions.map((cat: any) => (
                                                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-[120px]">
                                                    <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Valor</Label>
                                                    <Input 
                                                        type="number" 
                                                        className="h-9 bg-background"
                                                        value={split.amount}
                                                        onChange={(e) => updateSplit(split.id, 'amount', e.target.value)}
                                                    />
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 mt-5 text-muted-foreground hover:text-red-500"
                                                    onClick={() => removeSplit(split.id)}
                                                    disabled={splits.length <= 1}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Descrição (Opcional)</Label>
                                                <Input 
                                                    className="h-8 text-xs bg-background"
                                                    placeholder="Ex: Almoço Cliente X"
                                                    value={split.description}
                                                    onChange={(e) => updateSplit(split.id, 'description', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <Button 
                                    variant="outline" 
                                    className="w-full border-dashed border-2 h-12 gap-2 text-muted-foreground hover:text-primary hover:border-primary/50"
                                    onClick={addSplit}
                                >
                                    <Plus className="w-4 h-4" /> Adicionar Outro Item
                                </Button>

                                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 flex justify-between items-center">
                                    <span className="text-xs font-medium text-blue-600">Total Desmembrado:</span>
                                    <span className={cn(
                                        "text-sm font-bold",
                                        Math.abs(splits.reduce((sum, s) => sum + Number(s.amount), 0) - Math.abs(activeTransaction.amount)) < 0.01 
                                            ? "text-emerald-600" 
                                            : "text-red-600"
                                    )}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(splits.reduce((sum, s) => sum + Number(s.amount), 0))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="sm:justify-end gap-2 border-t pt-4 mt-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isUpdating || (!showSplitEditor && selectedCategoryId === activeTransaction.categoryId)}>
                        {isUpdating ? 'Salvando...' : 'Confirmar e Salvar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
