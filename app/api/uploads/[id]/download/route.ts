import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { uploads, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import FileStorageService from '@/lib/storage/file-storage.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`\n=== [UPLOAD-DOWNLOAD] Requisição de download: ${params.id} ===`);

    // Inicializar banco de dados se necessário
    await initializeDatabase();

    // Validar ID do upload
    if (!params.id) {
      return NextResponse.json({
        success: false,
        error: 'ID do upload não fornecido'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando upload: ${params.id}`);

    // Buscar upload no banco
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
        eq(uploads.id, params.id)
      ))
      .limit(1);

    if (!upload) {
      console.log(`❌ Upload não encontrado: ${params.id}`);
      return NextResponse.json({
        success: false,
        error: 'Upload não encontrado'
      }, { status: 404 });
    }

    console.log(`✅ Upload encontrado: ${upload.originalName} (${upload.fileType})`);

    // Ler arquivo do storage
    console.log('📁 Lendo arquivo do storage...');
    const fileBuffer = await FileStorageService.readFile(upload.filePath!);

    if (!fileBuffer) {
      console.log(`❌ Arquivo não encontrado no storage: ${upload.filePath}`);
      return NextResponse.json({
        success: false,
        error: 'Arquivo físico não encontrado no storage'
      }, { status: 404 });
    }

    console.log(`✅ Arquivo lido: ${fileBuffer.length} bytes`);

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
      'X-Upload-Date': upload.uploadedAt.toISOString(),
      'X-Company': upload.company?.name || 'Unknown'
    });

    console.log(`🚀 Enviando arquivo: ${upload.originalName}`);

    // Retornar arquivo
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('❌ Erro no download do arquivo:', {
      uploadId: params.id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });

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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    message: 'API de Download de Uploads',
    endpoint: `/api/uploads/${params.id}/download`,
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
    example: `GET /api/uploads/${params.id}/download`
  });
}