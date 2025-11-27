/**
 * Rule Preview API
 *
 * Endpoint para preview de regras antes de criá-las:
 * - Gera padrões inteligentes a partir de uma descrição
 * - Mostra transações que seriam afetadas por um padrão
 * - Valida padrões antes da criação
 */

import { NextRequest, NextResponse } from 'next/server';
import { RuleGenerationService } from '@/lib/services/rule-generation.service';
import { TransactionClusteringService } from '@/lib/services/transaction-clustering.service';
import { db } from '@/lib/db/drizzle';
import { transactions, categories } from '@/lib/db/schema';
import { eq, sql, like } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';

interface PreviewRequest {
  description: string;
  pattern?: string;
  ruleType?: 'contains' | 'wildcard' | 'exact' | 'regex';
}

interface PatternMatch {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  currentCategory: string | null;
}

/**
 * POST /api/categories/rules/preview
 *
 * Gera preview de regras para uma descrição
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const body: PreviewRequest = await request.json();

    if (!body.description && !body.pattern) {
      return NextResponse.json(
        {
          success: false,
          error: 'description or pattern is required'
        },
        { status: 400 }
      );
    }
    const results: {
      suggestedPatterns: ReturnType<typeof RuleGenerationService.extractPattern>['alternativePatterns'];
      bestPattern: {
        pattern: string;
        strategy: string;
        ruleType: string;
        confidence: number;
      } | null;
      affectedTransactions: PatternMatch[];
      similarTransactions: Awaited<ReturnType<typeof TransactionClusteringService.findSimilarTransactions>>;
      validation: {
        isValid: boolean;
        reason?: string;
      };
    } = {
      suggestedPatterns: [],
      bestPattern: null,
      affectedTransactions: [],
      similarTransactions: [],
      validation: { isValid: true }
    };

    // 1. Se descrição foi fornecida, gerar padrões sugeridos
    if (body.description) {
      const extraction = RuleGenerationService.extractPattern(body.description);

      results.suggestedPatterns = extraction.alternativePatterns || [];
      results.bestPattern = {
        pattern: extraction.pattern,
        strategy: extraction.strategy || 'fallback',
        ruleType: extraction.pattern.includes('*') ? 'wildcard' : 'contains',
        confidence: extraction.isValid ? 0.85 : 0.5
      };
      results.validation = {
        isValid: extraction.isValid,
        reason: extraction.reason
      };

      // Buscar transações similares
      results.similarTransactions = await TransactionClusteringService.findSimilarTransactions(
        body.description,
        companyId,
        20
      );
    }

    // 2. Se padrão foi fornecido (ou gerado), buscar transações afetadas
    const patternToTest = body.pattern || results.bestPattern?.pattern;
    const ruleType = body.ruleType || results.bestPattern?.ruleType || 'contains';

    if (patternToTest) {
      results.affectedTransactions = await findMatchingTransactions(
        patternToTest,
        ruleType,
        50
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        description: body.description,
        testedPattern: patternToTest,
        testedRuleType: ruleType,
        affectedCount: results.affectedTransactions.length,
        suggestedPatternsCount: results.suggestedPatterns?.length || 0
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[RULE-PREVIEW-API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate rule preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Encontra transações que seriam afetadas por um padrão
 */
async function findMatchingTransactions(
  pattern: string,
  ruleType: string,
  limit: number = 50
): Promise<PatternMatch[]> {
  try {
    // Construir condição SQL baseada no tipo de regra
    let whereCondition;

    switch (ruleType) {
      case 'exact':
        whereCondition = eq(
          sql`UPPER(${transactions.description})`,
          pattern.toUpperCase()
        );
        break;

      case 'contains':
        whereCondition = like(
          sql`UPPER(${transactions.description})`,
          `%${pattern.toUpperCase()}%`
        );
        break;

      case 'wildcard':
        // Converter wildcard para LIKE pattern
        const likePattern = pattern
          .toUpperCase()
          .replace(/\*/g, '%')
          .replace(/\?/g, '_');
        whereCondition = like(
          sql`UPPER(${transactions.description})`,
          likePattern
        );
        break;

      case 'regex':
        // PostgreSQL regex match
        whereCondition = sql`${transactions.description} ~* ${pattern}`;
        break;

      default:
        whereCondition = like(
          sql`UPPER(${transactions.description})`,
          `%${pattern.toUpperCase()}%`
        );
    }

    // Buscar transações
    const matchingTx = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        categoryId: transactions.categoryId,
        categoryName: categories.name
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereCondition)
      .limit(limit);

    return matchingTx.map(tx => ({
      transactionId: tx.id,
      description: tx.description,
      amount: parseFloat(tx.amount),
      date: tx.transactionDate,
      currentCategory: tx.categoryName
    }));

  } catch (error) {
    console.error('Error finding matching transactions:', error);
    return [];
  }
}

/**
 * GET /api/categories/rules/preview/test
 *
 * Testa um padrão específico contra transações existentes
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern');
    const ruleType = searchParams.get('ruleType') || 'contains';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!pattern) {
      return NextResponse.json(
        {
          success: false,
          error: 'pattern query parameter is required'
        },
        { status: 400 }
      );
    }

    const matches = await findMatchingTransactions(pattern, ruleType, limit);

    return NextResponse.json({
      success: true,
      data: {
        pattern,
        ruleType,
        matchCount: matches.length,
        matches
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[RULE-PREVIEW-API] Error testing pattern:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test pattern',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
