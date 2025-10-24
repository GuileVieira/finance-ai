import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getDefaultCompany } from '@/lib/db/init-db';
import { db } from '@/lib/db/connection';
import { companies, accounts, uploads, transactions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('\n=== [UPLOAD-SIMPLE] Iniciando upload simplificado ===');

    // Inicializar banco
    await initializeDatabase();
    const defaultCompany = await getDefaultCompany();
    if (!defaultCompany) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma empresa encontrada'
      }, { status: 400 });
    }

    console.log(`🏢 Empresa: ${defaultCompany.name}`);

    // Verificar multipart
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({
        success: false,
        error: 'Precisa ser multipart/form-data'
      }, { status: 400 });
    }

    // Parse do formulário
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const safeMode = formData.get('safeMode') === 'true';

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum arquivo enviado'
      }, { status: 400 });
    }

    console.log(`📁 Arquivo: ${file.name} (${file.size} bytes)`);

    // Ler arquivo
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ofxContent = fileBuffer.toString('utf-8');
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

    console.log(`📋 Conteúdo lido: ${ofxContent.length} caracteres`);
    console.log(`🔐 Hash: ${fileHash}`);

    // Salvar arquivo (simplificado)
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = '/Users/guilherme/Documents/Projetos/financeiro-aldo/mvp_finance/storage_tmp/ofx/simple';

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, fileBuffer);

    console.log(`💾 Arquivo salvo: ${filePath}`);

    // Buscar ou criar conta
    const existingAccounts = await db.select()
      .from(accounts)
      .where(eq(accounts.companyId, defaultCompany.id))
      .limit(1);

    let targetAccount;
    if (existingAccounts.length > 0) {
      targetAccount = existingAccounts[0];
      console.log(`✅ Conta existente: ${targetAccount.name}`);
    } else {
      console.log('🏦 Criando conta padrão...');
      const [newAccount] = await db.insert(accounts).values({
        companyId: defaultCompany.id,
        name: 'Conta Padrão',
        bankName: 'Banco Padrão',
        bankCode: '001',
        agencyNumber: '0000',
        accountNumber: '00000-0',
        accountType: 'checking',
        openingBalance: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      targetAccount = newAccount;
      console.log(`✅ Conta criada: ${targetAccount.name}`);
    }

    // Criar upload
    const [newUpload] = await db.insert(uploads).values({
      companyId: defaultCompany.id,
      accountId: targetAccount.id,
      filename: filename,
      originalName: file.name,
      fileType: 'ofx',
      fileSize: file.size,
      filePath: filePath,
      fileHash: fileHash,
      storageProvider: 'filesystem',
      status: 'completed',
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      uploadedAt: new Date(),
      processedAt: new Date()
    }).returning();

    console.log(`✅ Upload criado: ${newUpload.id}`);

    // Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Upload simplificado concluído',
      data: {
        upload: {
          id: newUpload.id,
          filename: newUpload.filename,
          originalName: newUpload.originalName,
          fileSize: newUpload.fileSize,
          status: newUpload.status,
          uploadedAt: newUpload.uploadedAt
        },
        account: {
          id: targetAccount.id,
          name: targetAccount.name,
          bankName: targetAccount.bankName
        },
        company: {
          id: defaultCompany.id,
          name: defaultCompany.name
        },
        safeMode
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload simplificado:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de Upload Simplificado',
    endpoint: '/api/ofx/upload-simple',
    method: 'POST',
    purpose: 'Versão simplificada para debug sem processamento de transações'
  });
}