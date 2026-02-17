import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts, companies, transactions, categories } from '@/lib/db/schema';
import { eq, desc, like, sum, sql, and, not, ilike } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('accounts');

// GET - Listar contas
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e obter companyId da sessão
    const session = await requireAuth();

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    // Permitir filtrar por companyId específico se passado na URL, 
    // senão usa o da sessão (comportamento padrão)
    const queryCompanyId = searchParams.get('companyId');
    const targetCompanyId = (queryCompanyId && queryCompanyId !== 'all') ? queryCompanyId : session.companyId;

    const active = searchParams.get('active');
    const search = searchParams.get('search');

    log.info({ targetCompanyId, active, search }, 'Listando contas');

    let query = db.select({
      id: accounts.id,
      companyId: accounts.companyId,
      name: accounts.name,
      bankName: accounts.bankName,
      bankCode: accounts.bankCode,
      agencyNumber: accounts.agencyNumber,
      accountNumber: accounts.accountNumber,
      accountType: accounts.accountType,
      openingBalance: accounts.openingBalance,
      active: accounts.active,
      lastSyncAt: accounts.lastSyncAt,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
      companyName: companies.name,
      companyCnpj: companies.cnpj
    })
      .from(accounts)
      .leftJoin(companies, eq(accounts.companyId, companies.id));

    // Filtros
    const conditions = [];

    // Se companyId fro diferente de 'all', filtra. Se for 'all', traz de todas.
    // Nota: Em produção, validar se o usuário TEM permissão para ver outras empresas.
    if (queryCompanyId !== 'all') {
      conditions.push(eq(accounts.companyId, targetCompanyId));
    }

    if (active !== null) {
      conditions.push(eq(accounts.active, active === 'true'));
    }
    if (search) {
      conditions.push(
        like(accounts.name, `%${search}%`)
      );
    }

    // Aplicar filtros
    query = query.where(and(...conditions));

    // Ordenação
    query = query.orderBy(desc(accounts.createdAt));

    const allAccounts = await query;

    log.info({ count: allAccounts.length }, 'Contas encontradas');

    // Buscar saldo calculado para cada conta (soma das transações)
    // EXCLUINDO transações de "Saldo Inicial" para evitar duplicação
    const accountBalances = await db
      .select({
        accountId: transactions.accountId,
        totalAmount: sum(transactions.amount).mapWith(Number),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(not(ilike(categories.name, 'Saldo Inicial')))
      .groupBy(transactions.accountId);

    // Criar mapa de saldos
    const balanceMap = new Map(
      accountBalances.map(b => [b.accountId, b.totalAmount || 0])
    );

    // Formatar contas com saldo calculado
    const formattedAccounts = allAccounts.map(account => {
      const transactionSum = balanceMap.get(account.id) || 0;
      const openingBalance = Number(account.openingBalance) || 0;
      const currentBalance = openingBalance + transactionSum;

      return {
        ...account,
        currentBalance, // Saldo atual = saldo inicial + soma das transações
        maskedAccountNumber: account.accountNumber
          ? `****${account.accountNumber.slice(-4)}`
          : '****'
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        accounts: formattedAccounts,
        total: formattedAccounts.length
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Erro ao listar contas');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// POST - Criar nova conta
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    await initializeDatabase();

    const body = await request.json();
    log.info({ body }, 'Criando nova conta');

    // Validações básicas
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nome da conta é obrigatório'
      }, { status: 400 });
    }

    if (!body.bankName || body.bankName.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nome do banco é obrigatório'
      }, { status: 400 });
    }

    if (!body.accountNumber || body.accountNumber.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Número da conta é obrigatório'
      }, { status: 400 });
    }

    // Criar conta com companyId fornecido ou da sessão
    const targetCompanyId = body.companyId || companyId;

    const [newAccount] = await db.insert(accounts).values({
      companyId: targetCompanyId,
      name: body.name.trim(),
      bankName: body.bankName.trim(),
      bankCode: body.bankCode?.trim() || null,
      agencyNumber: body.agencyNumber?.trim() || null,
      accountNumber: body.accountNumber.trim(),
      accountType: body.accountType?.trim() || 'checking',
      openingBalance: body.openingBalance || 0,
      active: body.active !== undefined ? body.active : true
    }).returning();

    log.info({ accountId: newAccount.id, name: newAccount.name }, 'Conta criada');

    return NextResponse.json({
      success: true,
      data: {
        account: newAccount,
        message: 'Conta criada com sucesso'
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Erro ao criar conta');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}