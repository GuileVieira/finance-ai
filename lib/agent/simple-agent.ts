import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { completion } from 'litellm';

// Ferramenta de busca web
const searchTool = tool(({ query }) => {
  // Simulação de busca - em produção usaria DuckDuckGo ou outra API
  return `Resultados da busca para: ${query}`;
}, {
  name: "search",
  description: "Ferramenta para buscar informações na web",
  schema: z.object({
    query: z.string().describe("Query para buscar na web")
  })
});

// Ferramenta de categorização
const categorizeTool = tool(({ description, amount }) => {
  // Categorias simples brasileiras
  const categories = [
    "Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
    "Lazer", "Vestuário", "Impostos", "Outras Despesas",
    "Salário", "Vendas", "Investimentos", "Outras Receitas"
  ];

  // Lógica simples de categorização baseada em palavras-chave
  const desc = description.toLowerCase();
  let category = "Outras Despesas";

  if (desc.includes("ifood") || desc.includes("restaurante") || desc.includes("lanche")) {
    category = "Alimentação";
  } else if (desc.includes("uber") || desc.includes("taxi") || desc.includes("transporte")) {
    category = "Transporte";
  } else if (desc.includes("aluguel") || desc.includes("condominio")) {
    category = "Moradia";
  } else if (desc.includes("salario") || desc.includes("folha")) {
    category = "Salário";
  } else if (desc.includes("venda") || desc.includes("receita")) {
    category = "Vendas";
  }

  return {
    category,
    confidence: 0.8,
    reasoning: `Categoria "${category}" identificada baseada nas palavras-chave da descrição`
  };
}, {
  name: "categorize",
  description: "Categoriza uma transação financeira",
  schema: z.object({
    description: z.string().describe("Descrição da transação"),
    amount: z.number().describe("Valor da transação")
  })
});

// Configuração dos modelos com sistema de fallback
const AI_MODELS = {
  primary: process.env.AI_MODEL_PRIMARY || 'gemini/gemini-2.5-flash',
  fallback: process.env.AI_MODEL_FALLBACK || 'openai/gpt-5-mini'
};

// Configuração do modelo LiteLLM
const llmConfig = {
  model: AI_MODELS.primary,
  api_key: process.env.OPENROUTER_API_KEY,
  api_base: 'https://openrouter.ai/api/v1',
  temperature: 0.1,
  max_tokens: 2000
};

// Função wrapper para LiteLLM com sistema de fallback
const llm = async (messages: Array<{role: string, content: string}>) => {
  const modelsToTry = [AI_MODELS.primary, AI_MODELS.fallback];

  for (const model of modelsToTry) {
    try {
      const response = await completion(model, messages, {
        temperature: llmConfig.temperature,
        max_tokens: llmConfig.max_tokens,
        api_base: llmConfig.api_base,
        api_key: llmConfig.api_key
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Resposta inválida da API');
      }

      const content = response.choices[0].message?.content || '';

      if (content) {
        return content;
      }

      throw new Error('Resposta vazia da API');
    } catch (error) {
      console.error(`Erro no modelo ${model}:`, error);

      // Se for o último modelo da lista, lança o erro
      if (model === modelsToTry[modelsToTry.length - 1]) {
        throw new Error(`Erro em todos os modelos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

      // Tenta o próximo modelo
      continue;
    }
  }

  throw new Error('Nenhum modelo disponível');
};

// Definir as ferramentas disponíveis para o agente
export const agentTools = [searchTool, categorizeTool];

// Função para executar o agente
export async function runSimpleAgent(
  description: string,
  amount: number
): Promise<{
  category: string;
  confidence: number;
  reasoning: string;
  source: 'rule_based' | 'ai';
  processingTime: number;
}> {
  const startTime = Date.now();

  try {
    // Primeiro tenta categorização baseada em regras
    const categorizeResult = await categorizeTool.invoke({ description, amount });
    const parsedResult = categorizeResult;

    // Se confiança for alta, retorna resultado baseado em regras
    if (parsedResult.confidence >= 0.8) {
      return {
        ...parsedResult,
        source: 'rule_based',
        processingTime: Date.now() - startTime
      };
    }

    // Senão, usa o agente com IA
    const messages = [
      {
        role: "system",
        content: `Você é um especialista em finanças pessoais.
Categorize a seguinte transação financeira em uma das categorias:
- Alimentação
- Transporte
- Moradia
- Saúde
- Educação
- Lazer
- Vestuário
- Impostos
- Outras Despesas
- Salário
- Vendas
- Investimentos
- Outras Receitas

Responda apenas com o nome da categoria e uma breve justificativa.`
      },
      {
        role: "user",
        content: `Descrição: "${description}"\nValor: R$ ${amount.toFixed(2)}`
      }
    ];

    const aiResponse = await llm(messages);
    const processingTime = Date.now() - startTime;

    // Extrai categoria da resposta
    const categoryMatch = aiResponse.match(/^(.+)$/m)?.[1] || "Outras Despesas";

    return {
      category: categoryMatch.trim(),
      confidence: 0.7,
      reasoning: aiResponse,
      source: 'ai',
      processingTime
    };

  } catch (error) {
    console.error('Erro no agente:', error);
    return {
      category: "Outras Despesas",
      confidence: 0.1,
      reasoning: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      source: 'ai',
      processingTime: Date.now() - startTime
    };
  }
}