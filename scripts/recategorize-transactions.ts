/**
 * Script de Recategorização de Transações em Batch
 *
 * Identifica e recategoriza transações que podem ter sido
 * categorizadas incorretamente (ex: COMISSÕES como IMPOSTOS).
 *
 * Uso:
 *   pnpm tsx scripts/recategorize-transactions.ts [--dry-run] [--pattern PATTERN]
 *
 * Opções:
 *   --dry-run    Apenas mostra o que seria feito, sem alterar dados
 *   --pattern    Padrão de descrição para filtrar (ex: "COMISS")
 *   --limit      Número máximo de transações a processar (default: 100)
 */

import { db } from '@/lib/db/drizzle';
import { transactions, categories } from '@/lib/db/schema';
import { eq, like, sql, and, inArray } from 'drizzle-orm';
import { descriptionEnrichmentService } from '@/lib/services/description-enrichment.service';
import { aiCategorizationAdapter } from '@/lib/services/ai-categorization-adapter.service';

// Configurações
const DEFAULT_LIMIT = 100;
const SUSPICIOUS_PATTERNS = [
  // Transações que podem ter sido categorizadas como impostos por engano
  { description: '%COMISS%', wrongCategory: '%IMPOSTO%' },
  { description: '%COMISSÃO%', wrongCategory: '%IMPOSTO%' },
  { description: '%COMISSAO%', wrongCategory: '%IMPOSTO%' },
  // Termos bancários que podem confundir
  { description: '%SISPAG%', wrongCategory: '%IMPOSTO%' },
  { description: '%TEV%', wrongCategory: null }, // Verificar todas com TEV
];

interface RecategorizationResult {
  transactionId: string;
  description: string;
  oldCategory: string;
  newCategory: string;
  confidence: number;
  reasoning: string;
  changed: boolean;
}

async function parseArgs(): Promise<{
  dryRun: boolean;
  pattern: string | null;
  limit: number;
}> {
  const args = process.argv.slice(2);

  let dryRun = false;
  let pattern: string | null = null;
  let limit = DEFAULT_LIMIT;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--pattern' && args[i + 1]) {
      pattern = args[i + 1];
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { dryRun, pattern, limit };
}

async function findSuspiciousTransactions(
  pattern: string | null,
  limit: number
): Promise<Array<{
  id: string;
  description: string;
  amount: string;
  memo: string | null;
  categoryId: string | null;
  categoryName: string | null;
  companyId: string;
}>> {
  console.log('\n🔍 Buscando transações suspeitas...');

  if (pattern) {
    // Buscar por padrão específico
    const results = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        memo: transactions.memo,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        companyId: sql<string>`COALESCE(${transactions.accountId}, '')`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(like(transactions.description, `%${pattern}%`))
      .limit(limit);

    return results;
  }

  // Buscar transações com padrões suspeitos
  const allResults: Array<{
    id: string;
    description: string;
    amount: string;
    memo: string | null;
    categoryId: string | null;
    categoryName: string | null;
    companyId: string;
  }> = [];

  for (const suspicious of SUSPICIOUS_PATTERNS) {
    const conditions = [like(transactions.description, suspicious.description)];

    if (suspicious.wrongCategory) {
      // Buscar categoria com nome que contém o padrão
      const wrongCategories = await db
        .select({ id: categories.id })
        .from(categories)
        .where(like(categories.name, suspicious.wrongCategory));

      if (wrongCategories.length > 0) {
        const categoryIds = wrongCategories.map(c => c.id);
        conditions.push(inArray(transactions.categoryId, categoryIds));
      }
    }

    const results = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        memo: transactions.memo,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        companyId: sql<string>`COALESCE(${transactions.accountId}, '')`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .limit(Math.floor(limit / SUSPICIOUS_PATTERNS.length));

    allResults.push(...results);
  }

  // Remover duplicatas
  const uniqueResults = Array.from(
    new Map(allResults.map(r => [r.id, r])).values()
  );

  return uniqueResults.slice(0, limit);
}

async function recategorizeTransaction(
  transaction: {
    id: string;
    description: string;
    amount: string;
    memo: string | null;
    categoryId: string | null;
    categoryName: string | null;
    companyId: string;
  },
  dryRun: boolean
): Promise<RecategorizationResult> {
  const description = transaction.description || '';
  const amount = parseFloat(transaction.amount) || 0;

  // 1. Enriquecer descrição
  const enrichment = await descriptionEnrichmentService.enrichDescription(
    description,
    transaction.memo || undefined
  );

  console.log(`\n📝 Processando: "${description}"`);
  if (enrichment.bankingTerm) {
    console.log(`   Termo detectado: ${enrichment.bankingTerm.term} (${enrichment.bankingTerm.meaning})`);
  }
  if (enrichment.complement) {
    console.log(`   Complemento: ${enrichment.complement}`);
  }

  // 2. Recategorizar usando IA com contexto enriquecido
  const newCategorization = await aiCategorizationAdapter.categorize({
    description,
    amount,
    memo: transaction.memo || undefined,
    companyId: transaction.companyId,
  });

  const oldCategory = transaction.categoryName || 'SEM CATEGORIA';
  const newCategory = newCategorization.category;
  const changed = oldCategory !== newCategory;

  console.log(`   Categoria atual: ${oldCategory}`);
  console.log(`   Nova categoria: ${newCategory} (confiança: ${(newCategorization.confidence * 100).toFixed(0)}%)`);

  if (changed) {
    console.log(`   ⚠️  MUDANÇA DETECTADA!`);

    if (!dryRun) {
      // Buscar ID da nova categoria
      const [newCategoryRecord] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, newCategory))
        .limit(1);

      if (newCategoryRecord) {
        await db
          .update(transactions)
          .set({ categoryId: newCategoryRecord.id })
          .where(eq(transactions.id, transaction.id));

        console.log(`   ✅ Atualizado no banco!`);
      } else {
        console.log(`   ❌ Categoria "${newCategory}" não encontrada no banco`);
      }
    } else {
      console.log(`   📋 [DRY-RUN] Não alterado`);
    }
  } else {
    console.log(`   ✓ Categoria mantida`);
  }

  return {
    transactionId: transaction.id,
    description,
    oldCategory,
    newCategory,
    confidence: newCategorization.confidence,
    reasoning: newCategorization.reasoning || '',
    changed,
  };
}

async function main() {
  console.log('🔄 Script de Recategorização de Transações');
  console.log('==========================================\n');

  const { dryRun, pattern, limit } = await parseArgs();

  if (dryRun) {
    console.log('⚠️  MODO DRY-RUN: Nenhuma alteração será feita no banco\n');
  }

  if (pattern) {
    console.log(`📌 Filtrando por padrão: "${pattern}"\n`);
  }

  console.log(`📊 Limite de transações: ${limit}\n`);

  // 1. Buscar transações suspeitas
  const suspiciousTransactions = await findSuspiciousTransactions(pattern, limit);

  console.log(`\n📊 Encontradas ${suspiciousTransactions.length} transações para analisar`);

  if (suspiciousTransactions.length === 0) {
    console.log('\n✅ Nenhuma transação suspeita encontrada!');
    return;
  }

  // 2. Processar cada transação
  const results: RecategorizationResult[] = [];

  for (const tx of suspiciousTransactions) {
    try {
      const result = await recategorizeTransaction(tx, dryRun);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Erro ao processar transação ${tx.id}:`, error);
    }
  }

  // 3. Resumo final
  const changedCount = results.filter(r => r.changed).length;
  const unchangedCount = results.filter(r => !r.changed).length;

  console.log('\n\n==========================================');
  console.log('📊 RESUMO FINAL');
  console.log('==========================================');
  console.log(`Total processadas: ${results.length}`);
  console.log(`Alteradas: ${changedCount}`);
  console.log(`Mantidas: ${unchangedCount}`);

  if (changedCount > 0) {
    console.log('\n📝 Transações alteradas:');
    for (const result of results.filter(r => r.changed)) {
      console.log(`   • "${result.description.substring(0, 40)}..."`);
      console.log(`     ${result.oldCategory} → ${result.newCategory}`);
    }
  }

  if (dryRun && changedCount > 0) {
    console.log('\n💡 Para aplicar as mudanças, execute sem --dry-run');
  }
}

// Executar
main()
  .then(() => {
    console.log('\n✅ Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
