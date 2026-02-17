import { NextRequest, NextResponse } from 'next/server';
import CategoriesService from '@/lib/services/categories.service';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('categories-summary');

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters = {
      type: searchParams.get('type') as any,
      companyId, // Always from session
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined
    };

    const summary = await CategoriesService.getCategoriesSummary(filters);

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Error fetching categories summary');
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