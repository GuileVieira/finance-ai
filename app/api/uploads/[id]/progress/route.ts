import { NextRequest, NextResponse } from 'next/server';
import BatchProcessingService from '@/lib/services/batch-processing.service';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('uploads-progress');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: uploadId } = await params;

    log.info({ uploadId }, 'Querying upload progress');

    const progress = await BatchProcessingService.getProcessingProgress(uploadId);

    if (!progress) {
      return NextResponse.json({
        success: false,
        error: 'Upload não encontrado'
      }, { status: 404 });
    }

    log.info({
      uploadId,
      percentage: progress.percentage,
      status: progress.status,
      processed: `${progress.processedTransactions}/${progress.totalTransactions}`
    }, 'Current progress');

    return NextResponse.json({
      success: true,
      data: progress
    });

  } catch (error) {
    log.error({ err: error }, 'Error querying progress');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}