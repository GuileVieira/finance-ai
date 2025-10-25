import { NextRequest, NextResponse } from 'next/server';
import CategoriesService from '@/lib/services/categories.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters = {
      type: searchParams.get('type') as any,
      companyId: searchParams.get('companyId') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined
    };

    const summary = await CategoriesService.getCategoriesSummary(filters);

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('[CATEGORIES-SUMMARY-API] Error fetching categories summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}