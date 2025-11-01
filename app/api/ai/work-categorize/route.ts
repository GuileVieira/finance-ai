import { NextRequest, NextResponse } from 'next/server';
import CategoriesService from '@/lib/services/categories.service';
import { searchCompanyInfo, searchByCNPJ, ProcessedSearchResult } from '@/lib/tools/duckduckgo-search.tool';
import { aiProviderService } from '@/lib/ai/ai-provider.service';

// Cache de categorias do banco para evitar múltiplas consultas
let cachedCategories: any[] = [];
let categoriesCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para obter categorias do banco com cache
async function getCategoriesFromDB(): Promise<string[]> {
  const now = Date.now();

  // Verificar cache
  if (cachedCategories.length > 0 && (now - categoriesCacheTime) < CACHE_DURATION) {
    console.log('📋 Usando categorias em cache:', cachedCategories.length, 'categorias');
    return cachedCategories.map(cat => cat.name);
  }

  // Buscar do banco
  try {
    const dbCategories = await CategoriesService.getCategories({
      isActive: true,
      includeStats: false
    });

    if (dbCategories.length > 0) {
      cachedCategories = dbCategories;
      categoriesCacheTime = now;
      console.log('✅ Categorias carregadas do banco:', dbCategories.length, 'categorias');

      // Log das categorias para debug
      console.log('📋 Lista de categorias disponíveis:');
      dbCategories.forEach((cat, index) => {
        console.log(`  ${index + 1}. ${cat.name} (${cat.type})`);
      });

      return dbCategories.map(cat => cat.name);
    } else {
      throw new Error('Nenhuma categoria encontrada no banco');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar categorias do banco:', error);
    throw new Error('Não foi possível carregar categorias do banco de dados');
  }
}

// Sem fallbacks estáticos - usar APENAS categorias do banco

// Função de categorização baseada em regras (usando categorias reais da tabela)
function categorizeByRules(description: string, amount: number): { category: string; confidence: number; reasoning: string; source: string } {
  const desc = description.toLowerCase();

  // Regras de palavras-chave - usando APENAS categorias reais da tabela
  if (desc.includes('salário') || desc.includes('folha') || desc.includes('contracheque') || desc.includes('holerite')) {
    return {
      category: 'SALARIOS',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como SALARIOS',
      source: 'rules'
    };
  }

  if (desc.includes('13º') || desc.includes('decimo terceiro') || desc.includes('13 salário')) {
    return {
      category: '13º SALARIO',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como 13º SALARIO',
      source: 'rules'
    };
  }

  if (desc.includes('aluguel') || desc.includes('condomínio') || desc.includes('imobiliária') || desc.includes('predio') || desc.includes('iptu')) {
    return {
      category: 'ALUGUEL',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como ALUGUEL',
      source: 'rules'
    };
  }

  if (desc.includes('comissões') || desc.includes('bônus') || desc.includes('participação')) {
    return {
      category: 'COMISSÕES',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como COMISSÕES',
      source: 'rules'
    };
  }

  if (desc.includes('energia') || desc.includes('elétrica') || desc.includes('luz')) {
    return {
      category: 'ENERGIA ELETRICA',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como ENERGIA ELETRICA',
      source: 'rules'
    };
  }

  if (desc.includes('telefone') || desc.includes('celular') || desc.includes('móvel')) {
    if (desc.includes('móvel') || desc.includes('celular')) {
      return {
        category: 'TELEFONES MÓVEIS',
        confidence: 0.9,
        reasoning: 'Classificado por regra de palavras-chave como TELEFONES MÓVEIS',
        source: 'rules'
      };
    } else {
      return {
        category: 'TELEFONES FIXOS',
        confidence: 0.9,
        reasoning: 'Classificado por regra de palavras-chave como TELEFONES FIXOS',
        source: 'rules'
      };
    }
  }

  if (desc.includes('internet') || desc.includes('sistemas') || desc.includes('software')) {
    return {
      category: 'INTERNET',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como INTERNET',
      source: 'rules'
    };
  }

  if (desc.includes('inss') || desc.includes('fgts')) {
    if (desc.includes('inss')) {
      return {
        category: 'INSS',
        confidence: 0.95,
        reasoning: 'Classificado por regra de palavras-chave como INSS',
        source: 'rules'
      };
    } else {
      return {
        category: 'FGTS',
        confidence: 0.95,
        reasoning: 'Classificado por regra de palavras-chave como FGTS',
        source: 'rules'
      };
    }
  }

  if (desc.includes('pro labore') || desc.includes('pró labore')) {
    return {
      category: 'PRO LABORE',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como PRO LABORE',
      source: 'rules'
    };
  }

  if (desc.includes('folha pj') || desc.includes('pj') && desc.includes('folha')) {
    return {
      category: 'FOLHA PJ',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como FOLHA PJ',
      source: 'rules'
    };
  }

  if (desc.includes('consultoria') || desc.includes('assessoria')) {
    return {
      category: 'CONSULTORIA',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como CONSULTORIA',
      source: 'rules'
    };
  }

  if (desc.includes('contabilidade') || desc.includes('contador')) {
    return {
      category: 'SERVIÇOS DE CONTABILIDADE',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como SERVIÇOS DE CONTABILIDADE',
      source: 'rules'
    };
  }

  if (desc.includes('advocacia') || desc.includes('advogado')) {
    return {
      category: 'SERVIÇOS DE ADVOCACIA',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como SERVIÇOS DE ADVOCACIA',
      source: 'rules'
    };
  }

  if (desc.includes('cofins') || desc.includes('pis') || desc.includes('irpj') || desc.includes('iss') || desc.includes('icms')) {
    return {
      category: 'COFINS',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como COFINS',
      source: 'rules'
    };
  }

  if (desc.includes('manutenção')) {
    if (desc.includes('equipamento') || desc.includes('máquina')) {
      return {
        category: 'MANUTENÇÃO DE EQUIPAMENTOS',
        confidence: 0.85,
        reasoning: 'Classificado por regra de palavras-chave como MANUTENÇÃO DE EQUIPAMENTOS',
        source: 'rules'
      };
    } else if (desc.includes('predial') || desc.includes('prédio')) {
      return {
        category: 'MANUTENÇÃO PREDIAL',
        confidence: 0.85,
        reasoning: 'Classificado por regra de palavras-chave como MANUTENÇÃO PREDIAL',
        source: 'rules'
      };
    } else {
      return {
        category: 'CONSERVAÇÃO E LIMPEZA',
        confidence: 0.85,
        reasoning: 'Classificado por regra de palavras-chave como CONSERVAÇÃO E LIMPEZA',
        source: 'rules'
      };
    }
  }

  if (desc.includes('tarifas') && (desc.includes('bancárias') || desc.includes('banco')) ||
      desc.includes('juros') || desc.includes('multas') || desc.includes('cheque')) {
    return {
      category: 'TARIFAS BANCÁRIAS',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como TARIFAS BANCÁRIAS',
      source: 'rules'
    };
  }

  if (desc.includes('correios') || desc.includes('carteiro')) {
    return {
      category: 'CORREIOS',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como CORREIOS',
      source: 'rules'
    };
  }

  // Regra padrão para transações sem classificação específica
  return {
    category: 'OUTRAS DESPESAS NOP',
    confidence: 0.3, // Baixa confiança para fallback
    reasoning: 'Classificado por regra padrão como OUTRAS DESPESAS NOP (baixa confiança)',
    source: 'rules'
  };
}

// Configuração dos modelos com sistema de fallback
const AI_MODELS = {
  primary: process.env.AI_MODEL_PRIMARY || 'gemini/gemini-2.5',
  fallback: process.env.AI_MODEL_FALLBACK || 'openai/gpt-5-mini'
};

// Função para extrair informações de empresa da descrição
async function extractCompanyInfo(description: string, memo?: string): Promise<ProcessedSearchResult | null> {
  try {
    // Combinar descrição e memo para análise
    const fullText = `${description} ${memo || ''}`.toLowerCase();

    // Procurar por CNPJ no texto
    const cnpjMatch = fullText.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    if (cnpjMatch) {
      console.log(`🔍 CNPJ encontrado: ${cnpjMatch[0]}`);
      const searchResult = await searchByCNPJ(cnpjMatch[0]);
      if (searchResult.confidence > 0.3) {
        return searchResult;
      }
    }

    // Padrões para identificar nomes de empresa
    const companyPatterns = [
      /\b([A-Z][A-ZÀ-ÿ\s]+) LTDA\.?\b/gi,
      /\b([A-Z][A-ZÀ-ÿ\s]+) S\.?A\.?\b/gi,
      /\b([A-Z][A-ZÀ-ÿ\s]+) ME\b/gi,
      /\b([A-Z][A-ZÀ-ÿ\s]+) EPP\b/gi,
      /\b([A-Z][A-ZÀ-ÿ\s]+) (COMÉRCIO|INDÚSTRIA|SERVIÇOS)\b/gi,
    ];

    const possibleCompanies = new Set<string>();

    for (const pattern of companyPatterns) {
      const matches = fullText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const companyName = match.trim();
          if (companyName.length > 5 && companyName.length < 100) {
            possibleCompanies.add(companyName);
          }
        });
      }
    }

    // Se encontrou possíveis nomes de empresa, pesquisar o mais promissor
    if (possibleCompanies.size > 0) {
      const companiesArray = Array.from(possibleCompanies);
      // Priorizar nomes mais longos (provavelmente mais específicos)
      companiesArray.sort((a, b) => b.length - a.length);

      for (const company of companiesArray.slice(0, 3)) { // Pesquisar até 3 candidatos
        console.log(`🔍 Pesquisando empresa: ${company}`);
        const searchResult = await searchCompanyInfo(company);
        if (searchResult.confidence > 0.2) {
          return searchResult;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao extrair informações da empresa:', error);
    return null;
  }
}

// Função para determinar categoria com base nas informações da empresa
function getCompanyBasedCategory(companyInfo: ProcessedSearchResult, amount: number): string | null {
  if (companyInfo.confidence < 0.3) {
    return null;
  }

  // Se é instituição financeira
  if (companyInfo.isFinancial) {
    return 'Financeiros e Bancários';
  }

  // Se é fornecedor identificado pelo CNAE
  if (companyInfo.isSupplier) {
    // Classificar pelo setor
    switch (companyInfo.sector) {
      case 'Comércio':
        return amount > 10000 ? 'Custos de Produtos' : 'Utilidades e Insumos';
      case 'Indústria':
        return 'Custos de Produtos';
      case 'Serviços':
        if (companyInfo.activity?.toLowerCase().includes('consultoria') ||
            companyInfo.activity?.toLowerCase().includes('contabilidade') ||
            companyInfo.activity?.toLowerCase().includes('advocacia')) {
          return 'Serviços Profissionais';
        }
        if (companyInfo.activity?.toLowerCase().includes('tecnologia') ||
            companyInfo.activity?.toLowerCase().includes('software')) {
          return 'Tecnologia e Software';
        }
        return 'Serviços Profissionais';
      default:
        return 'Utilidades e Insumos';
    }
  }

  // Baseado na atividade principal
  if (companyInfo.activity) {
    const activity = companyInfo.activity.toLowerCase();

    if (activity.includes('aluguel') || activity.includes('imobili')) {
      return 'Aluguel e Ocupação';
    }

    if (activity.includes('transporte') || activity.includes('logística') ||
        activity.includes('correio') || activity.includes('frete')) {
      return 'Logística e Distribuição';
    }

    if (activity.includes('manutenção') || activity.includes('limpeza') ||
        activity.includes('conservação')) {
      return 'Manutenção e Serviços';
    }

    if (activity.includes('consultoria') || activity.includes('contabilidade') ||
        activity.includes('advocacia') || activity.includes('assessoria')) {
      return 'Serviços Profissionais';
    }

    if (activity.includes('tecnologia') || activity.includes('software') ||
        activity.includes('internet') || activity.includes('hospedagem')) {
      return 'Tecnologia e Software';
    }
  }

  return null;
}

// Função para mapear resultado da IA para categoria válida do banco
function mapAIResultToValidCategory(aiCategory: string, availableCategories: string[]): string {
  // Buscar correspondência exata (ignorando case e espaços)
  const exactMatch = availableCategories.find(cat =>
    cat.toLowerCase().trim() === aiCategory.toLowerCase().trim()
  );

  if (exactMatch) {
    console.log(`✅ Categoria exata encontrada: "${aiCategory}" → "${exactMatch}"`);
    return exactMatch;
  }

  // Buscar correspondência parcial
  const partialMatch = availableCategories.find(cat =>
    cat.toLowerCase().includes(aiCategory.toLowerCase()) ||
    aiCategory.toLowerCase().includes(cat.toLowerCase())
  );

  if (partialMatch) {
    console.log(`🎯 Categoria parcial encontrada: "${aiCategory}" → "${partialMatch}"`);
    return partialMatch;
  }

  // Buscar por palavras-chave
  const aiLower = aiCategory.toLowerCase();
  if (aiLower.includes('salário') || aiLower.includes('salario')) {
    const salaryCategory = availableCategories.find(cat =>
      cat.toLowerCase().includes('salario') || cat === 'SALARIOS'
    );
    if (salaryCategory) return salaryCategory;
  }

  if (aiLower.includes('aluguel')) {
    const rentCategory = availableCategories.find(cat =>
      cat.toLowerCase().includes('aluguel')
    );
    if (rentCategory) return rentCategory;
  }

  if (aiLower.includes('energia') || aiLower.includes('luz')) {
    const energyCategory = availableCategories.find(cat =>
      cat.toLowerCase().includes('energia')
    );
    if (energyCategory) return energyCategory;
  }

  if (aiLower.includes('telefone') || aiLower.includes('celular')) {
    const phoneCategory = availableCategories.find(cat =>
      cat.toLowerCase().includes('telefone')
    );
    if (phoneCategory) return phoneCategory;
  }

  if (aiLower.includes('comissão') || aiLower.includes('comissao')) {
    const commissionCategory = availableCategories.find(cat =>
      cat.toLowerCase().includes('comiss')
    );
    if (commissionCategory) return commissionCategory;
  }

  if (aiLower.includes('imposto') || aiLower.includes('tributo') ||
      aiLower.includes('cofins') || aiLower.includes('pis')) {
    const taxCategory = availableCategories.find(cat =>
      cat.toLowerCase().includes('cofin') || cat === 'COFINS'
    );
    if (taxCategory) return taxCategory;
  }

  // Último recurso: OUTRAS DESPESAS NOP (se existir) ou primeira categoria disponível
  const fallbackCategory = availableCategories.find(cat =>
    cat === 'OUTRAS DESPESAS NOP'
  ) || availableCategories[0];

  console.log(`⚠️ Nenhuma correspondência para "${aiCategory}". Usando fallback: "${fallbackCategory}"`);
  return fallbackCategory || 'OUTRAS DESPESAS NOP';
}

// Função para tentar categorização por IA com fallback e contexto empresarial
async function categorizeByAI(description: string, amount: number, context?: {
  memo?: string;
  fileName?: string;
  bankName?: string;
  date?: string;
  balance?: number;
}) {
  const modelsToTry = [AI_MODELS.primary, AI_MODELS.fallback];

  console.log('🔄 Modelos para tentar (em ordem):', modelsToTry);
  console.log('📋 Contexto OFX disponível:', context);

  // Buscar categorias do banco de dados
  let availableCategories: string[];
  try {
    availableCategories = await getCategoriesFromDB();
    console.log('✅ Categorias carregadas do banco:', availableCategories.length, 'categorias');
  } catch (error) {
    console.error('❌ Erro crítico ao carregar categorias do banco:', error);
    throw new Error(`Não foi possível carregar categorias do banco: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }

  const formattedCategoriesList = `• ${availableCategories.join('\n• ')}`;
  console.log('📋 Categorias disponíveis para IA:', formattedCategoriesList);

  // Tentar pesquisar informações da empresa antes de chamar a IA
  console.log('🔍 Tentando extrair informações de empresa da descrição...');
  const companyInfo = await extractCompanyInfo(description, context?.memo);

  let companyBasedCategory: string | null = null;
  if (companyInfo) {
    console.log('📋 Informações da empresa encontradas:', companyInfo);
    companyBasedCategory = getCompanyBasedCategory(companyInfo, amount);
    if (companyBasedCategory) {
      console.log(`✅ Categoria baseada na empresa: ${companyBasedCategory}`);

      return {
        category: companyBasedCategory,
        confidence: Math.min(0.8, companyInfo.confidence), // Limitar confiança máxima
        reasoning: `Categoria determinada por pesquisa de empresa: "${companyInfo.companyName}" (${companyInfo.cnpj || 'sem CNPJ'}) - Setor: ${companyInfo.sector || 'não identificado'} - Atividade: ${companyInfo.activity || 'não identificada'}`,
        source: 'company_research',
        model_used: 'none',
        companyInfo: companyInfo
      };
    }
  }

  for (const model of modelsToTry) {
    try {
      console.log(`🚀 Tentando modelo: ${model}`);

      const messages = [
        {
          role: 'system',
          content: `Você é um ESPECIALISTA EM FINANÇAS EMPRESARIAIS CRÍTICAS com vasta experiência em análise de demonstrações financeiras, fluxo de caixa, DRE e indicadores financeiros de empresas brasileiras.

SUA ESPECIALIDADE:
- Análise crítica e profissional de transações financeiras empresariais
- Conhecimento profundo em contabilidade brasileira e normas societárias (CPC, IFRS)
- Capacidade de interpretar operações complexas e de alto valor
- Domínio de categorias contábeis e padrões financeiros empresariais
- Experiência em análise de fluxo de caixa e estrutura de custos empresariais
- Conhecimento em classificação fiscal e tributária brasileira

CONTEXTO COMPLETO DA TRANSAÇÃO FINANCEIRA:
${context ? `
• DESCRIÇÃO OFICIAL: "${description}"
• VALOR: R$ ${amount.toFixed(2)}
• MEMO DO OFX: "${context.memo || 'Não disponível'}"
• NOME DO ARQUIVO OFX: "${context.fileName || 'Não disponível'}"
• BANCO ORIGEM: "${context.bankName || 'Não informado'}"
• DATA DA TRANSAÇÃO: ${context.date || 'Não disponível'}
• SALDO DA CONTA: ${context.balance ? `R$ ${context.balance.toFixed(2)}` : 'Não disponível'}
` : `
• DESCRIÇÃO OFICIAL: "${description}"
• VALOR: R$ ${amount.toFixed(2)}
• CONTEXTO OFX: Não disponível
`}

${companyInfo ? `
INFORMAÇÕES DA PESQUISA DE EMPRESA:
• EMPRESA IDENTIFICADA: "${companyInfo.companyName}"
• CNPJ: ${companyInfo.cnpj || 'Não encontrado'}
• CNAE: ${companyInfo.cnae || 'Não encontrado'}
• SETOR: ${companyInfo.sector || 'Não identificado'}
• ATIVIDADE PRINCIPAL: ${companyInfo.activity || 'Não identificada'}
• WEBSITE: ${companyInfo.website || 'Não encontrado'}
• É INSTITUIÇÃO FINANCEIRA: ${companyInfo.isFinancial ? 'Sim' : 'Não'}
• É FORNECEDOR IDENTIFICADO: ${companyInfo.isSupplier ? 'Sim' : 'Não'}
• CONFIANÇA DA PESQUISA: ${(companyInfo.confidence * 100).toFixed(1)}%
` : ''}

CATEGORIAS FINANCEIRAS DISPONÍVEIS NO SISTEMA:
${formattedCategoriesList}

METODOLOGIA DE ANÁLISE FINANCEIRA EMPRESARIAL:
1. ANÁLISE PRELIMINAR: Identificar natureza da operação (receita vs despesa vs investimento)
2. CONTEXTO EMPRESARIAL: Analisar setor, porte e tipo de empresa (ME, EPP, Ltda., S.A.)
3. CLASSIFICAÇÃO CONTÁBIL: Aplicar princípios contábeis brasileiros (PCASP, CPC)
4. ANÁLISE DE MATERIALIDADE: Avaliar relevância fiscal e impacto no resultado
5. PESQUISA EMPRESARIAL: Se categoria não for clara, pesquisar empresa identificada

REGRAS ESPECÍFICAS DE CLASSIFICAÇÃO:
- Usar nomenclatura contábil padrão brasileira
- Distinguir custos fixos de variáveis e custos diretos de indiretos
- Classificar investimentos como ativo imobilizado ou intangível quando aplicável
- Considerar tratamento fiscal (dedutível, não dedutível, crédito tributário)
- Identificar despesas operacionais vs não operacionais

PESQUISA EMPRESARIAL AUTOMÁTICA:
Se não houver categoria clara na lista:
1. Extrair nome de empresa da descrição ou memo OFX
2. Pesquisar CNPJ, CNAE e atividade principal da empresa
3. Classificar conforme setor de atuação e natureza da operação
4. Verificar se é fornecedor, cliente, parceiro ou instituição financeira

FORMATO DE RESPOSTA OBRIGATÓRIO:
- Retorne APENAS o nome exato da categoria conforme cadastrado no sistema
- NÃO inclua explicações, justificativas ou análises na resposta final
- Se não houver categoria adequada, use: "Utilidades e Insumos" (para despesas gerais) ou "Financeiros e Bancários" (para operações financeiras)

EXEMPLOS DE CLASSIFICAÇÃO:
- "DEBITO IFOOG RESTAURANTES LTDA" → Pesquisar CNPJ → Classificar como "Custos de Produtos" se for fornecedor, "Utilidades e Insumos" se for despesa operacional
- "CREDITO CLIENTE X REVENDEDORA" → "Vendas de Produtos"
- "DEBITO ALUGUEL PREDIO MATRIZ" → "Aluguel e Ocupação"`
        },
        {
          role: 'user',
          content: `Analise a transação financeira empresarial abaixo e classifique na categoria contábil mais adequada:

${context ? `
DADOS COMPLETOS DA TRANSAÇÃO:
${Object.entries({
  'DESCRIÇÃO OFICIAL': description,
  'VALOR': `R$ ${amount.toFixed(2)}`,
  'MEMO OFX': context.memo || 'N/A',
  'ARQUIVO OFX': context.fileName || 'N/A',
  'BANCO': context.bankName || 'N/A',
  'DATA': context.date || 'N/A',
  'SALDO CONTA': context.balance ? `R$ ${context.balance.toFixed(2)}` : 'N/A'
}).map(([key, value]) => `• ${key}: ${value}`).join('\n')}
` : `
DADOS DA TRANSAÇÃO:
• DESCRIÇÃO OFICIAL: ${description}
• VALOR: R$ ${amount.toFixed(2)}
`}

CATEGORIAS DISPONÍVEIS:
${formattedCategoriesList}

ANÁLISE SOLICITADA:
Como especialista em finanças empresariais críticas, analise esta transação considerando:
1. Se há nome de empresa identificável para pesquisa (CNPJ/CNAE)
2. Natureza contábil e tratamento fiscal
3. Setor econômico e tipo de operação
4. Materialidade e relevância para DRE

Retorne APENAS o nome exato da categoria escolhida.`
        }
      ];

      console.log(`📤 Enviando requisição para ${model}...`);

      const response = await aiProviderService.completeWithRetry({
        model: model,
        messages: messages,
        max_tokens: 200, // Aumentado para lidar com prompts mais complexos
        temperature: 0.2 // Ligeiramente maior para permitir criatividade na análise
      });

      console.log(`✅ Sucesso com modelo ${model}! Provedor: ${response.provider}`);

      const aiCategory = response.content || 'OUTRAS DESPESAS NOP';

      console.log(`✅ Categoria original: "${aiCategory}"`);

      // Mapear para categoria válida do banco
      const validCategory = mapAIResultToValidCategory(aiCategory, availableCategories);

      console.log(`📋 Categoria mapeada: "${aiCategory}" → "${validCategory}"`);

      return {
        category: validCategory,
        confidence: 0.9,
        reasoning: `IA (${response.provider}/${response.model}) - especialista em finanças empresariais categorizou como "${aiCategory}" → mapeado para "${validCategory}" com base na descrição, valor e contexto OFX${context ? ' e informações bancárias' : ''}`,
        source: 'ai',
        model_used: `${response.provider}/${response.model}`
      };
    } catch (error) {
      console.error(`❌ Erro no modelo ${model}:`, {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });

      // Se for o último modelo da lista, retorna erro
      if (model === modelsToTry[modelsToTry.length - 1]) {
        console.log(`💥 Todos os modelos falharam! Último erro:`, error);
        return {
          category: 'Utilidades e Insumos',
          confidence: 0.1,
          reasoning: `Erro em todos os modelos: ${error instanceof Error ? error.message : 'Erro desconhecido'} - fallback categorizado como "Utilidades e Insumos"`,
          source: 'ai',
          model_used: 'none'
        };
      }

      console.log(`🔄 Tentando próximo modelo...`);
      // Tenta o próximo modelo
      continue;
    }
  }

  // Fallback final - usar primeira categoria disponível ou erro se não houver categorias
  console.log(`💥 Fallback final - nenhum modelo funcionou`);

  if (availableCategories.length === 0) {
    throw new Error('Nenhuma categoria disponível no banco para fallback');
  }

  const fallbackCategory = availableCategories[0];

  return {
    category: fallbackCategory,
    confidence: 0.5, // Baixa confiança para fallback quando IA falha
    reasoning: `Fallback crítico - IA falhou em todos os modelos, usando primeira categoria disponível: "${fallbackCategory}"`,
    source: 'fallback',
    model_used: 'none'
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('\n=== [WORK-CATEGORIZE] Nova requisição de categorização ===');

    const body = await request.json();
    const { description, amount, memo, fileName, bankName, date, balance } = body;

    console.log('📥 Dados recebidos:', {
      description,
      amount,
      memo,
      fileName,
      bankName,
      date,
      balance,
      timestamp: new Date().toISOString()
    });

    if (!description || !amount) {
      console.log('❌ Erro: Descrição e valor são obrigatórios');
      return NextResponse.json({
        success: false,
        error: 'Descrição e valor são obrigatórios'
      }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    console.log('💰 Valor processado:', numAmount);

    // Primeiro tentar categorização por regras
    console.log('🔍 Tentando categorização por regras...');
    const ruleResult = categorizeByRules(description, numAmount);
    console.log('✅ Resultado das regras:', ruleResult);

    // Se regras tiverem alta confiança, usa o resultado
    if (ruleResult.confidence >= 0.7) {
      const finalResult = {
        ...ruleResult,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };

      console.log('🎯 Usando resultado das regras (alta confiança):', finalResult);
      console.log('=== [WORK-CATEGORIZE] Fim da requisição (regras) ===\n');

      return NextResponse.json({
        success: true,
        data: finalResult
      });
    }

    // Senão, usa IA
    console.log('🤖 Confiança baixa nas regras, usando IA...');
    console.log('🔧 Modelos configurados:', AI_MODELS);

    const aiResult = await categorizeByAI(description, numAmount, {
      memo,
      fileName,
      bankName,
      date,
      balance
    });
    console.log('🤖 Resultado da IA:', aiResult);

    const finalResult = {
      ...aiResult,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };

    console.log('🎯 Resultado final (IA):', finalResult);
    console.log('=== [WORK-CATEGORIZE] Fim da requisição (IA) ===\n');

    return NextResponse.json({
      success: true,
      data: finalResult
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro na API de categorização:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    });
    console.log('=== [WORK-CATEGORIZE] Fim da requisição (ERRO) ===\n');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      processingTime
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Buscar categorias dinâmicas do banco
    let categoriesList = [];
    try {
      categoriesList = await getCategoriesFromDB();
    } catch (error) {
      console.error('❌ Erro crítico ao buscar categorias:', error);
      return NextResponse.json({
        error: 'Erro interno do servidor',
        message: `Não foi possível carregar categorias: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        details: 'As categorias não puderam ser carregadas do banco de dados'
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'API de Categorização Funcional - Versão com Categorias Reais da Tabela',
      endpoint: '/api/ai/work-categorize',
      method: 'POST',
      body: {
        description: 'string (obrigatório) - Descrição da transação',
        amount: 'number (obrigatório) - Valor da transação',
        memo: 'string (opcional) - Memo do arquivo OFX',
        fileName: 'string (opcional) - Nome do arquivo OFX',
        bankName: 'string (opcional) - Nome do banco',
        date: 'string (opcional) - Data da transação',
        balance: 'number (opcional) - Saldo da conta'
      },
      example: {
        description: 'CANTINHO DAS ESSENCIAS LTDA',
        amount: 2100.00,
        memo: 'Pix recebido: "Cp :60701190-CANTINHO DAS ESSENCIAS LTDA"',
        fileName: 'Extrato-01-01-2025-a-24-10-2025-OFX.ofx',
        bankName: 'Banco Intermedium S/A',
        date: '2025-03-20',
        balance: 15000.00
      },
      categories: categoriesList,
      categoriesCount: categoriesList.length,
      categoriesSource: 'database',
      workflow: [
        '1️⃣ Extrai informações de empresa da descrição (CNPJ, nome, etc.)',
        '2️⃣ Pesquisa empresa no DuckDuckGo para obter CNPJ/CNAE se disponível',
        '3️⃣ Se empresa encontrada com boa confiança, categoriza baseado no setor/CNAE',
        '4️⃣ Senão, tenta categorização por regras baseadas em palavras-chave',
        '5️⃣ Se confiança alta (>70%), retorna resultado',
        '6️⃣ Senão, usa IA com contexto completo (memo OFX, pesquisa empresa, etc.)',
        '7️⃣ Retorna categoria com contexto empresarial completo'
      ],
      features: [
        '🔍 Pesquisa automática de empresas (CNPJ/CNAE)',
        '📋 Análise com contexto OFX completo (memo, nome do arquivo)',
        '🏭 Especialista em finanças empresariais críticas',
        '🎯 Mapeamento inteligente para categorias reais',
        '💼 Classificação conforme CNAE brasileiro',
        '🗃️ APENAS categorias 100% reais da tabela',
        '🔄 Mapeamento automático IA → categoria válida'
      ]
    });
  } catch (error) {
    console.error('Erro no GET /api/ai/work-categorize:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}