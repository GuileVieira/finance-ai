/**
 * Script para corrigir o campo confidence de decimal(3,2) para decimal(5,2)
 * Execute: node scripts/fix-confidence-field.mjs
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
import { existsSync } from 'fs';

// Carregar .env.local se existir, senão tentar .env
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
} else if (existsSync('.env')) {
  config({ path: '.env' });
}

async function applyFix() {
  try {
    console.log('🔧 Aplicando correção do campo confidence...');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não encontrada no .env.local');
    }

    console.log(`📍 Conectando ao PostgreSQL...`);
    const db = drizzle(databaseUrl);

    // Aplicar a alteração diretamente
    await db.execute(sql`
      ALTER TABLE financeai_transactions
      ALTER COLUMN confidence TYPE numeric(5, 2)
    `);

    console.log('✅ Campo confidence corrigido!');
    console.log('   Antes: decimal(3,2) - Range: 0.00 a 9.99');
    console.log('   Depois: decimal(5,2) - Range: 0.00 a 999.99');
    console.log('   ✅ Agora aceita valores de 0-100% corretamente');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao aplicar correção:', error.message);
    if (error.code) {
      console.error(`   Código do erro: ${error.code}`);
    }
    process.exit(1);
  }
}

applyFix();
