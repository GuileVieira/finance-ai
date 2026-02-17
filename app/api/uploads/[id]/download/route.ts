import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { uploads, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import FileStorageService from '@/lib/storage/file-storage.service';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('uploads-download');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { companyId } = await requireAuth();


    log.info({ uploadId: id }, 'Download request received');

    // Inicializar banco de dados se necessário
    await initializeDatabase();

    // Validar ID do upload
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID do upload não fornecido'
      }, { status: 400 });
    }

    log.info({ uploadId: id }, 'Searching for upload');

    // Buscar upload no banco - VERIFICAR PROPRIEDADE
    const [upload] = await db.select({
      id: uploads.id,
      filename: uploads.filename,
      originalName: uploads.originalName,
      fileType: uploads.fileType,
      fileSize: uploads.fileSize,
      filePath: uploads.filePath,
      fileHash: uploads.fileHash,
      storageProvider: uploads.storageProvider,
      companyId: uploads.companyId,
      uploadedAt: uploads.uploadedAt,
      company: {
        id: companies.id,
        name: companies.name
      }
    })
      .from(uploads)
      .leftJoin(companies, eq(uploads.companyId, companies.id))
      .where(and(
        eq(uploads.id, id),
        eq(uploads.companyId, companyId) // Verificar propriedade
      ))
      .limit(1);

    if (!upload) {
      log.warn({ uploadId: id }, 'Upload not found');
      return NextResponse.json({
        success: false,
        error: 'Upload não encontrado'
      }, { status: 404 });
    }

    log.info({ originalName: upload.originalName, fileType: upload.fileType }, 'Upload found');

    // Ler arquivo do storage
    log.info('Reading file from storage');
    const fileBuffer = await FileStorageService.readFile(upload.filePath!);

    if (!fileBuffer) {
      log.warn({ filePath: upload.filePath }, 'File not found in storage');
      return NextResponse.json({
        success: false,
        error: 'Arquivo físico não encontrado no storage'
      }, { status: 404 });
    }

    log.info({ bytes: fileBuffer.length }, 'File read successfully');

    // Determinar MIME type
    const mimeType = getMimeType(upload.fileType);

    // Preparar headers para download
    const headers = new Headers({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(upload.originalName)}"`,
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Upload-ID': upload.id,
      'X-File-Hash': upload.fileHash || '',
      'X-Upload-Date': upload.uploadedAt ? upload.uploadedAt.toISOString() : new Date().toISOString(),
      'X-Company': upload.company?.name || 'Unknown'
    });

    log.info({ originalName: upload.originalName }, 'Sending file');

    // Retornar arquivo
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers
    });

  } catch (error) {
    log.error({ err: error, uploadId: id }, 'Error downloading file');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor ao baixar arquivo'
    }, { status: 500 });
  }
}

// Função auxiliar para obter MIME type
function getMimeType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    'ofx': 'application/x-ofx',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'csv': 'text/csv'
  };

  return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;
  return NextResponse.json({
    message: 'API de Download de Uploads',
    endpoint: `/api/uploads/${id}/download`,
    method: 'GET',
    description: 'Baixa o arquivo original associado a um upload',
    parameters: {
      id: 'ID do upload (UUID)'
    },
    headers: {
      'Content-Type': 'MIME type do arquivo',
      'Content-Disposition': 'Força download do arquivo',
      'X-Upload-ID': 'ID do upload',
      'X-File-Hash': 'Hash SHA-256 do arquivo',
      'X-Upload-Date': 'Data do upload',
      'X-Company': 'Nome da empresa'
    },
    supportedFormats: ['OFX', 'XLSX', 'XLS', 'CSV'],
    example: `GET /api/uploads/${id}/download`
  });
}