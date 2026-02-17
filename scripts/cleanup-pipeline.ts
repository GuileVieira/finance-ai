#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const db = drizzle(databaseUrl);

async function cleanupPipeline() {
  console.log('\n' + '='.repeat(60));
  console.log('🧹 LIMPEZA DO PIPELINE DE CATEGORIZAÇÃO');
  console.log('='.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════════
  // PASSO 1: Destruir regras automáticas (Camada 2)
  // ═══════════════════════════════════════════════════════════
  console.log('📌 PASSO 1: Destruindo regras automáticas...');
  
  const beforeRules = await db.execute(sql`
    SELECT COUNT(*) as total FROM financeai_category_rules
  `);
  console.log(`   Regras existentes: ${(beforeRules.rows?.[0] as any)?.total ?? 'N/A'}`);

  // Deletar regras geradas automaticamente (source_type='ai' ou 'imported')
  await db.execute(sql`
    DELETE FROM financeai_category_rules 
    WHERE source_type = 'ai'
       OR source_type = 'imported'
       OR status IN ('candidate', 'inactive')
  `);
  
  const afterRules = await db.execute(sql`
    SELECT COUNT(*) as total FROM financeai_category_rules
  `);
  console.log(`   ✅ Regras restantes: ${(afterRules.rows?.[0] as any)?.total ?? 'N/A'}`);

  // ═══════════════════════════════════════════════════════════
  // PASSO 2: Resetar histórico de transações (Camada 3)
  // ═══════════════════════════════════════════════════════════
  console.log('\n📌 PASSO 2: Resetando categorização de transações...');
  
  const beforeTx = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE categorization_source IS NOT NULL) as auto_count
    FROM financeai_transactions
  `);
  console.log(`   Total de transações: ${(beforeTx.rows?.[0] as any)?.total ?? 'N/A'}`);
  console.log(`   Com categorização automática: ${(beforeTx.rows?.[0] as any)?.auto_count ?? 'N/A'}`);

  // Resetar TODAS as transações
  await db.execute(sql`
    UPDATE financeai_transactions 
    SET category_id = NULL, 
        categorization_source = NULL, 
        confidence = 0,
        needs_review = true
    WHERE categorization_source IS NOT NULL
  `);

  const afterTx = await db.execute(sql`
    SELECT 
      COUNT(*) FILTER (WHERE category_id IS NOT NULL) as categorized,
      COUNT(*) FILTER (WHERE category_id IS NULL) as uncategorized
    FROM financeai_transactions
  `);
  console.log(`   ✅ Categorizadas: ${(afterTx.rows?.[0] as any)?.categorized ?? 'N/A'}`);
  console.log(`   ✅ Para re-processamento: ${(afterTx.rows?.[0] as any)?.uncategorized ?? 'N/A'}`);

  // ═══════════════════════════════════════════════════════════
  // PASSO EXTRA: Limpar clusters e feedback
  // ═══════════════════════════════════════════════════════════
  console.log('\n📌 PASSO 3: Limpando clusters e feedback...');
  await db.execute(sql`DELETE FROM financeai_transaction_clusters`);
  await db.execute(sql`DELETE FROM financeai_rule_feedback`);
  console.log('   ✅ Clusters e feedback limpos');

  // ═══════════════════════════════════════════════════════════
  // RESUMO
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  console.log('✅ LIMPEZA CONCLUÍDA!');
  console.log('');
  console.log('Próximos passos:');
  console.log('  1. Reinicie o servidor (pnpm dev) para limpar cache em memória');
  console.log('  2. Suba o OFX novamente para re-categorizar');
  console.log('  3. O sistema vai direto para a IA (Camada 6)');
  console.log('='.repeat(60) + '\n');
}

cleanupPipeline().catch(err => {
  console.error('💥 Erro fatal no script de limpeza:', err);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
