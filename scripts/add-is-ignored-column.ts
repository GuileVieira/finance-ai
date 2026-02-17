import * as dotenv from 'dotenv';
import path from 'path';
import { pgTable, varchar, text, uuid, timestamp, boolean, decimal, integer, json, pgEnum, AnyPgColumn, index } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql, ilike, eq } from 'drizzle-orm';

// Carregar variáveis de ambiente ANTES de qualquer coisa
dotenv.config({ path: path.join(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada no arquivo .env');
  process.exit(1);
}

// Definir o schema minimalista aqui para evitar imports circulares ou problemas de env
const categories = pgTable('financeai_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  isIgnored: boolean('is_ignored').default(false),
  active: boolean('active').default(true),
});

async function applyMigration() {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    console.log('🚀 Iniciando script de migração para Hidden Categories...');
    
    // 1. Adicionar a coluna is_ignored via SQL puro
    console.log('➕ Adicionando coluna is_ignored...');
    await db.execute(sql`
      ALTER TABLE financeai_categories 
      ADD COLUMN IF NOT EXISTS is_ignored BOOLEAN DEFAULT false;
    `);
    
    // 2. Criar o índice via SQL puro
    console.log('📑 Criando índice idx_categories_is_ignored...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_categories_is_ignored 
      ON financeai_categories (is_ignored);
    `);
    
    console.log('✅ Estrutura de banco atualizada!');

    // 3. Marcar categorias que contêm "Saldo" como ignoradas por padrão
    console.log('🔄 Localizando e marcando categorias de "Saldo"...');
    
    const result = await db.update(categories)
      .set({ isIgnored: true })
      .where(ilike(categories.name, '%Saldo%'))
      .returning({ name: categories.name });
    
    if (result.length > 0) {
      console.log(`✅ ${result.length} categorias marcadas como ignoradas:`);
      result.forEach(c => console.log(`   - ${c.name}`));
    } else {
      console.log('ℹ️ Nenhuma categoria com "Saldo" encontrada para atualizar.');
    }
    
    await pool.end();
    console.log('🏁 Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
