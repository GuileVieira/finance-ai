/**
 * Utility para filtrar categorias relevantes baseado no tipo da transação
 *
 * Reduz tokens enviados para IA de 331 (53 categorias) para ~25-111 tokens
 * Economia: 66-92% dos tokens de categorias
 */

export interface Category {
  name: string;
  type: string;
  description?: string;
}

/**
 * Filtra categorias baseado no tipo da transação (crédito vs débito)
 *
 * @param transactionType - 'credit' (entrada/receita) ou 'debit' (saída/despesa)
 * @param allCategories - Lista completa de categorias disponíveis
 * @returns Array de categorias relevantes para o tipo de transação
 */
export function filterCategoriesByTransactionType(
  transactionType: 'credit' | 'debit',
  allCategories: Category[]
): Category[] {

  if (transactionType === 'credit') {
    // CRÉDITO (entrada) → Apenas categorias de receita
    // Reduz de 53 para ~4 categorias
    const revenueCategories = allCategories.filter(c => c.type === 'revenue');

    console.log(`📊 Filtro de categorias (CRÉDITO): ${revenueCategories.length}/${allCategories.length} categorias relevantes`);

    return revenueCategories;

  } else {
    // DÉBITO (saída) → Categorias de custos e despesas
    // Mantém 49 categorias (todas exceto receitas)
    const expenseCategories = allCategories.filter(c =>
      c.type === 'variable_cost' ||
      c.type === 'fixed_cost' ||
      c.type === 'non_operating' ||
      c.type === 'expense' // Fallback para categorias antigas
    );

    console.log(`📊 Filtro de categorias (DÉBITO): ${expenseCategories.length}/${allCategories.length} categorias relevantes`);

    return expenseCategories;
  }
}

/**
 * Filtra categorias de forma ainda mais específica baseado em padrões comuns
 * (Otimização adicional opcional)
 *
 * @param description - Descrição da transação
 * @param transactionType - Tipo da transação
 * @param allCategories - Lista completa de categorias
 * @returns Array de categorias ainda mais filtradas
 */
export function filterCategoriesByPattern(
  description: string,
  transactionType: 'credit' | 'debit',
  allCategories: Category[]
): Category[] {

  // Primeiro aplica filtro por tipo
  const filtered = filterCategoriesByTransactionType(transactionType, allCategories);

  // Padrões comuns que podem reduzir ainda mais
  const descUpper = description.toUpperCase();

  // Para CRÉDITO, já temos apenas 4 categorias, não precisa filtrar mais
  if (transactionType === 'credit') {
    return filtered;
  }

  // Para DÉBITO, aplicar filtros adicionais se identificar padrões óbvios
  const patterns: Record<string, string[]> = {
    // Salários e folha
    'SALARIO|FUNCIONARIO|FOLHA': ['SALARIOS', '13º SALARIO', 'FÉRIAS', 'VALE ALIMENTAÇÃO', 'VALE REFEIÇÃO', 'VALE TRANSPORTE'],

    // Tributos
    'INSS|FGTS|COFINS|IMPOSTO|TRIBUTO': ['INSS', 'FGTS', 'COFINS', 'OUTROS TRIBUTOS'],

    // Bancário
    'TARIFA|TAXA BANCO|MENSALIDADE': ['TARIFAS BANCÁRIAS'],

    // Utilidades
    'ENERGIA|LUZ|ELETRIC': ['ENERGIA ELETRICA'],
    'TELEFONE|CELULAR|TIM|VIVO|CLARO': ['TELEFONES FIXOS', 'TELEFONES MÓVEIS'],
    'INTERNET|PROVEDOR': ['INTERNET'],

    // Serviços profissionais
    'CONTADOR|CONTABIL': ['SERVIÇOS DE CONTABILIDADE'],
    'ADVOGADO|JURIDICO': ['SERVIÇOS DE ADVOCACIA']
  };

  for (const [pattern, categories] of Object.entries(patterns)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(descUpper)) {
      const matchedCategories = filtered.filter(c =>
        categories.some(cat => c.name.toUpperCase().includes(cat))
      );

      if (matchedCategories.length > 0) {
        console.log(`🎯 Filtro por padrão "${pattern}": ${matchedCategories.length} categorias`);
        return matchedCategories;
      }
    }
  }

  // Se não encontrou padrão específico, retorna filtro por tipo
  return filtered;
}

/**
 * Formata lista de categorias para o prompt da IA
 *
 * @param categories - Categorias filtradas
 * @returns String formatada para incluir no prompt
 */
export function formatCategoriesForPrompt(categories: Category[]): string {
  return categories
    .map(c => `• ${c.name}`)
    .join('\n');
}
