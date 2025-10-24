'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Table, Loader2 } from 'lucide-react';
import { ExportOptions, ReportPeriod } from '@/lib/types';

interface ExportButtonProps {
  onExport: (options: ExportOptions) => Promise<void>;
  isExporting?: boolean;
  periods?: ReportPeriod[];
  categories?: Array<{ name: string; value: string }>;
}

export default function ExportButton({
  onExport,
  isExporting = false,
  periods = [],
  categories = []
}: ExportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeDetails: true,
    includeCharts: true,
    period: { id: 'current', name: 'Mês Atual', startDate: '', endDate: '', type: 'month' },
    categories: []
  });

  const handleExport = async () => {
    try {
      await onExport(exportOptions);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getFormatIcon = (format: 'pdf' | 'excel') => {
    return format === 'pdf' ? <FileText className="w-4 h-4" /> : <Table className="w-4 h-4" />;
  };

  const getFormatLabel = (format: 'pdf' | 'excel') => {
    return format === 'pdf' ? 'PDF' : 'Excel';
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Relatório
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportar Relatório Financeiro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Período */}
          <div className="space-y-2">
            <Label htmlFor="period">Período do Relatório</Label>
            <Select
              value={exportOptions.period.id}
              onValueChange={(value) => {
                const selectedPeriod = periods.find(p => p.id === value);
                if (selectedPeriod) {
                  setExportOptions(prev => ({
                    ...prev,
                    period: selectedPeriod
                  }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Formato */}
          <div className="space-y-2">
            <Label>Formato do Arquivo</Label>
            <div className="grid grid-cols-2 gap-4">
              {(['pdf', 'excel'] as const).map((format) => (
                <Card
                  key={format}
                  className={`cursor-pointer transition-all ${
                    exportOptions.format === format
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    setExportOptions(prev => ({ ...prev, format }))
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      {getFormatIcon(format)}
                      <div>
                        <div className="font-medium">{getFormatLabel(format)}</div>
                        <div className="text-sm text-gray-500">
                          {format === 'pdf'
                            ? 'Relatório profissional para envio'
                            : 'Dados brutos para análise'
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Opções de Conteúdo */}
          <div className="space-y-4">
            <Label>Conteúdo do Relatório</Label>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="include-details"
                  checked={exportOptions.includeDetails}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({
                      ...prev,
                      includeDetails: checked as boolean
                    }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="include-details" className="text-sm font-medium">
                    Incluir detalhamento das transações
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mostra todas as transações individualmente
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="include-charts"
                  checked={exportOptions.includeCharts}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({
                      ...prev,
                      includeCharts: checked as boolean
                    }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="include-charts" className="text-sm font-medium">
                    Incluir gráficos e visualizações
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Adiciona gráficos ao relatório (apenas PDF)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Categorias (Opcional) */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label>Filtrar por Categorias (Opcional)</Label>
              <Select
                value={exportOptions.categories?.join(',') || ''}
                onValueChange={(value) => {
                  const selectedCategories = value
                    ? value.split(',').filter(cat => cat)
                    : [];
                  setExportOptions(prev => ({
                    ...prev,
                    categories: selectedCategories
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isExporting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="min-w-[120px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar {getFormatLabel(exportOptions.format).toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}