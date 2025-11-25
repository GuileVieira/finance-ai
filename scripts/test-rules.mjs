import { db } from '../lib/db/drizzle.ts';
import * as schema from '../lib/db/schema.ts';
import { eq } from 'drizzle-orm';

const { categoryRules, categories } = schema;

const rules = await db
  .select({
    id: categoryRules.id,
    pattern: categoryRules.rulePattern,
    type: categoryRules.ruleType,
    categoryName: categories.name,
    active: categoryRules.active,
    usageCount: categoryRules.usageCount,
    confidence: categoryRules.confidenceScore
  })
  .from(categoryRules)
  .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
  .where(eq(categoryRules.active, true));

console.log('\n📋 REGRAS ATIVAS:\n');
rules.forEach((rule, i) => {
  console.log(`${i + 1}. Padrão: "${rule.pattern}"`);
  console.log(`   Categoria: ${rule.categoryName}`);
  console.log(`   Tipo: ${rule.type}`);
  console.log(`   Confiança: ${rule.confidence}`);
  console.log(`   Usos: ${rule.usageCount}`);
  console.log('');
});

// Testar o texto específico
const testText = "PAGAMENTOS FORNECEDORES ATLANTICA HOTELS INTERNATIONAL BRASIL LT";
console.log(`\n🔍 TESTANDO: "${testText}"\n`);

const matches = rules.filter(rule => {
  const pattern = rule.pattern.toLowerCase();
  const text = testText.toLowerCase();

  if (rule.type === 'contains') {
    return text.includes(pattern);
  }
  return false;
});

if (matches.length > 0) {
  console.log('✅ REGRAS QUE BATEM:');
  matches.forEach(m => {
    console.log(`   - "${m.pattern}" → ${m.categoryName}`);
  });
} else {
  console.log('❌ Nenhuma regra bateu');
}

process.exit(0);
