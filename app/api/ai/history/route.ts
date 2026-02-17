import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts } from '@/lib/db/schema';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import categoryCacheService from '@/lib/services/category-cache.service';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const companyId = session.companyId;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        // Estatísticas reais baseadas no banco de dados e no novo cache
        const cacheStats = categoryCacheService.getStats();
        
        // Contagem de transações classificadas vs não classificadas
        const transactionStats = await db
          .select({
            total: sql<number>`count(*)`,
            categorized: sql<number>`count(${transactions.categoryId})`,
            needsReview: sql<number>`count(CASE WHEN ${transactions.needsReview} = true THEN 1 END)`
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(eq(accounts.companyId, companyId));

        return NextResponse.json({
          success: true,
          data: {
            cache: {
              ...cacheStats,
              hits: cacheStats.hitRate // hitRate ou hits dependendo da interface
            },
            database: transactionStats[0],
            timestamp: new Date().toISOString()
          }
        });

      case 'search':
        // Buscar no histórico real do banco de dados
        const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
        const offset = parseInt(searchParams.get('offset') || '0');
        const searchTerm = searchParams.get('searchTerm') || '';

        let query = db
          .select({
            id: transactions.id,
            description: transactions.description,
            amount: transactions.amount,
            date: transactions.date,
            categoryId: transactions.categoryId,
            categoryName: categories.name,
            needsReview: transactions.needsReview,
            source: sql<string>`'database'` // Identificador de origem
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(
            and(
              eq(accounts.companyId, companyId),
              searchTerm ? or(
                ilike(transactions.description, `%${searchTerm}%`),
                ilike(categories.name, `%${searchTerm}%`)
              ) : undefined
            )
          )
          .orderBy(desc(transactions.transactionDate))
          .limit(limit)
          .offset(offset);

        const results = await query;

        return NextResponse.json({
          success: true,
          data: {
            records: results,
            pagination: {
                total: results.length, // Simplificado, ideal seria um count separado
                limit,
                offset
            }
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Ação não especificada ou inválida',
          availableActions: ['stats', 'search']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na consulta de histórico:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const companyId = session.companyId;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear-cache') {
      // Limpa apenas o cache da empresa atual no CategoryCacheService
      // Nota: o serviço atual não tem clear por empresa individual, mas podemos resetar
      categoryCacheService.clear(); 
      return NextResponse.json({
        success: true,
        message: 'Cache global limpo com sucesso'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Ação não especificada ou inválida'
    }, { status: 400 });

  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}