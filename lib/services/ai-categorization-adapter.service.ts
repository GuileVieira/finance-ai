/**
 * AI Categorization Adapter
 *
 * Adapter que conecta o TransactionCategorizationService
 * com o endpoint existente /api/ai/work-categorize
 */

import type { AICategorizationService, TransactionContext } from './transaction-categorization.service';

export class AICategorization implements AICategorizationService {
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Categoriza transação usando IA via endpoint existente
   */
  async categorize(
    context: TransactionContext & { companyId: string }
  ): Promise<{
    category: string;
    confidence: number;
    reasoning?: string;
    modelUsed?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/work-categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: context.description,
          amount: context.amount,
          memo: context.memo,
          name: context.name,
          companyId: context.companyId
        })
      });

      if (!response.ok) {
        throw new Error(`AI categorization failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`AI categorization failed: ${result.error || 'Unknown error'}`);
      }

      return {
        category: result.data.category,
        confidence: result.data.confidence || 0,
        reasoning: result.data.reasoning,
        modelUsed: result.data.model_used
      };

    } catch (error) {
      console.error('[AI-ADAPTER-ERROR]', error);
      throw error;
    }
  }
}

// Singleton instance
export const aiCategorizationAdapter = new AICategorization();

export default aiCategorizationAdapter;
