import { NextRequest, NextResponse } from 'next/server';
import { CashFlowReport } from '@/lib/types';
import { mockCashFlow } from '@/lib/mock-reports';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    const days = searchParams.get('days') || '30';

    // Simular busca no banco de dados
    const data = mockCashFlow;

    return NextResponse.json({
      success: true,
      data: {
        report: data,
        period: data.period,
        days: parseInt(days)
      }
    });
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cash flow data'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate } = body;

    // Lógica para calcular fluxo de caixa com base em transações
    // Por enquanto, retorna dados mockados

    return NextResponse.json({
      success: true,
      data: mockCashFlow
    });
  } catch (error) {
    console.error('Error calculating cash flow:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate cash flow'
      },
      { status: 500 }
    );
  }
}