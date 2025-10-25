import { NextRequest, NextResponse } from 'next/server';
import CategoriesService from '@/lib/services/categories.service';
import { searchCompanyInfo, searchByCNPJ, ProcessedSearchResult } from '@/lib/tools/duckduckgo-search.tool';

// Categorias financeiras empresariais brasileiras
const BUSINESS_CATEGORIES = {
  // Receitas
  revenue: {
    'Vendas de Produtos': 'Receitas principais de vendas de mercadorias e produtos',
    'Vendas de Serviços': 'Receitas de prestação de serviços profissionais',
    'Receitas Financeiras': 'Rendimentos de aplicações, juros, etc.',
    'Outras Receitas': 'Receitas não operacionais ou eventuais'
  },
  // Custos Variáveis
  variable_cost: {
    'Custos de Produtos': 'Matéria-prima, insumos diretos e embalagens',
    'Comissões e Variáveis': 'Comissões sobre vendas, bônus variáveis',
    'Logística e Distribuição': 'Transportes, fretes, logística',
    'Utilidades e Insumos': 'Materiais de consumo, insumos gerais'
  },
  // Custos Fixos
  fixed_cost: {
    'Salários e Encargos': 'Folha de pagamento, pró-labore, encargos sociais',
    'Aluguel e Ocupação': 'Aluguéis, condomínios, taxas imobiliárias',
    'Tecnologia e Software': 'Softwares, sistemas, internet, hospedagem',
    'Serviços Profissionais': 'Contabilidade, advocacia, consultoria',
    'Tributos e Contribuições': 'Impostos, taxas, contribuições',
    'Financeiros e Bancários': 'Tarifas bancárias, juros, multas',
    'Manutenção e Serviços': 'Manutenção, limpeza, conservação',
    'Outras Despesas Fixas': 'Outros custos fixos operacionais'
  },
  // Não Operacionais
  non_operational: {
    'Despesas Não Operacionais': 'Despesas eventuais ou não relacionadas à operação',
    'Investimentos': 'Aquisição de ativos, investimentos de capital'
  }
};

// Lista completa de categorias para o prompt
const CATEGORIES_LIST = Object.values(BUSINESS_CATEGORIES)
  .flatMap(group => Object.keys(group))
  .join('\n• ');

// Função de categorização baseada em regras empresariais
function categorizeByRules(description: string, amount: number) {
  const desc = description.toLowerCase();

  // Regras de palavras-chave - usando categorias empresariais
  if (desc.includes('salário') || desc.includes('folha') ||
      desc.includes('contracheque') || desc.includes('holerite') ||
      desc.includes('inss') || desc.includes('fgts') || desc.includes('pro labore')) {
    return {
      category: 'Salários e Encargos',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como Salários e Encargos',
      source: 'rules'
    };
  }

  if (desc.includes('venda') || desc.includes('receita') ||
      desc.includes('faturamento') || desc.includes('cliente') ||
      desc.includes('pedido') || desc.includes('nota fiscal')) {
    return {
      category: 'Vendas de Produtos',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como Vendas de Produtos',
      source: 'rules'
    };
  }

  if (desc.includes('serviço') && desc.includes('prestado') ||
      desc.includes('honorários') || desc.includes('consultoria')) {
    return {
      category: 'Vendas de Serviços',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como Vendas de Serviços',
      source: 'rules'
    };
  }

  if (desc.includes('aluguel') || desc.includes('condomínio') ||
      desc.includes('imobiliária') || desc.includes('predio') || desc.includes('iptu')) {
    return {
      category: 'Aluguel e Ocupação',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como Aluguel e Ocupação',
      source: 'rules'
    };
  }

  if (desc.includes('comissões') || desc.includes('bônus') || desc.includes('participação')) {
    return {
      category: 'Comissões e Variáveis',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como Comissões e Variáveis',
      source: 'rules'
    };
  }

  if (desc.includes('matéria') && desc.includes('prima') || desc.includes('insumos') ||
      desc.includes('embalagem') || desc.includes('estoque')) {
    return {
      category: 'Custos de Produtos',
      confidence: 0.85,
      reasoning: 'Classificado por regra de palavras-chave como Custos de Produtos',
      source: 'rules'
    };
  }

  if (desc.includes('correios') || desc.includes('viagens') || desc.includes('transportes') ||
      desc.includes('fretes') || desc.includes('logística')) {
    return {
      category: 'Logística e Distribuição',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como Logística e Distribuição',
      source: 'rules'
    };
  }

  if (desc.includes('softwares') || desc.includes('internet') || desc.includes('sistemas') ||
      desc.includes('hospedagem') || desc.includes('tecnologia')) {
    return {
      category: 'Tecnologia e Software',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como Tecnologia e Software',
      source: 'rules'
    };
  }

  if (desc.includes('contabilidade') || desc.includes('advocacia') || desc.includes('consultoria') ||
      desc.includes('assessoria') || desc.includes('serviços profissionais')) {
    return {
      category: 'Serviços Profissionais',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como Serviços Profissionais',
      source: 'rules'
    };
  }

  if (desc.includes('cofins') || desc.includes('pis') || desc.includes('irpj') || desc.includes('iss') ||
      desc.includes('icms') || desc.includes('imposto') || desc.includes('tributo')) {
    return {
      category: 'Tributos e Contribuições',
      confidence: 0.95,
      reasoning: 'Classificado por regra de palavras-chave como Tributos e Contribuições',
      source: 'rules'
    };
  }

  if (desc.includes('energia') || desc.includes('elétrica') || desc.includes('telefones') ||
      desc.includes('água') || desc.includes('luz') || desc.includes('telefone')) {
    return {
      category: 'Utilidades e Insumos',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como Utilidades e Insumos',
      source: 'rules'
    };
  }

  if (desc.includes('manutenção') || desc.includes('conservação') || desc.includes('limpeza')) {
    return {
      category: 'Manutenção e Serviços',
      confidence: 0.85,
      reasoning: 'Classificado por regra de palavras-chave como Manutenção e Serviços',
      source: 'rules'
    };
  }

  if (desc.includes('tarifas') && (desc.includes('bancárias') || desc.includes('banco')) ||
      desc.includes('juros') || desc.includes('multas') || desc.includes('cheque')) {
    return {
      category: 'Financeiros e Bancários',
      confidence: 0.9,
      reasoning: 'Classificado por regra de palavras-chave como Financeiros e Bancários',
      source: 'rules'
    };
  }

  // Verificar se é receita ou despesa pelo valor e contexto
  if (amount > 0) {
    // Valores positivos geralmente são receitas
    if (desc.includes('juros') || desc.includes('rendimento') || desc.includes('aplicação')) {
      return {
        category: 'Receitas Financeiras',
        confidence: 0.9,
        reasoning: 'Classificado como Receitas Financeiras (valor positivo + contexto financeiro)',
        source: 'rules'
      };
    }
  }

  // Regra padrão para transações sem classificação específica
  return {
    category: 'Utilidades e Insumos',
    confidence: 0.3, // Baixa confiança para fallback
    reasoning: 'Classificado por regra padrão como Utilidades e Insumos (baixa confiança)',
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

  // Buscar categorias dinâmicas do banco de dados
  let categoriesList: string;
  try {
    const dbCategories = await CategoriesService.getCategories({
      companyId: 'default', // Usar primeira empresa disponível
      isActive: true,
      includeStats: false
    });

    if (dbCategories.length > 0) {
      categoriesList = dbCategories
        .map(cat => `${cat.name} (${cat.type})`)
        .join('\n• ');
      console.log('✅ Categorias carregadas do banco:', categoriesList.length, 'categorias');
    } else {
      // Fallback para categorias pré-definidas se não houver no banco
      categoriesList = CATEGORIES_LIST;
      console.log('⚠️ Nenhuma categoria no banco, usando fallback pré-definido');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar categorias do banco:', error);
    // Fallback para categorias pré-definidas
    categoriesList = CATEGORIES_LIST;
  }

  const formattedCategoriesList = `• ${categoriesList}`;
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

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 200, // Aumentado para lidar com prompts mais complexos
          temperature: 0.2 // Ligeiramente maior para permitir criatividade na análise
        })
      });

      console.log(`📡 Resposta HTTP de ${model}:`, response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.choices || result.choices.length === 0) {
        throw new Error('Nenhuma resposta da API');
      }

      const aiCategory = result.choices[0]?.message?.content?.trim() || 'Utilidades e Insumos';

      console.log(`✅ Sucesso com modelo ${model}! Categoria: "${aiCategory}"`);

      return {
        category: aiCategory,
        confidence: 0.9,
        reasoning: `IA (${model}) - especialista em finanças empresariais categorizou como "${aiCategory}" com base na descrição, valor e contexto OFX${context ? ' e informações bancárias' : ''}`,
        source: 'ai',
        model_used: model
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

  // Fallback final melhorado
  console.log(`💥 Fallback final - nenhum modelo funcionou, usando lógica de regras empresarial`);
  return {
    category: 'Utilidades e Insumos',
    confidence: 0.7, // Mais alto que fallback anterior
    reasoning: 'Fallback para análise empresarial - transação não pôde ser categorizada pela IA, classificada por regras como "Utilidades e Insumos"',
    source: 'rules',
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
    let dbCategories = [];
    try {
      dbCategories = await CategoriesService.getCategories({
        isActive: true,
        includeStats: false
      });
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }

    const categoriesList = dbCategories.length > 0
      ? dbCategories.map(cat => cat.name)
      : Object.values(BUSINESS_CATEGORIES).flatMap(group => Object.keys(group));

    return NextResponse.json({
      message: 'API de Categorização Funcional - Versão com Categorias Dinâmicas',
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
      categoriesCount: dbCategories.length,
      categoriesSource: dbCategories.length > 0 ? 'database' : 'fallback',
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
        '🎯 Categorias baseadas em setor econômico',
        '💼 Classificação conforme CNAE brasileiro',
        '🗃️ Categorias dinâmicas do banco de dados'
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