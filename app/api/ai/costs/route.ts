/**
 * API Endpoint para gerenciamento de custos de IA
 *
 * Endpoints:
 * - GET /api/ai/costs - Lista logs de custos (com filtros)
 * - GET /api/ai/costs?action=summary - Resumo de custos
 * - GET /api/ai/costs?action=export&format=csv - Exportar custos
 * - GET /api/ai/costs?action=forecast - Previsão de gastos
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { aiUsageLogs } from '@/lib/db/schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/costs - Lista logs com filtros
 * Query params:
 * - action: summary | export | forecast
 * - userId: filtrar por usuário
 * - companyId: filtrar por empresa
 * - startDate: data inicial (ISO string)
 * - endDate: data final (ISO string)
 * - provider: filtrar por provedor
 * - source: history | cache | ai
 * - limit: número de registros (padrão: 100)
 * - offset: paginação (padrão: 0)
 * - format: csv | json (para export)
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Banco de dados não disponível' },
        { status: 500 }
      );
    }

    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');

    // Roteamento baseado em action
    if (action === 'summary') {
      return handleSummary(searchParams);
    } else if (action === 'export') {
      return handleExport(searchParams);
    } else if (action === 'forecast') {
      return handleForecast(searchParams);
    } else {
      return handleList(searchParams);
    }
  } catch (error) {
    console.error('[AI-COSTS-API] Erro:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar requisição',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

/**
 * Lista logs de custos com filtros
 */
async function handleList(searchParams: URLSearchParams) {
  const userId = searchParams.get('userId');
  const companyId = searchParams.get('companyId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const provider = searchParams.get('provider');
  const source = searchParams.get('source');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Construir filtros
  const filters = [];
  if (userId) filters.push(eq(aiUsageLogs.userId, userId));
  if (companyId) filters.push(eq(aiUsageLogs.companyId, companyId));
  if (startDate) filters.push(gte(aiUsageLogs.createdAt, new Date(startDate)));
  if (endDate) filters.push(lte(aiUsageLogs.createdAt, new Date(endDate)));
  if (provider) filters.push(eq(aiUsageLogs.provider, provider));
  if (source) filters.push(eq(aiUsageLogs.source, source as 'history' | 'cache' | 'ai'));

  // Buscar logs
  const logs = await db
    .select()
    .from(aiUsageLogs)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(aiUsageLogs.createdAt))
    .limit(limit)
    .offset(offset);

  // Contar total
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageLogs)
    .where(filters.length > 0 ? and(...filters) : undefined);

  const total = countResult?.count || 0;

  return NextResponse.json({
    logs: logs.map(log => ({
      id: log.id,
      userId: log.userId,
      companyId: log.companyId,
      uploadId: log.uploadId,
      batchId: log.batchId,
      transactionId: log.transactionId,
      operationType: log.operationType,
      provider: log.provider,
      modelName: log.modelName,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      totalTokens: log.totalTokens,
      costUsd: parseFloat(log.costUsd),
      processingTimeMs: log.processingTimeMs,
      source: log.source,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  });
}

/**
 * Resumo de custos agregados
 */
async function handleSummary(searchParams: URLSearchParams) {
  const userId = searchParams.get('userId');
  const companyId = searchParams.get('companyId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Construir filtros
  const filters = [];
  if (userId) filters.push(eq(aiUsageLogs.userId, userId));
  if (companyId) filters.push(eq(aiUsageLogs.companyId, companyId));
  if (startDate) filters.push(gte(aiUsageLogs.createdAt, new Date(startDate)));
  if (endDate) filters.push(lte(aiUsageLogs.createdAt, new Date(endDate)));

  // Buscar todos os logs para agregação
  const logs = await db
    .select()
    .from(aiUsageLogs)
    .where(filters.length > 0 ? and(...filters) : undefined);

  // Agregar dados
  const summary = {
    totalCost: 0,
    totalCalls: logs.length,
    totalTokens: 0,
    bySource: {} as Record<string, { calls: number; cost: number; tokens: number }>,
    byProvider: {} as Record<string, { calls: number; cost: number; tokens: number }>,
    byModel: {} as Record<string, { calls: number; cost: number; tokens: number }>,
    byOperation: {} as Record<string, { calls: number; cost: number; tokens: number }>,
    dailyCosts: {} as Record<string, number>,
    averageCostPerCall: 0,
    averageTokensPerCall: 0
  };

  for (const log of logs) {
    const cost = parseFloat(log.costUsd);
    summary.totalCost += cost;
    summary.totalTokens += log.totalTokens;

    // Por source
    if (!summary.bySource[log.source]) {
      summary.bySource[log.source] = { calls: 0, cost: 0, tokens: 0 };
    }
    summary.bySource[log.source].calls++;
    summary.bySource[log.source].cost += cost;
    summary.bySource[log.source].tokens += log.totalTokens;

    // Por provider
    if (!summary.byProvider[log.provider]) {
      summary.byProvider[log.provider] = { calls: 0, cost: 0, tokens: 0 };
    }
    summary.byProvider[log.provider].calls++;
    summary.byProvider[log.provider].cost += cost;
    summary.byProvider[log.provider].tokens += log.totalTokens;

    // Por modelo
    const modelKey = `${log.provider}/${log.modelName}`;
    if (!summary.byModel[modelKey]) {
      summary.byModel[modelKey] = { calls: 0, cost: 0, tokens: 0 };
    }
    summary.byModel[modelKey].calls++;
    summary.byModel[modelKey].cost += cost;
    summary.byModel[modelKey].tokens += log.totalTokens;

    // Por operação
    if (!summary.byOperation[log.operationType]) {
      summary.byOperation[log.operationType] = { calls: 0, cost: 0, tokens: 0 };
    }
    summary.byOperation[log.operationType].calls++;
    summary.byOperation[log.operationType].cost += cost;
    summary.byOperation[log.operationType].tokens += log.totalTokens;

    // Custos diários
    if (log.createdAt) {
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      summary.dailyCosts[date] = (summary.dailyCosts[date] || 0) + cost;
    }
  }

  summary.averageCostPerCall = summary.totalCalls > 0 ? summary.totalCost / summary.totalCalls : 0;
  summary.averageTokensPerCall = summary.totalCalls > 0 ? summary.totalTokens / summary.totalCalls : 0;

  return NextResponse.json(summary);
}

/**
 * Exportar custos em CSV ou JSON
 */
async function handleExport(searchParams: URLSearchParams) {
  const format = searchParams.get('format') || 'json';
  const userId = searchParams.get('userId');
  const companyId = searchParams.get('companyId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Construir filtros
  const filters = [];
  if (userId) filters.push(eq(aiUsageLogs.userId, userId));
  if (companyId) filters.push(eq(aiUsageLogs.companyId, companyId));
  if (startDate) filters.push(gte(aiUsageLogs.createdAt, new Date(startDate)));
  if (endDate) filters.push(lte(aiUsageLogs.createdAt, new Date(endDate)));

  // Buscar logs
  const logs = await db
    .select()
    .from(aiUsageLogs)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(aiUsageLogs.createdAt));

  if (format === 'csv') {
    // Gerar CSV
    const csvLines = [
      'ID,Date,User ID,Company ID,Upload ID,Batch ID,Transaction ID,Operation,Provider,Model,Input Tokens,Output Tokens,Total Tokens,Cost (USD),Processing Time (ms),Source,Error'
    ];

    for (const log of logs) {
      csvLines.push([
        log.id,
        log.createdAt?.toISOString() || '',
        log.userId || '',
        log.companyId || '',
        log.uploadId || '',
        log.batchId || '',
        log.transactionId || '',
        log.operationType,
        log.provider,
        log.modelName,
        log.inputTokens,
        log.outputTokens,
        log.totalTokens,
        log.costUsd,
        log.processingTimeMs || '',
        log.source,
        log.errorMessage || ''
      ].map(v => `"${v}"`).join(','));
    }

    const csv = csvLines.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ai-costs-${new Date().toISOString()}.csv"`
      }
    });
  } else {
    // Retornar JSON
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      filters: {
        userId,
        companyId,
        startDate,
        endDate
      },
      totalRecords: logs.length,
      data: logs.map(log => ({
        id: log.id,
        date: log.createdAt,
        userId: log.userId,
        companyId: log.companyId,
        uploadId: log.uploadId,
        batchId: log.batchId,
        transactionId: log.transactionId,
        operationType: log.operationType,
        provider: log.provider,
        modelName: log.modelName,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        totalTokens: log.totalTokens,
        costUsd: parseFloat(log.costUsd),
        processingTimeMs: log.processingTimeMs,
        source: log.source,
        errorMessage: log.errorMessage
      }))
    });
  }
}

/**
 * Previsão de gastos baseada em histórico
 */
async function handleForecast(searchParams: URLSearchParams) {
  const companyId = searchParams.get('companyId');
  const days = parseInt(searchParams.get('days') || '30'); // Dias para prever

  // Buscar dados dos últimos 30 dias para calcular média
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filters = [gte(aiUsageLogs.createdAt, thirtyDaysAgo)];
  if (companyId) filters.push(eq(aiUsageLogs.companyId, companyId));

  const logs = await db
    .select()
    .from(aiUsageLogs)
    .where(and(...filters));

  if (logs.length === 0) {
    return NextResponse.json({
      message: 'Dados insuficientes para previsão',
      forecast: null
    });
  }

  // Calcular custos por dia
  const dailyCosts: Record<string, number> = {};
  for (const log of logs) {
    if (log.createdAt) {
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      dailyCosts[date] = (dailyCosts[date] || 0) + parseFloat(log.costUsd);
    }
  }

  // Calcular média diária
  const daysWithData = Object.keys(dailyCosts).length;
  const totalCost = Object.values(dailyCosts).reduce((sum, cost) => sum + cost, 0);
  const averageDailyCost = daysWithData > 0 ? totalCost / daysWithData : 0;

  // Calcular tendência (linear regression simples)
  const sortedDates = Object.keys(dailyCosts).sort();
  let trend = 0;
  if (sortedDates.length > 1) {
    const firstCost = dailyCosts[sortedDates[0]];
    const lastCost = dailyCosts[sortedDates[sortedDates.length - 1]];
    trend = (lastCost - firstCost) / sortedDates.length;
  }

  // Previsão para os próximos N dias
  const forecast = {
    basedOnDays: daysWithData,
    averageDailyCost,
    trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
    trendValue: trend,
    forecastDays: days,
    estimatedCost: averageDailyCost * days,
    estimatedCostWithTrend: (averageDailyCost + (trend * days / 2)) * days,
    dailyBreakdown: [] as Array<{ date: string; estimatedCost: number }>
  };

  // Gerar breakdown diário
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const estimatedCost = averageDailyCost + (trend * i);

    forecast.dailyBreakdown.push({
      date: dateStr,
      estimatedCost: Math.max(0, estimatedCost) // Não pode ser negativo
    });
  }

  return NextResponse.json(forecast);
}
