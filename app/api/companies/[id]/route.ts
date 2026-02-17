import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { companies, accounts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('companies');

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obter empresa por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    await initializeDatabase();

    const { id } = await params;

    log.info({ companyId: id }, 'Buscando empresa');

    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!company) {
      return NextResponse.json({
        success: false,
        error: 'Empresa não encontrada'
      }, { status: 404 });
    }

    // Buscar contas da empresa
    const companyAccounts = await db.select()
      .from(accounts)
      .where(eq(accounts.companyId, id))
      .orderBy(desc(accounts.createdAt));

    log.info({ name: company.name, accountsCount: companyAccounts.length }, 'Empresa encontrada');

    return NextResponse.json({
      success: true,
      data: {
        company,
        accounts: companyAccounts
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao buscar empresa');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// PUT - Atualizar empresa
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    await initializeDatabase();

    const { id } = await params;
    const body = await request.json();

    log.info({ companyId: id, body }, 'Atualizando empresa');

    // Verificar se empresa existe
    const [existingCompany] = await db.select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!existingCompany) {
      return NextResponse.json({
        success: false,
        error: 'Empresa não encontrada'
      }, { status: 404 });
    }

    // Verificar se CNPJ já existe (se estiver sendo alterado)
    if (body.cnpj && body.cnpj !== existingCompany.cnpj) {
      const [duplicateCompany] = await db.select()
        .from(companies)
        .where(eq(companies.cnpj, body.cnpj))
        .limit(1);

      if (duplicateCompany) {
        return NextResponse.json({
          success: false,
          error: 'Já existe uma empresa com este CNPJ'
        }, { status: 409 });
      }
    }

    // Preparar dados para atualização
    const updateData: any = {};
    const allowedFields = [
      'name', 'corporateName', 'phone', 'email', 'address',
      'city', 'state', 'zipCode', 'industry', 'monthlyRevenueRange', 'active'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'cnpj') {
          updateData[field] = body[field].replace(/\D/g, '');
        } else if (typeof body[field] === 'string') {
          updateData[field] = body[field].trim() || null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    updateData.updatedAt = new Date();

    // Atualizar empresa
    const [updatedCompany] = await db.update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();

    log.info({ name: updatedCompany.name }, 'Empresa atualizada');

    return NextResponse.json({
      success: true,
      data: {
        company: updatedCompany,
        message: 'Empresa atualizada com sucesso'
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao atualizar empresa');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// DELETE - Desativar empresa
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    await initializeDatabase();

    const { id } = await params;

    log.info({ companyId: id }, 'Desativando empresa');

    // Verificar se empresa existe
    const [existingCompany] = await db.select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (!existingCompany) {
      return NextResponse.json({
        success: false,
        error: 'Empresa não encontrada'
      }, { status: 404 });
    }

    // Soft delete - apenas desativar
    const [deactivatedCompany] = await db.update(companies)
      .set({
        active: false,
        updatedAt: new Date()
      })
      .where(eq(companies.id, id))
      .returning();

    log.info({ name: deactivatedCompany.name }, 'Empresa desativada');

    return NextResponse.json({
      success: true,
      data: {
        company: deactivatedCompany,
        message: 'Empresa desativada com sucesso'
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Erro ao desativar empresa');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}