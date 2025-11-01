/**
 * Service para abstrair provedores de IA (OpenRouter, OpenAI)
 * Permite alternar facilmente entre provedores via variável de ambiente
 */

export type AIProvider = 'openrouter' | 'openai';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface AICompletionResponse {
  content: string;
  provider: AIProvider;
  model: string;
}

/**
 * Configuração dos provedores
 */
const PROVIDER_CONFIG = {
  openrouter: {
    apiBase: 'https://openrouter.ai/api/v1',
    getApiKey: () => process.env.OPENROUTER_API_KEY,
    /**
     * Mapeia modelos genéricos para formato OpenRouter
     * Ex: 'gpt-4' -> 'openai/gpt-4'
     */
    formatModel: (model: string): string => {
      // Se já tem prefixo de provedor, manter
      if (model.includes('/')) return model;

      // Mapear modelos comuns
      if (model.startsWith('gpt-')) return `openai/${model}`;
      if (model.startsWith('gemini')) return `google/${model}`;
      if (model.startsWith('claude')) return `anthropic/${model}`;

      return model;
    }
  },
  openai: {
    apiBase: 'https://api.openai.com/v1',
    getApiKey: () => process.env.OPENAI_API_KEY,
    /**
     * Mapeia modelos para formato OpenAI
     * Remove prefixos de provedor se houver
     */
    formatModel: (model: string): string => {
      // Se tem prefixo 'openai/', remover
      if (model.startsWith('openai/')) {
        return model.replace('openai/', '');
      }

      // Mapear modelos do OpenRouter para OpenAI
      const modelMap: Record<string, string> = {
        'google/gemini-2.5-flash': 'gpt-4o-mini', // Fallback para modelo similar
        'google/gemini-2.0-flash-exp': 'gpt-4o-mini',
        'openai/gpt-5-mini': 'gpt-4o-mini', // GPT-5 não existe ainda
        'openai/gpt-4o-mini': 'gpt-4o-mini',
        'openai/gpt-4o': 'gpt-4o',
        'openai/gpt-4': 'gpt-4',
      };

      return modelMap[model] || model;
    }
  }
} as const;

/**
 * Determina qual provedor usar baseado na env
 * Prioridade: AI_PROVIDER > existência de chaves
 */
export function getActiveProvider(): AIProvider {
  const envProvider = process.env.AI_PROVIDER?.toLowerCase();

  if (envProvider === 'openai' || envProvider === 'openrouter') {
    return envProvider;
  }

  // Fallback: usar OpenRouter se tiver chave
  if (process.env.OPENROUTER_API_KEY) {
    return 'openrouter';
  }

  // Último fallback: OpenAI
  return 'openai';
}

/**
 * Classe principal do service de IA
 */
export class AIProviderService {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || getActiveProvider();
  }

  /**
   * Obtém a configuração do provedor atual
   */
  private getConfig() {
    return PROVIDER_CONFIG[this.provider];
  }

  /**
   * Valida se o provedor está configurado corretamente
   */
  validateConfiguration(): { valid: boolean; error?: string } {
    const config = this.getConfig();
    const apiKey = config.getApiKey();

    if (!apiKey) {
      return {
        valid: false,
        error: `Chave de API não configurada para ${this.provider}. Configure ${
          this.provider === 'openai' ? 'OPENAI_API_KEY' : 'OPENROUTER_API_KEY'
        } no .env`
      };
    }

    return { valid: true };
  }

  /**
   * Extrai tempo de espera do erro de rate limit
   */
  private extractRetryAfter(errorMessage: string): number {
    // Procura por padrões como "try again in 1.302s" ou "retry_after"
    const match = errorMessage.match(/try again in ([\d.]+)s/i);
    if (match) {
      return parseFloat(match[1]) * 1000; // converter para ms
    }
    return 0;
  }

  /**
   * Realiza uma chamada de completion com retry automático para rate limit
   */
  async completeWithRetry(
    options: AICompletionOptions,
    maxRetries = 3
  ): Promise<AICompletionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.complete(options);
      } catch (error) {
        lastError = error as Error;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Verificar se é erro de rate limit (429)
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate_limit');

        if (!isRateLimit || attempt === maxRetries - 1) {
          // Não é rate limit ou última tentativa - lançar erro
          throw error;
        }

        // Extrair tempo de espera sugerido pela API
        const retryAfter = this.extractRetryAfter(errorMessage);

        // Usar tempo sugerido ou exponential backoff
        const waitTime = retryAfter > 0
          ? retryAfter + 500 // tempo sugerido + 500ms de buffer
          : Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...

        console.log(
          `⏳ Rate limit atingido (tentativa ${attempt + 1}/${maxRetries}). ` +
          `Aguardando ${(waitTime / 1000).toFixed(1)}s antes de tentar novamente...`
        );

        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error('Todas as tentativas de retry falharam');
  }

  /**
   * Realiza uma chamada de completion para o provedor configurado
   */
  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    const validation = this.validateConfiguration();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const config = this.getConfig();
    const apiKey = config.getApiKey();
    const apiBase = config.apiBase;
    const formattedModel = config.formatModel(options.model);

    const requestBody = {
      model: formattedModel,
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.max_tokens ?? 2000
    };

    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(this.provider === 'openrouter' && {
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'MVP Finance'
          })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API ${this.provider} retornou erro ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();

      if (!result.choices || result.choices.length === 0) {
        throw new Error(`Nenhuma resposta retornada pela API ${this.provider}`);
      }

      const content = result.choices[0]?.message?.content?.trim() || '';

      return {
        content,
        provider: this.provider,
        model: formattedModel
      };
    } catch (error) {
      throw new Error(
        `Erro ao chamar ${this.provider}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Tenta múltiplos modelos em sequência até obter sucesso
   */
  async completeWithFallback(
    models: string[],
    messages: AIMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<AICompletionResponse> {
    const errors: string[] = [];

    for (const model of models) {
      try {
        const response = await this.completeWithRetry({
          model,
          messages,
          temperature: options?.temperature,
          max_tokens: options?.max_tokens
        });

        // Validar se a resposta tem conteúdo mínimo
        if (response.content && response.content.length > 10) {
          return response;
        }

        errors.push(`Modelo ${model} retornou resposta vazia ou muito curta`);
      } catch (error) {
        errors.push(
          `Modelo ${model}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        );

        // Se não for o último modelo, continuar tentando
        if (model !== models[models.length - 1]) {
          console.log(`⚠️ Falha no modelo ${model}, tentando próximo...`);
          continue;
        }
      }
    }

    // Se chegou aqui, todos os modelos falharam
    throw new Error(
      `Todos os modelos falharam:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
    );
  }

  /**
   * Retorna informações sobre o provedor atual
   */
  getProviderInfo() {
    const config = this.getConfig();
    const hasApiKey = !!config.getApiKey();

    return {
      provider: this.provider,
      apiBase: config.apiBase,
      isConfigured: hasApiKey,
      envVariable: this.provider === 'openai' ? 'OPENAI_API_KEY' : 'OPENROUTER_API_KEY'
    };
  }
}

/**
 * Instância singleton do service (usa provedor padrão das env)
 */
export const aiProviderService = new AIProviderService();

/**
 * Helper para criar service com provedor específico
 */
export function createAIProviderService(provider: AIProvider): AIProviderService {
  return new AIProviderService(provider);
}
