import { categories } from '@/lib/db/schema';
import { not, ilike, and, or, isNull } from 'drizzle-orm';

/**
 * Retorna a cláusula SQL para excluir transações que não devem afetar cálculos financeiros
 * (ex: Saldo Inicial, Transferências entre contas).
 *
 * Regras:
 * 1. MANTÉM transações sem categoria (uncategorized)
 * 2. Exclui categorias que contêm "Transferência" ou "Transferencia" (independente de maiúsculas/minúsculas)
 * 3. Exclui categorias que contêm "Saldo", EXCETO se contiverem termos seguros:
 *    - "Vinculada" (ex: Saldo Vinculada - geralmente Receita)
 *    - "Juros" (ex: Juros de Saldo - Receita Financeira)
 *    - "Rendimento" (ex: Rendimento de Saldo - Receita Financeira)
 */
export function getFinancialExclusionClause() {
    return or(
        // INCLUIR transações sem categoria (caso contrário o leftJoin + filtro mataria elas)
        isNull(categories.id),

        // Para transações COM categoria, aplicar as regras de exclusão:
        and(
            // Transferências AGORA SÃO PERMITIDAS a pedido do usuário
            // not(ilike(categories.name, '%Transferência%')),
            // not(ilike(categories.name, '%Transferencia%')),

            // Lógica para Saldo:
            // Mantém se NÃO tem "Saldo" OU se tem "Saldo" mas acompanhado de termos seguros
            or(
                // Se NÃO tem "Saldo" no nome, mantém (maioria das categorias)
                not(ilike(categories.name, '%Saldo%')),

                // Exceções seguras que PODEM ter "Saldo" no nome mas são receitas/despesas reais
                ilike(categories.name, '%Vinculada%'),
                ilike(categories.name, '%Juros%'),
                ilike(categories.name, '%Rendimento%')
            )
        )
    );
}
