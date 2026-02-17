
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { db } from '@/lib/db/drizzle';
import { companies, categories, categoryRules } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const COMPANY_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const COMPANY_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CATEGORY_A_ID = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1';
const CATEGORY_B_ID = 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2';
const CATEGORY_NAME = 'Marketing';

async function cleanup() {
  // Delete only test data, never wipe entire tables
  await db.delete(categoryRules).where(eq(categoryRules.companyId, COMPANY_A_ID)).execute();
  await db.delete(categoryRules).where(eq(categoryRules.companyId, COMPANY_B_ID)).execute();
  await db.delete(categories).where(eq(categories.id, CATEGORY_A_ID)).execute();
  await db.delete(categories).where(eq(categories.id, CATEGORY_B_ID)).execute();
  await db.delete(companies).where(eq(companies.id, COMPANY_A_ID)).execute();
  await db.delete(companies).where(eq(companies.id, COMPANY_B_ID)).execute();
}

async function runTest() {
  console.log('--- Testing PR2: Auto-Learning Isolation (Category disambiguation) ---');

  // Cleanup before test
  await cleanup();

  await db.insert(companies).values([
    { id: COMPANY_A_ID, name: 'Company A' },
    { id: COMPANY_B_ID, name: 'Company B' }
  ]);

  await db.insert(categories).values([
    { id: CATEGORY_A_ID, companyId: COMPANY_A_ID, name: CATEGORY_NAME, type: 'expense' },
    { id: CATEGORY_B_ID, companyId: COMPANY_B_ID, name: CATEGORY_NAME, type: 'expense' }
  ]);

  console.log('Test data created. Running auto-learning for Company B...');

  // Call tryAutoLearning for Company B (private method, access via cast)
  const service = TransactionCategorizationService as unknown as {
    tryAutoLearning: (description: string, categoryName: string, companyId: string, confidence: number, reasoning?: string) => Promise<void>;
  };

  await service.tryAutoLearning(
    'FACEBOOK ADS PAYMENT',
    CATEGORY_NAME,
    COMPANY_B_ID,
    95, // High confidence to trigger direct rule creation
    'Reason'
  );

  // Verify that the rule was created for Company B with catBId
  const rules = await db
    .select()
    .from(categoryRules)
    .where(eq(categoryRules.companyId, COMPANY_B_ID));

  console.log(`Rules found for Company B: ${rules.length}`);

  let passed = true;

  if (rules.length === 0) {
    console.error('❌ FAILED: No rule created for Company B');
    passed = false;
  } else {
    const rule = rules[0];
    console.log(`Rule Category ID: ${rule.categoryId}`);

    if (rule.categoryId === CATEGORY_B_ID) {
      console.log('✅ PASS: Auto-learning correctly linked to Company B category.');
    } else if (rule.categoryId === CATEGORY_A_ID) {
      console.error('❌ FAILED: Auto-learning leaked to Company A category!');
      passed = false;
    } else {
      console.error(`❌ FAILED: Unexpected category ID: ${rule.categoryId}`);
      passed = false;
    }
  }

  // Clean up
  await cleanup();

  if (!passed) {
    console.error('\n❌ Some tests FAILED!');
    process.exit(1);
  }

  console.log('\n✅ All auto-learning isolation tests PASSED!');
  console.log('--- Auto-Learning Isolation Test Complete ---');
}

runTest().catch(err => {
  console.error(err);
  cleanup().finally(() => process.exit(1));
});
