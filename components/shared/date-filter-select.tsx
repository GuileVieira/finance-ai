'use client';

import * as React from 'react';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface DateFilterSelectProps {
    value: string;
    onChange: (value: string) => void;
    periods?: string[]; // Lista de períodos disponíveis no formato YYYY-MM
    isLoading?: boolean;
}

export function DateFilterSelect({
    value,
    onChange,
    periods = [],
    isLoading = false,
}: DateFilterSelectProps) {

    // Função para formatar o label do período mensal (YYYY-MM -> NomeDoMês Ano)
    const formatPeriodLabel = (period: string) => {
        if (!period) return '';
        const [year, month] = period.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    return (
        <Select value={value} onValueChange={onChange} disabled={isLoading}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="custom">Personalizado</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>

                <SelectGroup>
                    <SelectLabel>Períodos Rápidos</SelectLabel>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="this_month">Este Mês</SelectItem>
                    <SelectItem value="last_month">Mês Passado</SelectItem>
                    <SelectItem value="this_year">Este Ano</SelectItem>
                    <SelectItem value="last_year">Ano Passado</SelectItem>
                </SelectGroup>

                <SelectGroup>
                    <SelectLabel>Últimos Dias</SelectLabel>
                    <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                    <SelectItem value="last_15_days">Últimos 15 dias</SelectItem>
                    <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                    <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
                    <SelectItem value="last_180_days">Últimos 6 meses</SelectItem>
                </SelectGroup>

                {periods.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>Mensal</SelectLabel>
                        {periods.map((period) => (
                            <SelectItem key={period} value={period}>
                                {formatPeriodLabel(period)}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}


            </SelectContent>
        </Select>
    );
}
