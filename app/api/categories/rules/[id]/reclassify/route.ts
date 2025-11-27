/**
 * Reclassify Transactions API
 *
 * POST /api/categories/rules/[id]/reclassify - Execute reclassification
 * GET /api/categories/rules/[id]/reclassify/preview - Preview impact
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReclassificationService } from '@/lib/services/reclassification.service';
import { requireAuth } from '@/lib/auth/get-session';

/**
 * GET - Preview da reclassificação
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: ruleId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const onlyAutomatic = searchParams.get('onlyAutomatic') !== 'false'; // Default: true

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    // Preview da reclassificação
    const preview = await ReclassificationService.previewReclassification(
      ruleId,
      onlyAutomatic
    );

    // Estimar tempo de processamento
    const affectedCount = onlyAutomatic ? preview.automaticOnly : preview.totalAffected;
    const estimatedTime = ReclassificationService.estimateProcessingTime(affectedCount);

    return NextResponse.json({
      success: true,
      data: {
        ...preview,
        estimatedTime,
        willProcess: affectedCount,
        message: onlyAutomatic
          ? `${preview.automaticOnly} automatic transactions will be reclassified (${preview.manualOnly} manual excluded)`
          : `${preview.totalAffected} total transactions will be reclassified`
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[RECLASSIFY-PREVIEW-ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview reclassification'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Executar reclassificação
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: ruleId } = await params;
    const body = await request.json();
    const {
      newCategoryId,
      onlyAutomatic = true,
      createBackup = false
    } = body;

    if (!ruleId || !newCategoryId) {
      return NextResponse.json(
        { success: false, error: 'ruleId and newCategoryId are required' },
        { status: 400 }
      );
    }

    // Opcional: Criar backup antes de reclassificar
    let backup;
    if (createBackup) {
      backup = await ReclassificationService.createBackup(ruleId);
    }

    // Executar reclassificação
    const job = await ReclassificationService.reclassifyTransactions(
      ruleId,
      newCategoryId,
      onlyAutomatic
    );

    return NextResponse.json({
      success: true,
      data: {
        job,
        backup,
        message: `Reclassification completed: ${job.processedCount}/${job.affectedCount} transactions updated`
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[RECLASSIFY-ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reclassify transactions'
      },
      { status: 500 }
    );
  }
}
