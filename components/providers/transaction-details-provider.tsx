'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Transaction } from '@/lib/types';
import { TransactionDetailsDialog } from '@/components/dashboard/transaction-details-dialog';
import { useTransactions } from '@/hooks/use-transactions';

interface TransactionDetailsContextType {
    openTransaction: (transaction: Transaction, companyId?: string) => void;
    closeTransaction: () => void;
}

const TransactionDetailsContext = createContext<TransactionDetailsContextType | undefined>(undefined);

export function TransactionDetailsProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [companyId, setCompanyId] = useState<string>('');

    // We use the useTransactions hook here just to get the update function
    // We pass empty filters as we only need the mutation function
    const { updateTransactionCategory } = useTransactions({ page: 1, limit: 1 } as any);

    const openTransaction = useCallback((transaction: Transaction, companyId?: string) => {
        setSelectedTransaction(transaction);
        if (companyId) setCompanyId(companyId);
        setIsOpen(true);
    }, []);

    const closeTransaction = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleCategoryChange = async (transactionId: string, categoryId: string) => {
        if (selectedTransaction) {
            await updateTransactionCategory.mutateAsync({ transactionId, categoryId });
            // Optimistically update the selected transaction to reflect the change immediately in the dialog
            // Note: The main list will update via query invalidation in useTransactions
            setSelectedTransaction(prev => prev ? { ...prev, categoryId } : null);
        }
    };

    return (
        <TransactionDetailsContext.Provider value={{ openTransaction, closeTransaction }}>
            {children}
            <TransactionDetailsDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                transaction={selectedTransaction}
                onCategoryChange={handleCategoryChange}
                companyId={companyId}
            />
        </TransactionDetailsContext.Provider>
    );
}

export function useTransactionDetails() {
    const context = useContext(TransactionDetailsContext);
    if (context === undefined) {
        throw new Error('useTransactionDetails must be used within a TransactionDetailsProvider');
    }
    return context;
}
