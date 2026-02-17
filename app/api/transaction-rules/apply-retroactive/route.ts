import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { transactions, categoryRules, categories } from '@/lib/db/schema';
import { eq, and, or, ilike, isNull, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('tx-rules-retroactive');

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();

    const body = await request.json();
    const { ruleId, applyToAll = false } = body;

    // Validações
    if (!ruleId) {
      return NextResponse.json({
        success: false,
        error: 'RuleId é obrigatório'
      }, { status: 400 });
    }

    log.info({ ruleId, companyId }, 'Aplicando regra retroativamente');

    // Buscar a regra
    const [rule] = await db
      .select({
        id: categoryRules.id,
        rulePattern: categoryRules.rulePattern,
        ruleType: categoryRules.ruleType,
        categoryId: categoryRules.categoryId,
        confidenceScore: categoryRules.confidenceScore,
      })
      .from(categoryRules)
      .where(and(
        eq(categoryRules.id, ruleId),
        eq(categoryRules.companyId, companyId),
        eq(categoryRules.active, true)
      ))
      .limit(1);

    if (!rule) {
      return NextResponse.json({
        success: false,
        error: 'Regra não encontrada ou inativa'
      }, { status: 404 });
    }

    // Verificar se categoria existe
    const [category] = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.id, rule.categoryId),
        eq(categories.companyId, companyId)
      ))
      .limit(1);

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Categoria associada à regra não encontrada'
      }, { status: 404 });
    }

    // Construir condição para encontrar transações que correspondem ao padrão
    let whereCondition;

    if (applyToAll) {
      // Aplicar a todas as transações que correspondem ao padrão (inclusive as já categorizadas)
      whereCondition = and(
        eq(transactions.companyId, companyId),
        // Condição de correspondência baseada no tipo de regra
        rule.ruleType === 'exact'
          ? eq(transactions.description, rule.rulePattern)
          : rule.ruleType === 'contains'
          ? ilike(transactions.description, `%${rule.rulePattern}%`)
          : // regex - precisamos implementar validação no código
          ilike(transactions.description, `%${rule.rulePattern}%`)
      );
    } else {
      // Aplicar apenas a transações sem categoria
      whereCondition = and(
        eq(transactions.companyId, companyId),
        or(
          isNull(transactions.categoryId),
          eq(transactions.categoryId, '')
        ),
        // Condição de correspondência baseada no tipo de regra
        rule.ruleType === 'exact'
          ? eq(transactions.description, rule.rulePattern)
          : rule.ruleType === 'contains'
          ? ilike(transactions.description, `%${rule.rulePattern}%`)
          : // regex - fallback para contains
          ilike(transactions.description, `%${rule.rulePattern}%`)
      );
    }

    // Buscar transações que correspondem (primeiro para preview)
    const matchingTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        currentCategoryId: transactions.categoryId,
      })
      .from(transactions)
      .where(whereCondition);

    log.info({ count: matchingTransactions.length }, 'Transacoes encontradas que correspondem ao padrao');

    if (matchingTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          rule: {
            ...rule,
            categoryName: category.name,
          },
          affectedTransactions: [],
          totalAffected: 0,
          newlyCategorized: 0,
          message: 'Nenhuma transação encontrada para aplicar esta regra'
        }
      });
    }

    // Contar quantas são novas categorizações
    const newlyCategorized = matchingTransactions.filter(t =>
      !t.currentCategoryId || t.currentCategoryId === ''
    ).length;

    // Atualizar as transações
    const updatedTransactions = await db
      .update(transactions)
      .set({
        categoryId: rule.categoryId,
        updatedAt: new Date()
      })
      .where(whereCondition)
      .returning();

    // Atualizar contador de uso da regra
    await db
      .update(categoryRules)
      .set({
        usageCount: (Number(categoryRules.usageCount) || 0) + updatedTransactions.length,
        updatedAt: new Date()
      })
      .where(eq(categoryRules.id, ruleId));

    log.info({ updated: updatedTransactions.length, newlyCategorized }, 'Regra aplicada retroativamente');

    return NextResponse.json({
      success: true,
      data: {
        rule: {
          ...rule,
          categoryName: category.name,
        },
        affectedTransactions: updatedTransactions,
        totalAffected: updatedTransactions.length,
        newlyCategorized,
        message: `Regra aplicada com sucesso em ${updatedTransactions.length} transações`
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao aplicar regra retroativamente');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}