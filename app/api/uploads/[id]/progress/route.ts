import { NextRequest, NextResponse } from 'next/server';
import BatchProcessingService from '@/lib/services/batch-processing.service';
import { requireAuth } from '@/lib/auth/get-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: uploadId } = await params;

    console.log(`📊 [PROGRESS] Consultando progresso do upload: ${uploadId}`);

    const progress = await BatchProcessingService.getProcessingProgress(uploadId);

    if (!progress) {
      return NextResponse.json({
        success: false,
        error: 'Upload não encontrado'
      }, { status: 404 });
    }

    console.log(`📈 [PROGRESS] Progresso atual:`, {
      uploadId,
      percentage: progress.percentage,
      status: progress.status,
      processed: `${progress.processedTransactions}/${progress.totalTransactions}`
    });

    return NextResponse.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('❌ [PROGRESS] Erro ao consultar progresso:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}