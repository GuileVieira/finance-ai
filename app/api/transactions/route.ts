import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';
import TransactionsService, { TransactionFilters } from '@/lib/services/transactions.service';

// GET - Listar transações
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);

    // Parse filtros
    const filters: TransactionFilters & {
      page?: number;
      limit?: number;
    } = {};

    if (searchParams.get('accountId')) {
      filters.accountId = searchParams.get('accountId')!;
    }

    if (searchParams.get('companyId')) {
      filters.companyId = searchParams.get('companyId')!;
    }

    if (searchParams.get('categoryId')) {
      filters.categoryId = searchParams.get('categoryId')!;
    }

    if (searchParams.get('type')) {
      filters.type = searchParams.get('type') as 'credit' | 'debit';
    }

    if (searchParams.get('verified')) {
      filters.verified = searchParams.get('verified') === 'true';
    }

    if (searchParams.get('startDate')) {
      filters.startDate = searchParams.get('startDate')!;
    }

    if (searchParams.get('endDate')) {
      filters.endDate = searchParams.get('endDate')!;
    }

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    if (searchParams.get('page')) {
      filters.page = parseInt(searchParams.get('page')!, 10);
    }

    if (searchParams.get('limit')) {
      filters.limit = parseInt(searchParams.get('limit')!, 10);
    }

    console.log('📊 [TRANSACTIONS-API] Listando transações com filtros:', filters);

    // Verificar se é requisição de estatísticas
    if (searchParams.get('stats') === 'true') {
      const serviceStats = await TransactionsService.getTransactionStats(filters);

      // Converter formato do serviço para formato da API
      const apiStats = {
        total: Number(serviceStats.totalAmount) || 0,
        income: Number(serviceStats.totalCreditsValue) || 0,
        expenses: Number(serviceStats.totalDebitsValue) || 0,
        transactionCount: serviceStats.totalTransactions || 0,
        incomeCount: serviceStats.totalCredits || 0,
        expenseCount: serviceStats.totalDebits || 0
      };

      return NextResponse.json({
        success: true,
        data: { statistics: apiStats }
      });
    }

    // Listar transações
    const result = await TransactionsService.getTransactions(filters);

    console.log(`✅ Retornando ${result.transactions.length} transações`);

    // Garantir que o total seja um número
    const resultWithNumberTotal = {
      ...result,
      pagination: {
        ...result.pagination,
        total: Number(result.pagination.total)
      }
    };

    return NextResponse.json({
      success: true,
      data: resultWithNumberTotal
    });

  } catch (error) {
    console.error('❌ Erro ao listar transações:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// GET da documentação da API
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    message: 'API de Transações Financeiras',
    endpoint: '/api/transactions',
    method: 'GET',
    parameters: {
      accountId: 'string (opcional) - ID da conta bancária',
      companyId: 'string (opcional) - ID da empresa',
      categoryId: 'string (opcional) - ID da categoria',
      type: 'credit|debit (opcional) - Tipo da transação',
      verified: 'true|false (opcional) - Se a transação foi verificada',
      startDate: 'YYYY-MM-DD (opcional) - Data inicial',
      endDate: 'YYYY-MM-DD (opcional) - Data final',
      search: 'string (opcional) - Busca na descrição',
      page: 'number (opcional, padrão: 1) - Página atual',
      limit: 'number (opcional, padrão: 50) - Itens por página',
      stats: 'true (opcional) - Retorna estatísticas em vez da lista'
    },
    examples: {
      listTransactions: '/api/transactions?page=1&limit=20',
      filterByAccount: '/api/transactions?accountId=uuid-da-conta',
      filterByDateRange: '/api/transactions?startDate=2024-01-01&endDate=2024-12-31',
      searchTransactions: '/api/transactions?search=supermercado',
      getStatistics: '/api/transactions?stats=true&companyId=uuid-da-empresa'
    }
  });
}