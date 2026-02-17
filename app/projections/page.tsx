'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Save, ChevronLeft, ChevronRight, TrendingUp, Calculator } from 'lucide-react';

// Grupos DRE disponíveis
const DRE_GROUPS = [
  { value: 'RoB', label: 'Receita Bruta', description: 'Faturamento esperado de vendas' },
  { value: 'TDCF', label: 'Tributos/Deduções', description: 'Impostos sobre vendas (ICMS, PIS, COFINS)' },
  { value: 'MP', label: 'Matéria Prima', description: 'Custos variáveis, insumos, comissões' },
  { value: 'CF', label: 'Custos Fixos', description: 'Salários, aluguel, utilities' },
  { value: 'RNOP', label: 'Rec. Não Operacional', description: 'Rendimentos, juros, aluguéis recebidos' },
  { value: 'DNOP', label: 'Desp. Não Operacional', description: 'Tarifas bancárias, seguros, multas' },
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface Projection {
  id: string;
  companyId: string;
  year: number;
  month: number;
  dreGroup: string;
  amount: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseCurrency = (value: string): number => {
  // Remove tudo exceto números, vírgula e ponto
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export default function ProjectionsPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar projeções do ano
  const { data: projections, isLoading } = useQuery<Projection[]>({
    queryKey: ['projections', selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/projections?year=${selectedYear}`);
      const result = await response.json();
      return result.data || [];
    },
  });

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (data: { year: number; month: number; projections: Array<{ dreGroup: string; amount: number }> }) => {
      const response = await fetch('/api/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao salvar');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      setIsDirty(false);
      toast({
        title: 'Projeções salvas',
        description: `Orçamento de ${MONTHS[selectedMonth - 1]}/${selectedYear} salvo com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as projeções.',
        variant: 'destructive',
      });
    },
  });

  // Atualizar valores do form quando mudar mês/ano ou carregar dados
  useEffect(() => {
    if (projections) {
      const monthProjections = projections.filter(p => p.month === selectedMonth);
      const values: Record<string, string> = {};
      DRE_GROUPS.forEach(group => {
        const proj = monthProjections.find(p => p.dreGroup === group.value);
        values[group.value] = proj ? formatCurrency(Number(proj.amount)) : '';
      });
      setFormValues(values);
      setIsDirty(false);
    }
  }, [projections, selectedMonth]);

  const handleValueChange = (dreGroup: string, value: string) => {
    setFormValues(prev => ({ ...prev, [dreGroup]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    const projectionsToSave = DRE_GROUPS.map(group => ({
      dreGroup: group.value,
      amount: parseCurrency(formValues[group.value] || '0'),
    })).filter(p => p.amount !== 0);

    if (projectionsToSave.length === 0) {
      toast({
        title: 'Nenhum valor informado',
        description: 'Preencha pelo menos um campo para salvar.',
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate({
      year: selectedYear,
      month: selectedMonth,
      projections: projectionsToSave,
    });
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Calcular totais
  const totalReceitas = parseCurrency(formValues['RoB'] || '0') + parseCurrency(formValues['RNOP'] || '0');
  const totalDespesas = parseCurrency(formValues['TDCF'] || '0') +
    parseCurrency(formValues['MP'] || '0') +
    parseCurrency(formValues['CF'] || '0') +
    parseCurrency(formValues['DNOP'] || '0');
  const resultadoLiquido = totalReceitas - totalDespesas;

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Toaster />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Calculator className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          Projeções / Orçamento
        </h1>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Defina o orçamento mensal para comparar com o realizado no dashboard.
        </p>
      </div>

      {/* Seletor de Mês/Ano */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>

            <div className="flex items-center gap-4">
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, idx) => {
                    const year = currentDate.getFullYear() - 2 + idx;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" className="rounded-xl" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Projeções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Orçamento de {MONTHS[selectedMonth - 1]} {selectedYear}
          </CardTitle>
          <CardDescription>
            Informe os valores previstos para cada grupo do DRE.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Campos do formulário */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Grupo DRE</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[180px] text-right">Valor Projetado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DRE_GROUPS.map((group) => (
                    <TableRow key={group.value}>
                      <TableCell className="font-medium">{group.label}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{group.description}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="R$ 0,00"
                          value={formValues[group.value] || ''}
                          onChange={(e) => handleValueChange(group.value, e.target.value)}
                          onBlur={(e) => {
                            const value = parseCurrency(e.target.value);
                            if (value > 0) {
                              handleValueChange(group.value, formatCurrency(value));
                            }
                          }}
                          className="text-right"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Resumo */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Receitas (RoB + RNOP)</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(totalReceitas)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Despesas (TDCF + MP + CF + DNOP)</span>
                  <span className="font-medium text-rose-600">{formatCurrency(totalDespesas)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Resultado Líquido Projetado</span>
                  <span className={resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatCurrency(resultadoLiquido)}
                  </span>
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !isDirty}
                  className="gap-2 rounded-xl"
                >
                  <Save className="h-4 w-4" strokeWidth={1.5} />
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar Projeções'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dica */}
      <p className="text-xs text-muted-foreground mt-4 text-center">
        As projeções salvas aparecerão no dashboard "Fluxo | Real + Projetado" para comparação.
      </p>
    </div>
  );
}
