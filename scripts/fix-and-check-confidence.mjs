/**
 * Script para verificar e corrigir o campo confidence
 */

import pg from 'pg';

const { Pool } = pg;

async function fixConfidence() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 Verificando configuração do campo confidence...\n');

    // Consultar informações da coluna
    const checkResult = await pool.query(`
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

    if (checkResult.rows.length > 0) {
      const col = checkResult.rows[0];
      console.log('📊 Configuração ANTES:');
      console.log(`   Tipo: ${col.data_type}`);
      console.log(`   Precisão: ${col.numeric_precision}`);
      console.log(`   Escala: ${col.numeric_scale}`);
      console.log('');

      if (col.numeric_precision === 3 && col.numeric_scale === 2) {
        console.log('❌ Campo incorreto! Aplicando correção...\n');

        // Aplicar a correção
        await pool.query(`
          ALTER TABLE financeai_transactions
          ALTER COLUMN confidence TYPE numeric(5, 2)
        `);

        console.log('✅ Correção aplicada!\n');

        // Verificar novamente
        const recheckResult = await pool.query(`
          SELECT numeric_precision, numeric_scale
          FROM information_schema.columns
          WHERE table_name = 'financeai_transactions'
            AND column_name = 'confidence'
        `);

        const newCol = recheckResult.rows[0];
        console.log('📊 Configuração DEPOIS:');
        console.log(`   Precisão: ${newCol.numeric_precision}`);
        console.log(`   Escala: ${newCol.numeric_scale}`);
        console.log(`   Range: -999.99 a 999.99`);
        console.log('   ✅ Agora aceita valores de 0-100 corretamente!');
      } else if (col.numeric_precision === 5 && col.numeric_scale === 2) {
        console.log('✅ Campo JÁ está correto!');
        console.log('   Range: -999.99 a 999.99');
        console.log('   Aceita valores de 0-100 corretamente');
        console.log('');
        console.log('⚠️ Se as transações ainda estão falhando, o problema é outro!');
      }
    } else {
      console.log('❌ Coluna confidence não encontrada!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixConfidence();
