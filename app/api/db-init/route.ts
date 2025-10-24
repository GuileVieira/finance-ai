import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { companies, accounts, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [DB-INIT] Inicializando dados no PostgreSQL...');

    // Verificar se empresa já existe
    const [existingCompany] = await db.select()
      .from(companies)
      .limit(1);

    let company;
    if (!existingCompany) {
      console.log('🏢 Criando empresa padrão...');
      const [newCompany] = await db.insert(companies).values({
        name: 'Empresa Padrão',
        cnpj: '00000000000000',
        corporateName: 'Empresa Padrão LTDA',
        active: true
      }).returning();

      company = newCompany;
      console.log('✅ Empresa criada:', newCompany.name);
    } else {
      company = existingCompany;
      console.log('✅ Empresa já existe:', company.name);
    }

    // Verificar se conta já existe
    const [existingAccount] = await db.select()
      .from(accounts)
      .where(eq(accounts.companyId, company.id))
      .limit(1);

    let account;
    if (!existingAccount) {
      console.log('🏦 Criando conta padrão...');
      const [newAccount] = await db.insert(accounts).values({
        companyId: company.id,
        name: 'Conta Principal',
        bankName: 'Banco Exemplo',
        bankCode: '001',
        accountNumber: '12345-6',
        accountType: 'checking',
        active: true
      }).returning();

      account = newAccount;
      console.log('✅ Conta criada:', newAccount.name);
    } else {
      account = existingAccount;
      console.log('✅ Conta já existe:', account.name);
    }

    // Inserir categorias completas do mock-categories.ts se não existirem
    const existingCategories = await db.select()
      .from(categories)
      .where(eq(categories.companyId, company.id));

    if (existingCategories.length === 0) {
      console.log('📊 Inserindo categorias completas do mock-categories.ts...');

      // Importar dados completos do mockCategories
      const { mockCategories } = await import('@/lib/mock-categories');

      const categoriesToInsert = mockCategories.map(cat => ({
        companyId: company.id,
        name: cat.name,
        description: cat.description,
        type: cat.type,
        colorHex: cat.color,
        icon: cat.icon,
        examples: cat.examples,
        isSystem: true,
        active: true
      }));

      await db.insert(categories).values(categoriesToInsert);
      console.log(`✅ ${categoriesToInsert.length} categorias completas inseridas`);
    } else {
      console.log('✅ Categorias já existem:', existingCategories.length);
    }

    // Retornar estatísticas
    const [finalStats] = await db.select({
      companies: { count: 1 },
      categories: { count: 1 },
      transactions: { count: 1 }
    })
    .from(companies);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Dados inicializados com sucesso!',
        company: {
          id: company.id,
          name: company.name,
          cnpj: company.cnpj
        },
        account: {
          id: account.id,
          name: account.name,
          bankName: account.bankName
        },
        statistics: {
          companies: finalStats.companies,
          categories: finalStats.categories,
          transactions: finalStats.transactions
        }
      }
    });

  } catch (error) {
    console.error('❌ [DB-INIT] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar estatísticas atuais
    const [stats] = await db.select({
      companies: { count: 1 },
      accounts: { count: 1 },
      categories: { count: 1 },
      transactions: { count: 1 }
    })
    .from(companies);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Status atual do banco de dados',
        statistics: stats[0],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}