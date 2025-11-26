/**
 * Script para gerar regras a partir das transações já categorizadas pela IA
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { categoryRules } from '../lib/db/schema';
import { sql } from 'drizzle-orm';
import { RuleGenerationService } from '../lib/services/rule-generation.service';

interface TransactionRow {
  id: string;
  description: string;
  category_id: string;
  category_name: string;
  confidence: string;
  company_id: string;
}

async function generateRules() {
  console.log('🔄 Gerando regras a partir das transações existentes...\n');

  // 1. Buscar transações categorizadas pela IA usando SQL raw
  const aiTransactionsResult = await db.execute(sql`
    SELECT
      t.id,
      t.description,
      t.category_id,
      c.name as category_name,
      t.confidence,
      c.company_id
    FROM financeai_transactions t
    INNER JOIN financeai_categories c ON t.category_id = c.id
    WHERE t.categorization_source = 'ai'
      AND t.category_id IS NOT NULL
    ORDER BY t.created_at DESC
  `);

  const aiTransactions = aiTransactionsResult.rows as TransactionRow[];

  console.log(`📊 Encontradas ${aiTransactions.length} transações categorizadas pela IA\n`);

  if (aiTransactions.length === 0) {
    console.log('⚠️ Nenhuma transação para processar');
    process.exit(0);
  }

  // 2. Agrupar por padrão único
  const uniquePatterns = new Map<string, {
    description: string;
    categoryId: string;
    categoryName: string;
    confidence: number;
    companyId: string;
    pattern: string;
    strategy: string;
    ruleType: string;
  }>();

  for (const tx of aiTransactions) {
    if (!tx.category_id || !tx.category_name || !tx.company_id) continue;

    // Extrair padrão
    const extraction = RuleGenerationService.extractPattern(tx.description);
    if (!extraction.isValid) {
      console.log(`⏭️ Padrão inválido: "${tx.description.substring(0, 40)}..."`);
      continue;
    }

    const key = `${tx.category_id}:${extraction.pattern}`;

    if (!uniquePatterns.has(key)) {
      uniquePatterns.set(key, {
        description: tx.description,
        categoryId: tx.category_id,
        categoryName: tx.category_name,
        confidence: parseFloat(tx.confidence || '85'),
        companyId: tx.company_id,
        pattern: extraction.pattern,
        strategy: extraction.strategy || 'fallback',
        ruleType: extraction.pattern.includes('*') ? 'wildcard' : 'contains'
      });
    }
  }

  console.log(`📋 ${uniquePatterns.size} padrões únicos identificados\n`);

  // 3. Buscar regras existentes para evitar duplicatas
  const existingPatterns = new Set<string>();
  const existingRulesResult = await db.execute(sql`
    SELECT rule_pattern, category_id FROM financeai_category_rules
  `);

  interface RuleRow { rule_pattern: string; category_id: string | null; }
  const existingRules = existingRulesResult.rows as RuleRow[];

  for (const rule of existingRules) {
    if (rule.category_id) {
      existingPatterns.add(`${rule.category_id}:${rule.rule_pattern.toLowerCase()}`);
    }
  }

  console.log(`📋 ${existingPatterns.size} regras já existentes\n`);

  // 4. Criar regras novas
  let created = 0;
  let skipped = 0;

  for (const [key, data] of uniquePatterns) {
    const checkKey = `${data.categoryId}:${data.pattern.toLowerCase()}`;

    if (existingPatterns.has(checkKey)) {
      console.log(`⏭️ Já existe: "${data.pattern}"`);
      skipped++;
      continue;
    }

    try {
      // Calcular confidence para a regra
      const ruleConfidence = Math.min(0.85, Math.max(0.75, data.confidence / 100));

      await db.insert(categoryRules).values({
        rulePattern: data.pattern,
        ruleType: data.ruleType,
        categoryId: data.categoryId,
        companyId: data.companyId,
        confidenceScore: ruleConfidence.toFixed(2),
        active: true,
        usageCount: 0,
        sourceType: 'ai',
        matchFields: ['description', 'memo', 'name'],
        examples: [data.description],
        patternStrategy: data.strategy,
        status: 'candidate',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✅ Criada: "${data.pattern}" (${data.ruleType}) → ${data.categoryName}`);
      created++;
      existingPatterns.add(checkKey); // Adicionar para evitar duplicatas no mesmo run

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.log(`❌ Erro ao criar regra: ${errMsg}`);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📈 RESULTADO:`);
  console.log(`   Regras criadas: ${created}`);
  console.log(`   Ignoradas/Duplicadas: ${skipped}`);
  console.log('='.repeat(50));

  process.exit(0);
}

generateRules().catch(console.error);
