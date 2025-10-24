import { NextRequest, NextResponse } from 'next/server';
import { ExportOptions } from '@/lib/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const options: ExportOptions = await request.json();

    // Buscar dados baseado nas opções
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/reports/dre`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { data } = await response.json();
    const dreData = data.current;

    if (options.format === 'pdf') {
      const pdf = generatePDFReport(dreData, options);

      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="dre-${options.period.name}.pdf"`,
        },
      });
    } else if (options.format === 'excel') {
      const excel = generateExcelReport(dreData, options);

      return new NextResponse(excel, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="dre-${options.period.name}.xlsx"`,
        },
      });
    }

    throw new Error('Invalid format');
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export report'
      },
      { status: 500 }
    );
  }
}

function generatePDFReport(dreData: any, options: ExportOptions): Uint8Array {
  const pdf = new jsPDF();

  // Cabeçalho
  pdf.setFontSize(20);
  pdf.text('Demonstrativo de Resultado do Exercício', 14, 20);
  pdf.setFontSize(12);
  pdf.text(`Período: ${dreData.period}`, 14, 30);

  let yPosition = 50;

  // DRE Detalhado
  const dreItems = [
    ['RECEITA BRUTA', dreData.grossRevenue],
    ['(-) Impostos sobre Vendas', -dreData.taxes],
    ['(-) Custos Financeiros', -dreData.financialCosts],
    ['= RECEITA LÍQUIDA', dreData.netRevenue],
    ['(-) CUSTO VARIÁVEL', -dreData.variableCosts],
    ['= MARGEM DE CONTRIBUIÇÃO', dreData.contributionMargin.value],
    [`${dreData.contributionMargin.percentage}%`, 0],
    ['(-) CUSTO FIXO', -dreData.fixedCosts],
    ['= RESULTADO OPERACIONAL', dreData.operationalResult],
    ['(-) DESPESAS NÃO OPERACIONAIS', -dreData.nonOperationalExpenses],
    ['= RESULTADO LÍQUIDO DE CAIXA', dreData.netResult],
  ];

  pdf.setFontSize(10);
  dreItems.forEach(([label, value]) => {
    const formattedValue = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);

    pdf.text(label, 20, yPosition);
    pdf.text(formattedValue, 180, yPosition, { align: 'right' });
    yPosition += 10;
  });

  if (options.includeDetails && dreData.categories) {
    yPosition += 20;
    pdf.setFontSize(14);
    pdf.text('Detalhamento por Categorias', 20, yPosition);
    yPosition += 15;

    pdf.setFontSize(10);
    dreData.categories.forEach((category: any) => {
      const formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(category.value);

      pdf.text(`${category.name}:`, 20, yPosition);
      pdf.text(formattedValue, 180, yPosition, { align: 'right' });
      pdf.text(`${category.percentage}% (${category.transactions} trans)`, 20, yPosition + 6);
      yPosition += 15;
    });
  }

  return pdf.output('arraybuffer') as Uint8Array;
}

function generateExcelReport(dreData: any, options: ExportOptions): Buffer {
  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Aba do DRE
  const dreDataArray = [
    ['Demonstrativo de Resultado do Exercício'],
    [`Período: ${dreData.period}`],
    [],
    ['Conta', 'Valor'],
    ['RECEITA BRUTA', dreData.grossRevenue],
    ['(-) Impostos sobre Vendas', -dreData.taxes],
    ['(-) Custos Financeiros', -dreData.financialCosts],
    ['= RECEITA LÍQUIDA', dreData.netRevenue],
    ['(-) CUSTO VARIÁVEL', -dreData.variableCosts],
    ['= MARGEM DE CONTRIBUIÇÃO', dreData.contributionMargin.value],
    [`${dreData.contributionMargin.percentage}%`, 0],
    ['(-) CUSTO FIXO', -dreData.fixedCosts],
    ['= RESULTADO OPERACIONAL', dreData.operationalResult],
    ['(-) DESPESAS NÃO OPERACIONAIS', -dreData.nonOperationalExpenses],
    ['= RESULTADO LÍQUIDO DE CAIXA', dreData.netResult],
  ];

  const wsDRE = XLSX.utils.aoa_to_sheet(dreDataArray);
  XLSX.utils.book_append_sheet(wb, wsDRE, 'DRE');

  // Aba de Categorias (se incluído)
  if (options.includeDetails && dreData.categories) {
    const categoriesData = [
      ['Detalhamento por Categorias'],
      ['Categoria', 'Valor', 'Percentual', 'Transações', 'Tipo'],
      ...dreData.categories.map((category: any) => [
        category.name,
        category.value,
        `${category.percentage}%`,
        category.transactions,
        category.type
      ])
    ];

    const wsCategories = XLSX.utils.aoa_to_sheet(categoriesData);
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Categorias');
  }

  // Gerar buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}