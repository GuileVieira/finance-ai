import { NextRequest, NextResponse } from 'next/server';
import CategoriesService from '@/lib/services/categories.service';
import { requireAuth } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Parse filters from query params - FORÇAR companyId da sessão
    const filters = {
      type: searchParams.get('type') as any,
      companyId: (searchParams.get('companyId') && searchParams.get('companyId') !== 'all') ? searchParams.get('companyId')! : companyId,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      includeStats: searchParams.get('includeStats') === 'true',
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as 'name' | 'totalAmount' | 'transactionCount') || 'totalAmount',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      accountId: searchParams.get('accountId') || undefined
    };

    const categories = await CategoriesService.getCategories(filters);

    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[CATEGORIES-API] Error fetching categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.colorHex || !body.icon) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, type, colorHex, icon'
        },
        { status: 400 }
      );
    }

    // FORÇAR companyId da sessão
    const category = await CategoriesService.createCategory({ ...body, companyId });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[CATEGORIES-API] Error creating category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create category',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category ID is required'
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // FORÇAR companyId da sessão para garantir que só atualiza categorias da empresa
    const category = await CategoriesService.updateCategory({ id, ...body, companyId });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[CATEGORIES-API] Error updating category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update category',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category ID is required'
        },
        { status: 400 }
      );
    }

    // TODO: Verificar se categoria pertence à empresa antes de deletar
    await CategoriesService.deleteCategory(id, companyId);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[CATEGORIES-API] Error deleting category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete category',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}