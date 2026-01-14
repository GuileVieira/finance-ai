'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateFilterSelect } from '@/components/shared/date-filter-select';
import { RefreshCw } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useAccountsForSelect } from '@/hooks/use-accounts';
import { useCompaniesForSelect } from '@/hooks/use-companies';
import { ReactNode } from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface FilterBarProps {
    // Estado dos filtros
    period: string;
    accountId: string;
    companyId: string;
    dateRange?: DateRange;

    // Handlers
    onPeriodChange: (value: string) => void;
    onAccountChange: (value: string) => void;
    onCompanyChange: (value: string) => void;
    onDateRangeChange: (range: DateRange | undefined) => void;
    onRefresh: () => void;

    // Loading states
    isLoading?: boolean;
    isRefetching?: boolean;

    // Custom children (botões extras)
    children?: ReactNode;
}

export function FilterBar({
    period,
    accountId,
    companyId,
    dateRange,
    onPeriodChange,
    onAccountChange,
    onCompanyChange,
    onDateRangeChange,
    onRefresh,
    isLoading = false,
    isRefetching = false,
    children
}: FilterBarProps) {
    // Buscar dados para os selects
    const { companyOptions, isLoading: isLoadingCompanies } = useCompaniesForSelect();
    const { accountOptions, isLoading: isLoadingAccounts } = useAccountsForSelect(companyId);

    return (
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                {/* Filtro de Período */}
                <DateFilterSelect
                    value={period}
                    onChange={onPeriodChange}
                />

                {/* Date Picker Customizado */}
                {period === 'custom' && (
                    <DatePickerWithRange
                        date={dateRange}
                        onDateChange={onDateRangeChange}
                        className="w-full sm:w-auto"
                    />
                )}

                {/* Filtro de Empresa */}
                <div className="space-y-1">
                    <Label htmlFor="company-select" className="sr-only">Empresa</Label>
                    <Select value={companyId} onValueChange={onCompanyChange} disabled={isLoadingCompanies}>
                        <SelectTrigger id="company-select" className="w-full sm:w-[220px]">
                            <SelectValue placeholder={isLoadingCompanies ? "Carregando..." : "Selecione uma empresa"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as empresas</SelectItem>
                            {isLoadingCompanies ? (
                                <div className="p-2 text-sm text-muted-foreground">Carregando...</div>
                            ) : (
                                companyOptions.map((option: SelectOption) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtro de Conta */}
                <div className="space-y-1">
                    <Label htmlFor="account-select" className="sr-only">Conta</Label>
                    <Select value={accountId} onValueChange={onAccountChange} disabled={isLoadingAccounts}>
                        <SelectTrigger id="account-select" className="w-full sm:w-[220px]">
                            <SelectValue placeholder={isLoadingAccounts ? "Carregando..." : "Selecione uma conta"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as contas</SelectItem>
                            {isLoadingAccounts ? (
                                <div className="p-2 text-sm text-muted-foreground">Carregando...</div>
                            ) : (
                                accountOptions.map((option: SelectOption) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Ações (Botões extras + Refresh) */}
            <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                {children}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isLoading || isRefetching}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>
        </div>
    );
}
