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
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('categories-rules-detail');

/**
 * GET - Buscar regra específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: ruleId } = await params;

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
      name: `Regra para ${dbRule.rulePattern}`,
      // description: undefined, // Field does not exist in schema
      pattern: dbRule.rulePattern,
      categoryId: dbRule.categoryId,
      // priority: 5, // Field does not exist in schema
      isActive: dbRule.active,
      createdAt: dbRule.createdAt,
      updatedAt: dbRule.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: rule
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Error fetching rule');
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: ruleId } = await params;
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

    // if (body.priority !== undefined) {
    //   updateData.priority = body.priority;
    // }

    // if (body.name !== undefined || body.description !== undefined) {
    //   // updateData.description = body.description || body.name; // Field does not exist
    // }

    // Atualizar regra
    const [dbUpdatedRule] = await db
      .update(categoryRules)
      .set(updateData)
      .where(eq(categoryRules.id, ruleId))
      .returning();

    // Transformar resposta para formato da API
    // Transformar resposta para formato da API
    const updatedRule = {
      id: dbUpdatedRule.id,
      name: `Regra para ${dbUpdatedRule.rulePattern}`,
      // description: undefined,
      pattern: dbUpdatedRule.rulePattern,
      categoryId: dbUpdatedRule.categoryId,
      // priority: 5,
      isActive: dbUpdatedRule.active,
      createdAt: dbUpdatedRule.createdAt,
      updatedAt: dbUpdatedRule.updatedAt
    };

    log.info({ ruleId }, 'Rule updated');

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: body.isActive !== undefined || body.active !== undefined
        ? `Regra ${updateData.active ? 'ativada' : 'desativada'} com sucesso`
        : 'Regra atualizada com sucesso'
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Error updating rule');
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: ruleId } = await params;

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

    log.info({ ruleId }, 'Rule deleted');

    return NextResponse.json({
      success: true,
      message: 'Regra deletada com sucesso'
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Error deleting rule');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar regra'
      },
      { status: 500 }
    );
  }
}
