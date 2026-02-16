/**
 * Description Enrichment Service
 *
 * Enriquece descrições de transações bancárias com informações contextuais.
 * Usa um dicionário local de termos bancários conhecidos + pesquisa web como fallback.
 */

import { DuckDuckGoService } from '@/lib/search/serpapi';

// Tipos
export interface BankingTermInfo {
  term: string;
  bank?: string;
  meaning: string;
  categoryHint?: string;
  keywords: string[];
}

export interface EnrichedDescription {
  original: string;
  normalized: string;
  bankingTerm?: BankingTermInfo;
  webSearchResult?: string;
  enrichedContext: string;
  confidence: number;
  complement?: string; // Parte da descrição após o termo bancário (ex: "FORNECEDORES" em "SISPAG FORNECEDORES")
}

// Dicionário de termos bancários conhecidos
const BANKING_TERMS: Record<string, BankingTermInfo> = {
  // Sistema de Pagamentos
  'SISPAG': {
    term: 'SISPAG',
    bank: 'Itaú',
    meaning: 'Sistema de Pagamentos do Itaú (pode ser Fornecedores, Salários ou Tributos)',
    categoryHint: 'Pagamento em Lote (Verificar complemento ou marcar como ambíguo)',
    keywords: ['pagamento', 'itau', 'lote', 'tributo']
  },
  'PAGFOR': {
    term: 'PAGFOR',
    bank: 'Bradesco',
    meaning: 'Pagamento a Fornecedores via Bradesco',
    categoryHint: 'Pagamento a fornecedores',
    keywords: ['pagamento', 'bradesco', 'fornecedor']
  },

  // FIDC e Antecipação
  'FIDC': {
    term: 'FIDC',
    meaning: 'Fundo de Investimento em Direitos Creditórios (Antecipação)',
    categoryHint: 'Desconto de Títulos ou Empréstimos (Entrada)',
    keywords: ['fidc', 'antecipacao', 'desconto', 'titulos']
  },
  'REC TIT': {
    term: 'REC TIT',
    meaning: 'Recebimento de Títulos (Antecipação ou Cobrança)',
    categoryHint: 'Receita de Vendas ou Desconto de Títulos',
    keywords: ['recebimento', 'titulo', 'antecipacao']
  },

  // Transferências e Devoluções
  'DEV TED': {
    term: 'DEV TED',
    meaning: 'Devolução de TED (Estorno)',
    categoryHint: 'Estorno de pagamentos',
    keywords: ['devolucao', 'estorno', 'ted']
  },
  'DEVOLUCAO': {
    term: 'DEVOLUCAO',
    meaning: 'Devolução de valores',
    categoryHint: 'Estorno de pagamentos',
    keywords: ['devolucao', 'estorno']
  },
  'TEV': {
    term: 'TEV',
    meaning: 'Transferência Eletrônica de Valores (mesmo banco)',
    categoryHint: 'Transferência interna (verificar titularidade)',
    keywords: ['transferencia', 'bancaria', 'mesmo', 'banco']
  },
  'TED': {
    term: 'TED',
    meaning: 'Transferência Eletrônica Disponível',
    categoryHint: 'Transferência bancária (ou Pagamento se externo)',
    keywords: ['transferencia', 'bancaria', 'interbancaria']
  },
  'DOC': {
    term: 'DOC',
    meaning: 'Documento de Ordem de Crédito',
    categoryHint: 'Transferência bancária',
    keywords: ['transferencia', 'bancaria']
  },
  'PIX': {
    term: 'PIX',
    meaning: 'Sistema de Pagamentos Instantâneos',
    categoryHint: 'Transferência ou Pagamento',
    keywords: ['transferencia', 'pagamento', 'instantaneo']
  },

  // Operações Bancárias
  'ESTORNO': {
    term: 'ESTORNO',
    meaning: 'Estorno de lançamentos',
    categoryHint: 'Estorno/Devolução',
    keywords: ['estorno', 'devolucao', 'reversao']
  },
  'EST': {
    term: 'EST',
    meaning: 'Estorno de transação',
    categoryHint: 'Estorno/Devolução',
    keywords: ['estorno', 'devolucao', 'reversao']
  },
  'DEB AUT': {
    term: 'DEB AUT',
    meaning: 'Débito Automático em conta',
    categoryHint: 'Débito automático (ver beneficiário para categoria)',
    keywords: ['debito', 'automatico', 'conta']
  },
  'COBRANCA': {
    term: 'COBRANCA',
    meaning: 'Cobrança bancária (boleto ou título)',
    categoryHint: 'Pagamento de boleto/título',
    keywords: ['cobranca', 'boleto', 'titulo']
  },
  'LIQ BOL': {
    term: 'LIQ BOL',
    meaning: 'Liquidação de Boleto',
    categoryHint: 'Pagamento de boleto',
    keywords: ['boleto', 'pagamento', 'liquidacao']
  },

  // Impostos e Taxas
  'DA REC FED': {
    term: 'DA REC FED',
    meaning: 'Documento de Arrecadação de Receitas Federais (DARF)',
    categoryHint: 'Impostos e Tributos (ou Estorno se crédito)',
    keywords: ['imposto', 'darf', 'receita', 'federal']
  },
  'DARF': {
    term: 'DARF',
    meaning: 'Documento de Arrecadação de Receitas Federais',
    categoryHint: 'Impostos e Tributos',
    keywords: ['imposto', 'darf', 'federal']
  },
  'DAS': {
    term: 'DAS',
    meaning: 'Documento de Arrecadação do Simples Nacional',
    categoryHint: 'Impostos e Tributos',
    keywords: ['imposto', 'simples', 'nacional']
  },
  'GPS': {
    term: 'GPS',
    meaning: 'Guia da Previdência Social',
    categoryHint: 'Encargos Sociais',
    keywords: ['imposto', 'inss', 'previdencia']
  },
  'FGTS': {
    term: 'FGTS',
    meaning: 'Fundo de Garantia do Tempo de Serviço',
    categoryHint: 'Encargos Sociais',
    keywords: ['encargos', 'fgts', 'trabalhista']
  },

  // Legados e Outros
  'CPMF': {
    term: 'CPMF',
    meaning: 'Contribuição Provisória (Extinto)',
    categoryHint: 'Taxa bancária histórica',
    keywords: ['imposto', 'taxa', 'cpmf']
  },
  'IOF': {
    term: 'IOF',
    meaning: 'Imposto sobre Operações Financeiras',
    categoryHint: 'Imposto federal',
    keywords: ['imposto', 'iof', 'financeiras']
  },

  // Investimentos
  'CDB': {
    term: 'CDB',
    meaning: 'Certificado de Depósito Bancário (investimento de renda fixa)',
    categoryHint: 'Investimento/Aplicação financeira',
    keywords: ['investimento', 'aplicacao', 'renda', 'fixa']
  },
  'RDB': {
    term: 'RDB',
    meaning: 'Recibo de Depósito Bancário (similar ao CDB)',
    categoryHint: 'Investimento/Aplicação financeira',
    keywords: ['investimento', 'aplicacao', 'renda', 'fixa']
  },
  'LCI': {
    term: 'LCI',
    meaning: 'Letra de Crédito Imobiliário (isento de IR)',
    categoryHint: 'Investimento/Aplicação financeira',
    keywords: ['investimento', 'imobiliario', 'renda', 'fixa']
  },
  'LCA': {
    term: 'LCA',
    meaning: 'Letra de Crédito do Agronegócio (isento de IR)',
    categoryHint: 'Investimento/Aplicação financeira',
    keywords: ['investimento', 'agronegocio', 'renda', 'fixa']
  },

  // Tarifas
  'TAR': {
    term: 'TAR',
    meaning: 'Tarifa bancária',
    categoryHint: 'Taxa/Tarifa bancária',
    keywords: ['tarifa', 'taxa', 'bancaria']
  },
  'ANUIDADE': {
    term: 'ANUIDADE',
    meaning: 'Anuidade de cartão de crédito ou serviço',
    categoryHint: 'Taxa/Tarifa bancária',
    keywords: ['anuidade', 'cartao', 'taxa']
  },

  // Outros
  'COMPENSACAO': {
    term: 'COMPENSACAO',
    meaning: 'Compensação de cheque ou documento',
    categoryHint: 'Movimento de compensação',
    keywords: ['compensacao', 'cheque', 'documento']
  },
  'RENDIMENTO': {
    term: 'RENDIMENTO',
    meaning: 'Rendimento de aplicação financeira',
    categoryHint: 'Receita financeira',
    keywords: ['rendimento', 'juros', 'aplicacao']
  },
  'RESGATE': {
    term: 'RESGATE',
    meaning: 'Resgate de aplicação financeira',
    categoryHint: 'Resgate de investimento',
    keywords: ['resgate', 'aplicacao', 'investimento']
  },
  'APLICACAO': {
    term: 'APLICACAO',
    meaning: 'Aplicação em investimento',
    categoryHint: 'Aplicação financeira',
    keywords: ['aplicacao', 'investimento']
  }
};

// Mapeamento de complementos para categorias
const COMPLEMENT_HINTS: Record<string, string> = {
  'FORNECEDORES': 'Pagamento a fornecedores',
  'FORNECEDOR': 'Pagamento a fornecedores',
  'TRIBUTOS': 'Pagamento de impostos/tributos',
  'TRIBUTO': 'Pagamento de impostos/tributos',
  'IMPOSTOS': 'Pagamento de impostos',
  'IMPOSTO': 'Pagamento de impostos',
  'SALARIOS': 'Folha de pagamento/Salários',
  'SALARIO': 'Folha de pagamento/Salários',
  'FOLHA': 'Folha de pagamento',
  'FUNCIONARIOS': 'Pagamento de funcionários',
  'ENERGIA': 'Conta de energia elétrica',
  'AGUA': 'Conta de água',
  'TELEFONE': 'Conta de telefone',
  'INTERNET': 'Serviço de internet',
  'ALUGUEL': 'Aluguel de imóvel',
  'CONDOMINIO': 'Taxa de condomínio'
};

export class DescriptionEnrichmentService {
  private static instance: DescriptionEnrichmentService;
  private searchCache: Map<string, { result: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  private constructor() {}

  static getInstance(): DescriptionEnrichmentService {
    if (!DescriptionEnrichmentService.instance) {
      DescriptionEnrichmentService.instance = new DescriptionEnrichmentService();
    }
    return DescriptionEnrichmentService.instance;
  }

  /**
   * Enriquece uma descrição de transação com contexto adicional
   */
  async enrichDescription(description: string, memo?: string): Promise<EnrichedDescription> {
    const normalized = this.normalize(description);
    const upperDescription = description.toUpperCase();

    // 1. Busca no dicionário local de termos bancários
    const bankingTerm = this.findBankingTerm(upperDescription);

    // 2. Extrai o complemento (parte após o termo bancário)
    let complement: string | undefined;
    if (bankingTerm) {
      complement = this.extractComplement(upperDescription, bankingTerm.term);
    }

    // 3. Se não encontrar termo bancário e parecer ser um termo desconhecido, pesquisa na web
    let webSearchResult: string | undefined;
    if (!bankingTerm && this.hasUnknownTerm(normalized)) {
      webSearchResult = await this.searchTermMeaning(normalized);
    }

    // 4. Monta contexto enriquecido
    const enrichedContext = this.buildEnrichedContext(
      description,
      memo,
      bankingTerm,
      complement,
      webSearchResult
    );

    // 5. Calcula confiança
    let confidence = 0.5; // Base
    if (bankingTerm) confidence = 0.9;
    else if (webSearchResult) confidence = 0.7;

    return {
      original: description,
      normalized,
      bankingTerm,
      webSearchResult,
      enrichedContext,
      confidence,
      complement
    };
  }

  /**
   * Normaliza a descrição (remove caracteres especiais, múltiplos espaços)
   */
  private normalize(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^\w\sáéíóúãõâêîôûç]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Busca termo bancário no dicionário
   */
  private findBankingTerm(description: string): BankingTermInfo | undefined {
    const upper = description.toUpperCase();

    // Primeiro, tenta match exato com termos compostos (mais específicos)
    const compositeTerms = Object.keys(BANKING_TERMS)
      .filter(term => term.includes(' '))
      .sort((a, b) => b.length - a.length); // Mais longos primeiro

    for (const term of compositeTerms) {
      if (upper.includes(term)) {
        return BANKING_TERMS[term];
      }
    }

    // Depois, tenta match com termos simples
    const simpleTerms = Object.keys(BANKING_TERMS)
      .filter(term => !term.includes(' '))
      .sort((a, b) => b.length - a.length);

    for (const term of simpleTerms) {
      // Usa word boundary para evitar falsos positivos
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(upper)) {
        return BANKING_TERMS[term];
      }
    }

    return undefined;
  }

  /**
   * Extrai o complemento após o termo bancário
   */
  private extractComplement(description: string, term: string): string | undefined {
    const upper = description.toUpperCase();
    const termIndex = upper.indexOf(term);

    if (termIndex === -1) return undefined;

    // Pega tudo após o termo
    const afterTerm = upper.substring(termIndex + term.length).trim();

    if (!afterTerm) return undefined;

    // Retorna a primeira palavra significativa após o termo
    const words = afterTerm.split(/\s+/).filter(w => w.length > 2);

    return words[0] || afterTerm.split(/\s+/)[0];
  }

  /**
   * Verifica se a descrição tem um termo que parece desconhecido
   */
  private hasUnknownTerm(normalized: string): boolean {
    // Palavras que indicam que devemos pesquisar
    const unknownPatterns = [
      /^[a-z]{3,8}$/i, // Siglas de 3-8 letras
      /^[a-z]{2,4}\s+[a-z]+/i, // Sigla seguida de palavra
    ];

    const words = normalized.split(' ');
    const firstWord = words[0];

    // Se a primeira palavra é curta e toda maiúscula no original, pode ser sigla
    if (firstWord && firstWord.length <= 8 && firstWord.length >= 2) {
      // Verifica se não é uma palavra comum
      const commonWords = ['pix', 'ted', 'doc', 'boleto', 'pagamento', 'debito', 'credito'];
      if (!commonWords.includes(firstWord)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Pesquisa o significado de um termo na web
   */
  private async searchTermMeaning(term: string): Promise<string | undefined> {
    // Verifica cache
    const cached = this.searchCache.get(term);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    try {
      const duckDuckGo = DuckDuckGoService.getInstance();
      const results = await duckDuckGo.searchCompany({
        query: `${term} banco significado extrato bancário`,
        type: 'general'
      });

      if (results.length > 0 && results[0].description) {
        const result = results[0].description;

        // Armazena no cache
        this.searchCache.set(term, { result, timestamp: Date.now() });

        return result;
      }
    } catch (error) {
      console.error('[ENRICHMENT] Erro ao pesquisar termo:', error);
    }

    return undefined;
  }

  /**
   * Monta o contexto enriquecido para passar à IA
   */
  private buildEnrichedContext(
    description: string,
    memo: string | undefined,
    bankingTerm: BankingTermInfo | undefined,
    complement: string | undefined,
    webSearchResult: string | undefined
  ): string {
    const parts: string[] = [];

    if (bankingTerm) {
      parts.push(`TERMO BANCÁRIO: ${bankingTerm.term}`);
      if (bankingTerm.bank) {
        parts.push(`BANCO: ${bankingTerm.bank}`);
      }
      parts.push(`SIGNIFICADO: ${bankingTerm.meaning}`);

      // Se tiver complemento, adiciona dica específica
      if (complement) {
        const complementHint = COMPLEMENT_HINTS[complement];
        if (complementHint) {
          parts.push(`COMPLEMENTO "${complement}": ${complementHint}`);
        } else {
          parts.push(`COMPLEMENTO: ${complement}`);
        }
      }

      if (bankingTerm.categoryHint) {
        parts.push(`DICA DE CATEGORIA: ${bankingTerm.categoryHint}`);
      }
    }

    if (webSearchResult) {
      parts.push(`INFORMAÇÃO DA WEB: ${webSearchResult}`);
    }

    if (memo && memo.trim()) {
      parts.push(`MEMO/OBSERVAÇÃO: ${memo}`);
    }

    if (parts.length === 0) {
      return `Descrição original: ${description}`;
    }

    return parts.join('\n');
  }

  /**
   * Limpa o cache de pesquisas
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * Adiciona um novo termo ao dicionário (em memória)
   * Útil para aprendizado durante a sessão
   */
  addTerm(term: string, info: Omit<BankingTermInfo, 'term'>): void {
    const upperTerm = term.toUpperCase();
    BANKING_TERMS[upperTerm] = {
      term: upperTerm,
      ...info
    };
  }

  /**
   * Retorna todos os termos conhecidos
   */
  getKnownTerms(): string[] {
    return Object.keys(BANKING_TERMS);
  }
}

// Export singleton
export const descriptionEnrichmentService = DescriptionEnrichmentService.getInstance();
