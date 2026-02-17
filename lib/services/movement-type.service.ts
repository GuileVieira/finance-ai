/**
 * Movement Type Service
 * 
 * Classifica a natureza da transação antes da categorização específica.
 * Essencial para garantir a integridade do DRE e restringir o pool de categorias.
 */

import { TransactionContext } from './rule-scoring.service';

export type MovementType = 
  | 'operacional_receita'
  | 'deducao'
  | 'custo_direto'
  | 'despesa_operacional'
  | 'financeiro'
  | 'nao_operacional'
  | 'investimento'
  | 'transferencia_interna';

export class MovementTypeService {
  /**
   * Classifica a transação em um dos tipos base de movimento
   */
  static classify(context: TransactionContext): MovementType {
    const description = context.description.toUpperCase();
    const memo = (context.memo || '').toUpperCase();
    const fullText = `${description} ${memo}`;
    const amount = context.amount || 0;

    // 1. Identificar Transferências Internas (Alta Prioridade)
    if (this.isInternalTransfer(fullText)) {
      return 'transferencia_interna';
    }

    // 2. Identificar Financeiro (Tarifas, Juros, Impostos Bancários)
    if (this.isFinancial(fullText)) {
      return 'financeiro';
    }

    // 3. Identificar Investimentos
    if (this.isInvestment(fullText)) {
      return 'investimento';
    }

    // 3.1 Identificar Empréstimos e Antecipações (Evitar que caiam em Receita Operacional)
    if (this.isLoan(fullText) || this.isAntecipation(fullText)) {
      return 'financeiro'; // Tratado como movimentação financeira
    }

    // 4. Classificação Base por Sinal (Heurística Inicial)
    if (amount > 0) {
      // Entradas são, por padrão, Receitas Operacionais exceto se identificadas como algo específico
      if (this.isNonOperationalRevenue(fullText)) {
        return 'nao_operacional';
      }
      return 'operacional_receita';
    } else {
      // Saídas
      if (this.isDeduction(fullText)) {
        return 'deducao';
      }
      
      // Heurística para Custo Direto (CMV/Serviços) vs Despesa Operacional
      // Geralmente custo direto tem termos de fornecedores ou matéria prima
      if (this.isDirectCost(fullText)) {
        return 'custo_direto';
      }

      // Default para saídas é Despesa Operacional
      return 'despesa_operacional';
    }
  }

  /**
   * Detecta termos de transferência interna
 * TODO: No futuro, cruzar com outras contas da mesma empresa
   */
  private static isInternalTransfer(text: string): boolean {
    const terms = [
      'TRANSFERENCIA ENTRE CONTAS',
      'TRANSF MESMA TITULARIDADE',
      'TED MESMA TITULARIDADE',
      'DOC MESMA TITULARIDADE',
      'PIX MESMA TITULARIDADE',
      'APLICACAO FINANCEIRA', // Muitas vezes tratado como transferência do caixa para investimento
      'RESGATE AUTOMATICO'
    ];
    return terms.some(term => text.includes(term));
  }

  /**
   * Detecta termos financeiros (bancos)
   */
  private static isFinancial(text: string): boolean {
    const terms = [
      'TARIFA BANCARIA',
      'IOF',
      'JUROS SOBRE',
      'MORA',
      'COMISSAO',
      'CUSTODIA',
      'MANUTENCAO DE CONTA'
    ];
    return terms.some(term => text.includes(term));
  }

  /**
   * Detecta termos de investimento
   */
  private static isInvestment(text: string): boolean {
    const terms = [
      'COMPRA DE ACOES',
      'RESGATE DE FUNDOS',
      'APLICACAO CDB',
      'INVESTIMENTO',
      'TESOURO DIRETO'
    ];
    return terms.some(term => text.includes(term));
  }

  /**
   * Detecta deduções de receita (Devoluções, estornos de venda)
   */
  private static isDeduction(text: string): boolean {
    const terms = [
      'ESTORNO DE VENDA',
      'DEVOLUCAO DE CLIENTE',
      'CANCELAMENTO DE Venda'
    ];
    return terms.some(term => text.includes(term.toUpperCase()));
  }

  /**
   * Detecta se é receita não operacional (Venda de ativo, etc)
   */
  private static isNonOperationalRevenue(text: string): boolean {
    const terms = [
      'VENDA DE ATIVO',
      'ALIENACAO DE BENS',
      'RESTITUICAO IRPJ'
    ];
    return terms.some(term => text.includes(term));
  }

  /**
   * Detecta custos diretos (Heurística baseada em termos comuns de insumos)
   */
  private static isDirectCost(text: string): boolean {
    const terms = [
      'FORNECEDOR',
      'COMPRA MATERIA PRIMA',
      'FRETE SOBRE COMPRA',
      'EMBALAGENS'
    ];
    return terms.some(term => text.includes(term));
  }

  /**
   * Detecta empréstimos (Entrada de Passivo)
   */
  private static isLoan(text: string): boolean {
    const terms = [
      'EMPRESTIMO',
      'FINANCIAMENTO',
      'CAPITAL DE GIRO',
      'PRONAMPE',
      'MUTUO',
      'FOMENTO'
    ];
    return terms.some(term => text.includes(term));
  }

  /**
   * Detecta antecipação de recebíveis (Operação Financeira)
   */
  private static isAntecipation(text: string): boolean {
    const terms = [
      'ANTECIPACAO',
      'DESCONTO DE DUPLICATA',
      'DESCONTO DE CHEQUE',
      'FACTORING'
    ];
    return terms.some(term => text.includes(term));
  }
}
