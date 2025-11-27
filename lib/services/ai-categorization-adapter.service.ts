/**
 * AI Categorization Adapter
 *
 * Chama diretamente o aiProviderService para categorizar transações
 * (Evita fetch HTTP interno que pode falhar em background processing)
 *
 * NOVO: Integra serviço de enriquecimento de descrições para
 * fornecer contexto adicional sobre termos bancários obscuros.
 */

import type { AICategorizationService, TransactionContext } from './transaction-categorization.service';
import { aiProviderService } from '@/lib/ai/ai-provider.service';
import CategoriesService from '@/lib/services/categories.service';
import { filterCategoriesByTransactionType } from '@/lib/utils/category-filter';
import { descriptionEnrichmentService, type EnrichedDescription } from './description-enrichment.service';

// Cache de categorias do banco para evitar múltiplas consultas
let cachedCategories: Array<{name: string; type: string}> = [];
let categoriesCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Configuração dos modelos com sistema de fallback
const AI_MODELS = {
  primary: process.env.AI_MODEL_PRIMARY || 'google/gemini-2.0-flash-exp',
  fallback: process.env.AI_MODEL_FALLBACK || 'openai/gpt-4o-mini'
};

// Função para obter categorias do banco com cache
async function getCategoriesFromDB(): Promise<Array<{name: string; type: string}>> {
  const now = Date.now();

  // Verificar cache
  if (cachedCategories.length > 0 && (now - categoriesCacheTime) < CACHE_DURATION) {
    return cachedCategories;
  }

  // Buscar do banco
  const dbCategories = await CategoriesService.getCategories({
    isActive: true,
    includeStats: false
  });

  if (dbCategories.length > 0) {
    cachedCategories = dbCategories.map(cat => ({ name: cat.name, type: cat.type }));
    categoriesCacheTime = now;
    return cachedCategories;
  }

  throw new Error('Nenhuma categoria encontrada no banco');
}

// Função para mapear resultado da IA para categoria válida do banco
function mapAIResultToValidCategory(aiCategory: string, availableCategories: string[]): string {
  // Buscar correspondência exata (ignorando case e espaços)
  const exactMatch = availableCategories.find(cat =>
    cat.toLowerCase().trim() === aiCategory.toLowerCase().trim()
  );

  if (exactMatch) {
    return exactMatch;
  }

  // Buscar correspondência parcial
  const partialMatch = availableCategories.find(cat =>
    cat.toLowerCase().includes(aiCategory.toLowerCase()) ||
    aiCategory.toLowerCase().includes(cat.toLowerCase())
  );

  if (partialMatch) {
    return partialMatch;
  }

  // Buscar por palavras-chave
  const aiLower = aiCategory.toLowerCase();

  if (aiLower.includes('salário') || aiLower.includes('salario')) {
    const found = availableCategories.find(cat =>
      cat.toLowerCase().includes('salario') || cat === 'SALARIOS'
    );
    if (found) return found;
  }

  if (aiLower.includes('aluguel')) {
    const found = availableCategories.find(cat => cat.toLowerCase().includes('aluguel'));
    if (found) return found;
  }

  if (aiLower.includes('energia') || aiLower.includes('luz')) {
    const found = availableCategories.find(cat => cat.toLowerCase().includes('energia'));
    if (found) return found;
  }

  if (aiLower.includes('telefone') || aiLower.includes('celular')) {
    const found = availableCategories.find(cat => cat.toLowerCase().includes('telefone'));
    if (found) return found;
  }

  if (aiLower.includes('tarifa') || aiLower.includes('banco') || aiLower.includes('bancaria')) {
    const found = availableCategories.find(cat => cat.toLowerCase().includes('tarifa'));
    if (found) return found;
  }

  // Último recurso: OUTRAS DESPESAS NOP (se existir) ou primeira categoria disponível
  const fallbackCategory = availableCategories.find(cat =>
    cat === 'OUTRAS DESPESAS NOP'
  ) || availableCategories[0];

  return fallbackCategory || 'OUTRAS DESPESAS NOP';
}

export class AICategorization implements AICategorizationService {
  /**
   * Categoriza transação usando IA diretamente (sem HTTP fetch)
   * NOVO: Enriquece a descrição antes de enviar para a IA
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
      console.log('[AI-ADAPTER] Iniciando categorização direta via aiProviderService');

      // NOVO: Enriquecer descrição com contexto adicional
      let enrichment: EnrichedDescription | null = null;
      try {
        enrichment = await descriptionEnrichmentService.enrichDescription(
          context.description,
          context.memo
        );
        if (enrichment.bankingTerm) {
          console.log(`[AI-ADAPTER] Termo bancário detectado: ${enrichment.bankingTerm.term} (${enrichment.bankingTerm.meaning})`);
        }
      } catch (enrichError) {
        console.warn('[AI-ADAPTER] Erro ao enriquecer descrição, continuando sem enriquecimento:', enrichError);
      }

      // Buscar categorias do banco de dados
      const allCategories = await getCategoriesFromDB();

      // Filtrar categorias baseado no tipo da transação
      const transactionType: 'credit' | 'debit' = context.amount >= 0 ? 'credit' : 'debit';
      const filteredCategories = filterCategoriesByTransactionType(transactionType, allCategories);

      const availableCategories = filteredCategories.map(c => c.name);
      const formattedCategoriesList = `• ${availableCategories.join('\n• ')}`;

      // Montar contexto enriquecido para o prompt
      const enrichedContextText = enrichment?.enrichedContext
        ? `\n\nCONTEXTO ADICIONAL (descoberto automaticamente):\n${enrichment.enrichedContext}`
        : '';

      const categoryHintText = enrichment?.bankingTerm?.categoryHint
        ? `\n\nDICA: ${enrichment.bankingTerm.categoryHint}`
        : '';

      const modelsToTry = [AI_MODELS.primary, AI_MODELS.fallback];

      for (const model of modelsToTry) {
        try {
          console.log(`[AI-ADAPTER] Tentando modelo: ${model}`);

          const messages = [
            {
              role: 'system' as const,
              content: `Você é um especialista em finanças empresariais brasileiras. Sua tarefa é categorizar transações financeiras.

CONTEXTO DA TRANSAÇÃO:
• DESCRIÇÃO: "${context.description}"
• VALOR: R$ ${context.amount.toFixed(2)}
• MEMO: "${context.memo || 'N/A'}"${enrichedContextText}${categoryHintText}

CATEGORIAS DISPONÍVEIS:
${formattedCategoriesList}

REGRAS:
1. Retorne APENAS o nome exato da categoria escolhida
2. NÃO inclua explicações, justificativas ou análises
3. Use uma das categorias listadas acima
4. Se houver DICA ou CONTEXTO ADICIONAL, use essa informação para escolher a categoria mais adequada`
            },
            {
              role: 'user' as const,
              content: `Categorize a transação: "${context.description}" (R$ ${context.amount.toFixed(2)})`
            }
          ];

          const response = await aiProviderService.completeWithRetry({
            model: model,
            messages: messages,
            max_tokens: 100,
            temperature: 0.1
          });

          const aiCategory = response.content?.trim() || 'OUTRAS DESPESAS NOP';
          const validCategory = mapAIResultToValidCategory(aiCategory, availableCategories);

          console.log(`[AI-ADAPTER] Sucesso! Categoria: "${aiCategory}" → "${validCategory}"`);

          // Montar reasoning com informações do enriquecimento
          let reasoning = `IA (${response.provider}/${response.model}) categorizou como "${aiCategory}" → "${validCategory}"`;
          if (enrichment?.bankingTerm) {
            reasoning += ` | Termo detectado: ${enrichment.bankingTerm.term} (${enrichment.bankingTerm.meaning})`;
          }
          if (enrichment?.complement) {
            reasoning += ` | Complemento: ${enrichment.complement}`;
          }

          return {
            category: validCategory,
            confidence: enrichment?.bankingTerm ? 0.95 : 0.9, // Maior confiança quando temos contexto
            reasoning,
            modelUsed: `${response.provider}/${response.model}`
          };
        } catch (error) {
          console.error(`[AI-ADAPTER] Erro no modelo ${model}:`, error);

          // Se for o último modelo, retorna fallback
          if (model === modelsToTry[modelsToTry.length - 1]) {
            console.log('[AI-ADAPTER] Todos os modelos falharam, usando fallback');

            const fallbackCategory = availableCategories.find(cat => cat === 'OUTRAS DESPESAS NOP')
              || availableCategories[0]
              || 'OUTRAS DESPESAS NOP';

            return {
              category: fallbackCategory,
              confidence: 0.3,
              reasoning: `Fallback após erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
              modelUsed: 'none'
            };
          }

          // Tenta próximo modelo
          continue;
        }
      }

      // Fallback final
      return {
        category: 'OUTRAS DESPESAS NOP',
        confidence: 0.1,
        reasoning: 'Fallback final - nenhum modelo respondeu',
        modelUsed: 'none'
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
