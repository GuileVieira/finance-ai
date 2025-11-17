/**
 * Script standalone para corrigir campo confidence
 */

import { config } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

// Carregar .env
config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrado no .env');
  process.exit(1);
}

async function fixConfidence() {
  const pool = new Pool({
    connectionString: DATABASE_URL
  });

  try {
    console.log('🔍 Verificando configuração do campo confidence...\n');

    // Consultar configuração atual
    const checkResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'financeai_transactions'
        AND column_name = 'confidence'
    `);

    if (checkResult.rows.length > 0) {
      const col = checkResult.rows[0];
      console.log('📊 Configuração ANTES:');
      console.log(`   Tipo: ${col.data_type}`);
      console.log(`   Precisão: ${col.numeric_precision}`);
      console.log(`   Escala: ${col.numeric_scale}`);
      console.log('');

      if (col.numeric_precision === 3 && col.numeric_scale === 2) {
        console.log('❌ PROBLEMA ENCONTRADO!');
        console.log('   Campo está como decimal(3,2) - aceita apenas -9.99 a 9.99');
        console.log('   Mas o sistema está tentando inserir valores como 76.5, 90, 95!');
        console.log('');
        console.log('🔧 Aplicando correção para decimal(5,2)...\n');

        // Aplicar correção
        await pool.query(`
          ALTER TABLE financeai_transactions
          ALTER COLUMN confidence TYPE numeric(5, 2)
        `);

        console.log('✅ Correção aplicada com sucesso!\n');

        // Verificar novamente
        const recheckResult = await pool.query(`
          SELECT numeric_precision, numeric_scale
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'financeai_transactions'
            AND column_name = 'confidence'
        `);

        const newCol = recheckResult.rows[0];
        console.log('📊 Configuração DEPOIS:');
        console.log(`   Precisão: ${newCol.numeric_precision}`);
        console.log(`   Escala: ${newCol.numeric_scale}`);
        console.log('');
        console.log('✅✅✅ PROBLEMA RESOLVIDO! ✅✅✅');
        console.log('');
        console.log('🚀 Agora você pode fazer upload do OFX novamente!');
        console.log('   As transações serão salvas corretamente.');
      } else if (col.numeric_precision === 5 && col.numeric_scale === 2) {
        console.log('✅ Campo JÁ está correto (5,2)!');
        console.log('   Range: -999.99 a 999.99');
        console.log('');
        console.log('⚠️ Se as inserções ainda estão falhando, pode ser outro problema.');
        console.log('   Verifique os logs para mais detalhes.');
      } else {
        console.log(`⚠️ Configuração inesperada: (${col.numeric_precision},${col.numeric_scale})`);
      }
    } else {
      console.log('❌ Coluna confidence não encontrada na tabela!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixConfidence()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
