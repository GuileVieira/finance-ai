import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { companies, accounts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obter empresa por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();

    const { id } = await params;

    console.log(`🏢 [COMPANIES-API] Buscando empresa: ${id}`);

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

    console.log(`✅ Empresa encontrada: ${company.name} com ${companyAccounts.length} contas`);

    return NextResponse.json({
      success: true,
      data: {
        company,
        accounts: companyAccounts
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar empresa:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// PUT - Atualizar empresa
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();

    const { id } = await params;
    const body = await request.json();

    console.log(`🏢 [COMPANIES-API] Atualizando empresa ${id}:`, body);

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
      'city', 'state', 'zipCode', 'industry', 'active'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'cnpj') {
          updateData[field] = body[field].replace(/\D/g, '');
        } else {
          updateData[field] = body[field]?.trim() || null;
        }
      }
    }

    updateData.updatedAt = new Date();

    // Atualizar empresa
    const [updatedCompany] = await db.update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();

    console.log(`✅ Empresa atualizada: ${updatedCompany.name}`);

    return NextResponse.json({
      success: true,
      data: {
        company: updatedCompany,
        message: 'Empresa atualizada com sucesso'
      }
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar empresa:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// DELETE - Desativar empresa
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();

    const { id } = await params;

    console.log(`🏢 [COMPANIES-API] Desativando empresa: ${id}`);

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

    console.log(`✅ Empresa desativada: ${deactivatedCompany.name}`);

    return NextResponse.json({
      success: true,
      data: {
        company: deactivatedCompany,
        message: 'Empresa desativada com sucesso'
      }
    });

  } catch (error) {
    console.error('❌ Erro ao desativar empresa:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}