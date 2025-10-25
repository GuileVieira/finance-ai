import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts, companies } from '@/lib/db/schema';
import { eq, desc, like } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';

// GET - Listar contas
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
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

    // Filtros
    const conditions = [];
    if (companyId) {
      conditions.push(eq(accounts.companyId, companyId));
    }
    if (active !== null) {
      conditions.push(eq(accounts.active, active === 'true'));
    }
    if (search) {
      conditions.push(
        like(accounts.name, `%${search}%`)
      );
    }

    // Aplicar filtros se existirem
    if (conditions.length > 0) {
      query = query.where(
        conditions.length === 1
          ? conditions[0]
          : // @ts-ignore
            conditions.reduce((acc, condition) => acc && condition)
      );
    }

    // Ordenação
    query = query.orderBy(desc(accounts.createdAt));

    const allAccounts = await query;

    console.log(`✅ Encontradas ${allAccounts.length} contas`);

    // Formatar número da conta para mostrar apenas últimos dígitos
    const formattedAccounts = allAccounts.map(account => ({
      ...account,
      maskedAccountNumber: account.accountNumber
        ? `****${account.accountNumber.slice(-4)}`
        : '****'
    }));

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