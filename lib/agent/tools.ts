import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DuckDuckGoService } from '@/lib/search/serpapi';
import { CNPJService } from '@/lib/search/cnpj-service';
import { SearchQuery, CompanyInfo } from '@/lib/agent/types';

// Ferramenta para buscar informações de empresas
export const searchCompanyTool = tool(async (input: { query: string; type: string }) => {
  const duckDuckGo = DuckDuckGoService.getInstance();

  const searchQuery: SearchQuery = {
    query: input.query,
    type: input.type as 'company' | 'cnpj' | 'service'
  };

  try {
    const results = await duckDuckGo.searchCompany(searchQuery);
    return {
      success: true,
      data: results,
      count: results.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      data: []
    };
  }
}, {
  name: 'search_company',
  description: 'Busca informações sobre empresas usando nome ou CNPJ',
  schema: z.object({
    query: z.string().describe('Nome da empresa ou CNPJ para buscar'),
    type: z.enum(['company', 'cnpj', 'service']).describe('Tipo de busca: empresa, CNPJ ou serviço')
  })
});

// Ferramenta para validar CNPJ
export const validateCNPJTool = tool(async (input: { cnpj: string }) => {
  try {
    const isValid = CNPJService.validarCNPJ(input.cnpj);

    if (!isValid) {
      return {
        valid: false,
        error: 'CNPJ inválido',
        formatted: '',
        info: null
      };
    }

    const formatted = CNPJService.formatarCNPJ(input.cnpj);
    const cnpjService = CNPJService.getInstance();
    const info = await cnpjService.consultarCNPJ(input.cnpj);

    return {
      valid: true,
      error: null,
      formatted,
      info,
      category: info ? CNPJService.getCategoriaPorCNAE(info.cnaePrincipal.codigo) : null
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erro ao validar CNPJ',
      formatted: '',
      info: null
    };
  }
}, {
  name: 'validate_cnpj',
  description: 'Valida formato do CNPJ e busca informações da empresa',
  schema: z.object({
    cnpj: z.string().describe('CNPJ para validar (com ou sem formatação)')
  })
});

// Ferramenta para extrair CNPJ de texto
export const extractCNPJTool = tool(async (input: { text: string }) => {
  try {
    const cnpjs = CNPJService.extrairCNPJ(input.text);
    const validCnpjs = cnpjs.filter(cnpj => CNPJService.validarCNPJ(cnpj));

    return {
      success: true,
      found: cnpjs.length,
      valid: validCnpjs.length,
      cnpjs: validCnpjs,
      originalMatches: cnpjs
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao extrair CNPJ',
      cnpjs: []
    };
  }
}, {
  name: 'extract_cnpj',
  description: 'Extrai todos os CNPJs válidos de um texto',
  schema: z.object({
    text: z.string().describe('Texto para extrair CNPJs')
  })
});

// Ferramenta para categorizar empresa por CNAE
export const categorizeByCNAETool = tool(async (input: { cnaeCode: string }) => {
  try {
    const category = CNPJService.getCategoriaPorCNAE(input.cnaeCode);
    return {
      success: true,
      category,
      cnaeCode: input.cnaeCode
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao categorizar por CNAE',
      category: null
    };
  }
}, {
  name: 'categorize_by_cnae',
  description: 'Categoriza empresa baseado no código CNAE',
  schema: z.object({
    cnaeCode: z.string().describe('Código CNAE para categorizar')
  })
});

// Ferramenta para normalizar descrição de transação
export const normalizeDescriptionTool = tool(async (input: { description: string }) => {
  try {
    const normalized = input.description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Manter apenas letras, números e espaços
      .replace(/\s+/g, ' ') // Unificar múltiplos espaços
      .trim();

    // Extrair palavras-chave
    const keywords = normalized
      .split(' ')
      .filter(word => word.length > 2) // Remover palavras pequenas
      .filter(word => !['de', 'da', 'do', 'em', 'para', 'com', 'sem', 'por', 'pelo', 'pela', 'ao', 'aos'].includes(word))
      .slice(0, 10); // Limitar a 10 palavras

    // Detectar padrões
    const patterns = {
      hasCNPJ: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/.test(input.description),
      hasValue: /R\$?\s*\d+([.,]\d{2})?/.test(input.description),
      hasDate: /\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/.test(input.description),
      isDebit: /debit|débito|saída|pagamento|despesa/i.test(input.description),
      isCredit: /credit|crédito|entrada|receita|depósito/i.test(input.description)
    };

    return {
      success: true,
      normalized,
      keywords,
      patterns,
      originalLength: input.description.length,
      normalizedLength: normalized.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao normalizar descrição',
      normalized: input.description,
      keywords: [],
      patterns: {}
    };
  }
}, {
  name: 'normalize_description',
  description: 'Normaliza e extrai palavras-chave de descrições de transações',
  schema: z.object({
    description: z.string().describe('Descrição da transação para normalizar')
  })
});

// Ferramenta para analisar contexto financeiro
export const analyzeFinancialContextTool = tool(async (input: {
  description: string;
  amount: number;
  history?: string[]
}) => {
  try {
    const analysis = {
      transactionType: 'unknown',
      businessNature: 'unknown',
      frequency: 'unknown',
      riskLevel: 'low'
    };

    // Analisar valor
    if (input.amount > 10000) {
      analysis.riskLevel = 'high';
    } else if (input.amount > 1000) {
      analysis.riskLevel = 'medium';
    }

    // Detectar tipo de transação pela descrição
    const lowerDesc = input.description.toLowerCase();
    if (lowerDesc.includes('salário') || lowerDesc.includes('folha')) {
      analysis.transactionType = 'payroll';
      analysis.businessNature = 'operational';
    } else if (lowerDesc.includes('aluguel') || lowerDesc.includes('condomínio')) {
      analysis.transactionType = 'rent';
      analysis.businessNature = 'fixed_cost';
    } else if (lowerDesc.includes('compra') || lowerDesc.includes('material')) {
      analysis.transactionType = 'purchase';
      analysis.businessNature = 'variable_cost';
    } else if (lowerDesc.includes('ifood') || lowerDesc.includes('uber eats')) {
      analysis.transactionType = 'food_delivery';
      analysis.businessNature = 'business_meal';
    }

    // Analisar frequência se houver histórico
    if (input.history && input.history.length > 0) {
      const similarTransactions = input.history.filter(h =>
        h.toLowerCase().includes(lowerDesc.split(' ').slice(0, 3).join(' '))
      );

      if (similarTransactions.length > 5) {
        analysis.frequency = 'daily';
      } else if (similarTransactions.length > 1) {
        analysis.frequency = 'monthly';
      } else {
        analysis.frequency = 'occasional';
      }
    }

    return {
      success: true,
      analysis,
      insights: [
        `Tipo identificado: ${analysis.transactionType}`,
        `Natureza: ${analysis.businessNature}`,
        `Risco: ${analysis.riskLevel}`,
        `Frequência: ${analysis.frequency}`
      ]
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao analisar contexto',
      analysis: null
    };
  }
}, {
  name: 'analyze_financial_context',
  description: 'Analisa o contexto financeiro da transação para melhor classificação',
  schema: z.object({
    description: z.string().describe('Descrição da transação'),
    amount: z.number().describe('Valor da transação'),
    history: z.array(z.string()).optional().describe('Histórico de transações similares')
  })
});

// Ferramenta para validar consistência da classificação
export const validateClassificationTool = tool(async (input: {
  description: string;
  amount: number;
  macroCategory: string;
  microCategory: string;
  confidence: number;
}) => {
  try {
    const validation = {
      isValid: true,
      warnings: [],
      suggestions: []
    };

    // Validar confiança
    if (input.confidence < 0.7) {
      validation.warnings.push('Baixa confiança na classificação');
      validation.suggestions.push('Considere buscar mais informações sobre a empresa');
    }

    // Validar consistência do valor
    const lowerDesc = input.description.toLowerCase();

    if (input.amount > 50000 && lowerDesc.includes('salário')) {
      validation.warnings.push('Valor muito alto para salário');
      validation.suggestions.push('Verifique se é pagamento de salários consolidados ou bonificação');
    }

    if (input.amount < 10 && input.microCategory.includes('aluguel')) {
      validation.warnings.push('Valor muito baixo para aluguel');
      validation.suggestions.push('Pode ser taxa ou imposto relacionado, não aluguel principal');
    }

    // Validar padrões conhecidos
    const knownPatterns = {
      'ifood': { macro: 'Não Operacional', micro: 'Serviços Diversos' },
      'uber': { macro: 'Não Operacional', micro: 'Serviços Diversos' },
      'netflix': { macro: 'Custos Fixos', micro: 'Tecnologia e Software' },
      'aluguel': { macro: 'Custos Fixos', micro: 'Aluguel e Ocupação' },
      'inss': { macro: 'Custos Fixos', micro: 'Salários e Encargos' }
    };

    for (const [pattern, expected] of Object.entries(knownPatterns)) {
      if (lowerDesc.includes(pattern)) {
        if (input.macroCategory !== expected.macro || input.microCategory !== expected.micro) {
          validation.warnings.push(`Padrão conhecido "${pattern}" não corresponde à classificação`);
          validation.suggestions.push(`Considere: ${expected.macro} > ${expected.micro}`);
        }
      }
    }

    return {
      success: true,
      validation,
      recommendation: validation.warnings.length === 0 ? 'Aprovado' : 'Revisar'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro na validação',
      validation: null
    };
  }
}, {
  name: 'validate_classification',
  description: 'Valida a consistência e lógica da classificação proposta',
  schema: z.object({
    description: z.string().describe('Descrição original da transação'),
    amount: z.number().describe('Valor da transação'),
    macroCategory: z.string().describe('Categoria macro classificada'),
    microCategory: z.string().describe('Categoria micro classificada'),
    confidence: z.number().describe('Nível de confiança da classificação (0-1)')
  })
});