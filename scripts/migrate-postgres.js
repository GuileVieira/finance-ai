/**
 * Script para migrar o banco de dados PostgreSQL
 * Execute: pnpm db:migrate:custom
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function migrateDatabase() {
  console.log('🚀 Migrando banco de dados PostgreSQL...');

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não encontrada no .env');
    }

    console.log(`📍 Conectando ao PostgreSQL: ${databaseUrl}`);

    const db = drizzle(databaseUrl);

    // Executar migração
    console.log('📝 Criando tabelas com prefixo financeAI__...');

    await migrate(db, { migrationsFolder: './lib/db/migrations' });

    console.log('✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

// Executar migração
migrateDatabase().then(() => {
  console.log('\n✅ Script concluído');
  process.exit(0);
});