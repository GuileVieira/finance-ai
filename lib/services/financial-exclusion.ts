import { categories, transactions } from '@/lib/db/schema';
import { not, ilike, and, or, isNull, eq } from 'drizzle-orm';

/**
 * Retorna a cláusula SQL para excluir transações que não devem afetar cálculos financeiros
 * (ex: Saldo Inicial, Transferências entre contas).
 *
 * Regras:
 * 1. MANTÉM transações sem categoria (uncategorized)
 * 2. Exclui categorias que contêm "Saldo", EXCETO se contiverem termos seguros:
 *    - "Vinculada" (ex: Saldo Vinculada - geralmente Receita)
 *    - "Juros" (ex: Juros de Saldo - Receita Financeira)
 *    - "Rendimento" (ex: Rendimento de Saldo - Receita Financeira)
 * 3. Exclui transações cuja descrição contêm termos de "Saldo" ( snapshots bancários)
 */
/**
 * Cláusula de exclusão SOMENTE para Categorias
 * Útil para listar categorias sem depender da tabela de transações
 */
export function getCategoryExclusionClause() {
    return or(
        // INCLUIR transações sem categoria (null categories são tratadas no LEFT JOIN como null)
        // Mas se estamos filtrando a TABELA de categorias, queremos as que:
        // 1. São visíveis (is_ignored = false)
        // 2. Estão ativas (active = true)
        // 3. Fallback de nome (sem Saldo/etc)
        
        // OBS: Se for query direta na tabela categorias, isNull(categories.id) nunca será true para um registro existente.
        // Mas em um JOIN, pode ser.
        
        and(
            // A categoria DEVE estar ativa
            eq(categories.active, true),

            // Se isIgnored estiver marcado, EXCLUI
            eq(categories.isIgnored, false),

            // Lógica legada para Saldo em categorias (como fallback de segurança):
            or(
                // Se NÃO tem "Saldo" no nome, mantém
                not(ilike(categories.name, '%Saldo%')),

                // Exceções seguras (categorias que representam resultado real)
                ilike(categories.name, '%Vinculada%'),
                ilike(categories.name, '%Juros%'),
                ilike(categories.name, '%Rendimento%')
            )
        )
    );
}

/**
 * Cláusula de exclusão SOMENTE para Descrição de Transações
 * Útil para filtrar snapshots de saldo
 */
export function getTransactionDescriptionExclusionClause(descriptionCol: any = transactions.description) {
    return and(
        not(ilike(descriptionCol, '%SALDO TOTAL%')),
        not(ilike(descriptionCol, '%SALDO DISPONIVEL%')),
        not(ilike(descriptionCol, '%SALDO DO DIA%')),
        not(ilike(descriptionCol, '%SALDO EM%')),
        not(ilike(descriptionCol, '%S A L D O%'))
    );
}

/**
 * Retorna a cláusula SQL para excluir transações que não devem afetar cálculos financeiros
 * (ex: Saldo Inicial, Transferências entre contas).
 * COMBINA regras de Categoria e Descrição.
 * 
 * Requer que ambas as tabelas (categories e transactions) estejam no contexto da query (JOIN).
 */
export function getFinancialExclusionClause(options: { descriptionColumn?: any } = {}) {
    const descriptionCol = options.descriptionColumn || transactions.description;
    
    return and(
        or(
             // Permite NULL category (transação sem categoria conta no financeiro? Geralmente sim, como Despesa/Receita a classificar)
             isNull(categories.id),
             getCategoryExclusionClause()
        ),
        getTransactionDescriptionExclusionClause(descriptionCol)
    );
}
