/**
 * Serviço para registro de custos de IA
 *
 * Responsável por:
 * - Registrar cada chamada de IA no banco de dados
 * - Calcular custos reais baseado na tabela de preços
 * - Em desenvolvimento, salvar logs em arquivo local
 */

import { db } from '../db/connection';
import { aiUsageLogs, aiModelPricing, type NewAiUsageLog } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { appendFileSync } from 'fs';
import { join } from 'path';
import { createLogger } from '@/lib/logger';

const log = createLogger('ai-cost-logger');

export interface AiUsageLogInput {
  userId?: string;
  companyId?: string;
  uploadId?: string;
  batchId?: string;
  transactionId?: string;
  operationType: string;
  provider: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  processingTimeMs?: number;
  source: 'history' | 'cache' | 'ai';
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  errorMessage?: string;
}

export class AiCostLoggerService {
  private static instance: AiCostLoggerService;
  private logFilePath: string;
  private isDevelopment: boolean;

  private constructor() {
    this.logFilePath = join(process.cwd(), 'ai-costs.log');
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  static getInstance(): AiCostLoggerService {
    if (!AiCostLoggerService.instance) {
      AiCostLoggerService.instance = new AiCostLoggerService();
    }
    return AiCostLoggerService.instance;
  }

  /**
   * Busca o preço de um modelo no banco de dados
   */
  private async getModelPricing(provider: string, modelName: string): Promise<{
    inputPricePer1kTokens: number;
    outputPricePer1kTokens: number;
  } | null> {
    if (!db) {
      log.warn('Database not available');
      return null;
    }

    try {
      const [pricing] = await db
        .select()
        .from(aiModelPricing)
        .where(
          and(
            eq(aiModelPricing.provider, provider),
            eq(aiModelPricing.modelName, modelName),
            eq(aiModelPricing.active, true)
          )
        )
        .limit(1);

      if (!pricing) {
        log.warn({ provider, modelName }, 'Pricing not found for model');
        return null;
      }

      return {
        inputPricePer1kTokens: parseFloat(pricing.inputPricePer1kTokens),
        outputPricePer1kTokens: parseFloat(pricing.outputPricePer1kTokens)
      };
    } catch (error) {
      log.error({ err: error, provider, modelName }, 'Error fetching model pricing');
      return null;
    }
  }

  /**
   * Calcula o custo de uma chamada de IA
   */
  private async calculateCost(
    provider: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<number> {
    const pricing = await this.getModelPricing(provider, modelName);

    if (!pricing) {
      // Fallback: usar custo estimado de $0.001 por chamada se não encontrar o preço
      return 0.001;
    }

    const inputCost = (inputTokens / 1000) * pricing.inputPricePer1kTokens;
    const outputCost = (outputTokens / 1000) * pricing.outputPricePer1kTokens;

    return inputCost + outputCost;
  }

  /**
   * Salva log em arquivo local (apenas em desenvolvimento)
   */
  private async saveToFile(logData: AiUsageLogInput, costUsd: number): Promise<void> {
    if (!this.isDevelopment) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const totalTokens = logData.inputTokens + logData.outputTokens;

      const logLine = [
        `[${timestamp}]`,
        `user:${logData.userId || 'N/A'}`,
        `company:${logData.companyId || 'N/A'}`,
        `${logData.provider}/${logData.modelName}`,
        `tokens:${logData.inputTokens}/${logData.outputTokens} (${totalTokens})`,
        `cost:$${costUsd.toFixed(6)}`,
        `source:${logData.source}`,
        `op:${logData.operationType}`,
        logData.errorMessage ? `ERROR:${logData.errorMessage}` : ''
      ]
        .filter(Boolean)
        .join(' | ');

      appendFileSync(this.logFilePath, logLine + '\n', 'utf8');
    } catch (error) {
      log.error({ err: error }, 'Error saving log to file');
    }
  }

  /**
   * Registra uma chamada de IA
   */
  async logUsage(logData: AiUsageLogInput): Promise<void> {
    try {
      const totalTokens = logData.inputTokens + logData.outputTokens;
      const costUsd = await this.calculateCost(
        logData.provider,
        logData.modelName,
        logData.inputTokens,
        logData.outputTokens
      );

      // Salvar em arquivo (se em desenvolvimento)
      await this.saveToFile(logData, costUsd);

      // Salvar no banco de dados
      if (!db) {
        log.warn('Database not available, log saved to file only');
        return;
      }

      const newLog: NewAiUsageLog = {
        userId: logData.userId,
        companyId: logData.companyId,
        uploadId: logData.uploadId,
        batchId: logData.batchId,
        transactionId: logData.transactionId,
        operationType: logData.operationType,
        provider: logData.provider,
        modelName: logData.modelName,
        inputTokens: logData.inputTokens,
        outputTokens: logData.outputTokens,
        totalTokens,
        costUsd: costUsd.toString(),
        processingTimeMs: logData.processingTimeMs,
        source: logData.source,
        requestData: logData.requestData,
        responseData: logData.responseData,
        errorMessage: logData.errorMessage
      };

      await db.insert(aiUsageLogs).values(newLog);

      log.info(
        { provider: logData.provider, model: logData.modelName, totalTokens, costUsd: costUsd.toFixed(6), source: logData.source },
        'Usage log recorded'
      );
    } catch (error) {
      log.error({ err: error }, 'Error recording usage log');
      // Não propagar o erro para não quebrar o fluxo principal
    }
  }

  /**
   * Registra múltiplas chamadas de IA em lote
   */
  async logBatch(logs: AiUsageLogInput[]): Promise<void> {
    for (const log of logs) {
      await this.logUsage(log);
    }
  }

  /**
   * Obtém estatísticas de custos
   */
  async getStats(filters?: {
    userId?: string;
    companyId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalCost: number;
    totalCalls: number;
    totalTokens: number;
    bySource: Record<string, { calls: number; cost: number }>;
    byModel: Record<string, { calls: number; cost: number }>;
  }> {
    if (!db) {
      throw new Error('Banco de dados não disponível');
    }

    // Implementação básica - pode ser expandida com filtros
    const logs = await db.select().from(aiUsageLogs);

    const stats = {
      totalCost: 0,
      totalCalls: logs.length,
      totalTokens: 0,
      bySource: {} as Record<string, { calls: number; cost: number }>,
      byModel: {} as Record<string, { calls: number; cost: number }>
    };

    for (const log of logs) {
      const cost = parseFloat(log.costUsd);
      stats.totalCost += cost;
      stats.totalTokens += log.totalTokens;

      // Por source
      if (!stats.bySource[log.source]) {
        stats.bySource[log.source] = { calls: 0, cost: 0 };
      }
      stats.bySource[log.source].calls++;
      stats.bySource[log.source].cost += cost;

      // Por modelo
      const modelKey = `${log.provider}/${log.modelName}`;
      if (!stats.byModel[modelKey]) {
        stats.byModel[modelKey] = { calls: 0, cost: 0 };
      }
      stats.byModel[modelKey].calls++;
      stats.byModel[modelKey].cost += cost;
    }

    return stats;
  }
}

// Export singleton instance
export const aiCostLogger = AiCostLoggerService.getInstance();
