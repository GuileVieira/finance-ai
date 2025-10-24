import { NextRequest, NextResponse } from 'next/server';

// Categorias financeiras brasileiras
const categories = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  moradia: 'Moradia',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  vestuario: 'Vestuário',
  impostos: 'Impostos',
  outras_despesas: 'Outras Despesas',
  salario: 'Salário',
  vendas: 'Vendas',
  investimentos: 'Investimentos',
  outras_receitas: 'Outras Receitas'
};

// Função de categorização baseada em regras
function categorizeByRules(description: string, amount: number) {
  const desc = description.toLowerCase();

  // Regras de palavras-chave
  if (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('lanche') ||
      desc.includes('mercado') || desc.includes('supermercado')) {
    return categories.alimentacao;
  }

  if (desc.includes('uber') || desc.includes('taxi') || desc.includes('99taxi') ||
      desc.includes('transporte') || desc.includes('fretado') ||
      desc.includes('correios')) {
    return categories.transporte;
  }

  if (desc.includes('aluguel') || desc.includes('condomínio') ||
      desc.includes('imobiliária') || desc.includes('predio')) {
    return categories.moradia;
  }

  if (desc.includes('supermercado') || desc.includes('drogaria') ||
      desc.includes('farmácia')) {
    return categories.alimentacao;
  }

  if (desc.includes('salário') || desc.includes('folha') ||
      desc.includes('contracheque') || desc.includes('holerite')) {
    return categories.salario;
  }

  if (desc.includes('venda') || desc.includes('receita') ||
      desc.includes('faturamento')) {
    return categories.vendas;
  }

  if (amount > 5000) {
    return categories.investimentos;
  }

  // Regras específicas por CNPJ ou empresas conhecidas
  if (desc.includes('picpay') || desc.includes('stone')) {
    return categories.outras_despesas;
  }

  if (desc.includes('netflix') || desc.includes('spotify') ||
      desc.includes('prime video')) {
    return categories.lazer;
  }

  // Serviços essenciais
  if (desc.includes('energia') || desc.includes('água') ||
      desc.includes('internet') || desc.includes('telefone')) {
    return categories.moradia;
  }

  return categories.outras_despesas;
}

// Configuração dos modelos com sistema de fallback
const AI_MODELS = {
  primary: process.env.AI_MODEL_PRIMARY || 'gemini/gemini-2.5',
  fallback: process.env.AI_MODEL_FALLBACK || 'openai/gpt-5-mini'
};

// Função para tentar categorização por IA com fallback
async function categorizeByAI(description: string, amount: number) {
  const modelsToTry = [AI_MODELS.primary, AI_MODELS.fallback];

  console.log('🔄 Modelos para tentar (em ordem):', modelsToTry);

  for (const model of modelsToTry) {
    try {
      console.log(`🚀 Tentando modelo: ${model}`);

      const messages = [
        {
          role: 'system',
          content: `Você é um especialista em finanças pessoais.
Categorize a transação abaixo em uma das seguintes categorias:

Categorias disponíveis:
- ${Object.values(categories).join(', ')}

IMPORTANTE:
- Retorne APENAS o nome exato da categoria (sem alterações)
- Se não tiver certeza, escolha a categoria mais provável
- A resposta deve ser APENAS o nome da categoria, sem explicações adicionais

Transação:
Descrição: "${description}"
Valor: R$ ${amount.toFixed(2)}

Responda apenas com o nome da categoria.`
        },
        {
          role: 'user',
          content: `Descrição: "${description}"\nValor: R$ ${amount.toFixed(2)}`
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
          max_tokens: 100,
          temperature: 0.1
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

      const aiCategory = result.choices[0]?.message?.content?.trim() || categories.outras_despesas;

      console.log(`✅ Sucesso com modelo ${model}! Categoria: "${aiCategory}"`);

      return {
        category: aiCategory,
        confidence: 0.9,
        reasoning: `IA (${model}) categorizou como "${aiCategory}" com base na descrição e valor`,
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
          category: categories.outras_despesas,
          confidence: 0.1,
          reasoning: `Erro em todos os modelos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          source: 'ai',
          model_used: 'none'
        };
      }

      console.log(`🔄 Tentando próximo modelo...`);
      // Tenta o próximo modelo
      continue;
    }
  }

  // Fallback final
  console.log(`💥 Fallback final - nenhum modelo funcionou`);
  return {
    category: categories.outras_despesas,
    confidence: 0.1,
    reasoning: 'Fallback final - erro em todos os modelos',
    source: 'ai',
    model_used: 'none'
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('\n=== [WORK-CATEGORIZE] Nova requisição de categorização ===');

    const body = await request.json();
    const { description, amount } = body;

    console.log('📥 Dados recebidos:', {
      description,
      amount,
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

    const aiResult = await categorizeByAI(description, numAmount);
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
  return NextResponse.json({
    message: 'API de Categorização Funcional - Versão Simplificada',
    endpoint: '/api/ai/work-categorize',
    method: 'POST',
    body: {
      description: 'string (obrigatório)',
      amount: 'number (obrigatório)'
    },
    example: {
      description: 'DEBITO IFOOD RESTAURANTES 45.90',
      amount: 45.90
    },
    categories: Object.values(categories),
    workflow: [
      '1️⃣ Tenta categorização por regras baseadas em palavras-chave',
      '2️⃣ Se confiança alta (>70%), retorna resultado',
      '3️⃣ Senão, usa IA Claude (Anthropic) para categorização final',
      '4️⃣ Retorna categoria com 90% confiança da IA'
    ]
  });
}