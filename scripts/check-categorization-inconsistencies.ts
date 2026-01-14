/**
 * Script de diagnóstico de inconsistências de categorização
 * Execute com: npx tsx scripts/check-categorization-inconsistencies.ts
 */

import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function runDiagnostics() {
  console.log('🔍 Iniciando diagnóstico de inconsistências de categorização...\n');

  // Q1. Verificar se tabelas existem
  console.log('=== Q1. Verificando tabelas financeai_* ===');
  const tables = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'financeai_%'
    ORDER BY table_name
  `);
  console.log('Tabelas encontradas:', tables.rows.length);
  tables.rows.forEach((t: Record<string, unknown>) => console.log('  -', t.table_name));

  if (tables.rows.length === 0) {
    console.log('\n❌ ERRO CRÍTICO: Nenhuma tabela financeai_* encontrada!');
    console.log('Execute: pnpm db:push para criar as tabelas');
    process.exit(1);
  }

  // Q10. Resumo geral
  console.log('\n=== Q10. Resumo Geral ===');
  const summary = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM financeai_categories) as total_categorias,
      (SELECT COUNT(*) FROM financeai_category_rules) as total_regras,
      (SELECT COUNT(*) FROM financeai_transactions) as total_transacoes,
      (SELECT COUNT(*) FROM financeai_transactions WHERE category_id IS NULL) as transacoes_sem_categoria,
      (SELECT COUNT(*) FROM financeai_transactions WHERE category_id IS NOT NULL) as transacoes_categorizadas
  `);
  console.log('Resumo:', summary.rows[0]);

  // Q2. Categorias Órfãs
  console.log('\n=== Q2. Categorias Órfãs (parent inexistente) ===');
  const orphanCategories = await db.execute(sql`
    SELECT c.id, c.name, c.parent_category_id, c.company_id
    FROM financeai_categories c
    LEFT JOIN financeai_categories parent ON c.parent_category_id = parent.id
    WHERE c.parent_category_id IS NOT NULL AND parent.id IS NULL
  `);
  if (orphanCategories.rows.length === 0) {
    console.log('✅ Nenhuma categoria órfã encontrada');
  } else {
    console.log('❌ Categorias órfãs:', orphanCategories.rows.length);
    orphanCategories.rows.forEach((c: Record<string, unknown>) => console.log('  -', c.name, '(parent:', c.parent_category_id, ')'));
  }

  // Q3. Regras sem Company
  console.log('\n=== Q3. Regras sem Company (risco cross-company) ===');
  const rulesNoCompany = await db.execute(sql`
    SELECT id, rule_pattern, category_id, status, active
    FROM financeai_category_rules
    WHERE company_id IS NULL
  `);
  if (rulesNoCompany.rows.length === 0) {
    console.log('✅ Todas as regras têm company_id');
  } else {
    console.log('⚠️ Regras sem company_id:', rulesNoCompany.rows.length);
    rulesNoCompany.rows.slice(0, 10).forEach((r: Record<string, unknown>) => console.log('  -', r.rule_pattern, '| status:', r.status));
    if (rulesNoCompany.rows.length > 10) console.log('  ... e mais', rulesNoCompany.rows.length - 10, 'regras');
  }

  // Q4. Categorias Duplicadas
  console.log('\n=== Q4. Categorias Duplicadas ===');
  const dupCategories = await db.execute(sql`
    SELECT company_id, name, type, COUNT(*) as duplicatas
    FROM financeai_categories
    GROUP BY company_id, name, type
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);
  if (dupCategories.rows.length === 0) {
    console.log('✅ Nenhuma categoria duplicada');
  } else {
    console.log('❌ Categorias duplicadas:', dupCategories.rows.length);
    dupCategories.rows.forEach((c: Record<string, unknown>) => console.log('  -', c.name, '| tipo:', c.type, '| duplicatas:', c.duplicatas));
  }

  // Q5. Regras Duplicadas
  console.log('\n=== Q5. Regras Duplicadas ===');
  const dupRules = await db.execute(sql`
    SELECT company_id, rule_pattern, category_id, COUNT(*) as duplicatas
    FROM financeai_category_rules
    GROUP BY company_id, rule_pattern, category_id
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `);
  if (dupRules.rows.length === 0) {
    console.log('✅ Nenhuma regra duplicada');
  } else {
    console.log('⚠️ Regras duplicadas:', dupRules.rows.length);
    dupRules.rows.forEach((r: Record<string, unknown>) => console.log('  -', r.rule_pattern, '| duplicatas:', r.duplicatas));
  }

  // Q6. Transações Não Categorizadas
  console.log('\n=== Q6. Transações Não Categorizadas ===');
  const uncategorized = await db.execute(sql`
    SELECT type, categorization_source, COUNT(*) as total
    FROM financeai_transactions
    WHERE category_id IS NULL
    GROUP BY type, categorization_source
    ORDER BY COUNT(*) DESC
  `);
  if (uncategorized.rows.length === 0) {
    console.log('✅ Todas as transações estão categorizadas');
  } else {
    console.log('⚠️ Transações sem categoria:');
    uncategorized.rows.forEach((t: Record<string, unknown>) => console.log('  -', t.type, '| source:', t.categorization_source || 'null', '| total:', t.total));
  }

  // Q7. Inconsistência Manual vs Source
  console.log('\n=== Q7. Flags Manual vs Source ===');
  const manualVsSource = await db.execute(sql`
    SELECT manually_categorized, categorization_source, COUNT(*) as total
    FROM financeai_transactions
    WHERE category_id IS NOT NULL
    GROUP BY manually_categorized, categorization_source
    ORDER BY COUNT(*) DESC
  `);
  console.log('Distribuição de categorização:');
  manualVsSource.rows.forEach((t: Record<string, unknown>) =>
    console.log('  - manual:', t.manually_categorized, '| source:', t.categorization_source || 'null', '| total:', t.total)
  );

  // Verificar inconsistências
  const inconsistent = await db.execute(sql`
    SELECT COUNT(*) as total
    FROM financeai_transactions
    WHERE category_id IS NOT NULL
      AND manually_categorized = true
      AND categorization_source IS NOT NULL
      AND categorization_source != 'manual'
  `);
  const inconsistentCount = inconsistent.rows[0] as Record<string, unknown>;
  if (Number(inconsistentCount.total) > 0) {
    console.log('⚠️ Inconsistências (manual=true mas source!=manual):', inconsistentCount.total);
  }

  // Q8. Categorias com type inválido
  console.log('\n=== Q8. Categorias com Type Inválido ===');
  const invalidType = await db.execute(sql`
    SELECT id, name, type, dre_group
    FROM financeai_categories
    WHERE type NOT IN ('revenue', 'variable_cost', 'fixed_cost', 'non_operational', 'financial_movement')
  `);
  if (invalidType.rows.length === 0) {
    console.log('✅ Todos os types são válidos');
  } else {
    console.log('⚠️ Categorias com type inválido:', invalidType.rows.length);
    invalidType.rows.slice(0, 10).forEach((c: Record<string, unknown>) => console.log('  -', c.name, '| type:', c.type));
  }

  // Q9. Regras apontando para categorias deletadas
  console.log('\n=== Q9. Regras Órfãs (categoria deletada) ===');
  const orphanRules = await db.execute(sql`
    SELECT cr.id, cr.rule_pattern, cr.category_id, cr.status
    FROM financeai_category_rules cr
    LEFT JOIN financeai_categories c ON cr.category_id = c.id
    WHERE c.id IS NULL
  `);
  if (orphanRules.rows.length === 0) {
    console.log('✅ Todas as regras apontam para categorias existentes');
  } else {
    console.log('❌ Regras órfãs:', orphanRules.rows.length);
    orphanRules.rows.slice(0, 10).forEach((r: Record<string, unknown>) => console.log('  -', r.rule_pattern, '| category_id:', r.category_id));
  }

  console.log('\n✅ Diagnóstico concluído!');
  process.exit(0);
}

runDiagnostics().catch((err) => {
  console.error('Erro ao executar diagnóstico:', err);
  process.exit(1);
});
