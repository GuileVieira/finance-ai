
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { db } from '@/lib/db/drizzle';
import { companies, accounts, categories, transactions, categoryRules } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing PR2: Auto-Learning Isolation (Category disambiguation) ---');

  // 1. Setup two companies with the SAME category name
  const companyAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const companyBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const categoryName = 'Marketing';

  // Cleanup
  await db.delete(categoryRules).execute();
  await db.delete(categories).execute();
  await db.delete(companies).where(eq(companies.id, companyAId)).execute();
  await db.delete(companies).where(eq(companies.id, companyBId)).execute();

  await db.insert(companies).values([
    { id: companyAId, name: 'Company A' },
    { id: companyBId, name: 'Company B' }
  ]);

  const catAId = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1';
  const catBId = 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2';

  await db.insert(categories).values([
    { id: catAId, companyId: companyAId, name: categoryName, type: 'expense' },
    { id: catBId, companyId: companyBId, name: categoryName, type: 'expense' }
  ]);

  console.log('Test data created. Running auto-learning for Company B...');

  // 2. Call tryAutoLearning for Company B
  const service = TransactionCategorizationService as any;
  
  await service.tryAutoLearning(
    'FACEBOOK ADS PAYMENT',
    categoryName,
    companyBId,
    95, // High confidence to trigger direct rule creation
    'Reason'
  );

  // 3. Verify that the rule was created for Company B and catBId
  const rules = await db
    .select()
    .from(categoryRules)
    .where(eq(categoryRules.companyId, companyBId));

  console.log(`Rules found for Company B: ${rules.length}`);

  if (rules.length === 0) {
    console.error('❌ FAILED: No rule created for Company B');
    process.exit(1);
  }

  const rule = rules[0];
  console.log(`Rule Category ID: ${rule.categoryId}`);

  if (rule.categoryId === catBId) {
    console.log('✅ PASS: Auto-learning (direct rule) correctly linked to Company B category.');
  } else if (rule.categoryId === catAId) {
    console.error('❌ FAILED: Auto-learning (direct rule) leaked to Company A category!');
    process.exit(1);
  } else {
    console.error(`❌ FAILED: Unexpected category ID: ${rule.categoryId}`);
    process.exit(1);
  }

  // Final Cleanup
  await db.delete(categoryRules).where(eq(categoryRules.companyId, companyBId)).execute();
  await db.delete(categories).execute();
  await db.delete(companies).where(eq(companies.id, companyAId)).execute();
  await db.delete(companies).where(eq(companies.id, companyBId)).execute();
  
  console.log('--- Auto-Learning Isolation Test Complete ---');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
