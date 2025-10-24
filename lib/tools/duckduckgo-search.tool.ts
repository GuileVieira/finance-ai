import { tool } from 'langchain';
import * as z from 'zod';

// Interface para resultado da pesquisa DuckDuckGo
export interface DuckDuckGoSearchResult {
  Abstract?: string;
  AbstractText?: string;
  AbstractSource?: string;
  AbstractURL?: string;
  Image?: string;
  Heading?: string;
  Answer?: string;
  AnswerType?: string;
  Definition?: string;
  DefinitionSource?: string;
  DefinitionURL?: string;
  RelatedTopics?: Array<{
    Text: string;
    FirstURL: string;
    Icon?: {
      URL: string;
      Height?: number;
      Width?: number;
    };
  }>;
  Results?: Array<{
    FirstURL: string;
    Text: string;
    HTML?: string;
    Icon?: {
      URL: string;
      Height?: number;
      Width?: number;
    };
  }>;
  Type?: string;
  meta?: {
    description?: string;
    maintenance?: string;
    developer?: string;
    designer?: string;
    homepage?: string;
    src?: string;
    src_diy?: string;
    src_name?: string;
    src_logo?: string;
    src_logo_2?: string;
  };
}

// Interface simplificada para resposta processada
export interface ProcessedSearchResult {
  companyName?: string;
  cnpj?: string;
  cnae?: string;
  activity?: string;
  sector?: string;
  website?: string;
  description?: string;
  isFinancial?: boolean;
  isSupplier?: boolean;
  confidence: number;
}

// Ferramenta de pesquisa DuckDuckGo para empresas brasileiras
export const duckDuckGoSearchTool = tool(
  async ({ query, searchType }: { query: string; searchType: 'company' | 'cnpj' | 'general' }): Promise<ProcessedSearchResult> => {
    try {
      console.log(`🔍 Pesquisando no DuckDuckGo: ${query} (tipo: ${searchType})`);

      // Construir URL de busca com otimizações para empresas brasileiras
      let searchQuery = query;
      if (searchType === 'company') {
        searchQuery = `${query} empresa CNPJ Brasil site:.br`;
      } else if (searchType === 'cnpj') {
        searchQuery = `CNPJ ${query} empresa Brasil`;
      }

      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&pretty=1&no_html=1&skip_disambig=1`;

      console.log(`📡 Fazendo requisição para: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DuckDuckGoSearchResult = await response.json();
      console.log('📋 Resposta DuckDuckGo recebida:', JSON.stringify(data, null, 2));

      // Processar resultados para extrair informações da empresa
      const processedResult = processSearchResult(data, query, searchType);

      console.log(`✅ Pesquisa processada:`, processedResult);
      return processedResult;

    } catch (error) {
      console.error('❌ Erro na pesquisa DuckDuckGo:', error);

      return {
        query,
        searchType,
        companyName: '',
        cnpj: '',
        cnae: '',
        activity: '',
        sector: '',
        website: '',
        description: '',
        isFinancial: false,
        isSupplier: false,
        confidence: 0.0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  },
  {
    name: "duckduckgo_search",
    description: "Pesquisa informações sobre empresas brasileiras usando DuckDuckGo. Ideal para encontrar CNPJ, CNAE, atividade principal e setor da empresa.",
    schema: z.object({
      query: z.string().describe("Nome da empresa, CNPJ ou termo para pesquisar"),
      searchType: z.enum(['company', 'cnpj', 'general']).describe("Tipo de pesquisa: 'company' para nome da empresa, 'cnpj' para CNPJ, 'general' para busca geral"),
    }),
  }
);

// Função auxiliar para processar resultados da busca
function processSearchResult(data: DuckDuckGoSearchResult, originalQuery: string, searchType: string): ProcessedSearchResult {
  const result: ProcessedSearchResult = {
    confidence: 0.0,
  };

  // Extrair informações do Abstract/Answer se disponível
  if (data.Abstract || data.AbstractText) {
    const text = data.Abstract || data.AbstractText || '';
    result.description = text;

    // Tentar extrair CNPJ do texto
    const cnpjMatch = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    if (cnpjMatch) {
      result.cnpj = cnpjMatch[0];
      result.confidence += 0.3;
    }

    // Tentar extrair CNAE do texto
    const cnaeMatch = text.match(/CNAE[:\s]*(\d{4}[-\/]\d{1,2})/i);
    if (cnaeMatch) {
      result.cnae = cnaeMatch[1];
      result.confidence += 0.2;
    }
  }

  // Extrair informações dos resultados relacionados
  if (data.RelatedTopics && data.RelatedTopics.length > 0) {
    for (const topic of data.RelatedTopics) {
      const text = topic.Text || '';

      // Procurar por CNPJ nos tópicos relacionados
      const cnpjMatch = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
      if (cnpjMatch && !result.cnpj) {
        result.cnpj = cnpjMatch[0];
        result.confidence += 0.2;
      }

      // Extrair nome da empresa se não tiver ainda
      if (!result.companyName && text.toLowerCase().includes(originalQuery.toLowerCase())) {
        const parts = text.split('-');
        if (parts.length > 0) {
          result.companyName = parts[0].trim();
          result.confidence += 0.2;
        }
      }
    }
  }

  // Extrair informações dos resultados principais
  if (data.Results && data.Results.length > 0) {
    const firstResult = data.Results[0];
    if (firstResult.FirstURL) {
      result.website = firstResult.FirstURL;
      result.confidence += 0.1;
    }

    if (firstResult.Text) {
      const text = firstResult.Text;

      // Tentar extrair atividade/setor do texto
      const activityKeywords = ['comércio', 'indústria', 'serviços', 'varejo', 'atacado', 'construção', 'tecnologia', 'consultoria'];
      for (const keyword of activityKeywords) {
        if (text.toLowerCase().includes(keyword)) {
          result.activity = keyword;
          result.confidence += 0.1;
          break;
        }
      }
    }
  }

  // Definir nome da empresa se ainda não tiver
  if (!result.companyName) {
    result.companyName = originalQuery;
    result.confidence += 0.1;
  }

  // Determinar setor com base na atividade
  if (result.activity) {
    if (['banco', 'financeira', 'seguradora'].some(term => result.activity!.toLowerCase().includes(term))) {
      result.isFinancial = true;
      result.sector = 'Financeiro';
    } else if (['varejo', 'comércio', 'atacado'].some(term => result.activity!.toLowerCase().includes(term))) {
      result.sector = 'Comércio';
    } else if (['indústria', 'manufatura', 'produção'].some(term => result.activity!.toLowerCase().includes(term))) {
      result.sector = 'Indústria';
    } else if (['serviços', 'consultoria', 'tecnologia'].some(term => result.activity!.toLowerCase().includes(term))) {
      result.sector = 'Serviços';
    }
  }

  // Determinar se é provavelmente fornecedor com base no CNAE (se disponível)
  if (result.cnae) {
    const supplierCnaeRanges = [
      /^46/, // Comércio atacadista
      /^47/, // Comércio varejista
      /^41/, // Construção
      /^42/, // Construção
      /^43/, // Construção
      /^49/, // Transporte
      /^50/, // Transporte
      /^51/, // Transporte
      /^52/, // Armazenagem
      /^53/, // Correio
      /^55/, // Hospedagem
      /^56/, // Alimentação
      /^68/, // Atividades imobiliárias
      /^69/, // Atividades jurídicas
      /^70/, // Atividades de sedes gerenciais
      /^71/, // Serviços de arquitetura e engenharia
      /^72/, // Atividades de pesquisa e desenvolvimento científico
      /^73/, // Publicidade e propaganda
      /^74/, // Outras atividades de serviços prestados principalmente às empresas
      /^78/, // Seleção, agenciamento e locação de mão de obra
      /^79/, // Agências de viagens
      /^80/, // Atividades de vigilância e segurança
      /^81/, // Atividades de serviços para edifícios e paisagismo
      /^82/, // Serviços de escritório, de apoio administrativo e outros serviços prestados às empresas
    ];

    result.isSupplier = supplierCnaeRanges.some(range => range.test(result.cnae!));
    result.confidence += result.isSupplier ? 0.2 : 0.0;
  }

  // Limitar confiança entre 0 e 1
  result.confidence = Math.min(Math.max(result.confidence, 0), 1);

  return result;
}

// Função auxiliar para pesquisa de empresa específica
export async function searchCompanyInfo(companyName: string): Promise<ProcessedSearchResult> {
  return await duckDuckGoSearchTool.invoke({
    query: companyName,
    searchType: 'company'
  });
}

// Função auxiliar para pesquisa por CNPJ
export async function searchByCNPJ(cnpj: string): Promise<ProcessedSearchResult> {
  return await duckDuckGoSearchTool.invoke({
    query: cnpj,
    searchType: 'cnpj'
  });
}