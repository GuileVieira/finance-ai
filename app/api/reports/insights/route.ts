import { NextRequest, NextResponse } from 'next/server';
import { Insight } from '@/lib/types';
import { mockInsights } from '@/lib/mock-reports';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    const category = searchParams.get('category');
    const type = searchParams.get('type'); // alert, recommendation, positive, trend

    // Filtrar insights com base nos parâmetros
    let filteredInsights = [...mockInsights];

    if (category) {
      filteredInsights = filteredInsights.filter(
        insight => insight.category?.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (type) {
      filteredInsights = filteredInsights.filter(
        insight => insight.type === type
      );
    }

    // Ordenar por impacto (high -> medium -> low)
    filteredInsights.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });

    return NextResponse.json({
      success: true,
      data: {
        insights: filteredInsights,
        total: filteredInsights.length,
        period
      }
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch insights'
      },
      { status: 500 }
    );
  }
}