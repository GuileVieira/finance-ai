/**
 * PR4 — Executa limpeza de categorização via Drizzle
 * 
 * Uso: npx tsx -r dotenv/config scripts/run-sql-cleanup.ts
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function runCleanup() {
  console.log('=== PR4: SQL Cleanup via Drizzle ===\n');

  // ============================================================
  // DRY-RUN: Preview do impacto
  // ============================================================
  console.log('--- DRY-RUN: Preview do impacto ---\n');

  // Etapa 1: Termos genéricos
  const e1 = await db.execute(sql`
    SELECT count(*) AS afetadas
    FROM financeai_transactions
    WHERE 
      (UPPER(description) ~ '^(SISPAG|PAGAMENTO|PIX ENVIADO|PIX RECEBIDO|TED ENVIADA|DOC ENVIADO|ENVIO TED|TRANSF|TRANSFERENCIA)\s*\S{0,15}$')
      AND manually_categorized = false
      AND verified = false
  `);
  console.log(`Etapa 1 (Termos genéricos):     ${e1.rows[0].afetadas} transações`);

  // Etapa 2: FIDC como Receita
  const e2 = await db.execute(sql`
    SELECT count(*) AS afetadas
    FROM financeai_transactions t
    JOIN financeai_categories c ON t.category_id = c.id
    WHERE 
      (UPPER(t.description) LIKE '%FIDC%' OR UPPER(t.description) LIKE '%REC TIT%' OR UPPER(t.description) LIKE '%ANTECIPACAO RECEB%')
      AND c.type IN ('revenue', 'income')
      AND c.dre_group = 'RoB'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`Etapa 2 (FIDC como Receita):     ${e2.rows[0].afetadas} transações`);

  // Etapa 3a: Créditos como Despesa
  const e3a = await db.execute(sql`
    SELECT count(*) AS afetadas
    FROM financeai_transactions t
    JOIN financeai_categories c ON t.category_id = c.id
    WHERE 
      CAST(t.amount AS numeric) > 0
      AND c.type IN ('variable_cost', 'fixed_cost', 'expense', 'tax')
      AND UPPER(t.description) NOT LIKE '%ESTORNO%'
      AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
      AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`Etapa 3a (Crédito→Despesa):      ${e3a.rows[0].afetadas} transações`);

  // Etapa 3b: Débitos como Receita
  const e3b = await db.execute(sql`
    SELECT count(*) AS afetadas
    FROM financeai_transactions t
    JOIN financeai_categories c ON t.category_id = c.id
    WHERE 
      CAST(t.amount AS numeric) < 0
      AND c.type IN ('revenue', 'income')
      AND UPPER(t.description) NOT LIKE '%ESTORNO%'
      AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
      AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`Etapa 3b (Débito→Receita):       ${e3b.rows[0].afetadas} transações`);

  // Etapa 4a: Débitos com RoB
  const e4a = await db.execute(sql`
    SELECT count(*) AS afetadas
    FROM financeai_transactions t
    JOIN financeai_categories c ON t.category_id = c.id
    WHERE 
      CAST(t.amount AS numeric) < 0
      AND c.dre_group = 'RoB'
      AND UPPER(t.description) NOT LIKE '%ESTORNO%'
      AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`Etapa 4a (Débito + dreGroup RoB): ${e4a.rows[0].afetadas} transações`);

  // Etapa 4b: Créditos com CV/CF/DNOP
  const e4b = await db.execute(sql`
    SELECT count(*) AS afetadas
    FROM financeai_transactions t
    JOIN financeai_categories c ON t.category_id = c.id
    WHERE 
      CAST(t.amount AS numeric) > 0
      AND c.dre_group IN ('CV', 'CF', 'DNOP')
      AND UPPER(t.description) NOT LIKE '%ESTORNO%'
      AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
      AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`Etapa 4b (Crédito + CV/CF/DNOP): ${e4b.rows[0].afetadas} transações`);

  // Estado atual
  const resumo = await db.execute(sql`
    SELECT 
      count(*) FILTER (WHERE needs_review = true) AS ja_em_revisao,
      count(*) FILTER (WHERE needs_review = false AND category_id IS NOT NULL) AS categorizadas_ok,
      count(*) FILTER (WHERE category_id IS NULL) AS sem_categoria,
      count(*) AS total_geral
    FROM financeai_transactions
  `);
  console.log('\n--- Estado Atual ---');
  console.log(`Em revisão:     ${resumo.rows[0].ja_em_revisao}`);
  console.log(`Categorizadas:  ${resumo.rows[0].categorizadas_ok}`);
  console.log(`Sem categoria:  ${resumo.rows[0].sem_categoria}`);
  console.log(`Total:          ${resumo.rows[0].total_geral}`);

  // ============================================================
  // EXECUÇÃO: Aplicar limpeza
  // ============================================================
  console.log('\n\n=== EXECUTANDO LIMPEZA ===\n');

  // Etapa 1
  const r1 = await db.execute(sql`
    UPDATE financeai_transactions t
    SET 
      needs_review = true,
      confidence = 0,
      reasoning = CONCAT('🔧 [PR4-CLEANUP] Termo genérico resetado. ', COALESCE(reasoning, '')),
      categorization_source = NULL,
      updated_at = NOW()
    WHERE 
      (UPPER(description) ~ '^(SISPAG|PAGAMENTO|PIX ENVIADO|PIX RECEBIDO|TED ENVIADA|DOC ENVIADO|ENVIO TED|TRANSF|TRANSFERENCIA)\s*\S{0,15}$')
      AND manually_categorized = false
      AND verified = false
  `);
  console.log(`✅ Etapa 1: ${r1.rowCount} transações resetadas (termos genéricos)`);

  // Etapa 2
  const r2 = await db.execute(sql`
    UPDATE financeai_transactions t
    SET 
      needs_review = true,
      confidence = 0,
      reasoning = CONCAT('🔧 [PR4-CLEANUP] FIDC→Receita corrigido. ', COALESCE(reasoning, '')),
      categorization_source = NULL,
      updated_at = NOW()
    FROM financeai_categories c
    WHERE 
      t.category_id = c.id
      AND (UPPER(t.description) LIKE '%FIDC%' OR UPPER(t.description) LIKE '%REC TIT%' OR UPPER(t.description) LIKE '%ANTECIPACAO RECEB%')
      AND c.type IN ('revenue', 'income')
      AND c.dre_group = 'RoB'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`✅ Etapa 2: ${r2.rowCount} transações resetadas (FIDC→Receita)`);

  // Etapa 3a
  const r3a = await db.execute(sql`
    UPDATE financeai_transactions t
    SET 
      needs_review = true,
      confidence = 0,
      reasoning = CONCAT('🔧 [PR4-CLEANUP] Crédito→Despesa corrigido. ', COALESCE(reasoning, '')),
      categorization_source = NULL,
      updated_at = NOW()
    FROM financeai_categories c
    WHERE 
      t.category_id = c.id
      AND CAST(t.amount AS numeric) > 0
      AND c.type IN ('variable_cost', 'fixed_cost', 'expense', 'tax')
      AND UPPER(t.description) NOT LIKE '%ESTORNO%'
      AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
      AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`✅ Etapa 3a: ${r3a.rowCount} transações resetadas (Crédito→Despesa)`);

  // Etapa 3b
  const r3b = await db.execute(sql`
    UPDATE financeai_transactions t
    SET 
      needs_review = true,
      confidence = 0,
      reasoning = CONCAT('🔧 [PR4-CLEANUP] Débito→Receita corrigido. ', COALESCE(reasoning, '')),
      categorization_source = NULL,
      updated_at = NOW()
    FROM financeai_categories c
    WHERE 
      t.category_id = c.id
      AND CAST(t.amount AS numeric) < 0
      AND c.type IN ('revenue', 'income')
      AND UPPER(t.description) NOT LIKE '%ESTORNO%'
      AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
      AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`✅ Etapa 3b: ${r3b.rowCount} transações resetadas (Débito→Receita)`);

  // Etapa 4a
  const r4a = await db.execute(sql`
    UPDATE financeai_transactions t
    SET 
      needs_review = true,
      confidence = 0,
      reasoning = CONCAT('🔧 [PR4-CLEANUP] Débito+RoB corrigido. ', COALESCE(reasoning, '')),
      categorization_source = NULL,
      updated_at = NOW()
    FROM financeai_categories c
    WHERE 
      t.category_id = c.id
      AND CAST(t.amount AS numeric) < 0
      AND c.dre_group = 'RoB'
      AND UPPER(t.description) NOT LIKE '%ESTORNO%'
      AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`✅ Etapa 4a: ${r4a.rowCount} transações resetadas (Débito+RoB)`);

  // Etapa 4b
  const r4b = await db.execute(sql`
    UPDATE financeai_transactions t
    SET 
      needs_review = true,
      confidence = 0,
      reasoning = CONCAT('🔧 [PR4-CLEANUP] Crédito+CV/CF/DNOP corrigido. ', COALESCE(reasoning, '')),
      categorization_source = NULL,
      updated_at = NOW()
    FROM financeai_categories c
    WHERE 
      t.category_id = c.id
      AND CAST(t.amount AS numeric) > 0
      AND c.dre_group IN ('CV', 'CF', 'DNOP')
      AND UPPER(t.description) NOT LIKE '%ESTORNO%'
      AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
      AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
      AND t.manually_categorized = false
      AND t.verified = false
  `);
  console.log(`✅ Etapa 4b: ${r4b.rowCount} transações resetadas (Crédito+CV/CF/DNOP)`);

  // Resumo final
  const final_ = await db.execute(sql`
    SELECT 
      count(*) FILTER (WHERE needs_review = true AND confidence = 0) AS para_revisao,
      count(*) FILTER (WHERE needs_review = false AND category_id IS NOT NULL) AS ok,
      count(*) AS total
    FROM financeai_transactions
  `);
  console.log('\n--- Estado Final ---');
  console.log(`Para revisão:   ${final_.rows[0].para_revisao}`);
  console.log(`OK:             ${final_.rows[0].ok}`);
  console.log(`Total:          ${final_.rows[0].total}`);

  console.log('\n🎉 Limpeza concluída!');
  process.exit(0);
}

runCleanup().catch(err => {
  console.error('Erro na limpeza:', err);
  process.exit(1);
});
