import { NextRequest, NextResponse } from 'next/server';
import CategoriesService from '@/lib/services/categories.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters = {
      type: searchParams.get('type') as any,
      companyId: searchParams.get('companyId') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      includeStats: searchParams.get('includeStats') === 'true',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') as any || 'totalAmount',
      sortOrder: searchParams.get('sortOrder') as any || 'desc'
    };

    const categories = await CategoriesService.getCategories(filters);

    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length
    });

  } catch (error) {
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

    const category = await CategoriesAPI.createCategory(body);

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully'
    }, { status: 201 });

  } catch (error) {
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

    const category = await CategoriesAPI.updateCategory({ id, ...body });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });

  } catch (error) {
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

    await CategoriesAPI.deleteCategory(id);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
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