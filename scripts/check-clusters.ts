/**
 * Script para verificar estado dos clusters e regras
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { transactionClusters, categoryRules, transactions, categories } from '../lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

async function checkStatus() {
  console.log('🔍 Verificando estado do sistema de regras inteligentes...\n');

  // 1. Verificar clusters
  console.log('📦 CLUSTERS:');
  const clusters = await db
    .select()
    .from(transactionClusters)
    .orderBy(desc(transactionClusters.transactionCount))
    .limit(20);

  if (clusters.length === 0) {
    console.log('  ⚠️ Nenhum cluster encontrado');
  } else {
    console.log(`  Total: ${clusters.length} clusters\n`);
    for (const cluster of clusters) {
      console.log(`  - "${cluster.centroidDescription?.substring(0, 50)}..."`);
      console.log(`    Categoria: ${cluster.categoryName}`);
      console.log(`    Transações: ${cluster.transactionCount}`);
      console.log(`    Status: ${cluster.status}`);
      console.log(`    Tokens: ${JSON.stringify(cluster.commonTokens)}`);
      console.log('');
    }
  }

  // 2. Verificar regras
  console.log('\n📋 REGRAS (últimas 20):');
  const rules = await db
    .select({
      id: categoryRules.id,
      pattern: categoryRules.rulePattern,
      type: categoryRules.ruleType,
      categoryName: categories.name,
      confidence: categoryRules.confidenceScore,
      usageCount: categoryRules.usageCount,
      sourceType: categoryRules.sourceType,
      status: categoryRules.status,
      createdAt: categoryRules.createdAt
    })
    .from(categoryRules)
    .leftJoin(categories, eq(categoryRules.categoryId, categories.id))
    .orderBy(desc(categoryRules.createdAt))
    .limit(20);

  if (rules.length === 0) {
    console.log('  ⚠️ Nenhuma regra encontrada');
  } else {
    console.log(`  Total consultado: ${rules.length} regras\n`);
    for (const rule of rules) {
      console.log(`  - Pattern: "${rule.pattern}"`);
      console.log(`    Tipo: ${rule.type} | Categoria: ${rule.categoryName}`);
      console.log(`    Confidence: ${rule.confidence} | Usos: ${rule.usageCount}`);
      console.log(`    Fonte: ${rule.sourceType} | Status: ${rule.status}`);
      console.log(`    Criada: ${rule.createdAt}`);
      console.log('');
    }
  }

  // 3. Verificar transações recentes
  console.log('\n📊 TRANSAÇÕES RECENTES (últimas 10):');
  const recentTx = await db
    .select({
      description: transactions.description,
      categoryName: categories.name,
      confidence: transactions.confidence,
      source: transactions.categorizationSource,
      ruleId: transactions.ruleId
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  for (const tx of recentTx) {
    console.log(`  - "${tx.description?.substring(0, 50)}..."`);
    console.log(`    → ${tx.categoryName} (${tx.confidence}% via ${tx.source})`);
    if (tx.ruleId) console.log(`    Regra: ${tx.ruleId}`);
    console.log('');
  }

  // 4. Estatísticas
  console.log('\n📈 ESTATÍSTICAS:');

  const [txCount] = await db.select({ count: sql<number>`count(*)` }).from(transactions);
  const [ruleCount] = await db.select({ count: sql<number>`count(*)` }).from(categoryRules);
  const [clusterCount] = await db.select({ count: sql<number>`count(*)` }).from(transactionClusters);
  const [aiRulesCount] = await db.select({ count: sql<number>`count(*)` }).from(categoryRules).where(eq(categoryRules.sourceType, 'ai'));

  console.log(`  Transações: ${txCount.count}`);
  console.log(`  Regras totais: ${ruleCount.count}`);
  console.log(`  Regras geradas por IA: ${aiRulesCount.count}`);
  console.log(`  Clusters: ${clusterCount.count}`);

  process.exit(0);
}

checkStatus().catch(console.error);
