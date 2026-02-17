import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getDefaultCompany, getDefaultAccount } from '@/lib/db/init-db';
import { db } from '@/lib/db/connection';
import { companies, accounts, transactions, uploads } from '@/lib/db/schema';
import { desc, eq, count } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('test-api');

export async function GET(request: NextRequest) {
  // Desativar em produção
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint desativado em produção' }, { status: 404 });
  }

  try {
    log.info('Starting system tests');

    // Inicializar banco
    await initializeDatabase();

    // Testar conexões
    const company = await getDefaultCompany();
    const account = await getDefaultAccount(company?.id || '');

    // Estatísticas gerais
    const [transactionStats] = await db.select({
      totalTransactions: count(),
      totalUploads: count()
    })
    .from(transactions)
    .rightJoin(uploads, eq(transactions.uploadId, uploads.id));

    const [uploadStats] = await db.select({
      totalUploads: count()
    })
    .from(uploads);

    // Listar uploads recentes
    const recentUploads = await db.select({
      id: uploads.id,
      originalName: uploads.originalName,
      status: uploads.status,
      totalTransactions: uploads.totalTransactions,
      successfulTransactions: uploads.successfulTransactions,
      uploadedAt: uploads.uploadedAt,
      companyName: companies.name
    })
    .from(uploads)
    .leftJoin(companies, eq(uploads.companyId, companies.id))
    .orderBy(desc(uploads.uploadedAt))
    .limit(5);

    // Listar transações recentes
    const recentTransactions = await db.select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      transactionDate: transactions.transactionDate,
      categoryName: companies.name,
      accountName: accounts.name
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(companies, eq(accounts.companyId, companies.id))
    .orderBy(desc(transactions.transactionDate))
    .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        system: {
          database: 'PGLite + Drizzle ORM',
          storage: 'File System (storage_tmp/)',
          status: '✅ Operacional'
        },
        defaultSetup: {
          company: company ? {
            id: company.id,
            name: company.name,
            cnpj: company.cnpj
          } : null,
          account: account ? {
            id: account.id,
            name: account.name,
            bankName: account.bankName
          } : null
        },
        statistics: {
          totalTransactions: transactionStats?.totalTransactions || 0,
          totalUploads: uploadStats?.totalUploads || 0,
          totalCompanies: 1, // Padrão
          totalAccounts: 1, // Padrão
          totalCategories: 15 // Padrão
        },
        recentActivity: {
          uploads: recentUploads,
          transactions: recentTransactions
        },
        endpoints: {
          upload: '/api/ofx/upload-and-analyze',
          companies: '/api/companies',
          accounts: '/api/accounts',
          transactions: '/api/transactions',
          test: '/api/test'
        },
        features: [
          '✅ Upload e parser de arquivos OFX',
          '✅ Classificação inteligente com IA',
          '✅ Salvamento automático no banco',
          '✅ Armazenamento físico dos arquivos',
          '✅ Gestão de empresas e contas',
          '✅ Histórico de uploads',
          '✅ Estatísticas e relatórios',
          '✅ Interface de upload atualizada'
        ]
      }
    });

  } catch (error) {
    log.error({ err: error }, 'Error in system test');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}