import { NextRequest, NextResponse } from 'next/server';
import { CategoriesAPI } from '@/lib/api/categories';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters = {
      categoryId: searchParams.get('categoryId') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined
    };

    const rules = await CategoriesAPI.getCategoryRules(filters);

    return NextResponse.json({
      success: true,
      data: rules,
      count: rules.length
    });

  } catch (error) {
    console.error('[CATEGORIES-RULES-API] Error fetching category rules:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch category rules',
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
    if (!body.name || !body.pattern || !body.categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, pattern, categoryId'
        },
        { status: 400 }
      );
    }

    const rule = await CategoriesAPI.createCategoryRule(body);

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Category rule created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[CATEGORIES-RULES-API] Error creating category rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create category rule',
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
          error: 'Rule ID is required'
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const rule = await CategoriesAPI.updateCategoryRule(id, body);

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Category rule updated successfully'
    });

  } catch (error) {
    console.error('[CATEGORIES-RULES-API] Error updating category rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update category rule',
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
          error: 'Rule ID is required'
        },
        { status: 400 }
      );
    }

    await CategoriesAPI.deleteCategoryRule(id);

    return NextResponse.json({
      success: true,
      message: 'Category rule deleted successfully'
    });

  } catch (error) {
    console.error('[CATEGORIES-RULES-API] Error deleting category rule:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete category rule',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}