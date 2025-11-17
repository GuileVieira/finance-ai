/**
 * Script para verificar a configuração atual do campo confidence
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function checkColumn() {
  try {
    // Criar pool de conexão
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    const db = drizzle({ client: pool });

    console.log('🔍 Verificando configuração do campo confidence...\n');

    // Consultar informações da coluna
    const result = await db.execute(sql`
      SELECT
        column_name,
        data_type,
        numeric_precision,
        numeric_scale,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'financeai_transactions'
        AND column_name = 'confidence'
    `);

    if (result.rows.length > 0) {
      const col = result.rows[0];
      console.log('📊 Configuração atual:');
      console.log(`   Tipo: ${col.data_type}`);
      console.log(`   Precisão: ${col.numeric_precision}`);
      console.log(`   Escala: ${col.numeric_scale}`);
      console.log(`   Nullable: ${col.is_nullable}`);
      console.log('');

      if (col.numeric_precision === 3 && col.numeric_scale === 2) {
        console.log('❌ PROBLEMA ENCONTRADO!');
        console.log('   O campo ainda está como decimal(3,2)');
        console.log('   Range atual: -9.99 a 9.99');
        console.log('   Valores sendo inseridos: 76.5, 90, 95 (MUITO MAIOR!)');
        console.log('');
        console.log('🔧 Solução: Executar ALTER TABLE para corrigir');
      } else if (col.numeric_precision === 5 && col.numeric_scale === 2) {
        console.log('✅ Campo está correto!');
        console.log('   Range: -999.99 a 999.99');
        console.log('   Aceita valores de 0-100 corretamente');
      }
    } else {
      console.log('❌ Coluna confidence não encontrada!');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkColumn();
