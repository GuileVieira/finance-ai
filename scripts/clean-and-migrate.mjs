/**
 * Script para limpar e recriar banco de dados PostgreSQL
 * Execute: pnpm db:reset
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
import * as schema from '../lib/db/schema.ts';

config();
config({ path: '.env.local', override: true });

async function cleanAndMigrate() {
  console.log('🗑️ Limpando e recriando banco de dados...');

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não encontrada no .env');
    }

    console.log(`📍 Conectando ao PostgreSQL: ${databaseUrl}`);

    const db = drizzle(databaseUrl, { schema });

    // Limpar tabelas existentes
    console.log('🧹 Limpando tabelas existentes...');

    const tables = [
      'financeai_projections',
      'financeai_rule_feedback',
      'financeai_transaction_splits',
      'financeai_transaction_clusters',
      'financeai_ai_usage_logs',
      'financeai_processing_batches',
      'financeai_uploads',
      'financeai_category_rules',
      'financeai_transactions',
      'financeai_categories',
      'financeai_accounts',
      'financeai_user_companies',
      'financeai_companies',
      'financeai_users',
      'financeai_ai_model_pricing',
      'financeai_insight_thresholds'
    ];

    for (const table of tables) {
      console.log(`  Removendo: ${table}`);
      await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(table)} CASCADE`);
    }

    console.log('✅ Tabelas limpas');

    // Recriar tabelas com migrate
    console.log('🏗️ Recriando tabelas com migrate...');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    console.log('✅ Tabelas recriadas com sucesso!');

    console.log('\n🎉 Banco de dados recriado com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

cleanAndMigrate().then(() => {
  console.log('\n✅ Script concluído');
  process.exit(0);
});