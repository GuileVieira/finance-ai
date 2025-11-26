#!/usr/bin/env node

/**
 * Script para limpar regras de categorização
 * Uso: node scripts/reset-rules.js [opções]
 *
 * Opções:
 *   --dry-run    Apenas mostra o que será limpo
 *   --company ID Limpar apenas regras de uma empresa específica
 *   --ai-only    Limpar apenas regras geradas por IA (sourceType = 'ai')
 *   --help       Mostra ajuda
 */

require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL não encontrada');
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  aiOnly: args.includes('--ai-only'),
  help: args.includes('--help') || args.includes('-h'),
};

// Parse company ID
let companyId = null;
const companyIdx = args.indexOf('--company');
if (companyIdx !== -1 && args[companyIdx + 1]) {
  companyId = args[companyIdx + 1];
}

if (flags.help) {
  console.log(`
🧹 Script de Limpeza de Regras de Categorização

Uso: node scripts/reset-rules.js [opções]

Opções:
  --dry-run      Apenas mostra quantas regras serão removidas
  --company ID   Limpar apenas regras de uma empresa específica
  --ai-only      Limpar apenas regras geradas por IA (sourceType = 'ai')
  --help         Mostra esta ajuda

Exemplos:
  node scripts/reset-rules.js --dry-run           # Simular limpeza
  node scripts/reset-rules.js                     # Limpar todas as regras
  node scripts/reset-rules.js --ai-only           # Limpar apenas regras de IA
  node scripts/reset-rules.js --company abc123    # Limpar regras de uma empresa
`);
  process.exit(0);
}

const { Pool } = require('pg');

async function main() {
  console.log('🧹 Script de Limpeza de Regras de Categorização');
  console.log('='.repeat(50));
  console.log(`🔍 Modo: ${flags.dryRun ? 'simulação' : 'execução'}`);
  if (flags.aiOnly) console.log('🤖 Filtrando apenas regras de IA');
  if (companyId) console.log(`🏢 Empresa: ${companyId}`);

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    // Construir WHERE clause
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (flags.aiOnly) {
      conditions.push(`source_type = $${paramIdx}`);
      params.push('ai');
      paramIdx++;
    }

    if (companyId) {
      conditions.push(`company_id = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Contar regras
    const countResult = await client.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE source_type = 'ai') as ai_rules,
        COUNT(*) FILTER (WHERE source_type = 'manual') as manual_rules,
        COUNT(*) FILTER (WHERE source_type = 'imported') as imported_rules
      FROM financeai_category_rules ${whereClause}`,
      params
    );

    const stats = countResult.rows[0];

    console.log('\n📊 Regras encontradas:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   - IA: ${stats.ai_rules}`);
    console.log(`   - Manual: ${stats.manual_rules}`);
    console.log(`   - Importadas: ${stats.imported_rules}`);

    if (parseInt(stats.total) === 0) {
      console.log('\n✅ Nenhuma regra encontrada para limpar');
      return;
    }

    // Contar regras a serem removidas
    const toRemoveResult = await client.query(
      `SELECT COUNT(*) as count FROM financeai_category_rules ${whereClause}`,
      params
    );
    const toRemove = toRemoveResult.rows[0].count;

    console.log(`\n🗑️  Regras a serem removidas: ${toRemove}`);

    if (flags.dryRun) {
      console.log('\n✨ Modo simulação - nenhuma alteração realizada');
      console.log('💡 Execute sem --dry-run para remover as regras');
      return;
    }

    // Confirmação
    console.log('\n⚠️  ATENÇÃO: Esta operação é irreversível!');
    console.log('Pressione ENTER para confirmar ou CTRL+C para cancelar');

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        process.stdin.pause();
        resolve();
      });
    });

    // Deletar regras
    console.log('\n🧹 Removendo regras...');
    const deleteResult = await client.query(
      `DELETE FROM financeai_category_rules ${whereClause}`,
      params
    );

    console.log(`\n✅ ${deleteResult.rowCount} regras removidas com sucesso!`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    await pool.end();
  }
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
