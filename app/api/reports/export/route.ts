import { NextRequest, NextResponse } from 'next/server';
import { ExportOptions } from '@/lib/types';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { requireAuth } from '@/lib/auth/get-session';
import DREService from '@/lib/services/dre.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('reports-export');
import CashFlowService, { CashFlowFilters } from '@/lib/services/cash-flow.service';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

applyPlugin(jsPDF);

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const options: ExportOptions = await request.json();

    // Validar opções básicas
    if (!options.period) {
      return NextResponse.json(
        { success: false, error: 'Period is required' },
        { status: 400 }
      );
    }

    let reportData: any;
    let filename = '';
    let buffer: Buffer | Uint8Array;

    const filters = {
      period: options.filters?.period || options.period.id,
      startDate: options.filters?.startDate || options.period.startDate,
      endDate: options.filters?.endDate || options.period.endDate,
      accountId: options.filters?.accountId,
      companyId: options.filters?.companyId || companyId
    };

    if (options.reportType === 'dre') {
      reportData = await DREService.getDREStatement(filters);
      filename = `dre-${options.period.name.replace(/\//g, '-')}`;

      if (options.format === 'pdf') {
        buffer = generateDREPDF(reportData, options);
      } else {
        buffer = generateDREExcel(reportData, options);
      }
    } else if (options.reportType === 'cashflow') {
      // Para fluxo de caixa, padrão de 30 dias se não especificado
      const cashFlowFilters: CashFlowFilters = { ...filters };
      if (!cashFlowFilters.days && !cashFlowFilters.startDate) {
        cashFlowFilters.days = 30;
      }

      reportData = await CashFlowService.getCashFlowReport(cashFlowFilters);
      filename = `fluxo-caixa-${options.period.name.replace(/\//g, '-')}`;

      if (options.format === 'pdf') {
        buffer = generateCashFlowPDF(reportData, options);
      } else {
        buffer = generateCashFlowExcel(reportData, options);
      }
    } else {
      throw new Error('Invalid report type');
    }

    if (options.format === 'pdf') {
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      });
    } else {
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

  } catch (error) {
    log.error({ err: error }, 'Error exporting report');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export report'
      },
      { status: 500 }
    );
  }
}

// --- GERADORES DRE ---

function generateDREPDF(dreData: any, options: ExportOptions): Uint8Array {
  const pdf = new jsPDF();

  // Cabeçalho
  pdf.setFontSize(20);
  pdf.text('Demonstrativo de Resultado do Exercício', 14, 20);
  pdf.setFontSize(12);
  pdf.text(`Período: ${dreData.period}`, 14, 30);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 36);

  let yPosition = 50;

  // Função auxiliar para formatar moeda
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // DRE Detalhado
  const dreItems = [
    ['RECEITA BRUTA', dreData.grossRevenue],
    ['(-) Impostos sobre Vendas', -dreData.taxes],
    ['(-) Custos Financeiros', -dreData.financialCosts],
    ['= RECEITA LÍQUIDA', dreData.netRevenue],
    ['(-) CUSTO VARIÁVEL', -dreData.variableCosts],
    ['= MARGEM DE CONTRIBUIÇÃO', dreData.contributionMargin.value],
    [`Margem %`, null, `${dreData.contributionMargin.percentage.toFixed(2)}%`],
    ['(-) CUSTO FIXO', -dreData.fixedCosts],
    ['= RESULTADO OPERACIONAL', dreData.operationalResult],
    ['(+) RECEITAS NÃO OPERACIONAIS', dreData.nonOperational.revenue],
    ['(-) DESPESAS NÃO OPERACIONAIS', -dreData.nonOperational.expenses],
    ['= RESULTADO NÃO OPERACIONAL', dreData.nonOperational.netResult],
    ['= RESULTADO LÍQUIDO DE CAIXA', dreData.netResult],
  ];

  pdf.setFontSize(10);
  dreItems.forEach((item) => {
    const label = item[0] as string;
    const value = item[1] as number | null;
    const textValue = item[2] as string | undefined;

    pdf.text(label, 20, yPosition);

    if (textValue) {
      pdf.text(textValue, 180, yPosition, { align: 'right' });
    } else if (value !== null) {
      // Highlight results
      if (label.startsWith('=')) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      pdf.text(formatCurrency(value), 180, yPosition, { align: 'right' });
    }

    yPosition += 8;
  });

  if (options.includeDetails && dreData.categories) {
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detalhamento por Categorias', 20, yPosition);
    yPosition += 10;

    // Usando autoTable para as categorias
    const tableData = dreData.categories.map((cat: any) => [
      cat.name,
      formatCurrency(cat.actual),
      `${cat.percentage.toFixed(2)}%`,
      cat.transactions,
      cat.type === 'revenue' ? 'Receita' :
        cat.type === 'variable_cost' ? 'Custo Var.' :
          cat.type === 'fixed_cost' ? 'Custo Fixo' : 'Outros'
    ]);

    pdf.autoTable({
      startY: yPosition,
      head: [['Categoria', 'Valor', '% Rec. Bruta', 'Trans.', 'Tipo']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'center' }
      }
    });
  }

  return new Uint8Array(pdf.output('arraybuffer'));
}

function generateDREExcel(dreData: any, options: ExportOptions): Buffer {
  const wb = XLSX.utils.book_new();

  // Aba Resumo
  const dreDataArray = [
    ['Demonstrativo de Resultado do Exercício'],
    [`Período: ${dreData.period}`],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [],
    ['Conta', 'Valor', '%'],
    ['RECEITA BRUTA', dreData.grossRevenue, 1],
    ['(-) Impostos sobre Vendas', -dreData.taxes, -dreData.taxes / dreData.grossRevenue || 0],
    ['(-) Custos Financeiros', -dreData.financialCosts, -dreData.financialCosts / dreData.grossRevenue || 0],
    ['= RECEITA LÍQUIDA', dreData.netRevenue, dreData.netRevenue / dreData.grossRevenue || 0],
    ['(-) CUSTO VARIÁVEL', -dreData.variableCosts, -dreData.variableCosts / dreData.grossRevenue || 0],
    ['= MARGEM DE CONTRIBUIÇÃO', dreData.contributionMargin.value, dreData.contributionMargin.percentage / 100],
    ['(-) CUSTO FIXO', -dreData.fixedCosts, -dreData.fixedCosts / dreData.grossRevenue || 0],
    ['= RESULTADO OPERACIONAL', dreData.operationalResult, dreData.operationalResult / dreData.grossRevenue || 0],
    ['(+) RECEITAS NÃO OPERACIONAIS', dreData.nonOperational.revenue, 0],
    ['(-) DESPESAS NÃO OPERACIONAIS', -dreData.nonOperational.expenses, 0],
    ['= RESULTADO NÃO OPERACIONAL', dreData.nonOperational.netResult, 0],
    ['= RESULTADO LÍQUIDO DE CAIXA', dreData.netResult, dreData.netResult / dreData.grossRevenue || 0],
  ];

  const wsDRE = XLSX.utils.aoa_to_sheet(dreDataArray);

  // Formatação básica de colunas (largura)
  wsDRE['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 10 }];

  XLSX.utils.book_append_sheet(wb, wsDRE, 'Resumo DRE');

  // Aba de Categorias (se incluído)
  if (options.includeDetails && dreData.categories) {
    const categoriesData = [
      ['Detalhamento por Categorias'],
      [],
      ['Categoria', 'Valor', '% Rec. Bruta', 'Transações', 'Tipo'],
      ...dreData.categories.map((category: any) => [
        category.name,
        category.actual,
        category.percentage / 100,
        category.transactions,
        category.type
      ])
    ];

    const wsCategories = XLSX.utils.aoa_to_sheet(categoriesData);
    wsCategories['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Categorias');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// --- GERADORES FLUXO DE CAIXA ---

function generateCashFlowPDF(cashFlowData: any, options: ExportOptions): Uint8Array {
  const pdf = new jsPDF();
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Cabeçalho
  pdf.setFontSize(20);
  pdf.text('Relatório de Fluxo de Caixa', 14, 20);
  pdf.setFontSize(12);
  pdf.text(`Período: ${cashFlowData.period}`, 14, 30);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 36);

  // Resumo
  let yPosition = 50;
  pdf.setFontSize(14);
  pdf.text('Resumo do Período', 14, yPosition);
  yPosition += 10;

  const summaryData = [
    ['Saldo Inicial', formatCurrency(cashFlowData.openingBalance)],
    ['(+) Total Entradas', formatCurrency(cashFlowData.totalIncome)],
    ['(-) Total Saídas', formatCurrency(cashFlowData.totalExpenses)],
    ['(=) Resultado Líquido', formatCurrency(cashFlowData.netCashFlow)],
    ['Saldo Final', formatCurrency(cashFlowData.closingBalance)],
  ];

  pdf.autoTable({
    startY: yPosition,
    head: [['Item', 'Valor']],
    body: summaryData,
    theme: 'plain',
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // Estatísticas
  yPosition = (pdf as any).lastAutoTable.finalY + 15;
  pdf.text('Metricas Diárias', 14, yPosition);
  yPosition += 5;

  const metricsData = [
    ['Média Diária de Entradas', formatCurrency(cashFlowData.averageDailyIncome)],
    ['Média Diária de Saídas', formatCurrency(cashFlowData.averageDailyExpenses)],
    ['Melhor Dia', `${new Date(cashFlowData.bestDay.date).toLocaleDateString('pt-BR')} (${formatCurrency(cashFlowData.bestDay.amount)})`],
    ['Pior Dia', `${new Date(cashFlowData.worstDay.date).toLocaleDateString('pt-BR')} (${formatCurrency(cashFlowData.worstDay.amount)})`],
  ];

  pdf.autoTable({
    startY: yPosition,
    body: metricsData,
    theme: 'grid',
    showHead: false,
    columnStyles: { 0: { cellWidth: 80 } }
  });

  // Detalhamento Diário
  if (options.includeDetails && cashFlowData.cashFlowDays) {
    yPosition = (pdf as any).lastAutoTable.finalY + 15;

    // Se não couber, nova página
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.text('Movimentação Diária', 14, yPosition);
    yPosition += 5;

    const dailyData = cashFlowData.cashFlowDays.map((day: any) => [
      new Date(day.date).toLocaleDateString('pt-BR'),
      formatCurrency(day.income),
      formatCurrency(day.expenses),
      formatCurrency(day.netCashFlow),
      formatCurrency(day.closingBalance),
      day.transactions
    ]);

    pdf.autoTable({
      startY: yPosition,
      head: [['Data', 'Entradas', 'Saídas', 'Líquido', 'Saldo', 'Trans.']],
      body: dailyData,
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113] },
      columnStyles: {
        1: { halign: 'right', textColor: [22, 160, 133] }, // Greenish
        2: { halign: 'right', textColor: [192, 57, 43] }, // Reddish
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'center' }
      }
    });
  }

  return new Uint8Array(pdf.output('arraybuffer'));
}

function generateCashFlowExcel(cashFlowData: any, options: ExportOptions): Buffer {
  const wb = XLSX.utils.book_new();

  // Aba Resumo
  const summaryArray = [
    ['Relatório de Fluxo de Caixa'],
    [`Período: ${cashFlowData.period}`],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [],
    ['RESUMO FINANCEIRO'],
    ['Item', 'Valor'],
    ['Saldo Inicial', cashFlowData.openingBalance],
    ['(+) Total Entradas', cashFlowData.totalIncome],
    ['(-) Total Saídas', -cashFlowData.totalExpenses],
    ['(=) Resultado Líquido', cashFlowData.netCashFlow],
    ['Saldo Final', cashFlowData.closingBalance],
    [],
    ['ESTATÍSTICAS'],
    ['Média Diária de Entradas', cashFlowData.averageDailyIncome],
    ['Média Diária de Saídas', cashFlowData.averageDailyExpenses],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryArray);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  // Aba Detalhada
  if (options.includeDetails && cashFlowData.cashFlowDays) {
    const detailHeader = ['Data', 'Saldo Inicial', 'Entradas', 'Saídas', 'Resultado Líquido', 'Saldo Final', 'Qtd Transações'];
    const detailRows = cashFlowData.cashFlowDays.map((day: any) => [
      day.date,
      day.openingBalance,
      day.income,
      day.expenses,
      day.netCashFlow,
      day.closingBalance,
      day.transactions
    ]);

    const wsDetalhes = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
    wsDetalhes['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Diário');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}