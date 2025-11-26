import { NextRequest, NextResponse } from 'next/server';
import CategoryRulesService from '@/lib/services/category-rules.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters = {
      categoryId: searchParams.get('categoryId') || undefined,
      active: searchParams.get('active') === 'true' ? true : searchParams.get('active') === 'false' ? false : undefined
    };

    const rules = await CategoryRulesService.getRules(filters);

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
    if (!body.rulePattern || !body.ruleType || !body.categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: rulePattern, ruleType, categoryId'
        },
        { status: 400 }
      );
    }

    // Se solicitada apenas validação (sem criar)
    if (body.validateOnly) {
      const validation = await CategoryRulesService.validateRuleCreation(
        body.rulePattern,
        body.categoryId,
        body.companyId
      );

      return NextResponse.json({
        success: true,
        data: null,
        validation,
        message: validation.canCreate
          ? 'Regra pode ser criada'
          : 'Existem problemas com esta regra'
      });
    }

    // Criar regra com validação automática
    const result = await CategoryRulesService.createRule({
      rulePattern: body.rulePattern,
      ruleType: body.ruleType,
      categoryId: body.categoryId,
      companyId: body.companyId,
      confidenceScore: body.confidenceScore,
      active: body.active,
      skipValidation: body.skipValidation
    });

    return NextResponse.json({
      success: true,
      data: result.rule,
      validation: result.validation,
      warnings: result.validation?.warnings || [],
      message: 'Category rule created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[CATEGORIES-RULES-API] Error creating category rule:', error);

    // Verificar se é erro de duplicata
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDuplicate = errorMessage.includes('duplicada') || errorMessage.includes('duplicate');

    return NextResponse.json(
      {
        success: false,
        error: isDuplicate ? 'Regra duplicada' : 'Failed to create category rule',
        message: errorMessage,
        isDuplicate
      },
      { status: isDuplicate ? 409 : 500 }
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

    const rule = await CategoryRulesService.updateRule(id, body);

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

    await CategoryRulesService.deleteRule(id);

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