import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('\n=== [TEST-UPLOAD] Iniciando teste de upload ===');

    // Verificar se é multipart/form-data
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({
        success: false,
        error: 'Requisição deve ser multipart/form-data'
      }, { status: 400 });
    }

    // Parse do formulário
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum arquivo enviado'
      }, { status: 400 });
    }

    console.log('📁 Arquivo recebido:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Ler apenas os primeiros 1000 caracteres para teste
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ofxContent = fileBuffer.toString('utf-8').substring(0, 1000);

    console.log('📋 Primeiros 1000 caracteres do OFX:');
    console.log('--- INÍCIO DO ARQUIVO ---');
    console.log(ofxContent);
    console.log('--- FIM DO TRECHO ---');

    // Verificar se parece um OFX válido
    const normalizedContent = ofxContent.toUpperCase().trim();
    const isValidOFX = normalizedContent.includes('OFXHEADER') &&
                      normalizedContent.includes('SIGNONMSGSRSV1');

    if (!isValidOFX) {
      return NextResponse.json({
        success: false,
        error: 'Arquivo não parece ser um OFX válido',
        details: {
          hasOFXHEADER: normalizedContent.includes('OFXHEADER'),
          hasSIGNON: normalizedContent.includes('SIGNONMSGSRSV1'),
          firstLine: ofxContent.split('\n')[0]
        }
      }, { status: 400 });
    }

    // Verificar se há transações
    const hasTransactions = normalizedContent.includes('<STMTTRN>') ||
                          normalizedContent.includes('<BANKTRANLIST>');

    return NextResponse.json({
      success: true,
      message: 'Arquivo OFX parece válido',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        firstLines: ofxContent.split('\n').slice(0, 5),
        hasTransactions
      },
      nextSteps: [
        '1. OFX válido ✅',
        '2. Extrair informações bancárias',
        '3. Processar transações',
        '4. Categorizar com IA',
        '5. Salvar no banco'
      ]
    });

  } catch (error) {
    console.error('❌ Erro no teste de upload:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de Teste de Upload',
    endpoint: '/api/test-upload',
    method: 'POST',
    contentType: 'multipart/form-data',
    purpose: 'Testar validação de arquivos OFX sem processamento completo',
    instructions: [
      '1. Envie um arquivo OFX',
      '2. A API vai ler apenas os primeiros 1000 caracteres',
      '3. Valida se é um OFX válido',
      '4. Retorna informações básicas do arquivo'
    ]
  });
}