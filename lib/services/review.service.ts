
import { db } from '@/lib/db/drizzle';
import { transactions, categories } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { RuleGenerationService } from './rule-generation.service';
import categoryCacheService from './category-cache.service';

export interface ReviewItem {
  id: string;
  description: string;
  amount: number;
  date: Date;
  currentCategory?: {
    id: string;
    name: string;
  };
  reason?: any; // Structured reason
  confidence: number;
  movementType?: string;
}

export class ReviewService {
  /**
   * Busca transações que precisam de revisão, ordenadas por prioridade.
   * Prioridade: Valor (absoluto) maior primeiro, depois data mais recente.
   */


  // Versão segura com JOIN para garantir companyId
  static async getReviewQueue(companyId: string, limit = 50): Promise<ReviewItem[]> {
      const { accounts } = await import('@/lib/db/schema');
      
      const queue = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          date: transactions.transactionDate,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          confidence: transactions.confidence,
          // aiReasoning pode não existir no schema ainda, usar reasoning texto se necessário
          // ou assumir que o campo 'reasoning' (texto) guarda o JSON stringificado por enquanto
          // ou criamos uma migração para JSONB. 
          // POR ENQUANTO: Vamos usar o campo existente e tentar parsear se for string JSON
          reasoning: transactions.reasoning, 
          movementType: transactions.movementType, 
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(accounts.companyId, companyId),
            eq(transactions.needsReview, true)
          )
        )
        .orderBy(desc(sql`ABS(${transactions.amount})`), desc(transactions.transactionDate))
        .limit(limit);
  
      return queue.map(item => {
          let parsedReason = null;
          try {
              // Tentar parsear se for JSON, senão usar como message
              if (item.reasoning && (item.reasoning.startsWith('{') || item.reasoning.startsWith('['))) {
                  parsedReason = JSON.parse(item.reasoning);
              } else if (item.reasoning) {
                  parsedReason = { message: item.reasoning, code: 'LEGACY_TEXT' };
              }
          } catch (e) {
              parsedReason = { message: item.reasoning || '', code: 'LEGACY_ERROR' };
          }

          return {
            id: item.id,
            description: item.description,
            amount: Number(item.amount),
            date: new Date(item.date),
            currentCategory: item.categoryId ? { id: item.categoryId, name: item.categoryName || 'Unknown' } : undefined,
            reason: parsedReason,
            confidence: Number(item.confidence || 0),
            movementType: item.movementType || undefined
          };
      });
  }

  /**
   * Resolve uma revisão de categorização
   * @param createRule Se true, tenta criar uma regra a partir desta correção (Feedback Loop)
   */
  static async resolveReview(
    transactionId: string,
    categoryId: string,
    categoryName: string, // Passar nome evita lookup extra
    companyId: string,
    createRule: boolean = false
  ): Promise<{ success: boolean; ruleCreated?: boolean }> {
    try {
        // 1. Atualizar transação
        await db
          .update(transactions)
          .set({
            categoryId: categoryId,
            needsReview: false,
            confidence: '100', // Confirmado por humano
            categorizationSource: 'manual_review',
            updatedAt: new Date()
          })
          .where(eq(transactions.id, transactionId));

        // 2. Atualizar Cache (Aprendizado Imediato)
        // Para a próxima vez pegar do cache
        const tx = await db
           .select({ description: transactions.description })
           .from(transactions)
           .where(eq(transactions.id, transactionId))
           .limit(1);
        
        if (tx.length > 0) {
            categoryCacheService.addToCache(
                tx[0].description,
                categoryId,
                categoryName,
                companyId,
                1.0 // Confiança máxima
            );

            // 3. Criar Regra (se solicitado)
            if (createRule) {
                // Tenta criar regra exata ou padrão, baseada na descrição
                const ruleResult = await RuleGenerationService.generateAndCreateRule(
                    tx[0].description,
                    categoryName,
                    companyId,
                    100,
                    'Created from Review Queue'
                );
                
                return { success: true, ruleCreated: ruleResult.success };
            }
        }

        return { success: true, ruleCreated: false };
    } catch (error) {
        console.error('Failed to resolve review:', error);
        throw error;
    }
  }
}
