#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../lib/db/schema';
import { mockCategories } from '../lib/mock-categories';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const db = drizzle(databaseUrl, { schema });

async function seed() {
  console.log('🧹 Clearing all tables...');
  
  const tables = [
    'financeai_ai_usage_logs',
    'financeai_insight_thresholds',
    'financeai_projections',
    'financeai_rule_feedback',
    'financeai_transaction_splits',
    'financeai_transactions',
    'financeai_category_rules',
    'financeai_transaction_clusters',
    'financeai_processing_batches',
    'financeai_uploads',
    'financeai_categories',
    'financeai_accounts',
    'financeai_user_companies',
    'financeai_companies',
    'financeai_users',
    'financeai_ai_model_pricing'
  ];

  for (const table of tables) {
    try {
      console.log(`  Deleting data from: ${table}`);
      await db.execute(sql`DELETE FROM ${sql.identifier(table)} CASCADE`);
    } catch (error) {
      console.log(`  ⚠️  Table ${table} not found or could not be cleared, skipping...`);
    }
  }
  
  console.log('✅ Tables cleared.');

  console.log('👤 Creating test user...');
  const passwordHash = await bcrypt.hash('Gxh3xO9BD', 10);
  const [user] = await db.insert(schema.users).values({
    name: 'usuario',
    email: 'empresa@teste.com',
    passwordHash: passwordHash,
    isSuperAdmin: true,
    active: true,
  }).returning();
  console.log(`✅ User created: ${user.email}`);

  console.log('🏢 Creating test company...');
  const [company] = await db.insert(schema.companies).values({
    name: 'empresa XPTO',
    cnpj: '12345678000199',
    corporateName: 'EMPRESA XPTO LTDA',
    active: true,
  }).returning();
  console.log(`✅ Company created: ${company.name}`);

  console.log('🔗 Linking user to company...');
  await db.insert(schema.userCompanies).values({
    userId: user.id,
    companyId: company.id,
    role: 'owner',
    isDefault: true,
  });
  console.log('✅ User linked to company');

  console.log('📊 Seeding categories...');
  const categoriesToInsert = mockCategories.map(cat => ({
    companyId: company.id,
    name: cat.name,
    description: cat.description,
    type: cat.type,
    colorHex: cat.colorHex,
    categoryGroup: cat.categoryGroup,
    dreGroup: cat.dreGroup,
    icon: cat.icon,
    examples: cat.examples,
    isSystem: true,
    active: true
  }));
  await db.insert(schema.categories).values(categoriesToInsert);
  console.log(`✅ ${mockCategories.length} categories seeded`);

  console.log('🤖 Seeding AI pricing...');
  // Simple version of AI pricing seed
  const modelPricing = [
    { provider: 'openrouter', modelName: 'google/gemini-2.0-flash-exp', inputPrice: '0', outputPrice: '0' },
    { provider: 'openrouter', modelName: 'openai/gpt-4o-mini', inputPrice: '0.00015', outputPrice: '0.0006' },
  ];
  await db.insert(schema.aiModelPricing).values(modelPricing.map(m => ({
    provider: m.provider,
    modelName: m.modelName,
    inputPricePer1kTokens: m.inputPrice,
    outputPricePer1kTokens: m.outputPrice,
    active: true
  })));
  console.log('✅ AI pricing seeded');

  console.log('\n🎉 FULL SEED COMPLETED!');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
