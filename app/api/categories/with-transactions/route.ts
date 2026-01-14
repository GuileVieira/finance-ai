import { NextRequest, NextResponse } from 'next/server';
import { CategoryFilters, CategoryWithStats, CategoryType } from '@/lib/api/categories';
import { db } from '@/lib/db/drizzle';
import { categories, transactions } from '@/lib/db/schema';
import { eq, desc, isNull, count, sum, sql, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters = {
      type: searchParams.get('type') as any,
      companyId, // Always from session
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      includeStats: searchParams.get('includeStats') === 'true',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') as any || 'totalAmount',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined
    };

    // Buscar categorias com transações associadas usando query direta
    const whereConditions = [
      eq(categories.companyId, companyId)
    ];

    if (filters.type && filters.type !== 'all') {
      whereConditions.push(eq(categories.type, filters.type));
    }

    if (filters.isActive !== undefined) {
      whereConditions.push(eq(categories.active, filters.isActive));
    }

    // Buscar categorias ativas com estatísticas
    const categoriesWithStats = await db
      .select({
        id: categories.id,
        companyId: categories.companyId,
        name: categories.name,
        description: categories.description,
        type: categories.type,
        parentType: categories.parentType,
        parentCategoryId: categories.parentCategoryId,
        colorHex: categories.colorHex,
        categoryGroup: categories.categoryGroup,
        dreGroup: categories.dreGroup,
        icon: categories.icon,
        examples: categories.examples,
        isSystem: categories.isSystem,
        active: categories.active,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        transactionCount: count(transactions.id).mapWith(Number),
        totalAmount: sum(transactions.amount).mapWith(Number),
      })
      .from(categories)
      .leftJoin(transactions,
        and(
          eq(categories.id, transactions.categoryId),
          filters.startDate ? gte(transactions.transactionDate, filters.startDate) : undefined,
          filters.endDate ? lte(transactions.transactionDate, filters.endDate) : undefined
        )
      )
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(categories.id)
      .orderBy(desc(sum(transactions.amount)));

    // Filtrar apenas categorias com transações
    const categoriesWithTransactions = categoriesWithStats.filter(cat =>
      cat.transactionCount && cat.transactionCount > 0
    );

    // Calcular o total geral de todas as categorias
    const grandTotal = categoriesWithTransactions.reduce((total, cat) => {
      return total + Math.abs(cat.totalAmount || 0);
    }, 0);

    // Formatar resultado para o formato esperado
    const formattedCategories: CategoryWithStats[] = categoriesWithTransactions.map(cat => {
      const transactionCount = cat.transactionCount || 0;
      const totalAmount = Math.abs(cat.totalAmount || 0);
      const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;
      const percentage = grandTotal > 0 ? (totalAmount / grandTotal) * 100 : 0;

      return {
        id: cat.id,
        companyId: cat.companyId!,
        name: cat.name,
        description: cat.description || undefined,
        type: cat.type as CategoryType,
        parentType: cat.parentType,
        parentCategoryId: cat.parentCategoryId,
        colorHex: cat.colorHex,
        categoryGroup: cat.categoryGroup,
        dreGroup: cat.dreGroup,
        icon: cat.icon,
        examples: cat.examples as string[] | undefined,
        isSystem: cat.isSystem,
        active: cat.active,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        transactionCount,
        totalAmount,
        percentage,
        averageAmount,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedCategories,
      count: formattedCategories.length
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    // Se não houver empresa configurada, retorna lista vazia ao invés de erro
    if (error instanceof Error && (error.message.includes('companyId') || error.message.includes('empresa'))) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      });
    }

    console.error('[CATEGORIES-WITH-TRANSACTIONS-API] Error fetching categories with transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories with transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}