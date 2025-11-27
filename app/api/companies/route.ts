import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { companies } from '@/lib/db/schema';
import { eq, desc, like } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import { requireAuth } from '@/lib/auth/get-session';

// GET - Listar empresas
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const search = searchParams.get('search');

    console.log('🏢 [COMPANIES-API] Listando empresas:', { active, search });

    let query = db.select().from(companies);

    // Filtros
    const conditions = [];
    if (active !== null) {
      conditions.push(eq(companies.active, active === 'true'));
    }
    if (search) {
      conditions.push(like(companies.name, `%${search}%`));
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
    query = query.orderBy(desc(companies.createdAt));

    const allCompanies = await query;

    console.log(`✅ Encontradas ${allCompanies.length} empresas`);

    return NextResponse.json({
      success: true,
      data: {
        companies: allCompanies,
        total: allCompanies.length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar empresas:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// POST - Criar nova empresa
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    await initializeDatabase();

    const body = await request.json();
    console.log('🏢 [COMPANIES-API] Criando nova empresa:', body);

    // Validações básicas
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nome da empresa é obrigatório'
      }, { status: 400 });
    }

    if (!body.cnpj || body.cnpj.length !== 14) {
      return NextResponse.json({
        success: false,
        error: 'CNPJ deve ter 14 dígitos'
      }, { status: 400 });
    }

    // Verificar se CNPJ já existe
    const existingCompany = await db.select()
      .from(companies)
      .where(eq(companies.cnpj, body.cnpj))
      .limit(1);

    if (existingCompany.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Já existe uma empresa com este CNPJ'
      }, { status: 409 });
    }

    // Criar empresa
    const [newCompany] = await db.insert(companies).values({
      name: body.name.trim(),
      cnpj: body.cnpj.replace(/\D/g, ''), // remover formatação
      corporateName: body.corporateName?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      zipCode: body.zipCode?.trim() || null,
      industry: body.industry?.trim() || null,
      active: body.active !== undefined ? body.active : true
    }).returning();

    console.log(`✅ Empresa criada: ${newCompany.name} (${newCompany.id})`);

    return NextResponse.json({
      success: true,
      data: {
        company: newCompany,
        message: 'Empresa criada com sucesso'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Erro ao criar empresa:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}