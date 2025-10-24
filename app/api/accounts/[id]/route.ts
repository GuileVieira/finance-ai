import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts, companies, transactions } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obter conta por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();

    const { id } = await params;

    console.log(`🏦 [ACCOUNTS-API] Buscando conta: ${id}`);

    const [account] = await db.select({
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
    .leftJoin(companies, eq(accounts.companyId, companies.id))
    .where(eq(accounts.id, id))
    .limit(1);

    if (!account) {
      return NextResponse.json({
        success: false,
        error: 'Conta não encontrada'
      }, { status: 404 });
    }

    // Buscar estatísticas de transações
    const [transactionStats] = await db.select({
      totalTransactions: count(),
      totalCredits: count(),
      totalDebits: count()
    })
    .from(transactions)
    .where(eq(transactions.accountId, id));

    console.log(`✅ Conta encontrada: ${account.name}`);

    return NextResponse.json({
      success: true,
      data: {
        account,
        statistics: {
          totalTransactions: transactionStats?.totalTransactions || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar conta:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// PUT - Atualizar conta
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();

    const { id } = await params;
    const body = await request.json();

    console.log(`🏦 [ACCOUNTS-API] Atualizando conta ${id}:`, body);

    // Verificar se conta existe
    const [existingAccount] = await db.select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);

    if (!existingAccount) {
      return NextResponse.json({
        success: false,
        error: 'Conta não encontrada'
      }, { status: 404 });
    }

    // Se estiver mudando a empresa, verificar se a nova empresa existe
    if (body.companyId && body.companyId !== existingAccount.companyId) {
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
    }

    // Preparar dados para atualização
    const updateData: any = {};
    const allowedFields = [
      'companyId', 'name', 'bankName', 'bankCode',
      'agencyNumber', 'accountNumber', 'accountType',
      'openingBalance', 'active', 'lastSyncAt'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]?.trim() || null;
      }
    }

    updateData.updatedAt = new Date();

    // Atualizar conta
    const [updatedAccount] = await db.update(accounts)
      .set(updateData)
      .where(eq(accounts.id, id))
      .returning();

    console.log(`✅ Conta atualizada: ${updatedAccount.name}`);

    return NextResponse.json({
      success: true,
      data: {
        account: updatedAccount,
        message: 'Conta atualizada com sucesso'
      }
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar conta:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// DELETE - Desativar conta
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();

    const { id } = await params;

    console.log(`🏦 [ACCOUNTS-API] Desativando conta: ${id}`);

    // Verificar se conta existe
    const [existingAccount] = await db.select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);

    if (!existingAccount) {
      return NextResponse.json({
        success: false,
        error: 'Conta não encontrada'
      }, { status: 404 });
    }

    // Soft delete - apenas desativar
    const [deactivatedAccount] = await db.update(accounts)
      .set({
        active: false,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, id))
      .returning();

    console.log(`✅ Conta desativada: ${deactivatedAccount.name}`);

    return NextResponse.json({
      success: true,
      data: {
        account: deactivatedAccount,
        message: 'Conta desativada com sucesso'
      }
    });

  } catch (error) {
    console.error('❌ Erro ao desativar conta:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}