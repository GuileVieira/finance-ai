/**
 * API Routes para operações em regras individuais
 * GET    /api/categories/rules/[id] - Buscar regra específica
 * PATCH  /api/categories/rules/[id] - Atualizar regra
 * DELETE /api/categories/rules/[id] - Deletar regra
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { categoryRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET - Buscar regra específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ruleId = params.id;

    const [dbRule] = await db
      .select()
      .from(categoryRules)
      .where(eq(categoryRules.id, ruleId))
      .limit(1);

    if (!dbRule) {
      return NextResponse.json(
        { success: false, error: 'Regra não encontrada' },
        { status: 404 }
      );
    }

    // Transformar para formato da API do frontend
    const rule = {
      id: dbRule.id,
      name: dbRule.description || `Regra para ${dbRule.rulePattern}`,
      description: dbRule.description || undefined,
      pattern: dbRule.rulePattern,
      categoryId: dbRule.categoryId,
      priority: dbRule.priority || 5,
      isActive: dbRule.active,
      createdAt: dbRule.createdAt,
      updatedAt: dbRule.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: rule
    });

  } catch (error) {
    console.error('❌ [GET-RULE] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar regra' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Atualizar regra (edição ou toggle de status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ruleId = params.id;
    const body = await request.json();

    // Verificar se regra existe
    const [existingRule] = await db
      .select()
      .from(categoryRules)
      .where(eq(categoryRules.id, ruleId))
      .limit(1);

    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Regra não encontrada' },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    // Transformar campos da API frontend para formato do banco
    if (body.pattern !== undefined) {
      updateData.rulePattern = body.pattern;
    }

    if (body.ruleType !== undefined) {
      updateData.ruleType = body.ruleType;
    }

    if (body.confidenceScore !== undefined) {
      updateData.confidenceScore = body.confidenceScore.toString();
    }

    if (body.isActive !== undefined) {
      updateData.active = body.isActive;
    }

    // Suporte para ambos os formatos (isActive e active) para compatibilidade
    if (body.active !== undefined && body.isActive === undefined) {
      updateData.active = body.active;
    }

    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }

    if (body.name !== undefined || body.description !== undefined) {
      updateData.description = body.description || body.name;
    }

    // Atualizar regra
    const [dbUpdatedRule] = await db
      .update(categoryRules)
      .set(updateData)
      .where(eq(categoryRules.id, ruleId))
      .returning();

    // Transformar resposta para formato da API
    const updatedRule = {
      id: dbUpdatedRule.id,
      name: dbUpdatedRule.description || `Regra para ${dbUpdatedRule.rulePattern}`,
      description: dbUpdatedRule.description || undefined,
      pattern: dbUpdatedRule.rulePattern,
      categoryId: dbUpdatedRule.categoryId,
      priority: dbUpdatedRule.priority || 5,
      isActive: dbUpdatedRule.active,
      createdAt: dbUpdatedRule.createdAt,
      updatedAt: dbUpdatedRule.updatedAt
    };

    console.log(`✅ [UPDATE-RULE] Regra ${ruleId} atualizada`);

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: body.isActive !== undefined || body.active !== undefined
        ? `Regra ${updateData.active ? 'ativada' : 'desativada'} com sucesso`
        : 'Regra atualizada com sucesso'
    });

  } catch (error) {
    console.error('❌ [UPDATE-RULE] Erro:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar regra'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Deletar regra
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ruleId = params.id;

    // Verificar se regra existe
    const [existingRule] = await db
      .select()
      .from(categoryRules)
      .where(eq(categoryRules.id, ruleId))
      .limit(1);

    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Regra não encontrada' },
        { status: 404 }
      );
    }

    // Deletar regra
    await db
      .delete(categoryRules)
      .where(eq(categoryRules.id, ruleId));

    console.log(`🗑️ [DELETE-RULE] Regra ${ruleId} deletada`);

    return NextResponse.json({
      success: true,
      message: 'Regra deletada com sucesso'
    });

  } catch (error) {
    console.error('❌ [DELETE-RULE] Erro:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar regra'
      },
      { status: 500 }
    );
  }
}
