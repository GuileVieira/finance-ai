'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useTransactions } from "@/hooks/use-transactions";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { memo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllCategories } from "@/hooks/use-all-categories";
// useTransactions already imported above

interface TransactionListSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    filters: any; // Using any for simplicity as filters might vary
}

interface ExtendedTransaction {
    id: string;
    description: string;
    transactionDate: string;
    amount: number;
    type: 'credit' | 'debit' | 'income' | 'expense';
    category?: {
        name: string;
        colorHex?: string;
    };
    categoryName?: string; // Compatibility with flat structure
    categoryColor?: string; // Compatibility with flat structure
}

export const TransactionListSheet = memo(function TransactionListSheet({
    isOpen,
    onClose,
    title,
    filters
}: TransactionListSheetProps) {
    const { transactions, isLoading, updateTransactionCategory } = useTransactions({
        ...filters,
        page: 1,
        limit: 50 // Limit to 50 for quick view
    });

    const { categoryOptions } = useAllCategories(filters.companyId || '');

    // Estado local para controle de popover por transação
    // key: transactionId, value: boolean
    const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

    const toggleOpen = (id: string, isOpen: boolean) => {
        setOpenStates(prev => ({ ...prev, [id]: isOpen }));
    };

    const handleCategorySelect = async (transactionId: string, categoryId: string) => {
        try {
            await updateTransactionCategory.mutateAsync({ transactionId, categoryId });
            toggleOpen(transactionId, false);
        } catch (error) {
            console.error("Erro ao atualizar categoria", error);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl flex flex-col h-full">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>
                        Visualizando as últimas 50 transações.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 flex-1 overflow-hidden">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !transactions || transactions.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                            <p>Nenhuma transação encontrada.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {(transactions as unknown as ExtendedTransaction[]).map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex flex-col gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="grid gap-0.5">
                                                <span className="font-medium text-foreground">
                                                    {transaction.description}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(transaction.transactionDate), "d 'de' MMMM, yyyy", {
                                                        locale: ptBR,
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span
                                                    className={`font-medium ${transaction.type === "credit"
                                                        ? "text-emerald-600"
                                                        : "text-red-600"
                                                        }`}
                                                >
                                                    {transaction.type === "credit" ? "+" : "-"}
                                                    {new Intl.NumberFormat("pt-BR", {
                                                        style: "currency",
                                                        currency: "BRL",
                                                    }).format(Number(transaction.amount))}
                                                </span>
                                                <Popover
                                                    open={openStates[transaction.id] || false}
                                                    onOpenChange={(open) => toggleOpen(transaction.id, open)}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={openStates[transaction.id] || false}
                                                            className="text-[10px] h-6 px-2 justify-between"
                                                            style={
                                                                (transaction.category?.name || transaction.categoryName) ? {
                                                                    borderColor: transaction.category?.colorHex || transaction.categoryColor || undefined,
                                                                    color: transaction.category?.colorHex || transaction.categoryColor || undefined
                                                                } : {}
                                                            }
                                                        >
                                                            {transaction.category?.name || transaction.categoryName || "Sem categoria"}
                                                            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[200px] p-0" align="end">
                                                        <Command>
                                                            <CommandInput placeholder="Buscar categoria..." />
                                                            <CommandList>
                                                                <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {categoryOptions.map((category: any) => (
                                                                        <CommandItem
                                                                            key={category.value}
                                                                            value={category.name} // Usar label/nome para busca
                                                                            onSelect={() => handleCategorySelect(transaction.id, category.value)}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    (transaction.category?.name || transaction.categoryName) === category.label
                                                                                        ? "opacity-100"
                                                                                        : "opacity-0"
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
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
});
