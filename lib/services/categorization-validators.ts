/**
 * Categorization Validators
 * 
 * Regras invioláveis de negócio para garantir a integridade do DRE.
 * Impede que transações sejam categorizadas de forma contábil impossível.
 */

import { TransactionContext } from './rule-scoring.service';
import { CategorizationResult } from './transaction-categorization.service';
import { MovementType } from './movement-type.service';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface CategoryMetadata {
  type: string;        // revenue, variable_cost, fixed_cost, etc.
  dreGroup?: string | null;   // RoB, CMV, DO, etc.
  isIgnored?: boolean | null;
}

export class CategorizationValidators {
  /**
   * Valida se a categoria proposta é contabilmente aceitável para a transação
   */
  static validate(
    context: TransactionContext,
    result: CategorizationResult,
    category: CategoryMetadata
  ): ValidationResult {
    const amount = context.amount || 0;
    const movementType = result.movementType as MovementType;
    const isEstorno = this.isEstorno(context.description);
    const isCredit = amount >= 0;

    // 1. Validação de Sinal vs Tipo de Categoria
    // Receitas devem ter valor positivo (entrada), Despesas valor negativo (saída)
    // Exceção: Estornos/Deduções podem ter sinal invertido da natureza base
    
    // Bloquear Despesa com valor Positivo (Entrada classificada como despesa)
    if (amount > 0 && this.isExpenseType(category.type)) {
      // Estornos e deduções são exceções válidas
      if (movementType !== 'deducao' && movementType !== 'transferencia_interna' && !isEstorno) {
        return {
          isValid: false,
          reason: `Erro Contábil: Categoria de Despesa (${category.type}) atribuída a uma entrada de dinheiro (Crédito R$ ${amount}).`
        };
      }
    }

    // Bloquear Receita com valor Negativo (Saída classificada como receita)
    if (amount < 0 && this.isRevenueType(category.type)) {
      if (movementType !== 'deducao' && !isEstorno) {
        return {
          isValid: false,
          reason: `Erro Contábil: Categoria de Receita (${category.type}) atribuída a uma saída de dinheiro (Débito R$ ${amount}).`
        };
      }
    }

    // 1b. [PR3] Validação de Sinal vs dreGroup (complementa a validação por type)
    // Captura violações que passam pelo type mas são visíveis no dreGroup
    if (category.dreGroup) {
      // Receita Bruta (RoB) DEVE ser Crédito
      if (category.dreGroup === 'RoB' && !isCredit && !isEstorno) {
        return {
          isValid: false,
          reason: `Erro Contábil: Categoria de Receita (dreGroup=${category.dreGroup}) atribuída a uma saída de dinheiro (Débito).`
        };
      }

      // Custos e Despesas (CV, CF, DNOP) DEVEM ser Débito
      const isExpenseDreGroup = ['CV', 'CF', 'DNOP'].includes(category.dreGroup);
      if (isExpenseDreGroup && isCredit && !isEstorno) {
        // Exceção: movementType dedução ou transferência
        if (movementType !== 'deducao' && movementType !== 'transferencia_interna') {
          return {
            isValid: false,
            reason: `Erro Contábil: Categoria de Despesa (dreGroup=${category.dreGroup}) atribuída a uma entrada de dinheiro (Crédito).`
          };
        }
      }
    }

    // 2. Transferência Interna não pode afetar DRE Operacional
    if (movementType === 'transferencia_interna') {
      if (this.isOperatingresultGroup(category.dreGroup)) {
        return {
          isValid: false,
          reason: `Transferência Interna não pode ser alocada em grupos de resultado operacional (${category.dreGroup}). Deve ser TRANSF ou neutro.`
        };
      }
    }

    // 3. Empréstimos/Financeiro não pode ser Receita Operacional
    if (movementType === 'financeiro' || movementType === 'investimento') {
      if (category.dreGroup === 'RoB') {
        return {
          isValid: false,
          reason: `Movimentação Financeira/Investimento não pode ser Receita Operacional Bruta.`
        };
      }
    }

    // 4. Restrição de Tipos por Movimento (Whitelist)
    const allowedTypes = this.getValidCategoryTypes(movementType);
    if (allowedTypes.length > 0 && !allowedTypes.includes(category.type)) {
      return {
        isValid: false,
        reason: `Movimento '${movementType}' aceita apenas categorias dos tipos: ${allowedTypes.join(', ')}. Tipo encontrado: '${category.type}'.`
      };
    }

    return { isValid: true };
  }

  private static isExpenseType(type: string): boolean {
    return ['variable_cost', 'fixed_cost', 'expense', 'tax'].includes(type);
  }

  private static isRevenueType(type: string): boolean {
    return ['revenue', 'income'].includes(type);
  }

  /**
   * [PR3] Verifica se a descrição indica um estorno ou devolução.
   * Estornos têm sinal invertido da natureza base da categoria,
   * portanto são exceções válidas às regras de sinal×tipo.
   */
  private static isEstorno(description: string): boolean {
    const upper = description.toUpperCase();
    return upper.includes('ESTORNO') || upper.includes('DEVOLUCAO') || upper.includes('RESTITUICAO');
  }

  private static isOperatingresultGroup(group?: string | null): boolean {
    if (!group) return false;
    // Grupos que afetam o resultado operacional (RoB até EBIT)
    return ['RoB', 'TDCF', 'MP', 'CV', 'CF'].includes(group);
  }

  /**
   * Retorna lista de grupos de DRE proibidos para um dado tipo de movimento.
   * Usado para filtrar regras e evitar categorizações absurdas.
   */
  static getForbiddenCategoryGroups(movementType: MovementType): string[] {
    switch (movementType) {
      case 'financeiro':
      case 'investimento':
        // Financeiro não deve ser misturado com Operacional (EBITDA)
        return ['RoB', 'TDCF', 'MP', 'CV', 'CF'];
      
      case 'operacional_receita':
        // Receita Operacional não pode ser Custo ou Despesa Operacional
        return ['MP', 'CV', 'CF', 'DNOP'];

      case 'custo_direto':
      case 'despesa_operacional':
        // Despesa Operacional não pode ser Receita ou Financeiro
        return ['RoB', 'RNOP'];

      case 'transferencia_interna':
        // Transferência não afeta resultado (nem Op nem Fin)
        return ['RoB', 'TDCF', 'MP', 'CV', 'CF', 'RNOP', 'DNOP'];

      default:
        return [];
    }
  }

  /**
   * Retorna os tipos de categoria permitidos para um dado tipo de movimento.
   * Usado para filtrar candidatos antes mesmo da classificação.
   */
  static getValidCategoryTypes(movementType: MovementType): string[] {
    switch (movementType) {
      case 'operacional_receita':
        return ['revenue', 'income'];
      
      case 'deducao':
        return ['revenue', 'income', 'variable_cost', 'tax']; // Deduções podem ocorrer em receitas ou impostos
      
      case 'custo_direto':
      case 'despesa_operacional':
        return ['variable_cost', 'fixed_cost', 'expense', 'tax'];
      
      case 'financeiro':
        return ['fixed_cost', 'expense', 'revenue']; // Receita financeira ou Despesa financeira
      
      case 'investimento':
        return ['asset', 'equity', 'revenue']; // Investimento é ativo, mas rendimento é receita
      
      case 'nao_operacional':
        return ['revenue', 'expense'];
      
      case 'transferencia_interna':
        return ['transfer', 'internal'];
      
      default:
        return []; // Se não identificado, não restringe (ou restringe tudo, a decidir)
    }
  }
}
