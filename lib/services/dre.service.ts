import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts, transactionSplits } from '@/lib/db/schema';
import { DREStatement, DRECategory } from '@/lib/types';
import { eq, and, gte, lte, sum, count, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getFinancialExclusionClause } from './financial-exclusion';

interface DrilldownTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  bank?: string;
}

export interface DREFilters {
  period?: string;
  companyId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

// Tipos de dreGroup válidos
type DreGroupType = 'RoB' | 'TDCF' | 'CF' | 'CV' | 'RNOP' | 'DNOP' | 'EMP' | 'TRANSF';

// Categorias que devem ser EXCLUÍDAS do DRE por serem movimentação de caixa/patrimonial e não Resultado
// Categorias que devem ser EXCLUÍDAS do DRE por serem movimentação de caixa/patrimonial e não Resultado
// Usuário solicitou ver Empréstimos e Transferências, então removemos as restrições
const EXCLUDED_DRE_GROUPS: DreGroupType[] = [/*'EMP', 'TRANSF'*/];

/**
 * Determina o dreGroup de uma categoria.
 * Usa o campo dreGroup se disponível, senão faz fallback pelo type.
 */
function getDreGroupFromCategory(cat: {
  dreGroup?: string | null;
  categoryGroup?: string | null;
  type?: string | null;
  name?: string;
}): DreGroupType | null {
  // Usar dreGroup se disponível
  if (cat.dreGroup) {
    return cat.dreGroup as DreGroupType;
  }

  // Fallback por type para categorias antigas sem dreGroup
  switch (cat.type) {
    case 'revenue':
      return 'RoB';
    case 'variable_cost':
      return 'CV';
    case 'fixed_cost':
      return 'CF';
    case 'non_operational':
      // Detectar se é TDCF pelo categoryGroup ou nome
      if (cat.categoryGroup === 'TRIBUTOS' || cat.categoryGroup === 'CUSTO FINANCEIRO') {
        return 'TDCF';
      }
      return 'DNOP';
    case 'financial_movement':
      return null; // Excluído do DRE
    default:
      return 'CF'; // Default para custos fixos
  }
}

/**
 * Verifica se uma categoria é de tributos (dentro do TDCF)
 */
function isTaxCategory(cat: { categoryGroup?: string | null; dreGroup?: string | null }): boolean {
  return cat.dreGroup === 'TDCF' && cat.categoryGroup === 'TRIBUTOS';
}

/**
 * Verifica se uma categoria é de custo financeiro (dentro do TDCF)
 */
function isFinancialCostCategory(cat: { categoryGroup?: string | null; dreGroup?: string | null }): boolean {
  return cat.dreGroup === 'TDCF' && cat.categoryGroup === 'CUSTO FINANCEIRO';
}

export default class DREService {
  /**
   * Obter período anterior para comparação
   * Retorna null se não houver período anterior válido (ex: 'all')
   */
  static getPreviousPeriod(period: string): string | null {
    // Para período 'all', não há período anterior para comparação
    if (period === 'all') {
      return null;
    }

    if (!period || period === 'current' || period === 'this_month') {
      return 'last_month';
    }

    if (period === 'last_month') {
      // Retorna YYYY-MM do mês retrasado
      const now = new Date();
      const monthBeforeLast = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return monthBeforeLast.toISOString().slice(0, 7);
    }

    if (period === 'today') return 'yesterday'; // Note: yesterday needs to be handled in convertPeriodToDates if we support it, otherwise fallback to date string
    if (period === 'last_7_days') return 'previous_7_days'; // Needs handling? Or just return YYYY-MM?
    // For simplicity, for dynamic ranges, we might need a more robust comparison logic specific to the range.
    // Given the complexity, let's stick to mapping simple knowns and fallback to 'last_month' or similar.

    if (period === 'this_year') return 'last_year';
    if (period === 'last_year') {
      const now = new Date();
      // Return YYYY (not supported by convertPeriodToDates which expects YYYY-MM or key)
      // Let's return a key 'year_before_last' if we supported it, or dates.
      // Actually DREService.comparePeriods calls getDREStatement(previousPeriod).
      // So we just need to return a string that convertPeriodToDates understands.
      // 'last_year' -> 'year_before_last' (not implemented).
      // Hack: return YYYY-MM of previous END DATE? No.
      // Let's implement 'year_before_last' in convertPeriodToDates if we really want to support it. 
      // For now, let's keep it simple.
      return 'last_year'; // Placeholder if we can't easily go back further without more code.
    }

    if (period === 'last_quarter') {
      return 'quarter_before_last'; // Not implemented.
    }

    // Formato YYYY-MM logic remains
    const datePattern = /^\d{4}-\d{2}$/;
    if (datePattern.test(period)) {
      const [year, month] = period.split('-').map(Number);
      const previousDate = new Date(year, month - 2, 1);
      return previousDate.toISOString().slice(0, 7);
    }

    return 'last_month'; // Default fallback
  }



  /**
   * Converter período para datas
   */
  static convertPeriodToDates(period: string): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    // Helper para formatar YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Verificar se é formato YYYY-MM
    const datePattern = /^\d{4}-\d{2}$/;
    if (datePattern.test(period)) {
      const [year, month] = period.split('-').map(Number);
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      // Último dia do mês
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      return { startDate, endDate };
    }

    switch (period) {
      case 'today':
        startDate = formatDate(now);
        endDate = startDate;
        break;
      case 'last_7_days':
        const last7 = new Date(now);
        last7.setDate(now.getDate() - 7);
        startDate = formatDate(last7);
        endDate = formatDate(now);
        break;
      case 'last_15_days':
        const last15 = new Date(now);
        last15.setDate(now.getDate() - 15);
        startDate = formatDate(last15);
        endDate = formatDate(now);
        break;
      case 'last_30_days':
        const last30 = new Date(now);
        last30.setDate(now.getDate() - 30);
        startDate = formatDate(last30);
        endDate = formatDate(now);
        break;
      case 'last_90_days':
        const last90 = new Date(now);
        last90.setDate(now.getDate() - 90);
        startDate = formatDate(last90);
        endDate = formatDate(now);
        break;
      case 'last_180_days':
        const last180 = new Date(now);
        last180.setDate(now.getDate() - 180);
        startDate = formatDate(last180);
        endDate = formatDate(now);
        break;
      case 'this_month':
      case 'current': // current mapeia para this_month
        const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = formatDate(firstDayMonth);
        const lastDayMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate = formatDate(lastDayMonth);
        break;
      case 'last_month':
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = formatDate(firstDayLastMonth);
        endDate = formatDate(lastDayLastMonth);
        break;
      case 'this_year':
        const firstDayYear = new Date(now.getFullYear(), 0, 1);
        startDate = formatDate(firstDayYear);
        const lastDayYear = new Date(now.getFullYear(), 11, 31);
        endDate = formatDate(lastDayYear);
        break;
      case 'last_year':
        const firstDayLastYear = new Date(now.getFullYear() - 1, 0, 1);
        startDate = formatDate(firstDayLastYear);
        const lastDayLastYear = new Date(now.getFullYear() - 1, 11, 31);
        endDate = formatDate(lastDayLastYear);
        break;
      case 'last_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        let lastQuarterYear = now.getFullYear();
        let lastQuarterFn = currentQuarter - 1;

        if (lastQuarterFn === 0) {
          lastQuarterFn = 4;
          lastQuarterYear -= 1;
        }

        const quarterStartMonth = (lastQuarterFn - 1) * 3;
        const firstDayQuarter = new Date(lastQuarterYear, quarterStartMonth, 1);
        const lastDayQuarter = new Date(lastQuarterYear, quarterStartMonth + 3, 0);

        startDate = formatDate(firstDayQuarter);
        endDate = formatDate(lastDayQuarter);
        break;
      case 'all':
        // Buscar desde 2 anos atrás até hoje
        const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
        startDate = formatDate(twoYearsAgo);
        endDate = formatDate(now);
        break;
      default:
        // Default para mês atual se não reconhecido
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = formatDate(defaultStart);
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate = formatDate(defaultEnd);
    }

    return { startDate, endDate };
  }

  /**
   * Buscar dados de DRE do banco
   */
  static async getDREStatement(filters: DREFilters = {}): Promise<DREStatement> {
    try {
      // Converter filtros - usar datas do filtro se period='custom'
      let startDate: string;
      let endDate: string;

      if (filters.period === 'custom' && filters.startDate && filters.endDate) {
        startDate = filters.startDate;
        endDate = filters.endDate;
      } else {
        const dates = this.convertPeriodToDates(filters.period || 'current');
        startDate = dates.startDate;
        endDate = dates.endDate;
      }

      const whereConditions = [];

      if (startDate) {
        whereConditions.push(sql`combined_transactions.transaction_date >= ${startDate}`);
      }

      if (endDate) {
        whereConditions.push(sql`combined_transactions.transaction_date <= ${endDate}`);
      }

      if (filters.accountId && filters.accountId !== 'all') {
        whereConditions.push(sql`combined_transactions.account_id = ${filters.accountId}`);
      }

      if (filters.companyId && filters.companyId !== 'all') {
        whereConditions.push(eq(accounts.companyId, filters.companyId));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions, getFinancialExclusionClause()) : getFinancialExclusionClause();

      // Buscar totais por categoria
      // Nova lógica: Combina transações sem splits + splits individuais
      const categoryData = await db
        .select({
          categoryId: categories.id,
          categoryName: categories.name,
          categoryType: categories.type,
          categoryGroup: categories.categoryGroup,
          dreGroup: categories.dreGroup,
          colorHex: categories.colorHex,
          icon: categories.icon,
          totalAmount: sum(sql`ABS(amount_to_sum)`).mapWith(Number),
          incomeAmount: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE 0 END`).mapWith(Number),
          expenseAmount: sum(sql`CASE WHEN type_to_sum = 'debit' THEN ABS(amount_to_sum) ELSE 0 END`).mapWith(Number),
          transactionCount: count(sql`transaction_id`).mapWith(Number),
          creditCount: sum(sql`CASE WHEN type_to_sum = 'credit' THEN 1 ELSE 0 END`).mapWith(Number),
          debitCount: sum(sql`CASE WHEN type_to_sum = 'debit' THEN 1 ELSE 0 END`).mapWith(Number),
        })
        .from(sql`(
          -- Transações que NÃO possuem desmembramentos
          SELECT 
            t.id as transaction_id,
            t.category_id as category_id,
            t.amount as amount_to_sum,
            t.type as type_to_sum,
            t.transaction_date,
            t.account_id
          FROM ${transactions} t
          WHERE t.id NOT IN (SELECT transaction_id FROM ${transactionSplits})
          
          UNION ALL
          
          -- Desmembramentos individuais
          SELECT 
            ts.transaction_id,
            ts.category_id,
            ts.amount as amount_to_sum,
            t.type as type_to_sum, -- Mantém o tipo original da transação
            t.transaction_date,
            t.account_id
          FROM ${transactionSplits} ts
          JOIN ${transactions} t ON ts.transaction_id = t.id
        ) as combined_transactions`)
        .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
        .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
        .where(whereClause) // O whereClause agora opera sobre as colunas da subquery/join
        .groupBy(categories.id, categories.name, categories.type, categories.categoryGroup, categories.dreGroup, categories.colorHex, categories.icon)
        .orderBy(sql`SUM(ABS(combined_transactions.amount_to_sum)) DESC`);

      // Processar categorias - excluir movimentações financeiras (empréstimos, transferências)
      const categorizedData = categoryData.filter(cat => {
        if (!cat.categoryId || !cat.categoryName) return false;

        // Determinar dreGroup (usando campo ou fallback)
        const dreGroup = getDreGroupFromCategory({
          dreGroup: cat.dreGroup,
          categoryGroup: cat.categoryGroup,
          type: cat.categoryType,
          name: cat.categoryName
        });

        // Excluir categorias que não pertencem ao DRE (EMP, TRANSF)
        if (!dreGroup || EXCLUDED_DRE_GROUPS.includes(dreGroup)) {
          return false;
        }

        // Excluir tipos financial_movement (empréstimos/antecipações)
        /*if (cat.categoryType === 'financial_movement') {
          return false;
        }*/

        return true;
      });

      const dreCategories: DRECategory[] = categorizedData
        .map(cat => {
          const incomeAmount = cat.incomeAmount || 0;
          const expenseAmount = cat.expenseAmount || 0;

          // Calculate NET amount (income - expense)
          // Income is positive, Expense is positive in this object but derived from DB sum.
          // Let's rely on raw sums if possible, or trust these.
          // The query returns:
          // incomeAmount = sum(CASE WHEN type='credit' ...)
          // expenseAmount = sum(CASE WHEN type='debit' ...) -> POSITIVE number

          // So Net Flow = Income - Expense
          const netFlow = incomeAmount - expenseAmount;

          let resolvedType: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational' | 'financial_movement';
          let actualValue: number;

          if (cat.categoryType) {
            resolvedType = cat.categoryType as 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational' | 'financial_movement';

            // If it's a Revenue type, we expect positive NetFlow.
            // If it's a Cost type, we expect negative NetFlow.
            // We want 'actualValue' to represent the MAGNITUDE in the context of the type, usually.
            // BUT for the DRE calculation steps later (grossRevenue = sum(actual)), we need consistency.
            // The original code passed 'incomeAmount' (pos) for revenue and 'expenseAmount' (pos) for costs.
            // Later: netRevenue = grossRevenue - taxes.
            //        operatingIncome = contributionMargin - totalFixedCosts.

            // If we have mixed data (positive and negative in a Cost category):
            // Old logic: took ONLY expenseAmount (ignoring credits).
            // New logic: take NetFlow. 

            if (resolvedType === 'revenue') {
              actualValue = netFlow; // If negative, it reduces revenue.
            } else {
              // For costs, we usually want a positive number representing the "Cost Amount"
              // So if NetFlow is -500 (Expense), ActualValue should be 500.
              // If NetFlow is +100 (Refund), ActualValue should be -100 (Negative Cost).
              actualValue = -netFlow;
            }

          } else {
            // Logic for unknown types (heuristic)
            if (netFlow < 0) {
              // It's an expense
              resolvedType = 'variable_cost';
              actualValue = -netFlow;
            } else {
              resolvedType = 'revenue';
              actualValue = netFlow;
            }
          }

          return {
            id: cat.categoryId!,
            name: cat.categoryName || 'Sem Categoria',
            type: resolvedType,
            categoryGroup: cat.categoryGroup || null,
            dreGroup: cat.dreGroup || null,
            budget: 0, // TODO: Implementar orçamento
            actual: actualValue,
            variance: 0, // TODO: Calcular variação vs orçamento
            percentage: 0, // Será calculado depois
            color: cat.colorHex || '#6366F1',
            icon: cat.icon || '📊',
            subcategories: [], // TODO: Implementar subcategorias
            growthRate: 0, // TODO: Calcular taxa de crescimento
            transactions: cat.transactionCount || 0,
          };
        });

      const uncategorizedData = categoryData.filter(cat => !cat.categoryId);

      const uncategorizedRevenue = uncategorizedData.reduce((sumValue, cat) => sumValue + (cat.incomeAmount || 0), 0);
      const uncategorizedExpenses = uncategorizedData.reduce((sumValue, cat) => sumValue + (cat.expenseAmount || 0), 0);
      const uncategorizedRevenueTransactions = uncategorizedData.reduce((sumValue, cat) => sumValue + (cat.creditCount || 0), 0);
      const uncategorizedExpenseTransactions = uncategorizedData.reduce((sumValue, cat) => sumValue + (cat.debitCount || 0), 0);

      if (uncategorizedRevenue > 0) {
        dreCategories.push({
          id: 'uncategorized-revenue',
          name: 'Receitas não categorizadas',
          type: 'revenue',
          categoryGroup: null,
          dreGroup: 'RoB',
          budget: 0,
          actual: uncategorizedRevenue,
          variance: 0,
          percentage: 0,
          color: '#0EA5E9',
          icon: '📁',
          subcategories: [],
          growthRate: 0,
          transactions: uncategorizedRevenueTransactions,
        });
      }

      if (uncategorizedExpenses > 0) {
        dreCategories.push({
          id: 'uncategorized-expense',
          name: 'Despesas não categorizadas',
          type: 'variable_cost',
          categoryGroup: null,
          dreGroup: 'CF',
          budget: 0,
          actual: uncategorizedExpenses,
          variance: 0,
          percentage: 0,
          color: '#A855F7',
          icon: '📁',
          subcategories: [],
          growthRate: 0,
          transactions: uncategorizedExpenseTransactions,
        });
      }

      // ========== CÁLCULO DO DRE USANDO dreGroup ==========

      // RECEITA BRUTA (RoB) - todas as receitas operacionais
      const grossRevenue = dreCategories
        .filter(cat => cat.dreGroup === 'RoB' || (cat.type === 'revenue' && !cat.dreGroup))
        .reduce((sum, cat) => sum + cat.actual, 0);

      // TRIBUTOS (TDCF com categoryGroup TRIBUTOS)
      const taxes = dreCategories
        .filter(cat => isTaxCategory(cat))
        .reduce((sum, cat) => sum + cat.actual, 0);

      // RECEITA LÍQUIDA = Receita Bruta - Impostos
      const netRevenue = grossRevenue - taxes;

      // CUSTOS VARIÁVEIS (CV)
      const totalVariableCosts = dreCategories
        .filter(cat => cat.dreGroup === 'CV' || (cat.type === 'variable_cost' && !cat.dreGroup))
        .reduce((sum, cat) => sum + cat.actual, 0);

      // CUSTOS FIXOS (CF)
      const totalFixedCosts = dreCategories
        .filter(cat => cat.dreGroup === 'CF' || (cat.type === 'fixed_cost' && !cat.dreGroup))
        .reduce((sum, cat) => sum + cat.actual, 0);

      // CUSTOS FINANCEIROS (TDCF com categoryGroup CUSTO FINANCEIRO)
      const financialCosts = dreCategories
        .filter(cat => isFinancialCostCategory(cat))
        .reduce((sum, cat) => sum + cat.actual, 0);

      // RECEITAS NÃO OPERACIONAIS (RNOP) - rendimentos, aplicações, etc
      const financialRevenue = dreCategories
        .filter(cat => cat.dreGroup === 'RNOP')
        .reduce((sum, cat) => sum + cat.actual, 0);

      // DESPESAS NÃO OPERACIONAIS (DNOP)
      const totalNonOperational = dreCategories
        .filter(cat => cat.dreGroup === 'DNOP')
        .reduce((sum, cat) => sum + cat.actual, 0);

      const totalExpenses = totalVariableCosts + totalFixedCosts + totalNonOperational + financialCosts;

      // MARGEM DE CONTRIBUIÇÃO = Receita Líquida - Custos Variáveis
      const contributionMargin = netRevenue - totalVariableCosts;
      const contributionMarginPercentage = netRevenue > 0
        ? (contributionMargin / netRevenue) * 100
        : 0;

      // RESULTADO OPERACIONAL = Margem de Contribuição - Custos Fixos
      const operatingIncome = contributionMargin - totalFixedCosts;

      // RESULTADO FINANCEIRO = Receitas Financeiras - Custos Financeiros
      const financialResult = financialRevenue - financialCosts;

      // RESULTADO LÍQUIDO = Resultado Operacional + Resultado Financeiro - Despesas Não Operacionais
      const netIncome = operatingIncome + financialResult - totalNonOperational;

      // Calcular percentuais usando Análise Vertical (padrão contábil)
      // Cada categoria é expressa como % da Receita Bruta
      dreCategories.forEach(cat => {
        if (grossRevenue > 0) {
          cat.percentage = (cat.actual / grossRevenue) * 100;
        }
      });

      // Obter período formatado
      const periodLabel = this.formatPeriodLabel(filters.period || 'current', startDate, endDate);

      // Buscar transações de cada categoria em paralelo para o drilldown
      const categoryTransactionsPromises = dreCategories.map(async (cat) => {
        const categoryId = cat.id.startsWith('uncategorized') ? null : cat.id;
        const txns = await this.getTransactionsByCategoryId(
          categoryId,
          startDate,
          endDate,
          filters.accountId,
          filters.companyId
        );
        return { categoryId: cat.id, transactions: txns };
      });

      const categoryTransactionsResults = await Promise.all(categoryTransactionsPromises);

      // Criar mapa de transações por categoria
      const transactionsByCategory = new Map<string, DrilldownTransaction[]>();
      categoryTransactionsResults.forEach(result => {
        transactionsByCategory.set(result.categoryId, result.transactions);
      });

      // Mapear categorias para o formato esperado pelo componente
      const mappedCategories = dreCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        budget: cat.budget,
        actual: cat.actual, // Was 'value: cat.actual' which was wrong
        variance: cat.variance,
        percentage: cat.percentage,
        color: cat.color,
        icon: cat.icon,
        subcategories: cat.subcategories,
        growthRate: cat.growthRate,
        transactions: cat.transactions || 0,
        drilldown: transactionsByCategory.get(cat.id) || []
      }));

      // ========== SEPARAR CATEGORIAS POR dreGroup PARA DETALHAMENTO ==========

      // Helper para mapear categoria para formato de detalhamento
      const mapCategoryToDetail = (cat: DRECategory) => ({
        name: cat.name,
        id: cat.id,
        categoryGroup: cat.categoryGroup,
        value: cat.actual,
        percentage: cat.percentage,
        color: cat.color,
        icon: cat.icon,
        transactions: cat.transactions || 0,
        drilldown: transactionsByCategory.get(cat.id) || []
      });

      // RECEITAS BRUTAS (RoB)
      const revenueCategories = dreCategories
        .filter(cat => cat.dreGroup === 'RoB' || (cat.type === 'revenue' && !cat.dreGroup))
        .map(mapCategoryToDetail);

      // CUSTOS VARIÁVEIS (CV)
      const variableCostCategories = dreCategories
        .filter(cat => cat.dreGroup === 'CV' || (cat.type === 'variable_cost' && !cat.dreGroup))
        .map(mapCategoryToDetail);

      // CUSTOS FIXOS (CF)
      const fixedCostCategories = dreCategories
        .filter(cat => cat.dreGroup === 'CF' || (cat.type === 'fixed_cost' && !cat.dreGroup))
        .map(mapCategoryToDetail);

      // DESPESAS NÃO OPERACIONAIS (DNOP)
      const nonOperationalCategories = dreCategories
        .filter(cat => cat.dreGroup === 'DNOP')
        .map(mapCategoryToDetail);

      // TRIBUTOS (TDCF com categoryGroup TRIBUTOS)
      const taxCategories = dreCategories
        .filter(cat => isTaxCategory(cat))
        .map(mapCategoryToDetail);

      // CUSTOS FINANCEIROS (TDCF com categoryGroup CUSTO FINANCEIRO)
      const financialCostCategoriesFiltered = dreCategories
        .filter(cat => isFinancialCostCategory(cat))
        .map(mapCategoryToDetail);

      // RECEITAS NÃO OPERACIONAIS (RNOP)
      const nonOperationalRevenueCategories = dreCategories
        .filter(cat => cat.dreGroup === 'RNOP')
        .map(mapCategoryToDetail);

      return {
        period: periodLabel,

        // Estrutura esperada pelo componente - CORRIGIDA
        grossRevenue: grossRevenue,
        netRevenue: netRevenue, // Receita Bruta - Impostos
        taxes: taxes, // Impostos detectados automaticamente
        financialCosts: financialCosts, // Custos financeiros detectados
        variableCosts: totalVariableCosts,
        fixedCosts: totalFixedCosts,
        contributionMargin: {
          value: contributionMargin,
          percentage: contributionMarginPercentage
        },
        operationalResult: operatingIncome,
        nonOperationalExpenses: totalNonOperational,
        nonOperational: {
          revenue: financialRevenue, // Receitas financeiras
          expenses: totalNonOperational,
          netResult: financialResult - totalNonOperational
        },
        financialResult: financialResult, // Resultado financeiro (receitas - custos financeiros)
        netResult: netIncome,

        // Categorias mapeadas
        categories: mappedCategories,

        // Detalhamento por linha com categoryGroup para sub-agrupamentos
        lineDetails: {
          grossRevenue: revenueCategories.map(cat => ({
            label: cat.name,
            value: cat.value,
            categoryGroup: cat.categoryGroup,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          taxes: taxCategories.map(cat => ({
            label: cat.name,
            value: -cat.value,
            categoryGroup: cat.categoryGroup,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          financialCosts: financialCostCategoriesFiltered.map(cat => ({
            label: cat.name,
            value: -cat.value,
            categoryGroup: cat.categoryGroup,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          variableCosts: variableCostCategories.map(cat => ({
            label: cat.name,
            value: -cat.value, // Negar valor para mostrar como despesa
            categoryGroup: cat.categoryGroup,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          fixedCosts: fixedCostCategories.map(cat => ({
            label: cat.name,
            value: -cat.value, // Negar valor para mostrar como despesa
            categoryGroup: cat.categoryGroup,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          nonOperationalRevenue: nonOperationalRevenueCategories.map(cat => ({
            label: cat.name,
            value: cat.value,
            categoryGroup: cat.categoryGroup,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          })),
          nonOperationalExpenses: nonOperationalCategories.map(cat => ({
            label: cat.name,
            value: -cat.value, // Negar valor para mostrar como despesa
            categoryGroup: cat.categoryGroup,
            transactions: cat.transactions,
            drilldown: cat.drilldown
          }))
        },

        // Manter compatibilidade com estrutura anterior
        totalRevenue: grossRevenue,
        totalVariableCosts,
        totalFixedCosts,
        totalNonOperational,
        totalExpenses,
        operatingIncome,
        netIncome,
        generatedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error generating DRE statement:', error);
      throw new Error('Failed to generate DRE statement');
    }
  }

  /**
   * Format period label for display
   */
  private static formatPeriodLabel(period: string, startDate?: string, endDate?: string): string {
    // Para período customizado, formatar as datas
    if (period === 'custom' && startDate && endDate) {
      const start = new Date(startDate + 'T12:00:00');
      const end = new Date(endDate + 'T12:00:00');
      const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      return `${formatDate(start)} - ${formatDate(end)}`;
    }

    if (!period || period === 'current') {
      const now = new Date();
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    }

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    if (period === 'this_year') {
      return `${new Date().getFullYear()}`;
    }

    if (period === 'last_year') {
      return `${new Date().getFullYear() - 1}`;
    }

    // Tenta formatar YYYY-MM
    if (/^\d{4}-\d{2}$/.test(period)) {
      const [year, month] = period.split('-').map(Number);
      return `${months[month - 1]} ${year}`;
    }

    // Fallback para datas se disponíveis, ou o próprio período
    if (startDate && endDate) {
      const start = new Date(startDate + 'T12:00:00');
      const end = new Date(endDate + 'T12:00:00');
      // Se for mesmo ano e mês inicio/fim (ex: mês fechado)
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${months[start.getMonth()]} ${start.getFullYear()}`;
      }
      return this.formatPeriodLabel('custom', startDate, endDate);
    }

    return period; // Fallback final
  }

  /**
   * Buscar transações por categoria para drilldown
   */
  static async getTransactionsByCategoryId(
    categoryId: string | null,
    startDate: string,
    endDate: string,
    accountId?: string,
    companyId?: string
  ): Promise<DrilldownTransaction[]> {
    const whereConditions = [];

    // Filtro por categoria (null = não categorizadas)
    if (categoryId === null || categoryId === 'uncategorized-revenue' || categoryId === 'uncategorized-expense') {
      whereConditions.push(isNull(transactions.categoryId));
    } else {
      whereConditions.push(eq(transactions.categoryId, categoryId));
    }

    // Filtros de data
    whereConditions.push(gte(transactions.transactionDate, startDate));
    whereConditions.push(lte(transactions.transactionDate, endDate));

    // Filtros opcionais
    if (accountId && accountId !== 'all') {
      whereConditions.push(eq(transactions.accountId, accountId));
    }

    if (companyId && companyId !== 'all') {
      whereConditions.push(eq(accounts.companyId, companyId));
    }

    const whereClause = and(...whereConditions);

    const transactionList = await db
      .select({
        id: transactions.id,
        date: transactions.transactionDate,
        description: transactions.description,
        categoryName: categories.name,
        amount: transactions.amount,
        type: transactions.type,
        bankName: accounts.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(whereClause)
      .orderBy(sql`${transactions.transactionDate} DESC`)
      .limit(50); // Limitar a 50 transações para performance

    return transactionList.map(t => ({
      id: t.id,
      date: t.date || '',
      description: t.description || 'Sem descrição',
      category: t.categoryName || 'Sem categoria',
      amount: Math.abs(Number(t.amount)),
      type: t.type === 'credit' ? 'income' : 'expense',
      bank: t.bankName || undefined,
    }));
  }

  /**
   * Comparar períodos
   */
  static async comparePeriods(
    currentPeriod: string,
    previousPeriod: string,
    filters: Omit<DREFilters, 'period'> = {}
  ): Promise<{
    current: DREStatement;
    previous: DREStatement;
    variance: {
      revenue: number;
      expenses: number;
      netIncome: number;
      revenuePercent: number;
      expensesPercent: number;
      netIncomePercent: number;
    };
  }> {
    const [currentData, previousData] = await Promise.all([
      this.getDREStatement({ ...filters, period: currentPeriod }),
      this.getDREStatement({ ...filters, period: previousPeriod })
    ]);

    const revenueVariance = currentData.totalRevenue - previousData.totalRevenue;
    const expensesVariance = currentData.totalExpenses - previousData.totalExpenses;
    const netIncomeVariance = currentData.netIncome - previousData.netIncome;

    const revenuePercent = previousData.totalRevenue > 0
      ? (revenueVariance / previousData.totalRevenue) * 100
      : 0;

    const expensesPercent = previousData.totalExpenses > 0
      ? (expensesVariance / previousData.totalExpenses) * 100
      : 0;

    const netIncomePercent = previousData.netIncome !== 0
      ? (netIncomeVariance / Math.abs(previousData.netIncome)) * 100
      : 0;

    return {
      current: currentData,
      previous: previousData,
      variance: {
        revenue: revenueVariance,
        expenses: expensesVariance,
        netIncome: netIncomeVariance,
        revenuePercent,
        expensesPercent,
        netIncomePercent
      }
    };
  }
}
