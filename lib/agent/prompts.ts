import { Category } from '@/lib/types';
import { AgentPromptData, ClassificationPattern } from '@/lib/agent/types';

export class AgentPrompts {
  // Prompt principal do agente com categorias dinâmicas
  static buildMainPrompt(categories: Category[], patterns: ClassificationPattern[]): string {
    const categoriesText = this.buildCategoriesText(categories);
    const patternsText = this.buildPatternsText(patterns);

    return `ATENÇÃO: Você atua como um Auditor Contábil Sênior (CPA).
Sua missão é classificar transações com RIGOR TÉCNICO e evitar alucinações.

## DADOS DA TRANSAÇÃO:
A descrição, valor (R$) e memo da transação serão fornecidos na mensagem do usuário. Analise-os com base nas regras abaixo.

## ⚠️ REGRAS DE OURO (SINAL DO DINHEIRO - INVIOLÁVEIS):
1. **VALOR NEGATIVO (-) É SAÍDA.**
   - OBRIGATÓRIO: Classificar como Custo, Despesa, Passivo ou Investimento.
   - PROIBIDO: Classificar como "Receita" ou "Vendas".

2. **VALOR POSITIVO (+) É ENTRADA.**
   - OBRIGATÓRIO: Classificar como Receita, Empréstimo ou Resgate.
   - PROIBIDO: Classificar como "Despesa".
   - EXCEÇÃO: Se contiver "ESTORNO", "REEMBOLSO" ou "DEVOLUCAO", a entrada PODE ser classificada como a categoria original da despesa estornada.

## 🛡️ PROTOCOLOS DE SEGURANÇA:

### [PROTOCOLO 1: INFORMAÇÃO INSUFICIENTE → NÃO ADIVINHE]
Antes de categorizar, verifique se a descrição contém **informação identificadora do destino/origem**:
- ✅ CNPJ, CPF, razão social, nome de pessoa/empresa, tipo específico (ex: "SALARIOS", "ENERGIA", "ALUGUEL")
- ❌ Apenas canal de pagamento (transferência, boleto, débito automático, pagamento eletrônico) SEM identificar QUEM ou O QUÊ

**Se a descrição indica APENAS o canal/meio de pagamento mas NÃO identifica o destinatário ou a natureza da despesa:**
- AÇÃO: NÃO INVENTE. Não chute "Matéria Prima", "Fornecedores" ou qualquer categoria específica.
- CLASSIFICAÇÃO: Use "Outras Despesas Operacionais" (saída) ou "A Classificar" (entrada).
- CONFIDENCE: Máximo 0.40 (para forçar revisão humana).
- REASONING: Explique que a descrição não contém informação suficiente para categorizar.

**Exemplos do PRINCÍPIO (não se limite a esses termos, QUALQUER banco pode ter variações):**
- ❌ "SISPAG FORNECEDORES" → só diz o canal, não diz QUEM é o fornecedor → **0.40**
- ❌ "PIX ENVIADO" / "TED ENVIADA" / "DOC" → canal sem destino → **0.40**
- ❌ "PAGAMENTO ELETRONICO" / "DEB AUTOMATICO" → meio sem natureza → **0.40**
- ✅ "SISPAG FORNECEDORES KIMBERLIT LTDA 61.167.060/0001-98" → tem CNPJ → categorizar normalmente
- ✅ "SISPAG SALARIOS" → natureza clara (folha) → categorizar normalmente
- ✅ "PIX RECEBIDO JOAO SILVA" → tem nome → categorizar normalmente

### [PROTOCOLO 2: DÍVIDA NÃO É RECEITA]
Se houver ENTRADA (+) com termos: "FIDC", "ANTECIPACAO", "MUTUO", "GIRO", "EMPRESTIMO":
- ISSO É DÍVIDA. PROIBIDO classificar como "Receita". Busque "Empréstimos" ou "Movimentações Financeiras".

### [PROTOCOLO 3: SALDO NÃO É TRANSAÇÃO]
Se a descrição contiver "SALDO", "SALDO TOTAL", "SALDO ANTERIOR", "SDO", "SALDO EM", "SALDO DO DIA" ou "SALDO DISPONIVEL":
- ISSO É UMA FOTO DO SALDO, NÃO é movimentação financeira real.
- CLASSIFICAÇÃO: Obrigatoriamente "Saldo Inicial" (Movimentações Financeiras e Transferências).
- CONFIDENCE: 1.0 (Certeza absoluta).

### [PROTOCOLO 4: CONFIANÇA PROPORCIONAL À INFORMAÇÃO]
Sua confiança DEVE refletir a quantidade de informação disponível:
- **0.90-1.00**: Descrição contém CNPJ/razão social + tipo claro (ex: "DARF GPS" ou "NF 12345 KIMBERLIT LTDA")
- **0.70-0.89**: Descrição indica natureza mas sem detalhes completos (ex: "SISPAG TRIBUTOS", "ENERGIA ELETRICA")
- **0.50-0.69**: Descrição tem alguma pista mas é parcial (ex: "PAG FORNEC METALURGICA")
- **0.30-0.49**: Descrição genérica sem informação identificadora → REVISÃO OBRIGATÓRIA

## CATEGORIAS DISPONÍVEIS:
${categoriesText}

## PADRÕES HISTÓRICOS:
${patternsText}

Responda APENAS com JSON válido:
\`\`\`json
{
  "macro": "Nome exato da Categoria Macro",
  "micro": "Nome exato da Subcategoria",
  "confidence": 0.85,
  "reasoning": "Explique a decisão baseada no SINAL e TERMOS TÉCNICOS."
}
\`\`\`
`;
  }

  // Texto com categorias formatadas usando o Plano de Contas (dreGroup + categoryGroup)
  private static buildCategoriesText(categories: Category[]): string {
    let text = '';

    // Nomes das linhas do DRE
    const dreGroupNames: Record<string, string> = {
      'RoB': 'RECEITA BRUTA',
      'TDCF': 'TRIBUTOS E CUSTOS FINANCEIROS',
      'CV': 'CUSTOS VARIÁVEIS',
      'CF': 'CUSTOS FIXOS',
      'RNOP': 'RECEITAS NÃO OPERACIONAIS',
      'DNOP': 'DESPESAS NÃO OPERACIONAIS',
      'EMP': 'EMPRÉSTIMOS (Fora do DRE)',
      'TRANSF': 'TRANSFERÊNCIAS (Fora do DRE)'
    };

    // Agrupar por dreGroup primeiro, depois por categoryGroup
    const groupedByDre: Record<string, Record<string, Category[]>> = {};

    for (const cat of categories) {
      const dreGroup = cat.dreGroup || this.getDreGroupFallback(cat.type);
      const catGroup = cat.categoryGroup || 'OUTROS';

      if (!groupedByDre[dreGroup]) {
        groupedByDre[dreGroup] = {};
      }
      if (!groupedByDre[dreGroup][catGroup]) {
        groupedByDre[dreGroup][catGroup] = [];
      }
      groupedByDre[dreGroup][catGroup].push(cat);
    }

    // Ordem de apresentação das linhas do DRE
    const dreOrder = ['RoB', 'TDCF', 'CV', 'CF', 'RNOP', 'DNOP', 'EMP', 'TRANSF'];

    for (const dreGroup of dreOrder) {
      if (!groupedByDre[dreGroup]) continue;

      const dreName = dreGroupNames[dreGroup] || dreGroup;
      text += `\n## ${dreName}:\n`;

      const categoryGroups = groupedByDre[dreGroup];
      for (const [catGroup, cats] of Object.entries(categoryGroups)) {
        if (catGroup !== 'OUTROS') {
          text += `\n### ${catGroup}:\n`;
        }

        for (const cat of cats) {
          text += `• **${cat.name}**`;
          if (cat.description) {
            text += ` - ${cat.description}`;
          }
          text += '\n';
          if (cat.examples && cat.examples.length > 0) {
            text += `  📌 Exemplos: ${cat.examples.join(', ')}\n`;
          }
        }
      }
    }

    return text;
  }

  // Fallback de dreGroup pelo type para categorias antigas
  private static getDreGroupFallback(type: string): string {
    switch (type) {
      case 'revenue': return 'RoB';
      case 'variable_cost': return 'CV';
      case 'fixed_cost': return 'CF';
      case 'non_operational': return 'DNOP';
      case 'financial_movement': return 'TRANSF';
      default: return 'CF';
    }
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
   * BLINDADO: Inclui regras de sinal para evitar que o contexto anule a lógica contábil.
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
    const isExpense = amount < 0;

    return `Você é um Auditor Contábil Sênior.
Analise esta transação enriquecida com dados externos.

## TRANSAÇÃO:
• DESCRIÇÃO ORIGINAL: "${description}"
• VALOR: R$ ${amount.toFixed(2)} (${isExpense ? 'SAÍDA/PAGAMENTO' : 'ENTRADA/RECEBIMENTO'})
• MEMO: "${memo || 'N/A'}"

## CONTEXTO ADICIONAL (Enriquecido via CNPJ/Search):
${enrichedContext}

${categoryHint ? `## DICA DO SISTEMA:\n${categoryHint}\n` : ''}

## REGRAS DE OURO (SINAL SOBERANO):
1. **VALOR NEGATIVO (-)**: É SAÍDA. Deve ser Custo, Despesa ou Passivo. JAMAIS "Receita".
2. **VALOR POSITIVO (+)**: É ENTRADA. Deve ser Receita ou Empréstimo. JAMAIS "Despesa" (exceto estornos).
3. **DÍVIDA vs RECEITA**: Se o contexto indicar "FIDC", "Factoring" ou "Empréstimo" e for uma ENTRADA (+), classifique como PASSIVO (Empréstimos), não como Receita.

## CATEGORIAS DISPONÍVEIS:
${categoriesText}

## FORMATO DE RESPOSTA:
Responda APENAS com JSON válido:
\`\`\`json
{
  "macro": "nome exato da categoria macro",
  "micro": "nome exato da subcategoria micro",
  "confidence": 0.95,
  "reasoning": "Contexto indica empresa X (Setor Y). Sinal confirma Despesa/Receita."
}
\`\`\``;
  }
  /**
   * Prompt simples para categorização rápida (usado pelo adapter)
   * BLINDADO: Agora inclui regras básicas de sinal para evitar erros grosseiros.
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
    const isExpense = amount < 0;

    let prompt = `Você é um especialista em finanças. Categorize esta transação.

DADOS:
• DESCRIÇÃO: "${description}"
• VALOR: R$ ${amount.toFixed(2)} (${isExpense ? 'SAÍDA/PAGAMENTO' : 'ENTRADA/RECEBIMENTO'})
• MEMO: "${memo || 'N/A'}"`;

    if (enrichedContext) {
      prompt += `\n\nCONTEXTO EXTRA: ${enrichedContext}`;
    }

    if (categoryHint) {
      prompt += `\n\nDICA: ${categoryHint}`;
    }

    prompt += `\n\nCATEGORIAS DISPONÍVEIS:\n${formattedCategoriesList}

REGRAS DE OURO:
1. VALOR NEGATIVO (R$ -) = Custo, Despesa ou Passivo. JAMAIS "Receita".
2. VALOR POSITIVO (R$ +) = Receita ou Empréstimo. JAMAIS "Despesa" (exceto estorno).
3. Retorne APENAS o nome exato da categoria da lista acima.`;

    return prompt;
  }
}