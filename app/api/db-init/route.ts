import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { companies, accounts, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('db-init');

export async function POST(request: NextRequest) {
  // Desativar em produção
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint desativado em produção' }, { status: 404 });
  }

  try {
    log.info('Initializing data in PostgreSQL');

    // Verificar se empresa já existe
    const [existingCompany] = await db.select()
      .from(companies)
      .limit(1);

    let company;
    if (!existingCompany) {
      log.info('Creating default company');
      const [newCompany] = await db.insert(companies).values({
        name: 'Empresa Padrão',
        cnpj: '00000000000000',
        corporateName: 'Empresa Padrão LTDA',
        active: true
      }).returning();

      company = newCompany;
      log.info({ name: newCompany.name }, 'Company created');
    } else {
      company = existingCompany;
      log.info({ name: company.name }, 'Company already exists');
    }

    // Verificar se conta já existe
    const [existingAccount] = await db.select()
      .from(accounts)
      .where(eq(accounts.companyId, company.id))
      .limit(1);

    let account;
    if (!existingAccount) {
      log.info('Creating default account');
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
      log.info({ name: newAccount.name }, 'Account created');
    } else {
      account = existingAccount;
      log.info({ name: account.name }, 'Account already exists');
    }

    // Inserir categorias completas do mock-categories.ts se não existirem
    const existingCategories = await db.select()
      .from(categories)
      .where(eq(categories.companyId, company.id));

    if (existingCategories.length === 0) {
      log.info('Inserting categories from mock-categories.ts');

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
      log.info({ count: categoriesToInsert.length }, 'Categories inserted');
    } else {
      log.info({ count: existingCategories.length }, 'Categories already exist');
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
    log.error({ err: error }, 'Error initializing database');
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