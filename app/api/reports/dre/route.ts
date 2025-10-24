import { NextRequest, NextResponse } from 'next/server';
import { DREStatement } from '@/lib/types';
import { mockDRECurrent, mockDREPrevious } from '@/lib/mock-reports';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    const includeComparison = searchParams.get('compare') === 'true';

    // Simular busca no banco de dados
    const data = period === 'previous' ? mockDREPrevious : mockDRECurrent;
    const comparison = includeComparison ? mockDREPrevious : undefined;

    return NextResponse.json({
      success: true,
      data: {
        current: data,
        comparison,
        period: data.period
      }
    });
  } catch (error) {
    console.error('Error fetching DRE:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch DRE data'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Lógica para calcular DRE com base em transações
    // Por enquanto, retorna dados mockados

    return NextResponse.json({
      success: true,
      data: mockDRECurrent
    });
  } catch (error) {
    console.error('Error calculating DRE:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate DRE'
      },
      { status: 500 }
    );
  }
}