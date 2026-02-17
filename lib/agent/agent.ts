import { StateGraph, START, END } from '@langchain/langgraph';
import { z } from 'zod';
import { AgentPrompts } from './prompts';
import CategoriesService from '@/lib/services/categories.service';
import type { Category } from '@/lib/types';
import { aiProviderService } from '@/lib/ai/ai-provider.service';
import {
  searchCompanyTool,
  validateCNPJTool,
  extractCNPJTool,
  categorizeByCNAETool,
  normalizeDescriptionTool,
  analyzeFinancialContextTool,
  validateClassificationTool
} from './tools';
import { db } from '@/lib/db/drizzle';
import { categoryRules, transactions, categories, accounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import categoryCacheService from '@/lib/services/category-cache.service';
import { CNPJService } from '@/lib/search/cnpj-service';
import { DuckDuckGoService } from '@/lib/search/serpapi';
import {
  ClassificationResult,
  BatchClassificationRequest,
  BatchClassificationResponse
} from './types';

// Configuração padrão para chamadas de IA
const aiConfig = {
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.1'),
  max_tokens: parseInt(process.env.AI_MAX_TOKENS || '2000')
};

// Contexto global para logging (thread-local storage simulation)
let currentLogContext: {
  userId?: string;
  companyId?: string;
  uploadId?: string;
  batchId?: string;
  transactionId?: string;
  operationType?: string;
} | undefined;

// Função para chamar modelos via AI Provider Service
async function callLLM(model: string, messages: Array<{role: string, content: string}>): Promise<string> {
  try {
    const response = await aiProviderService.complete({
      model,
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      })),
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.max_tokens,
      logContext: currentLogContext // Passar contexto para logging
    });
    return response.content;
  } catch (error) {
    console.error(`Erro ao chamar modelo ${model}:`, error);
    throw error;
  }
}

// Schema do estado do agente
const AgentStateSchema = z.object({
  description: z.string(),
  amount: z.number(),
  transactionId: z.string(),
  normalizedDescription: z.string().optional(),
  extractedInfo: z.object({
    companyName: z.string().optional(),
    cnpj: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    patterns: z.record(z.any()).optional()
  }).optional(),
  companyInfo: z.object({
    name: z.string().optional(),
    cnpj: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional()
  }).optional(),
  classification: z.object({
    macro: z.string(),
    micro: z.string(),
    confidence: z.number(),
    reasoning: z.string()
  }).optional(),
  validation: z.object({
    isValid: z.boolean(),
    warnings: z.array(z.string()),
    suggestions: z.array(z.string())
  }).optional(),
  finalResult: z.object({
    transactionId: z.string(),
    originalDescription: z.string(),
    classification: z.object({
      macro: z.string(),
      micro: z.string(),
      confidence: z.number(),
      reasoning: z.string()
    }),
    rawData: z.object({
      companyName: z.string().optional(),
      cnpj: z.string().optional(),
      website: z.string().optional(),
      description: z.string()
    }),
    source: z.enum(['history', 'cache', 'ai']),
    processingTime: z.number()
  }).optional(),
  processingTime: z.number(),
  error: z.string().optional()
});

type AgentStateType = z.infer<typeof AgentStateSchema>;

// Classe principal do Agente de Classificação
export class ClassificationAgent {
  private static instance: ClassificationAgent;
  private graph: any; // Type accurately if using LangGraph types
  private categoriesCache: Category[] | null = null;
  private categoriesCacheTime: number = 0;
  private readonly CATEGORIES_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  private constructor() {
    this.graph = this.buildGraph();
  }

  /**
   * Buscar categorias do banco de dados com cache
   */
  private async getCategories(): Promise<Category[]> {
    const now = Date.now();

    // Verificar cache
    if (this.categoriesCache && (now - this.categoriesCacheTime) < this.CATEGORIES_CACHE_TTL) {
      return this.categoriesCache;
    }

    try {
      const dbCategories = await CategoriesService.getCategories({ isActive: true });

      // Mapear para o formato esperado pelo prompt (incluindo plano de contas)
      this.categoriesCache = dbCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type as any,
        categoryGroup: cat.categoryGroup ?? null,
        dreGroup: cat.dreGroup ?? null,
        colorHex: cat.colorHex || '#6B7280',
        icon: cat.icon || '📊',
        description: cat.description || '',
        examples: cat.examples || [],
        active: cat.active ?? true
      })) as Category[];
      this.categoriesCacheTime = now;

      console.log(`[Agent] Categorias carregadas do BD: ${this.categoriesCache.length}`);
      return this.categoriesCache;
    } catch (error) {
      console.error('[Agent] Erro ao buscar categorias do BD:', error);
      if (this.categoriesCache) {
        return this.categoriesCache;
      }
      return [];
    }
  }

  static getInstance(): ClassificationAgent {
    if (!ClassificationAgent.instance) {
      ClassificationAgent.instance = new ClassificationAgent();
    }
    return ClassificationAgent.instance;
  }

  private buildGraph(): any {
    const workflow = new StateGraph(AgentStateSchema);

    workflow.addNode('check_history', this.checkHistory.bind(this));
    workflow.addNode('check_cache', this.checkCache.bind(this));
    workflow.addNode('normalize_description', this.normalizeDescription.bind(this));
    workflow.addNode('extract_info', this.extractInfo.bind(this));
    workflow.addNode('search_company', this.searchCompany.bind(this));
    workflow.addNode('classify_transaction', this.classifyTransactionNode.bind(this));
    workflow.addNode('validate_classification', this.validateClassificationNode.bind(this));
    workflow.addNode('create_result', this.createResult.bind(this));
    workflow.addNode('handle_error', this.handleError.bind(this));

    workflow.addEdge(START, 'check_history');
    
    workflow.addConditionalEdges('check_history', (state) => state.classification ? 'found' : 'not_found', {
      found: 'create_result',
      not_found: 'check_cache'
    });

    workflow.addConditionalEdges('check_cache', (state) => state.classification ? 'found' : 'not_found', {
      found: 'create_result',
      not_found: 'normalize_description'
    });

    workflow.addEdge('normalize_description', 'extract_info');
    workflow.addEdge('extract_info', 'search_company');
    workflow.addEdge('search_company', 'classify_transaction');
    workflow.addEdge('classify_transaction', 'validate_classification');
    
    workflow.addConditionalEdges('validate_classification', (state) => state.validation?.isValid ? 'valid' : 'invalid', {
      valid: 'create_result',
      invalid: 'classify_transaction'
    });

    workflow.addEdge('create_result', END);
    workflow.addEdge('handle_error', END);

    return workflow.compile();
  }

  private async checkHistory(state: AgentStateType): Promise<Partial<AgentStateType>> {
    return { description: state.description, amount: state.amount };
  }

  private async checkCache(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      const companyId = (currentLogContext as any)?.companyId || 'UNKNOWN';
      const cachedResult = categoryCacheService.findInCache(state.description, companyId);

      if (cachedResult) {
        return {
          classification: {
            macro: '',
            micro: cachedResult.categoryName,
            confidence: cachedResult.confidence * 100,
            reasoning: `Encontrado no cache (${cachedResult.source})`
          }
        };
      }
      return { description: state.description, amount: state.amount };
    } catch (error) {
      return { error: `Erro no cache: ${error instanceof Error ? error.message : 'Erro'}` };
    }
  }

  private async normalizeDescription(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      const result = await normalizeDescriptionTool.invoke({ description: state.description });
      if (result.success) {
        return {
          normalizedDescription: result.normalized,
          extractedInfo: { keywords: result.keywords, patterns: result.patterns }
        };
      }
      return { error: result.error || 'Erro normalização' };
    } catch (error) {
      return { error: `Erro normalização: ${error}` };
    }
  }

  private async extractInfo(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      const result = await extractCNPJTool.invoke({ text: state.description });
      let extracted = state.extractedInfo || {};
      if (result.success && result.cnpjs.length > 0) {
        extracted = { ...extracted, cnpj: result.cnpjs[0] };
      }
      return { extractedInfo: extracted };
    } catch (error) {
      return { error: `Erro extração: ${error}` };
    }
  }

  private async searchCompany(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      return { companyInfo: {} };
    } catch (error) {
      return { companyInfo: {} };
    }
  }

  private async classifyTransactionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      const categories = await this.getCategories();
      const prompt = AgentPrompts.buildMainPrompt(categories, []);
      const messages = [
        { role: 'system', content: prompt },
        { role: 'user', content: `Classifique: "${state.description}"` }
      ];
      const model = process.env.AI_MODEL_PRIMARY || 'google/gemini-2.0-flash-exp';
      const text = await callLLM(model, messages);
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      const classification = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(text);
      return { classification };
    } catch (error) {
      return { error: `Erro classificação: ${error}` };
    }
  }

  private async validateClassificationNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      if (!state.classification) return { error: 'Sem classificação' };
      const result = await validateClassificationTool.invoke({
        description: state.description,
        amount: state.amount,
        macroCategory: state.classification.macro,
        microCategory: state.classification.micro,
        confidence: state.classification.confidence
      });
      return { validation: (result.success && result.validation) ? (result.validation as any) : undefined };
    } catch (error) {
      return { error: `Erro validação: ${error}` };
    }
  }

  private async createResult(state: AgentStateType): Promise<Partial<AgentStateType>> {
    if (!state.classification) return { error: 'Sem classificação' };
    const result: ClassificationResult = {
      transactionId: state.transactionId,
      originalDescription: state.description,
      classification: state.classification,
      rawData: { description: state.description },
      source: 'ai',
      processingTime: state.processingTime
    };
    return { finalResult: result };
  }

  private async handleError(state: AgentStateType): Promise<Partial<AgentStateType>> {
    return {
      finalResult: {
        transactionId: state.transactionId,
        originalDescription: state.description,
        classification: { macro: 'Outros', micro: 'Outros', confidence: 0.1, reasoning: state.error || 'Erro' },
        rawData: { description: state.description },
        source: 'ai',
        processingTime: state.processingTime
      }
    };
  }

  async classifyTransaction(
    description: string,
    amount: number,
    transactionId: string,
    logContext?: any
  ): Promise<ClassificationResult> {
    const startTime = Date.now();
    currentLogContext = logContext;
    try {
      const result = await this.graph.invoke({ description, amount, transactionId, processingTime: 0 });
      return { ...result.finalResult, processingTime: Date.now() - startTime };
    } catch (error) {
      return {
        transactionId,
        originalDescription: description,
        classification: { macro: 'Erro', micro: 'Erro', confidence: 0, reasoning: String(error) },
        rawData: { description },
        source: 'ai',
        processingTime: Date.now() - startTime
      };
    }
  }

  async classifyBatch(request: BatchClassificationRequest, logContext?: any): Promise<BatchClassificationResponse> {
    const startTime = Date.now();
    const results = await Promise.all(request.transactions.map(t => this.classifyTransaction(t.description, t.amount, t.id, logContext)));
    return {
      results,
      summary: {
        total: results.length,
        fromHistory: 0,
        fromCache: 0,
        fromAI: results.length,
        processingTime: Date.now() - startTime,
        costEstimate: results.length * 0.001
      }
    };
  }
}