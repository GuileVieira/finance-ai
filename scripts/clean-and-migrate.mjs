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
      'financeai_insight_thresholds',
      'drizzle_migrations'
    ];

    for (const table of tables) {
      console.log(`  Removendo: ${table}`);
      await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(table)} CASCADE`);
    }

    console.log('✅ Tabelas limpas');

    // Recriar tabelas lendo o arquivo SQL diretamente
    console.log('🏗️ Recriando tabelas lendo o arquivo SQL diretamente...');
    const path = await import('path');
    const fs = await import('fs');
    const migrationsDir = path.resolve(process.cwd(), 'lib/db/migrations');
    
    // Pegar o arquivo SQL mais recente (0000_...)
    const sqlFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    if (sqlFiles.length === 0) {
      throw new Error('Nenhum arquivo de migração .sql encontrado em lib/db/migrations');
    }

    const latestSqlFile = path.join(migrationsDir, sqlFiles[sqlFiles.length - 1]);
    console.log(`📜 Executando migração: ${path.basename(latestSqlFile)}`);
    
    const sqlContent = fs.readFileSync(latestSqlFile, 'utf8');
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
      } catch (err) {
        // Ignorar erro se a tabela/constraint já existe (preventivo)
        if (!err.message.includes('already exists')) {
          console.error(`❌ Erro no statement: ${statement.substring(0, 100)}...`);
          throw err;
        }
      }
    }
    
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