import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts, companies, transactions } from '@/lib/db/schema';
import { eq, desc, like, sum, sql, and } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import { requireAuth } from '@/lib/auth/get-session';

// GET - Listar contas
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e obter companyId da sessão
    const session = await requireAuth();

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    // FORÇAR companyId da sessão - ignorar query string
    const companyId = session.companyId;
    const active = searchParams.get('active');
    const search = searchParams.get('search');

    console.log('🏦 [ACCOUNTS-API] Listando contas:', { companyId, active, search });

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

    // Filtros - SEMPRE filtrar por companyId da sessão
    const conditions = [eq(accounts.companyId, companyId)];

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

    console.log(`✅ Encontradas ${allAccounts.length} contas`);

    // Buscar saldo calculado para cada conta (soma das transações)
    const accountBalances = await db
      .select({
        accountId: transactions.accountId,
        totalAmount: sum(transactions.amount).mapWith(Number),
      })
      .from(transactions)
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
    console.error('❌ Erro ao listar contas:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// POST - Criar nova conta
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const body = await request.json();
    console.log('🏦 [ACCOUNTS-API] Criando nova conta:', body);

    // Validações básicas
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nome da conta é obrigatório'
      }, { status: 400 });
    }

    if (!body.companyId) {
      return NextResponse.json({
        success: false,
        error: 'ID da empresa é obrigatório'
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

    // Verificar se empresa existe
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, body.companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json({
        success: false,
        error: 'Empresa não encontrada'
      }, { status: 404 });
    }

    // Criar conta
    const [newAccount] = await db.insert(accounts).values({
      companyId: body.companyId,
      name: body.name.trim(),
      bankName: body.bankName.trim(),
      bankCode: body.bankCode?.trim() || null,
      agencyNumber: body.agencyNumber?.trim() || null,
      accountNumber: body.accountNumber.trim(),
      accountType: body.accountType?.trim() || 'checking',
      openingBalance: body.openingBalance || 0,
      active: body.active !== undefined ? body.active : true
    }).returning();

    console.log(`✅ Conta criada: ${newAccount.name} (${newAccount.id})`);

    return NextResponse.json({
      success: true,
      data: {
        account: newAccount,
        company: {
          id: company.id,
          name: company.name,
          cnpj: company.cnpj
        },
        message: 'Conta criada com sucesso'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Erro ao criar conta:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}