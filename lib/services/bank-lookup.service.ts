/**
 * Serviço de lookup de bancos brasileiros com fallback IA
 */

import { getBankByCode, getBankName, getBankColor, BrazilianBank } from '@/lib/data/brazilian-banks';
import { createLogger } from '@/lib/logger';

const log = createLogger('bank-lookup');

// Cache para resultados da IA (evita chamadas repetidas)
const aiCache = new Map<string, string>();

export interface BankLookupResult {
  code: string;
  name: string;
  shortName: string;
  color: string;
  source: 'database' | 'ai' | 'unknown';
}

export class BankLookupService {
  /**
   * Busca informações do banco pelo código
   * 1. Primeiro tenta na tabela estática
   * 2. Se não encontrar, tenta via IA (com cache)
   * 3. Se ainda não encontrar, retorna "Banco Não Identificado"
   */
  static async lookup(code: string): Promise<BankLookupResult> {
    if (!code) {
      return this.unknownBank('');
    }

    // Normalizar código
    const normalizedCode = code.replace(/\D/g, '').padStart(3, '0');

    // 1. Tentar na tabela estática
    const staticBank = getBankByCode(normalizedCode);
    if (staticBank) {
      return {
        code: normalizedCode,
        name: staticBank.name,
        shortName: staticBank.shortName,
        color: staticBank.color,
        source: 'database',
      };
    }

    // 2. Verificar cache da IA
    const cached = aiCache.get(normalizedCode);
    if (cached) {
      return {
        code: normalizedCode,
        name: cached,
        shortName: cached,
        color: '#6B7280',
        source: 'ai',
      };
    }

    // 3. Tentar buscar via IA (lado do servidor apenas)
    if (typeof window === 'undefined') {
      try {
        const aiResult = await this.lookupWithAI(normalizedCode);
        if (aiResult) {
          aiCache.set(normalizedCode, aiResult);
          return {
            code: normalizedCode,
            name: aiResult,
            shortName: aiResult,
            color: '#6B7280',
            source: 'ai',
          };
        }
      } catch (error) {
        log.error({ err: error, bankCode: normalizedCode }, 'Error looking up bank via AI');
      }
    }

    // 4. Retornar desconhecido
    return this.unknownBank(normalizedCode);
  }

  /**
   * Busca síncrona (sem IA) - para uso no frontend
   */
  static lookupSync(code: string): BankLookupResult {
    if (!code) {
      return this.unknownBank('');
    }

    const normalizedCode = code.replace(/\D/g, '').padStart(3, '0');
    const staticBank = getBankByCode(normalizedCode);

    if (staticBank) {
      return {
        code: normalizedCode,
        name: staticBank.name,
        shortName: staticBank.shortName,
        color: staticBank.color,
        source: 'database',
      };
    }

    // Verificar cache
    const cached = aiCache.get(normalizedCode);
    if (cached) {
      return {
        code: normalizedCode,
        name: cached,
        shortName: cached,
        color: '#6B7280',
        source: 'ai',
      };
    }

    return this.unknownBank(normalizedCode);
  }

  /**
   * Fallback: usar IA para identificar banco desconhecido
   */
  private static async lookupWithAI(code: string): Promise<string | null> {
    // Só executa no servidor
    if (typeof window !== 'undefined') {
      return null;
    }

    try {
      // Importar Anthropic dinamicamente (apenas no servidor)
      const { Anthropic } = await import('@anthropic-ai/sdk');

      const client = new Anthropic();

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Qual é o nome do banco brasileiro com código COMPE ${code}? Responda APENAS com o nome do banco, sem explicações. Se não souber, responda "Desconhecido".`,
          },
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (textContent && textContent.type === 'text') {
        const bankName = textContent.text.trim();
        if (bankName && bankName.toLowerCase() !== 'desconhecido') {
          log.info({ bankCode: code, bankName }, 'AI identified bank');
          return bankName;
        }
      }
    } catch (error) {
      log.error({ err: error }, 'Error in AI bank lookup call');
    }

    return null;
  }

  /**
   * Retorna resultado para banco desconhecido
   */
  private static unknownBank(code: string): BankLookupResult {
    return {
      code,
      name: code ? `Banco Não Identificado (${code})` : 'Banco Não Identificado',
      shortName: 'Banco Não Identificado',
      color: '#6B7280',
      source: 'unknown',
    };
  }

  /**
   * Adiciona resultado ao cache (para persistir descobertas da IA)
   */
  static addToCache(code: string, name: string): void {
    const normalizedCode = code.replace(/\D/g, '').padStart(3, '0');
    aiCache.set(normalizedCode, name);
  }

  /**
   * Limpa o cache da IA
   */
  static clearCache(): void {
    aiCache.clear();
  }

  /**
   * Retorna o tamanho do cache
   */
  static getCacheSize(): number {
    return aiCache.size;
  }
}

// Re-exportar funções úteis do arquivo de dados
export { getBankByCode, getBankName, getBankColor, getAllBanksSorted, searchBanks } from '@/lib/data/brazilian-banks';
export type { BrazilianBank } from '@/lib/data/brazilian-banks';
