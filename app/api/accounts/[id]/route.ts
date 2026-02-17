import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts, companies, transactions } from '@/lib/db/schema';
import { eq, desc, count, and } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('accounts');

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obter conta por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId } = await requireAuth();
    await initializeDatabase();

    const { id } = await params;

    log.info({ accountId: id }, 'Buscando conta');

    // Buscar conta verificando que pertence à empresa do usuário
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
      .where(and(eq(accounts.id, id), eq(accounts.companyId, companyId)))
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

    log.info({ name: account.name }, 'Conta encontrada');

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
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Erro ao buscar conta');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// PUT - Atualizar conta
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId } = await requireAuth();
    await initializeDatabase();

    const { id } = await params;
    const body = await request.json();

    log.info({ accountId: id, body }, 'Atualizando conta');

    // Verificar se conta existe E pertence à empresa do usuário
    const [existingAccount] = await db.select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.companyId, companyId)))
      .limit(1);

    if (!existingAccount) {
      return NextResponse.json({
        success: false,
        error: 'Conta não encontrada'
      }, { status: 404 });
    }

    // Preparar dados para atualização (NÃO permitir mudança de companyId)
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'companyId',
      'name', 'bankName', 'bankCode',
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

    log.info({ name: updatedAccount.name }, 'Conta atualizada');

    return NextResponse.json({
      success: true,
      data: {
        account: updatedAccount,
        message: 'Conta atualizada com sucesso'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Erro ao atualizar conta');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// DELETE - Desativar conta
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId } = await requireAuth();
    await initializeDatabase();

    const { id } = await params;

    log.info({ accountId: id }, 'Desativando conta');

    // Verificar se conta existe E pertence à empresa do usuário
    const [existingAccount] = await db.select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.companyId, companyId)))
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

    log.info({ name: deactivatedAccount.name }, 'Conta desativada');

    return NextResponse.json({
      success: true,
      data: {
        account: deactivatedAccount,
        message: 'Conta desativada com sucesso'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Erro ao desativar conta');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}