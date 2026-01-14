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
import { ClassificationHistory } from '@/lib/classification/history';
import { ClassificationCache } from '@/lib/classification/cache';
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
  private history: ClassificationHistory;
  private cache: ClassificationCache;
  private graph: ReturnType<typeof this.buildGraph>;
  private tools: unknown[];
  private categoriesCache: Category[] | null = null;
  private categoriesCacheTime: number = 0;
  private readonly CATEGORIES_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  private constructor() {
    this.history = ClassificationHistory.getInstance();
    this.cache = ClassificationCache.getInstance();
    this.tools = [
      searchCompanyTool,
      validateCNPJTool,
      extractCNPJTool,
      categorizeByCNAETool,
      normalizeDescriptionTool,
      analyzeFinancialContextTool,
      validateClassificationTool
    ];
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
        type: cat.type as 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational' | 'financial_movement',
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
      // Se falhar e tiver cache antigo, usar mesmo assim
      if (this.categoriesCache) {
        return this.categoriesCache;
      }
      // Retornar array vazio se não tiver nada
      return [];
    }
  }

  static getInstance(): ClassificationAgent {
    if (!ClassificationAgent.instance) {
      ClassificationAgent.instance = new ClassificationAgent();
    }
    return ClassificationAgent.instance;
  }

  private buildGraph(): void {
    // Criar o grafo de estados
    const workflow = new StateGraph(AgentStateSchema);

    // Definir nós do grafo
    workflow.addNode('check_history', this.checkHistory.bind(this));
    workflow.addNode('check_cache', this.checkCache.bind(this));
    workflow.addNode('normalize_description', this.normalizeDescription.bind(this));
    workflow.addNode('extract_info', this.extractInfo.bind(this));
    workflow.addNode('search_company', this.searchCompany.bind(this));
    workflow.addNode('classify_transaction', this.classifyTransaction.bind(this));
    workflow.addNode('validate_classification', this.validateClassification.bind(this));
    workflow.addNode('create_result', this.createResult.bind(this));
    workflow.addNode('handle_error', this.handleError.bind(this));

    // Definir transições
    workflow.addEdge(START, 'check_history');
    workflow.addConditionalEdges('check_history', this.hasHistoryResult, [
      { condition: 'found', node: 'create_result' },
      { condition: 'not_found', node: 'check_cache' }
    ]);
    workflow.addConditionalEdges('check_cache', this.hasCacheResult, [
      { condition: 'found', node: 'create_result' },
      { condition: 'not_found', node: 'normalize_description' }
    ]);
    workflow.addEdge('normalize_description', 'extract_info');
    workflow.addEdge('extract_info', 'search_company');
    workflow.addEdge('search_company', 'classify_transaction');
    workflow.addEdge('classify_transaction', 'validate_classification');
    workflow.addConditionalEdges('validate_classification', this.isValidClassification, [
      { condition: 'valid', node: 'create_result' },
      { condition: 'invalid', node: 'classify_transaction' }
    ]);
    workflow.addEdge('create_result', END);
    workflow.addEdge('handle_error', END);

    this.graph = workflow.compile();
  }

  // Verificar histórico
  private async checkHistory(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      const historyMatch = this.history.findExactMatch(state.description, state.amount);

      if (historyMatch) {
        return {
          classification: {
            macro: historyMatch.macroCategory,
            micro: historyMatch.microCategory,
            confidence: historyMatch.confidence,
            reasoning: 'Encontrado no histórico de classificações anteriores'
          },
          extractedInfo: {
            companyName: historyMatch.companyName,
            cnpj: historyMatch.cnpj
          }
        };
      }

      const similarMatch = this.history.findSimilarMatch(state.description);
      if (similarMatch) {
        return {
          classification: {
            macro: similarMatch.macroCategory,
            micro: similarMatch.microCategory,
            confidence: similarMatch.confidence * 0.8, // Reduzir confiança por ser similar
            reasoning: 'Encontrado transação similar no histórico'
          },
          extractedInfo: {
            companyName: similarMatch.companyName,
            cnpj: similarMatch.cnpj
          }
        };
      }

      return { description: state.description, amount: state.amount };
    } catch (error) {
      return {
        error: `Erro ao verificar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Verificar cache
  private async checkCache(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      const cachedResult = await this.cache.get(state.description, state.amount);

      if (cachedResult) {
        return {
          classification: cachedResult.classification,
          rawData: cachedResult.rawData
        };
      }

      const similarResult = await this.cache.findSimilar(state.description);
      if (similarResult) {
        return {
          classification: {
            ...similarResult.classification,
            confidence: similarResult.classification.confidence * 0.9
          },
          rawData: similarResult.rawData
        };
      }

      return { description: state.description, amount: state.amount };
    } catch (error) {
      return {
        error: `Erro ao verificar cache: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Normalizar descrição
  private async normalizeDescription(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      const result = await normalizeDescriptionTool.invoke({
        description: state.description
      });

      if (result.success) {
        return {
          normalizedDescription: result.normalized,
          extractedInfo: {
            keywords: result.keywords,
            patterns: result.patterns
          }
        };
      }

      return {
        error: result.error || 'Erro ao normalizar descrição'
      };
    } catch (error) {
      return {
        error: `Erro na normalização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Extrair informações
  private async extractInfo(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      const result = await extractCNPJTool.invoke({
        text: state.description
      });

      let extracted = state.extractedInfo || {};

      if (result.success && result.cnpjs.length > 0) {
        extracted = {
          ...extracted,
          cnpj: result.cnpjs[0]
        };
      }

      // Extrair nome da empresa usando IA se necessário
      if (!extracted.companyName) {
        const companyName = this.extractCompanyNameFromDescription(state.description);
        if (companyName) {
          extracted.companyName = companyName;
        }
      }

      return { extractedInfo: extracted };
    } catch (error) {
      return {
        error: `Erro ao extrair informações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Buscar informações da empresa
  private async searchCompany(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      let companyInfo = null;

      // Se tiver CNPJ, buscar por ele
      if (state.extractedInfo?.cnpj) {
        const cnpjResult = await validateCNPJTool.invoke({
          cnpj: state.extractedInfo.cnpj
        });
        if (cnpjResult.valid && cnpjResult.info) {
          companyInfo = {
            name: cnpjResult.info.razaoSocial,
            cnpj: cnpjResult.info.cnpj,
            category: CNPJService.getCategoriaPorCNAE(cnpjResult.info.cnaePrincipal.codigo)
          };
        }
      }

      // Se tiver nome da empresa, buscar por ele
      if (!companyInfo && state.extractedInfo?.companyName) {
        const searchResult = await searchCompanyTool.invoke({
          query: state.extractedInfo.companyName,
          type: 'company'
        });

        if (searchResult.success && searchResult.data.length > 0) {
          const bestMatch = searchResult.data[0];
          companyInfo = {
            name: bestMatch.name,
            cnpj: bestMatch.cnpj,
            website: bestMatch.website,
            description: bestMatch.description
          };
        }
      }

      return { companyInfo };
    } catch (error) {
      // Se der erro na busca, continuar sem info da empresa
      return { companyInfo: {} };
    }
  }

  // Classificar transação
  private async classifyTransaction(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      // Buscar categorias do banco de dados
      const categories = await this.getCategories();
      const prompt = AgentPrompts.buildMainPrompt(categories, this.history.exportPatterns());
      const historyStats = this.history.getStats();

      const enhancedPrompt = `${prompt}

## CONTEXTO ADICIONAL:
- Transação: "${state.description}"
- Valor: R$ ${state.amount.toFixed(2)}
- Empresa: ${state.companyInfo?.name || 'Não identificada'}
- CNPJ: ${state.companyInfo?.cnpj || 'Não encontrado'}
- Palavras-chave: ${state.extractedInfo?.keywords?.join(', ') || 'Nenhuma'}

## ESTATÍSTICAS DO HISTÓRICO:
- Total de classificações: ${historyStats.totalRecords}
- Acurácia média: ${(historyStats.averageAccuracy * 100).toFixed(1)}%

Classifique esta transação seguindo o formato JSON especificado.`;

      const messages = [
        { role: 'system', content: enhancedPrompt },
        { role: 'user', content: `Classifique esta transação: "${state.description}"` }
      ];

      // Tentar com modelo primário primeiro
      const primaryModel = process.env.AI_MODEL_PRIMARY || 'google/gemini-2.0-flash-exp';
      const fallbackModel = process.env.AI_MODEL_FALLBACK || 'openai/gpt-4o-mini';

      let classificationText = await callLLM(primaryModel, messages);

      // Se falhar, tentar com modelo fallback
      if (!classificationText || classificationText.length < 20) {
        classificationText = await callLLM(fallbackModel, messages);
      }
      const jsonMatch = classificationText.match(/```json\\s*([\\s\\S]*?)\\s*```/);

      if (jsonMatch) {
        const classification = JSON.parse(jsonMatch[1]);
        return { classification };
      }

      // Se não encontrar JSON, tentar parse direto
      try {
        const classification = JSON.parse(classificationText);
        return { classification };
      } catch {
        throw new Error('Resposta da IA não contém JSON válido');
      }
    } catch (error) {
      return {
        error: `Erro na classificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Validar classificação
  private async validateClassification(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      if (!state.classification) {
        return { error: 'Classificação não encontrada para validação' };
      }

      const result = await validateClassificationTool.invoke({
        description: state.description,
        amount: state.amount,
        macroCategory: state.classification.macro,
        microCategory: state.classification.micro,
        confidence: state.classification.confidence
      });

      return {
        validation: result.success ? result.validation : null
      };
    } catch (error) {
      return {
        error: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Criar resultado final
  private async createResult(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
      if (!state.classification) {
        return {
          error: 'Classificação não disponível para criar resultado'
        };
      }

      // Determinar fonte da classificação
      let source: 'history' | 'cache' | 'ai';
      if (state.classification.reasoning?.includes('histórico')) {
        source = 'history';
      } else if (state.classification.reasoning?.includes('cache')) {
        source = 'cache';
      } else {
        source = 'ai';
      }

      const result: ClassificationResult = {
        transactionId: state.transactionId,
        originalDescription: state.description,
        classification: state.classification,
        rawData: {
          companyName: state.companyInfo?.name || state.extractedInfo?.companyName,
          cnpj: state.companyInfo?.cnpj || state.extractedInfo?.cnpj,
          website: state.companyInfo?.website,
          description: state.description
        },
        source,
        processingTime: state.processingTime
      };

      // Adicionar ao cache se vier da IA
      if (source === 'ai') {
        await this.cache.set(state.description, result, state.amount);

        // Adicionar ao histórico
        this.history.addClassification({
          originalDescription: state.description,
          normalizedDescription: state.normalizedDescription || state.description.toLowerCase(),
          companyName: state.companyInfo?.name || state.extractedInfo?.companyName,
          cnpj: state.companyInfo?.cnpj || state.extractedInfo?.cnpj,
          macroCategory: state.classification.macro,
          microCategory: state.classification.micro,
          value: state.amount,
          confidence: state.classification.confidence,
          classificationSource: 'ai',
          feedbackCount: 0,
          accuracy: state.classification.confidence
        });
      }

      return { finalResult: result };
    } catch (error) {
      return {
        error: `Erro ao criar resultado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Lidar com erros
  private async handleError(state: AgentStateType): Promise<Partial<AgentStateType>> {
    return {
      finalResult: {
        transactionId: state.transactionId,
        originalDescription: state.description,
        classification: {
          macro: 'Não Operacional',
          micro: 'Outras Despesas',
          confidence: 0.1,
          reasoning: state.error || 'Erro na classificação'
        },
        rawData: {
          description: state.description
        },
        source: 'ai',
        processingTime: state.processingTime
      }
    };
  }

  // Métodos auxiliares para transições
  private hasHistoryResult(state: AgentStateType): string {
    return state.classification ? 'found' : 'not_found';
  }

  private hasCacheResult(state: AgentStateType): string {
    return state.classification ? 'found' : 'not_found';
  }

  private isValidClassification(state: AgentStateType): string {
    return state.validation?.isValid ? 'valid' : 'invalid';
  }

  private extractCompanyNameFromDescription(description: string): string | null {
    // Implementar lógica para extrair nome da empresa da descrição
    // Por enquanto, extrair primeira palavra-chave relevante
    const words = description
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 2);

    return words.length > 0 ? words.join(' ') : null;
  }

  // Método público para classificar transação
  async classifyTransaction(
    description: string,
    amount: number,
    transactionId: string,
    logContext?: {
      userId?: string;
      companyId?: string;
      uploadId?: string;
      batchId?: string;
    }
  ): Promise<ClassificationResult> {
    const startTime = Date.now();

    // Definir contexto para logging
    currentLogContext = logContext ? {
      ...logContext,
      transactionId,
      operationType: 'categorize'
    } : undefined;

    try {
      const initialState: AgentStateType = {
        description,
        amount,
        transactionId,
        processingTime: 0
      };

      const result = await this.graph.invoke(initialState);
      const processingTime = Date.now() - startTime;

      if (result.finalResult) {
        return {
          ...result.finalResult,
          processingTime
        };
      }

      // Se não tiver resultado, criar resultado de erro
      return {
        transactionId,
        originalDescription: description,
        classification: {
          macro: 'Não Operacional',
          micro: 'Outras Despesas',
          confidence: 0.1,
          reasoning: result.error || 'Falha na classificação'
        },
        rawData: { description },
        source: 'ai',
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        transactionId,
        originalDescription: description,
        classification: {
          macro: 'Não Operacional',
          micro: 'Outras Despesas',
          confidence: 0.1,
          reasoning: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        },
        rawData: { description },
        source: 'ai',
        processingTime
      };
    }
  }

  // Método para classificar em lote
  async classifyBatch(
    request: BatchClassificationRequest,
    logContext?: {
      userId?: string;
      companyId?: string;
      uploadId?: string;
      batchId?: string;
    }
  ): Promise<BatchClassificationResponse> {
    const startTime = Date.now();
    const results: ClassificationResult[] = [];
    let fromHistory = 0;
    let fromCache = 0;
    let fromAI = 0;

    for (const transaction of request.transactions) {
      const result = await this.classifyTransaction(
        transaction.description,
        transaction.amount,
        transaction.id,
        logContext // Passar contexto para cada classificação
      );

      results.push(result);

      if (result.source === 'history') fromHistory++;
      else if (result.source === 'cache') fromCache++;
      else fromAI++;
    }

    const processingTime = Date.now() - startTime;
    // Nota: o custo real está sendo registrado automaticamente no banco
    // Este é apenas uma estimativa rápida para retorno imediato
    const costEstimate = fromAI * 0.001; // Estimativa de custo por chamada IA

    return {
      results,
      summary: {
        total: results.length,
        fromHistory,
        fromCache,
        fromAI,
        processingTime,
        costEstimate
      }
    };
  }
}