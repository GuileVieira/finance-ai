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

    // 1. Validação de Sinal vs Tipo de Categoria
    // Receitas devem ter valor positivo (entrada), Despesas valor negativo (saída)
    // Exceção: Estornos/Deduções podem ter sinal invertido da natureza base
    
    // Bloquear Despesa com valor Positivo (Entrada classificada como despesa)
    // A menos que seja um estorno de despesa (muito raro detectar auto, melhor revisar)
    if (amount > 0 && this.isExpenseType(category.type)) {
      // Se for identificado explicitamente como dedução ou estorno, OK.
      // Caso contrário, é erro grave (ex: entrada de dinheiro classificada como Custo Fixo)
      if (movementType !== 'deducao' && movementType !== 'transferencia_interna') {
        return {
          isValid: false,
          reason: `Entrada de valor (R$ ${amount}) não pode ser classificada como Despesa/Custo (${category.type}).`
        };
      }
    }

    // Bloquear Receita com valor Negativo (Saída classificada como receita)
    // Ex: Pagamento sendo classificado como Venda
    if (amount < 0 && this.isRevenueType(category.type)) {
      if (movementType !== 'deducao') {
        return {
          isValid: false,
          reason: `Saída de valor (R$ ${amount}) não pode ser classificada como Receita (${category.type}). Se for devolução, use uma categoria de Dedução.`
        };
      }
    }

    // 2. Transfêrencia Interna não pode afetar DRE Operacional
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
      if (category.dreGroup === 'RoB' || category.dreGroup === 'RL') {
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

  private static isOperatingresultGroup(group?: string | null): boolean {
    if (!group) return false;
    // Grupos que afetam o resultado operacional
    return ['RoB', 'CMV', 'CSP', 'DO', 'DA', 'DL'].includes(group);
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
