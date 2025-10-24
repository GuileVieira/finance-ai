import { CompanyInfo, SearchQuery } from '@/lib/agent/types';

// Serviço de busca usando API gratuita do DuckDuckGo
export class DuckDuckGoService {
  private static instance: DuckDuckGoService;
  private readonly baseUrl = 'https://api.duckduckgo.com/';
  private readonly cache = new Map<string, any>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutos

  private constructor() {}

  static getInstance(): DuckDuckGoService {
    if (!DuckDuckGoService.instance) {
      DuckDuckGoService.instance = new DuckDuckGoService();
    }
    return DuckDuckGoService.instance;
  }

  // Buscar informações da empresa
  async searchCompany(query: SearchQuery): Promise<CompanyInfo[]> {
    const cacheKey = `${query.type}_${query.query}`;

    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const searchQuery = this.buildSearchQuery(query);
      const url = `${this.baseUrl}?q=${encodeURIComponent(searchQuery)}&format=json&pretty=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FinanceAI/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = await response.json();
      const results = this.parseCompanyResults(data);

      // Se não encontrar resultados, tentar com busca mais específica
      if (results.length === 0 && query.type === 'company') {
        const specificQuery = `${query.query} CNPJ empresa Brasil`;
        const fallbackUrl = `${this.baseUrl}?q=${encodeURIComponent(specificQuery)}&format=json&pretty=1`;

        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FinanceAI/1.0)'
          }
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackResults = this.parseCompanyResults(fallbackData);

          if (fallbackResults.length > 0) {
            this.cache.set(cacheKey, { data: fallbackResults, timestamp: Date.now() });
            return fallbackResults;
          }
        }
      }

      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;

    } catch (error) {
      console.error('Erro na busca DuckDuckGo:', error);
      // Fallback para modo simulado
      const mockResults = this.generateMockCompanyInfo(query);
      this.cache.set(cacheKey, { data: mockResults, timestamp: Date.now() });
      return mockResults;
    }
  }

  // Buscar por CNPJ
  async searchByCNPJ(cnpj: string): Promise<CompanyInfo[]> {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');

    if (cleanCnpj.length !== 14) {
      throw new Error('CNPJ inválido');
    }

    return this.searchCompany({
      query: `CNPJ ${cleanCnpj}`,
      type: 'cnpj'
    });
  }

  // Construir query de busca
  private buildSearchQuery(query: SearchQuery): string {
    switch (query.type) {
      case 'cnpj':
        return `${query.query} CNPJ empresa`;
      case 'company':
        return `${query.query} empresa Brasil`;
      case 'service':
        return `${query.query} serviço empresa`;
      default:
        return query.query;
    }
  }

  // Parsear resultados da DuckDuckGo
  private parseCompanyResults(data: any): CompanyInfo[] {
    const results: CompanyInfo[] = [];

    // DuckDuckGo retorna resultados no formato:
    // { Abstract: "", AbstractText: "", AbstractSource: "", AbstractURL: "",
    //   Image: "", Results: [{ FirstURL: "", FirstURLText: "", Text: "",
    //   Title: "", Result: "", Icon: "", a: "" }] }

    if (data.Results && Array.isArray(data.Results)) {
      for (const result of data.Results.slice(0, 5)) {
        const companyInfo = this.extractCompanyFromResult(result);
        if (companyInfo) {
          results.push(companyInfo);
        }
      }
    }

    return results.filter(r => r.confidence > 0.3);
  }

  // Extrair informações de resultado da DuckDuckGo
  private extractCompanyFromResult(result: any): CompanyInfo | null {
    try {
      const title = result.Title || result.Text || '';
      const snippet = result.Text || '';
      const url = result.FirstURL || '';

      // Detectar CNPJ no snippet/título
      const textToSearch = `${title} ${snippet}`;
      const cnpjMatch = textToSearch.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
      const cnpj = cnpjMatch ? cnpjMatch[0] : undefined;

      // Tentar extrair nome da empresa
      const companyName = this.extractCompanyName(title, snippet);

      if (!companyName) return null;

      // Calcular confiança baseado em fatores
      let confidence = 0.4;

      if (cnpj) confidence += 0.3;
      if (textToSearch.toLowerCase().includes('cnpj')) confidence += 0.2;
      if (url.includes('cnpj') || url.includes('empresa') || url.includes('.gov.br')) confidence += 0.1;
      if (title.toLowerCase().includes('ltda') || title.toLowerCase().includes('sa') || title.toLowerCase().includes('me')) confidence += 0.1;
      if (snippet.length > 50) confidence += 0.1; // Snippets mais longos geralmente mais úteis

      return {
        name: companyName,
        cnpj,
        website: url,
        description: snippet.substring(0, 200),
        confidence: Math.min(confidence, 1.0)
      };
    } catch (error) {
      console.error('Erro ao extrair empresa do resultado DuckDuckGo:', error);
      return null;
    }
  }

  // Extrair nome da empresa
  private extractCompanyName(title: string, snippet: string): string | null {
    // Remover sufixos comuns
    const cleanTitle = title
      .replace(/\s*(?:Ltda|S\.A\.|ME|EPP|S\/A)$/i, '')
      .replace(/\s*\|\s*[\[\(].*?[\]\)]\s*/g, '') // Remover texto entre parênteses/colchetes
      .trim();

    if (!cleanTitle || cleanTitle.length < 3) return null;

    // Verificar se parece com nome de empresa
    const hasBusinessTerms = /\b(Ltda|S\.A\.|ME|EPP|Comércio|Serviços|Indústria)\b/i;
    const hasNumbers = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
    const isCommonBusinessWords = /ifood|uber|netflix|amazon|google|microsoft/i;

    if (hasBusinessTerms.test(cleanTitle) ||
        hasNumbers.test(snippet) ||
        isCommonBusinessWords.test(cleanTitle)) {
      return cleanTitle;
    }

    // Se não for muito genérico, retornar
    const genericWords = /sobre|contato|telefone|email|home|página inicial/i;
    if (!genericWords.test(cleanTitle) && cleanTitle.length > 4) {
      return cleanTitle;
    }

    return null;
  }

  // Limpar cache
  clearCache(): void {
    this.cache.clear();
  }

  // Obter estatísticas
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implementar hit rate tracking
    };
  }
}