/**
 * Script para corrigir campo confidence diretamente
 */

import { config } from 'dotenv';
config({ path: '.env' }); // Carregar .env ANTES de importar db

import { sql } from 'drizzle-orm';
import { db } from '../lib/db/connection';

async function fixConfidence() {
  try {
    if (!db) {
      throw new Error('Database connection not available. Check DATABASE_URL in environment.');
    }

    console.log('🔍 Verificando configuração do campo confidence...\n');

    // Consultar configuração atual
    const checkResult = await db.execute(sql`
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
      const col = checkResult.rows[0] as any;
      console.log('📊 Configuração ANTES:');
      console.log(`   Tipo: ${col.data_type}`);
      console.log(`   Precisão: ${col.numeric_precision}`);
      console.log(`   Escala: ${col.numeric_scale}`);
      console.log('');

      if (col.numeric_precision === 3 && col.numeric_scale === 2) {
        console.log('❌ Campo incorreto (3,2)! Valores acima de 9.99 vão falhar!');
        console.log('🔧 Aplicando correção para (5,2)...\n');

        // Aplicar correção
        await db.execute(sql`
          ALTER TABLE financeai_transactions
          ALTER COLUMN confidence TYPE numeric(5, 2)
        `);

        console.log('✅ Correção aplicada com sucesso!\n');

        // Verificar novamente
        const recheckResult = await db.execute(sql`
          SELECT numeric_precision, numeric_scale
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'financeai_transactions'
            AND column_name = 'confidence'
        `);

        const newCol = recheckResult.rows[0] as any;
        console.log('📊 Configuração DEPOIS:');
        console.log(`   Precisão: ${newCol.numeric_precision}`);
        console.log(`   Escala: ${newCol.numeric_scale}`);
        console.log('');
        console.log('✅ Problema resolvido! Agora pode fazer upload novamente.');
      } else if (col.numeric_precision === 5 && col.numeric_scale === 2) {
        console.log('✅ Campo JÁ está correto (5,2)!');
        console.log('');
        console.log('⚠️ Se as inserções ainda estão falhando, verifique:');
        console.log('   1. Se o servidor Next.js foi reiniciado após a correção');
        console.log('   2. Se há outro erro além do confidence');
      } else {
        console.log(`⚠️ Configuração inesperada: (${col.numeric_precision},${col.numeric_scale})`);
      }
    } else {
      console.log('❌ Coluna confidence não encontrada na tabela!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixConfidence();
