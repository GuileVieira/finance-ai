import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import CashFlowService from '@/lib/services/cash-flow.service';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    const days = parseInt(searchParams.get('days') || '30');
    const companyId = searchParams.get('companyId') || undefined;
    const accountId = searchParams.get('accountId') || undefined;

    console.log('📊 [CASH-FLOW-API] Buscando fluxo de caixa com filtros:', { period, days, companyId, accountId });

    const cashFlowData = await CashFlowService.getCashFlowReport({
      period,
      days,
      companyId,
      accountId
    });

    return NextResponse.json({
      success: true,
      data: {
        report: cashFlowData,
        period: cashFlowData.period,
        days
      }
    });
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cash flow data'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const body = await request.json();
    const { startDate, endDate, companyId, accountId } = body;

    console.log('📊 [CASH-FLOW-API] Calculando fluxo de caixa personalizado:', { startDate, endDate, companyId, accountId });

    const cashFlowData = await CashFlowService.getCashFlowReport({
      startDate,
      endDate,
      companyId,
      accountId
    });

    return NextResponse.json({
      success: true,
      data: cashFlowData
    });
  } catch (error) {
    console.error('Error calculating cash flow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate cash flow'
      },
      { status: 500 }
    );
  }
}