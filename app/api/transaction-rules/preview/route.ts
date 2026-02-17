import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { transactions, categoryRules, categories } from '@/lib/db/schema';
import { eq, and, or, ilike, isNull, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('tx-rules-preview');

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();

    const body = await request.json();
    const { rulePattern, ruleType = 'contains', categoryId, applyToAll = false, limit = 10 } = body;

    // Validações
    if (!rulePattern || !categoryId) {
      return NextResponse.json({
        success: false,
        error: 'RulePattern e CategoryId são obrigatórios'
      }, { status: 400 });
    }

    log.info({ rulePattern, ruleType, companyId }, 'Preview da regra');

    // Verificar se categoria existe
    const [category] = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.id, categoryId),
        eq(categories.companyId, companyId)
      ))
      .limit(1);

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Categoria não encontrada'
      }, { status: 404 });
    }

    // Construir condição para encontrar transações que correspondem ao padrão
    let whereCondition;

    if (applyToAll) {
      // Aplicar a todas as transações que correspondem ao padrão
      whereCondition = and(
        eq(transactions.companyId, companyId),
        // Condição de correspondência baseada no tipo de regra
        ruleType === 'exact'
          ? eq(transactions.description, rulePattern)
          : ruleType === 'contains'
          ? ilike(transactions.description, `%${rulePattern}%`)
          : // regex - fallback para contains
          ilike(transactions.description, `%${rulePattern}%`)
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
        ruleType === 'exact'
          ? eq(transactions.description, rulePattern)
          : ruleType === 'contains'
          ? ilike(transactions.description, `%${rulePattern}%`)
          : // regex - fallback para contains
          ilike(transactions.description, `%${rulePattern}%`)
      );
    }

    // Buscar contagem total de transações que correspondem
    const totalCount = await db
      .select({ count: transactions.id })
      .from(transactions)
      .where(whereCondition);

    // Buscar amostra de transações para preview (limitadas)
    const sampleTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        currentCategoryId: transactions.categoryId,
        currentCategoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereCondition)
      .orderBy(desc(transactions.transactionDate))
      .limit(limit);

    // Contar quantas são novas categorizações
    const newlyCategorizedCount = totalCount.filter(t =>
      !t.currentCategoryId || t.currentCategoryId === ''
    ).length;

    // Calcular impacto financeiro
    const financialImpact = sampleTransactions.reduce((acc, t) => {
      const amount = parseFloat(t.amount);
      if (amount > 0) {
        acc.income += amount;
      } else {
        acc.expenses += Math.abs(amount);
      }
      acc.total += amount;
      return acc;
    }, { income: 0, expenses: 0, total: 0 });

    log.info({ total: totalCount.length, newlyCategorizedCount }, 'Preview resultado');

    return NextResponse.json({
      success: true,
      data: {
        rule: {
          rulePattern,
          ruleType,
          categoryId,
          categoryName: category.name,
        },
        impact: {
          totalAffected: totalCount.length,
          newlyCategorized: newlyCategorizedCount,
          alreadyCategorized: totalCount.length - newlyCategorizedCount,
          financialImpact,
        },
        sampleTransactions: sampleTransactions.map(t => ({
          id: t.id,
          description: t.description,
          amount: parseFloat(t.amount),
          date: t.transactionDate,
          currentCategory: t.currentCategoryName || 'Sem categoria',
          willChange: !t.currentCategoryId || t.currentCategoryId === '',
        })),
        message: `Esta regra afetaria ${totalCount.length} transações (${newlyCategorizedCount} novas categorizações)`
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao gerar preview da regra');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}