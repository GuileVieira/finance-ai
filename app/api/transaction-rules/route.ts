import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { categoryRules, categories, companies } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createHash } from 'crypto';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('tx-rules');

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();

    log.info({ companyId }, 'Buscando regras para empresa');

    // Buscar regras da empresa com informações da categoria
    const rules = await db
      .select({
        id: categoryRules.id,
        pattern: categoryRules.rulePattern,
        confidence: categoryRules.confidenceScore,
        active: categoryRules.active,
        createdAt: categoryRules.createdAt,
        applicationCount: categoryRules.usageCount,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryType: categories.type,
      })
      .from(categoryRules)
      .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
      .where(and(
        eq(categoryRules.companyId, companyId),
        eq(categoryRules.active, true)
      ))
      .orderBy(desc(categoryRules.usageCount), desc(categoryRules.createdAt));

    log.info({ count: rules.length }, 'Encontradas regras ativas');

    return NextResponse.json({
      success: true,
      data: rules,
      total: rules.length
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar regras');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();

    const body = await request.json();
    const { pattern, categoryId, examples, confidence = 0.8 } = body;

    // Validações
    if (!pattern || !categoryId) {
      return NextResponse.json({
        success: false,
        error: 'Pattern e categoryId são obrigatórios'
      }, { status: 400 });
    }

    // Verificar se empresa existe
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return NextResponse.json({
        success: false,
        error: 'Empresa não encontrada'
      }, { status: 404 });
    }

    // Verificar se categoria existe e pertence à empresa
    const [category] = await db.select()
      .from(categories)
      .where(and(
        eq(categories.id, categoryId),
        eq(categories.companyId, companyId)
      ))
      .limit(1);

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Categoria não encontrada ou não pertence à empresa'
      }, { status: 404 });
    }

    log.info({ companyId, pattern, category: category.name, confidence }, 'Criando regra');

    // Verificar se já existe regra similar
    const existingRule = await db.select()
      .from(categoryRules)
      .where(and(
        eq(categoryRules.companyId, companyId),
        eq(categoryRules.rulePattern, pattern.toLowerCase()),
        eq(categoryRules.categoryId, categoryId)
      ))
      .limit(1);

    if (existingRule.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Já existe uma regra idêntica para este padrão e categoria',
        existingRule: existingRule[0]
      }, { status: 409 });
    }

    // Criar nova regra
    const [newRule] = await db.insert(categoryRules).values({
      companyId,
      rulePattern: pattern.toLowerCase(),
      categoryId,
      confidenceScore: confidence.toString(),
      ruleType: 'contains',
      examples: examples || [],
      active: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    log.info({ ruleId: newRule.id }, 'Regra criada');

    // Retornar regra com informações da categoria
    const ruleWithCategory = {
      ...newRule,
      categoryName: category.name,
      categoryType: category.type,
    };

    return NextResponse.json({
      success: true,
      data: ruleWithCategory,
      message: 'Regra criada com sucesso'
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao criar regra');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { ruleId, active, applicationCount } = body;

    if (!ruleId) {
      return NextResponse.json({
        success: false,
        error: 'RuleId é obrigatório'
      }, { status: 400 });
    }

    log.info({ ruleId }, 'Atualizando regra');

    // Construir updates dinamicamente
    const updates: any = { updatedAt: new Date() };
    if (active !== undefined) updates.active = active;
    if (applicationCount !== undefined) updates.usageCount = applicationCount;

    // Atualizar regra
    const [updatedRule] = await db.update(categoryRules)
      .set(updates)
      .where(eq(categoryRules.id, ruleId))
      .returning();

    if (!updatedRule) {
      return NextResponse.json({
        success: false,
        error: 'Regra não encontrada'
      }, { status: 404 });
    }

    log.info({ ruleId }, 'Regra atualizada');

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: 'Regra atualizada com sucesso'
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao atualizar regra');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}