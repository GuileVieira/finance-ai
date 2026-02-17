import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import { db } from '@/lib/db/connection';
import { categories, transactions } from '@/lib/db/schema';
import { eq, isNull, desc, sql, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('categories-distinct');

export interface CategoryResponse {
  id: string;
  name: string;
  type: string;
  colorHex: string;
  transactionCount: number;
}

// GET - Buscar categorias distintas usadas nas transações
export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const includeEmpty = searchParams.get('includeEmpty');

    log.info({ includeEmpty, companyId }, 'Fetching distinct categories');

    // Buscar categorias que têm transações (usando DISTINCT)
    let query = db
      .select({
        id: categories.id,
        name: categories.name,
        type: categories.type,
        colorHex: categories.colorHex,
        transactionCount: sql<number>`count(*)`.as('transactionCount')
      })
      .from(categories)
      .innerJoin(transactions, eq(categories.id, transactions.categoryId))
      .where(and(
        eq(categories.companyId, companyId),
        eq(transactions.companyId, companyId)
      ))
      .groupBy(categories.id, categories.name, categories.type, categories.colorHex)
      .orderBy(sql`count(*) DESC`);

    // Se includeEmpty=true, inclui categorias sem transações
    if (includeEmpty === 'true') {
      const emptyCategoriesQuery = db
        .select({
          id: categories.id,
          name: categories.name,
          type: categories.type,
          colorHex: categories.colorHex,
          transactionCount: sql<number>`0`.as('transactionCount')
        })
        .from(categories)
        .leftJoin(transactions, eq(categories.id, transactions.categoryId))
        .where(and(
          eq(categories.companyId, companyId),
          isNull(transactions.categoryId)
        ));

      const emptyCategories = await emptyCategoriesQuery;

      // Mesclar categorias com transações e sem transações
      const allCategories = [...emptyCategories, ...query];

      return NextResponse.json({
        success: true,
        data: allCategories
      });
    }

    const distinctCategories = await query;

    log.info({ count: distinctCategories.length }, 'Found distinct categories');

    return NextResponse.json({
      success: true,
      data: distinctCategories
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Error fetching distinct categories');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// GET da documentação da API
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    message: 'API de Categorias Distintas',
    endpoint: '/api/categories/distinct',
    method: 'GET',
    parameters: {
      includeEmpty: 'boolean (opcional) - Incluir categorias sem transações',
    },
    description: 'Retorna todas as categorias usadas nas transações do usuário',
    response: {
      id: 'string - UUID único da categoria',
      name: 'string - Nome da categoria',
      type: 'string - Tipo da categoria (revenue, variable_cost, fixed_cost, non_operational)',
      colorHex: 'string - Cor hexadecimal para UI',
      transactionCount: 'number - Quantidade de transações nesta categoria'
    },
    examples: {
      usedCategories: '/api/categories/distinct',
      allCategories: '/api/categories/distinct?includeEmpty=true',
      filters: 'Não aplica filtros - retorna categorias ordenadas por uso'
    }
  });
}