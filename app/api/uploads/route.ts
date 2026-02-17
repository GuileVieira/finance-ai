import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { uploads, companies, accounts } from '@/lib/db/schema';
import { eq, desc, and, or, ilike } from 'drizzle-orm';
import { initializeDatabase, getDefaultCompany } from '@/lib/db/init-db';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('uploads-api');

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();

    log.info('New upload listing request');

    // Inicializar banco de dados se necessário
    await initializeDatabase();

    // Obter empresa do usuário autenticado
    const [defaultCompany] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!defaultCompany) {
      return NextResponse.json({
        success: false,
        error: 'Empresa não encontrada.'
      }, { status: 400 });
    }

    log.info({ companyName: defaultCompany.name, companyId: defaultCompany.id }, 'Listing uploads for company');

    // Parse dos query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const fileType = searchParams.get('fileType');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Construir filtros
    const filters = [eq(uploads.companyId, defaultCompany.id)];

    if (status) {
      filters.push(eq(uploads.status, status));
    }

    if (fileType) {
      filters.push(eq(uploads.fileType, fileType));
    }

    if (search) {
      filters.push(
        or(
          ilike(uploads.originalName, `%${search}%`),
          ilike(uploads.filename, `%${search}%`)
        )
      );
    }

    // Buscar uploads com paginação
    const [uploadsList, totalCount] = await Promise.all([
      db.select({
        id: uploads.id,
        filename: uploads.filename,
        originalName: uploads.originalName,
        fileType: uploads.fileType,
        fileSize: uploads.fileSize,
        filePath: uploads.filePath,
        fileHash: uploads.fileHash,
        storageProvider: uploads.storageProvider,
        status: uploads.status,
        totalTransactions: uploads.totalTransactions,
        successfulTransactions: uploads.successfulTransactions,
        failedTransactions: uploads.failedTransactions,
        uploadedAt: uploads.uploadedAt,
        processedAt: uploads.processedAt,
        processingLog: uploads.processingLog,
        account: {
          id: accounts.id,
          name: accounts.name,
          bankName: accounts.bankName,
          bankCode: accounts.bankCode,
          accountNumber: accounts.accountNumber
        }
      })
      .from(uploads)
      .leftJoin(accounts, eq(uploads.accountId, accounts.id))
      .where(and(...filters))
      .orderBy(desc(uploads.uploadedAt))
      .limit(limit)
      .offset(offset),

      db.select({ count: uploads.id })
        .from(uploads)
        .where(and(...filters))
    ]);

    log.info({ count: uploadsList.length, page }, 'Uploads found');

    // Formatar resultados
    const formattedUploads = uploadsList.map(upload => ({
      ...upload,
      processingStats: upload.totalTransactions > 0 ? {
        successRate: (upload.successfulTransactions / upload.totalTransactions) * 100,
        failureRate: (upload.failedTransactions / upload.totalTransactions) * 100,
        isCompleted: upload.status === 'completed',
        hasErrors: upload.failedTransactions > 0
      } : null,
      fileInfo: {
        sizeFormatted: formatFileSize(upload.fileSize),
        typeFormatted: upload.fileType.toUpperCase(),
        storageProvider: upload.storageProvider
      }
    }));

    // Estatísticas gerais
    const [statusStats] = await db.select({
      total: uploads.id,
      completed: uploads.id,
      processing: uploads.id,
      failed: uploads.id
    })
      .from(uploads)
      .where(eq(uploads.companyId, defaultCompany.id));

    const stats = {
      total: uploadsList.length,
      byStatus: {
        completed: uploadsList.filter(u => u.status === 'completed').length,
        processing: uploadsList.filter(u => u.status === 'processing').length,
        failed: uploadsList.filter(u => u.status === 'failed').length,
        pending: uploadsList.filter(u => u.status === 'pending').length
      },
      byFileType: {
        ofx: uploadsList.filter(u => u.fileType === 'ofx').length,
        xlsx: uploadsList.filter(u => u.fileType === 'xlsx').length,
        csv: uploadsList.filter(u => u.fileType === 'csv').length
      },
      totalTransactions: uploadsList.reduce((sum, u) => sum + (u.totalTransactions || 0), 0),
      totalSuccessful: uploadsList.reduce((sum, u) => sum + (u.successfulTransactions || 0), 0),
      totalFailed: uploadsList.reduce((sum, u) => sum + (u.failedTransactions || 0), 0)
    };

    const response = {
      success: true,
      data: {
        uploads: formattedUploads,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount.length / limit),
          totalItems: totalCount.length,
          itemsPerPage: limit,
          hasNextPage: offset + limit < totalCount.length,
          hasPreviousPage: page > 1
        },
        stats,
        filters: {
          status,
          fileType,
          search,
          applied: filters.length > 1
        }
      },
      metadata: {
        company: {
          id: defaultCompany.id,
          name: defaultCompany.name
        },
        generatedAt: new Date().toISOString()
      }
    };

    log.info({
      returned: formattedUploads.length,
      total: totalCount.length,
      page,
      stats
    }, 'Listing completed');

    return NextResponse.json(response);

  } catch (error) {
    log.error({ err: error }, 'Error listing uploads');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Função auxiliar para formatar tamanho de arquivo
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export async function POST(_request: NextRequest) {
  await requireAuth();
  return NextResponse.json({
    message: 'API de Uploads',
    endpoint: '/api/uploads',
    methods: {
      GET: 'Listar uploads da empresa com filtros e paginação',
      POST: 'Não implementado'
    },
    parameters: {
      GET: {
        page: 'Número da página (default: 1)',
        limit: 'Itens por página (default: 20, max: 100)',
        status: 'Filtrar por status: pending, processing, completed, failed',
        fileType: 'Filtrar por tipo: ofx, xlsx, csv',
        search: 'Buscar por nome do arquivo'
      }
    },
    examples: {
      listAll: '/api/uploads',
      listPage2: '/api/uploads?page=2&limit=10',
      listCompleted: '/api/uploads?status=completed',
      listOFX: '/api/uploads?fileType=ofx',
      searchByName: '/api/uploads?search=extrato'
    }
  });
}