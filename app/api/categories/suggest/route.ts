import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { categoryRules, categories, transactions } from '@/lib/db/schema';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import CategoryRulesService from '@/lib/services/category-rules.service';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('categories-suggest');

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const body = await request.json();
    const { description, amount, transactionType } = body;

    // Validações
    if (!description) {
      return NextResponse.json({
        success: false,
        error: 'Description é obrigatório'
      }, { status: 400 });
    }

    log.info({ description }, 'Searching suggestions for description');

    const suggestions = [];

    // Usar o CategoryRulesService para aplicar regras corretamente
    const ruleMatch = await CategoryRulesService.applyRulesToTransaction(description, companyId);

    if (ruleMatch) {
      log.info({ categoryName: ruleMatch.categoryName, confidence: ruleMatch.confidence }, 'Rule match found');

      // Incrementar contador de uso da regra
      await db
        .update(categoryRules)
        .set({
          usageCount: sql`${categoryRules.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(categoryRules.id, ruleMatch.ruleId));

      suggestions.push({
        categoryId: ruleMatch.categoryId,
        categoryName: ruleMatch.categoryName,
        categoryType: ruleMatch.categoryType,
        confidence: ruleMatch.confidence / 100, // Converter para 0-1
        source: 'rule',
        ruleId: ruleMatch.ruleId,
        rulePattern: ruleMatch.rulePattern,
        ruleType: ruleMatch.ruleType,
        reasoning: ruleMatch.reasoning || `Correspondência com regra: "${ruleMatch.rulePattern}"`
      });
    }

    // Se não encontrou regras, buscar transações similares
    if (suggestions.length === 0) {
      log.info('No rule found, searching similar transactions');

      const normalizedDescription = description.toLowerCase().trim();

      const similarTransactions = await db
        .select({
          categoryId: categories.id,
          categoryName: categories.name,
          categoryType: categories.type,
          count: sql<number>`COUNT(*)::int`.as('count'),
        })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(
          eq(transactions.companyId, companyId),
          ilike(transactions.description, `%${normalizedDescription}%`)
        ))
        .groupBy(categories.id, categories.name, categories.type)
        .orderBy(desc(sql`count`))
        .limit(3);

      similarTransactions.forEach((trans) => {
        suggestions.push({
          categoryId: trans.categoryId,
          categoryName: trans.categoryName,
          categoryType: trans.categoryType,
          confidence: 0.6, // Confiança menor para transações similares
          source: 'similar_transaction',
          usageCount: trans.count,
          reasoning: `Baseado em ${trans.count} transação(ões) similar(es) encontrada(s)`
        });
      });
    }

    // Ordenar por confiança
    suggestions.sort((a, b) => b.confidence - a.confidence);

    log.info({ count: suggestions.length }, 'Suggestions generated');

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        originalDescription: description,
        totalSuggestions: suggestions.length
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Error fetching suggestions');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API de sugestão de categorização',
    endpoint: '/api/categories/suggest',
    method: 'POST',
    body: {
      description: 'string (obrigatório) - Descrição da transação',
      amount: 'number (opcional) - Valor da transação',
      transactionType: 'string (opcional) - Tipo da transação (credit/debit)'
    },
    response: {
      suggestions: [
        {
          categoryId: 'string',
          categoryName: 'string',
          categoryType: 'string',
          confidence: 'number (0-1)',
          source: 'rule|similar_transaction|ai',
          reasoning: 'string'
        }
      ]
    },
    note: 'CompanyId é obtido automaticamente da sessão'
  });
}