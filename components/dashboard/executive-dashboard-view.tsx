"use client";

import { useQuery } from "@tanstack/react-query";
import { ExecutiveDashboardData } from "@/lib/services/executive-dashboard.service";
import { DashboardFilters } from "@/lib/api/dashboard";
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { RealVsProjectedChart } from "./real-vs-projected-chart";

interface ExecutiveDashboardViewProps {
    filters: DashboardFilters;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export function ExecutiveDashboardView({ filters }: ExecutiveDashboardViewProps) {
    // Chamada para o novo serviço (via query)
    const { data, isLoading } = useQuery<ExecutiveDashboardData>({
        queryKey: ['executive-dashboard', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.companyId) params.append('companyId', filters.companyId);
            if (filters.period) params.append('period', filters.period);
            if (filters.accountId) params.append('accountId', filters.accountId);

            const response = await fetch(`/api/dashboard/v2?${params.toString()}`);
            const result = await response.json();
            return result.data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Carregando visão executiva...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg border-dashed">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-destructive font-medium">Erro ao carregar dados executivos</p>
                <p className="text-xs text-muted-foreground mt-1">Verifique sua conexão ou tente novamente mais tarde.</p>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Saldo Inicial"
                    value={data.summary.initialBalance}
                    icon={<Wallet className="h-4 w-4" />}
                    color="blue"
                />
                <SummaryCard
                    title="Total Entradas"
                    value={data.summary.totalInflow}
                    icon={<TrendingUp className="h-4 w-4" />}
                    color="emerald"
                />
                <SummaryCard
                    title="Total Saídas"
                    value={data.summary.totalOutflow}
                    icon={<TrendingDown className="h-4 w-4" />}
                    color="rose"
                />
                <SummaryCard
                    title="Saldo Final"
                    value={data.summary.finalBalance}
                    icon={<DollarSign className="h-4 w-4" />}
                    color="indigo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lado Esquerdo: 6 Gráficos Real vs Projetado */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { group: 'RoB', label: 'Receita Bruta' },
                        { group: 'TDCF', label: 'Tributos/Deduções' },
                        { group: 'MP', label: 'Matéria Prima' },
                        { group: 'CF', label: 'Custos Fixos' },
                        { group: 'RNOP', label: 'Rec. Não Operacional' },
                        { group: 'DNOP', label: 'Desp. Não Operacional' },
                    ].map(({ group, label }) => {
                        const chartData = data.monthlyData
                            .filter(item => item.dreGroup === group)
                            .map(item => ({
                                month: item.month,
                                actual: item.actual,
                                projected: item.projected,
                            }));

                        return (
                            <Card key={group} className="h-[200px]">
                                <CardHeader className="py-3 px-4">
                                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[140px] px-2">
                                    <RealVsProjectedChart
                                        data={chartData}
                                        title={label}
                                        height={130}
                                    />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Lado Direito: Tabela DRE */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Resumo DRE</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-bold">Item</TableHead>
                                        <TableHead className="text-right font-bold">Real</TableHead>
                                        <TableHead className="text-right font-bold">Projetado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.dreTable.map((row) => (
                                        <TableRow key={row.group} className={cn(row.isDerived && "font-bold bg-muted/50")}>
                                            <TableCell className="text-xs font-medium">{row.label}</TableCell>
                                            <TableCell className="text-right text-xs">{formatCurrency(row.actual)}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {formatCurrency(row.projected)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
    const colorMap: Record<string, string> = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    };

    return (
        <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: `var(--${color}-500)` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{title}</CardTitle>
                <div className={cn("p-1.5 rounded-md", colorMap[color])}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent className="py-3 pt-0">
                <div className="text-xl font-bold">
                    {formatCurrency(value)}
                </div>
            </CardContent>
        </Card>
    );
}
