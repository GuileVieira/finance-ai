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
export function getFinancialExclusionClause(options: { descriptionColumn?: any } = {}) {
    const descriptionCol = options.descriptionColumn || transactions.description;
    
    return and(
        // Lógica de Categorias
        or(
            // INCLUIR transações sem categoria
            isNull(categories.id),

            // Para transações COM categoria, aplicar as regras de exclusão:
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
        ),

        // Lógica de Descrição (Padrão automático para ignorar snapshots de saldo)
        // Isso atua como uma "segunda camada" caso a categorização falhe
        not(ilike(descriptionCol, '%SALDO TOTAL%')),
        not(ilike(descriptionCol, '%SALDO DISPONIVEL%')),
        not(ilike(descriptionCol, '%SALDO DO DIA%')),
        not(ilike(descriptionCol, '%SALDO EM%')),
        not(ilike(descriptionCol, '%S A L D O%'))
    );
}
