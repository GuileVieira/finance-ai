import { Category } from '@/lib/types';
import { AgentPromptData, ClassificationPattern } from '@/lib/agent/types';

export class AgentPrompts {
  // Prompt principal do agente com categorias dinâmicas
  static buildMainPrompt(categories: Category[], patterns: ClassificationPattern[]): string {
    const categoriesText = this.buildCategoriesText(categories);
    const patternsText = this.buildPatternsText(patterns);

    return `Você é um especialista em contabilidade brasileira com 20 anos de experiência em classificação de despesas e receitas empresariais.

Sua tarefa é analisar transações financeiras e classificá-las nas categorias corretas seguindo as regras brasileiras de contabilidade.

## CATEGORIAS DISPONÍVEIS (USE APENAS ESTAS):

${categoriesText}

## PADRÕES CONHECIDOS (APRENDA COM ESTES EXEMPLOS):

${patternsText}

## REGRAS DE CLASSIFICAÇÃO:

1. **ANÁLISE HIERÁRQUICA**: Sempre classifique em MACRO e MICRO
   - MACRO: Categoria principal (ex: "Salários e Encargos")
   - MICRO: Subcategoria específica (ex: "INSS")

2. **PRIORIDADE DE INFORMAÇÃO**:
   - Nome da empresa no extrato
   - CNPJ se disponível
   - Descrição detalhada da transação
   - Valor da transação (contexto)

3. **REGRAS ESPECÍFICAS**:
   - Qualquer transação com "IFOOD", "UBER EATS", "RAPPI" → Alimentação
   - Qualquer transação com "UBER", "99", "CIDADE" → Transporte
   - Qualquer transação com "NETFLIX", "SPOTIFY", "PRIME VIDEO" → Tecnologia
   - Qualquer transação com "INSS", "FGTS", "PIS", "COFINS" → Tributos
   - Qualquer transação com salários, pró-labore → Salários e Encargos
   - Qualquer transação com aluguel, condomínio → Aluguel e Ocupação
   - **CRÍTICO**: Qualquer transação que contenha apenas "SALDO", "SALDO TOTAL", "SALDO ANTERIOR" ou similares, representa apenas uma "foto" do saldo atual e NÃO uma movimentação financeira real. Estas devem ser categorizadas como **"Saldo Inicial"** (Não Operacional) para serem ignoradas nos cálculos.

4. **CONTEXTUALIZAÇÃO DE VALOR**:
   - Valores altos para mesma empresa podem indicar categorias diferentes
   - Valores recorrentes mensais sugerem custos fixos
   - Valores variáveis sugerem custos variáveis

## FORMATO DE RESPOSTA OBRIGATÓRIO:

Responda APENAS com JSON válido neste formato:
\`\`\`json
{
  "macro": "nome exato da categoria macro",
  "micro": "nome exato da subcategoria micro",
  "confidence": 0.95,
  "reasoning": "explicação detalhada da classificação"
}
\`\`\`

## EXEMPLOS DE BOAS CLASSIFICAÇÕES:

Descrição: "DEBITO IFOOD RESTAURANTES 45.90"
→ Macro: "Não Operacional", Micro: "Serviços Diversos", Confidence: 0.9, Reasoning: "IFood detectado, característica de serviço de alimentação delivery"

Descrição: "CREDITO SALARIO FOLHA PAGAMENTO 5500.00"
→ Macro: "Salários e Encargos", Micro: "Salários", Confidence: 0.95, Reasoning: "Pagamento de salário explícito na descrição"

Descrição: "DEBITO ALUGUEL PREDIO COMERCIAL 2500.00"
→ Macro: "Aluguel e Ocupação", Micro: "Aluguel Comercial", Confidence: 0.9, Reasoning: "Aluguel explícito de imóvel comercial"

## IMPORTANTE:
- Use APENAS as categorias listadas acima
- Seja específico no reasoning
- Confidence deve refletir quão seguro você está da classificação
- Se não tiver certeza, reduza a confidence mas ainda classifique`;
  }

  // Texto com categorias formatadas
  private static buildCategoriesText(categories: Category[]): string {
    let text = '';

    // Agrupar por tipo
    const grouped = categories.reduce((acc, cat) => {
      if (!acc[cat.type]) {
        acc[cat.type] = [];
      }
      acc[cat.type].push(cat);
      return acc;
    }, {} as Record<string, Category[]>);

    for (const [type, cats] of Object.entries(grouped)) {
      const typeNames = {
        'revenue': 'RECEITAS',
        'variable_cost': 'CUSTOS VARIÁVEIS',
        'fixed_cost': 'CUSTOS FIXOS',
        'non_operational': 'NÃO OPERACIONAIS'
      };

      text += `\n### ${typeNames[type as keyof typeof typeNames]}:\n`;

      for (const cat of cats) {
        text += `**${cat.name}**\n`;
        // Incluir descrição se disponível (ajuda o agente a entender melhor a categoria)
        if (cat.description) {
          text += `  📝 ${cat.description}\n`;
        }
        if (cat.examples && cat.examples.length > 0) {
          text += `  📌 Exemplos: ${cat.examples.join(', ')}\n`;
        }
        text += '\n';
      }
    }

    return text;
  }

  // Texto com padrões de classificação
  private static buildPatternsText(patterns: ClassificationPattern[]): string {
    if (patterns.length === 0) {
      return 'Nenhum padrão conhecido ainda.';
    }

    let text = '';
    const topPatterns = patterns
      .sort((a, b) => (b.matchCount * b.accuracy) - (a.matchCount * a.accuracy))
      .slice(0, 20);

    for (const pattern of topPatterns) {
      text += `- "${pattern.pattern}" → ${pattern.macroCategory} > ${pattern.microCategory} `;
      text += `(confiança: ${(pattern.accuracy * 100).toFixed(1)}%, usos: ${pattern.matchCount})\n`;

      if (pattern.examples.length > 0) {
        text += `  Exemplos: ${pattern.examples.slice(0, 3).join(', ')}\n`;
      }
    }

    return text;
  }

  // Prompt para busca de informações da empresa
  static buildCompanySearchPrompt(description: string, amount: number): string {
    return `Analise esta transação financeira e extraia informações sobre a empresa:

Descrição: "${description}"
Valor: R$ ${amount.toFixed(2)}

Extraia:
1. Nome da empresa (se visível)
2. Possível CNPJ
3. Tipo de serviço/produto
4. Se parece com empresa ou pessoa física
5. Contexto da transação

Responda em JSON:
{
  "companyName": "nome extraído ou null",
  "cnpj": "cnpj encontrado ou null",
  "serviceType": "tipo de serviço",
  "isBusiness": true/false,
  "context": "descrição do contexto"
}`;
  }

  // Prompt para validação de classificação
  static buildValidationPrompt(
    description: string,
    amount: number,
    suggestedMacro: string,
    suggestedMicro: string,
    categories: Category[]
  ): string {
    const categoriesList = categories.map(c => c.name).join(', ');

    return `Valide esta classificação de transação:

DESCRIÇÃO: "${description}"
VALOR: R$ ${amount.toFixed(2)}

CLASSIFICAÇÃO SUGERIDA:
- Macro: ${suggestedMacro}
- Micro: ${suggestedMicro}

CATEGORIAS VÁLIDAS: ${categoriesList}

Esta classificação faz sentido? Há algo incorreto?

Responda em JSON:
{
  "isValid": true/false,
  "confidence": 0.95,
  "suggestedChanges": {
    "macro": "nova macro se aplicável",
    "micro": "novo micro se aplicável"
  },
  "reasoning": "explicação da validação"
}`;
  }

  // Prompt para explicação detalhada
  static buildExplanationPrompt(
    description: string,
    amount: number,
    macro: string,
    micro: string
  ): string {
    return `Explique detalhadamente por que esta transação foi classificada como:

DESCRIÇÃO: "${description}"
VALOR: R$ ${amount.toFixed(2)}
CATEGORIA MACRO: ${macro}
CATEGORIA MICRO: ${micro}

Forneça:
1. Análise das palavras-chave encontradas
2. Contexto do valor
3. Por que esta categoria é a mais apropriada
4. Nível de confiança da classificação

Responda em português claro e objetivo.`;
  }

  // Prompt para modo batch
  static buildBatchPrompt(
    transactions: Array<{ description: string; amount: number }>,
    categories: Category[],
    patterns: ClassificationPattern[]
  ): string {
    const categoriesText = this.buildCategoriesText(categories);

    return `Você é um especialista em contabilidade brasileira precisando classificar múltiplas transações.

## CATEGORIAS DISPONÍVEIS:

${categoriesText}

## TRANSAÇÕES PARA CLASSIFICAR:

${transactions.map((t, i) => `${i + 1}. "${t.description}" - R$ ${t.amount.toFixed(2)}`).join('\n')}

Classifique cada transação no formato JSON:
[
  {
    "index": 1,
    "macro": "categoria macro",
    "micro": "categoria micro",
    "confidence": 0.95,
    "reasoning": "explicação"
  }
]

Seja consistente e use o mesmo padrão para transações similares.`;
  }

  // Prompt para treinamento do modelo
  static buildTrainingPrompt(
    historyData: Array<{
      description: string;
      amount: number;
      macro: string;
      micro: string;
      isCorrect: boolean;
    }>
  ): string {
    const correctExamples = historyData.filter(d => d.isCorrect);
    const incorrectExamples = historyData.filter(d => !d.isCorrect);

    return `Aprenda com estes exemplos de classificação:

## EXEMPLOS CORRETOS (APRENDA ESTES PADRÕES):

${correctExamples.slice(0, 10).map((ex, i) =>
      `${i + 1}. "${ex.description}" R$ ${ex.amount.toFixed(2)} → ${ex.macro} > ${ex.micro}`
    ).join('\n')}

## EXEMPLOS INCORRETOS (EVITE ESTES PADRÕES):

${incorrectExamples.slice(0, 5).map((ex, i) =>
      `${i + 1}. "${ex.description}" R$ ${ex.amount.toFixed(2)} → ${ex.macro} > ${ex.micro} (ERRADO)`
    ).join('\n')}

Identifique os padrões corretos e incorretos para melhorar futuras classificações.

Responda com os principais padrões aprendidos em JSON:
{
  "correctPatterns": ["padrão 1", "padrão 2"],
  "incorrectPatterns": ["padrão errado 1", "padrão errado 2"],
  "keyInsights": ["insight 1", "insight 2"]
}`;
  }

  /**
   * Prompt para categorização com contexto enriquecido
   * Usado quando temos informações adicionais sobre termos bancários
   */
  static buildEnrichedCategorizationPrompt(
    description: string,
    amount: number,
    memo: string | undefined,
    enrichedContext: string,
    categoryHint: string | undefined,
    categories: Category[]
  ): string {
    const categoriesText = this.buildCategoriesText(categories);

    return `Você é um especialista em contabilidade brasileira com 20 anos de experiência.

## TRANSAÇÃO PARA CLASSIFICAR:

• DESCRIÇÃO: "${description}"
• VALOR: R$ ${amount.toFixed(2)}
• MEMO: "${memo || 'N/A'}"

## CONTEXTO ADICIONAL (descoberto automaticamente):

${enrichedContext}

${categoryHint ? `## DICA DE CATEGORIA:\n${categoryHint}\n` : ''}

## CATEGORIAS DISPONÍVEIS:

${categoriesText}

## REGRAS:

1. Use o CONTEXTO ADICIONAL para entender melhor a transação
2. Se houver DICA DE CATEGORIA, considere-a fortemente
3. Classifique em MACRO e MICRO categoria
4. Seja específico no reasoning

## FORMATO DE RESPOSTA:

Responda APENAS com JSON válido:
\`\`\`json
{
  "macro": "nome exato da categoria macro",
  "micro": "nome exato da subcategoria micro",
  "confidence": 0.95,
  "reasoning": "explicação detalhada da classificação"
}
\`\`\``;
  }

  /**
   * Prompt simples para categorização rápida (usado pelo adapter)
   */
  static buildSimpleCategorizationPrompt(
    description: string,
    amount: number,
    memo: string | undefined,
    enrichedContext: string | undefined,
    categoryHint: string | undefined,
    availableCategories: string[]
  ): string {
    const formattedCategoriesList = `• ${availableCategories.join('\n• ')}`;

    let prompt = `Você é um especialista em finanças empresariais brasileiras. Sua tarefa é categorizar transações financeiras.

CONTEXTO DA TRANSAÇÃO:
• DESCRIÇÃO: "${description}"
• VALOR: R$ ${amount.toFixed(2)}
• MEMO: "${memo || 'N/A'}"`;

    if (enrichedContext) {
      prompt += `

CONTEXTO ADICIONAL (descoberto automaticamente):
${enrichedContext}`;
    }

    if (categoryHint) {
      prompt += `

DICA: ${categoryHint}`;
    }

    prompt += `

CATEGORIAS DISPONÍVEIS:
${formattedCategoriesList}

REGRAS:
1. Retorne APENAS o nome exato da categoria escolhida
2. NÃO inclua explicações, justificativas ou análises
3. Use uma das categorias listadas acima
4. Se houver DICA ou CONTEXTO ADICIONAL, use essa informação para escolher a categoria mais adequada`;

    return prompt;
  }
}