import { config } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

try {
  // Buscar regras ativas
  const result = await pool.query(`
    SELECT
      r.rule_pattern,
      r.rule_type,
      r.confidence_score,
      r.usage_count,
      r.active,
      c.name as category_name
    FROM financeai_category_rules r
    INNER JOIN financeai_categories c ON r.category_id = c.id
    WHERE r.active = true
    ORDER BY c.name, r.rule_pattern
  `);

  console.log('\n📋 REGRAS ATIVAS:\n');
  result.rows.forEach((rule, i) => {
    console.log(`${i + 1}. Padrão: "${rule.rule_pattern}"`);
    console.log(`   Categoria: ${rule.category_name}`);
    console.log(`   Tipo: ${rule.rule_type}`);
    console.log(`   Confiança: ${rule.confidence_score}`);
    console.log(`   Usos: ${rule.usage_count}`);
    console.log('');
  });

  // Testar o texto específico
  const testText = "PAGAMENTOS FORNECEDORES ATLANTICA HOTELS INTERNATIONAL BRASIL LT";
  console.log(`\n🔍 TESTANDO: "${testText}"\n`);

  const matches = result.rows.filter(rule => {
    const pattern = rule.rule_pattern.toLowerCase();
    const text = testText.toLowerCase();

    if (rule.rule_type === 'contains') {
      return text.includes(pattern);
    }
    return false;
  });

  if (matches.length > 0) {
    console.log('✅ REGRAS QUE BATEM:');
    matches.forEach(m => {
      console.log(`   - "${m.rule_pattern}" → ${m.category_name}`);
    });
  } else {
    console.log('❌ Nenhuma regra bateu');
  }

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await pool.end();
}
