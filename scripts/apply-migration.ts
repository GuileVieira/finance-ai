/**
 * Script para aplicar migração do sistema de regras inteligentes
 * Execute com: pnpm tsx scripts/apply-migration.ts
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function applyMigration() {
  console.log('🔄 Iniciando migração do sistema de regras inteligentes...\n');

  try {
    // 1. Criar tabela de feedback de regras
    console.log('📦 Criando tabela financeai_rule_feedback...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS financeai_rule_feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        rule_id uuid REFERENCES financeai_category_rules(id) ON DELETE cascade,
        transaction_id uuid REFERENCES financeai_transactions(id) ON DELETE SET NULL,
        feedback_type varchar(20) NOT NULL,
        old_category_id uuid REFERENCES financeai_categories(id) ON DELETE SET NULL,
        new_category_id uuid REFERENCES financeai_categories(id) ON DELETE SET NULL,
        description text,
        created_at timestamp DEFAULT now()
      )
    `);
    console.log('✅ Tabela financeai_rule_feedback criada\n');

    // 2. Criar tabela de clusters de transações
    console.log('📦 Criando tabela financeai_transaction_clusters...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS financeai_transaction_clusters (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        company_id uuid REFERENCES financeai_companies(id) ON DELETE cascade,
        centroid_description text NOT NULL,
        common_pattern varchar(500),
        transaction_count integer DEFAULT 0,
        category_id uuid REFERENCES financeai_categories(id) ON DELETE SET NULL,
        category_name varchar(100),
        confidence numeric(3, 2) DEFAULT 0.00,
        status varchar(20) DEFAULT 'pending',
        transaction_ids json,
        common_tokens json,
        created_at timestamp DEFAULT now(),
        processed_at timestamp
      )
    `);
    console.log('✅ Tabela financeai_transaction_clusters criada\n');

    // 3. Adicionar colunas novas à tabela category_rules (se não existirem)
    console.log('📝 Adicionando colunas à tabela financeai_category_rules...');

    const columnsToAdd = [
      { name: 'status', type: "varchar(20) DEFAULT 'active'" },
      { name: 'validation_count', type: 'integer DEFAULT 0' },
      { name: 'negative_count', type: 'integer DEFAULT 0' },
      { name: 'validation_threshold', type: 'integer DEFAULT 3' },
      { name: 'pattern_strategy', type: 'varchar(30)' },
      { name: 'parent_rule_id', type: 'uuid' },
      { name: 'pattern_variants', type: 'json' },
      { name: 'rule_metadata', type: 'json' }
    ];

    for (const col of columnsToAdd) {
      try {
        await db.execute(sql.raw(
          `ALTER TABLE financeai_category_rules ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
        ));
        console.log(`  ✅ Coluna ${col.name} adicionada`);
      } catch (error: unknown) {
        const err = error as { message?: string };
        if (err.message?.includes('already exists')) {
          console.log(`  ℹ️ Coluna ${col.name} já existe`);
        } else {
          console.error(`  ⚠️ Erro ao adicionar coluna ${col.name}:`, err.message);
        }
      }
    }

    // 4. Criar índices
    console.log('\n📊 Criando índices...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_rule_feedback_rule_id ON financeai_rule_feedback(rule_id)',
      'CREATE INDEX IF NOT EXISTS idx_rule_feedback_transaction_id ON financeai_rule_feedback(transaction_id)',
      'CREATE INDEX IF NOT EXISTS idx_rule_feedback_type ON financeai_rule_feedback(feedback_type)',
      'CREATE INDEX IF NOT EXISTS idx_rule_feedback_created_at ON financeai_rule_feedback(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_clusters_company_id ON financeai_transaction_clusters(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_clusters_category_id ON financeai_transaction_clusters(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_clusters_status ON financeai_transaction_clusters(status)',
      'CREATE INDEX IF NOT EXISTS idx_category_rules_status ON financeai_category_rules(status)'
    ];

    for (const indexSql of indexes) {
      try {
        await db.execute(sql.raw(indexSql));
        const indexName = indexSql.match(/idx_\w+/)?.[0] || 'index';
        console.log(`  ✅ Índice ${indexName} criado`);
      } catch (error: unknown) {
        const err = error as { message?: string };
        if (err.message?.includes('already exists')) {
          const indexName = indexSql.match(/idx_\w+/)?.[0] || 'index';
          console.log(`  ℹ️ Índice ${indexName} já existe`);
        } else {
          console.error('  ⚠️ Erro ao criar índice:', err.message);
        }
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n📋 Resumo:');
    console.log('  - Tabela financeai_rule_feedback: para feedback de regras');
    console.log('  - Tabela financeai_transaction_clusters: para clustering de transações');
    console.log('  - Colunas adicionadas em category_rules: status, validation_count, etc.');
    console.log('  - Índices criados para otimização de queries');

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error);
    process.exit(1);
  }

  process.exit(0);
}

applyMigration();
