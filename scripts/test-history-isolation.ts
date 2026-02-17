
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { db } from '@/lib/db/drizzle';
import { companies, accounts, categories } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const COMPANY_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const COMPANY_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ACCOUNT_A_ID = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const ACCOUNT_B_ID = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
const CATEGORY_A_ID = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1';

async function cleanup() {
  // Delete only test data, never wipe entire tables
  await db.execute(sql`DELETE FROM financeai_transactions WHERE account_id IN (${ACCOUNT_A_ID}, ${ACCOUNT_B_ID})`);
  await db.delete(categories).where(eq(categories.id, CATEGORY_A_ID)).execute();
  await db.delete(accounts).where(eq(accounts.id, ACCOUNT_A_ID)).execute();
  await db.delete(accounts).where(eq(accounts.id, ACCOUNT_B_ID)).execute();
  await db.delete(companies).where(eq(companies.id, COMPANY_A_ID)).execute();
  await db.delete(companies).where(eq(companies.id, COMPANY_B_ID)).execute();
}

async function runTest() {
  console.log('--- Testing PR1: History Isolation (No Leaking) ---');

  // Cleanup before test
  await cleanup();

  console.log('Creating Test Data...');
  await db.insert(companies).values([
    { id: COMPANY_A_ID, name: 'Company A' },
    { id: COMPANY_B_ID, name: 'Company B' }
  ]);

  await db.insert(accounts).values([
    { id: ACCOUNT_A_ID, companyId: COMPANY_A_ID, name: 'Acc A', bankName: 'Bank', bankCode: '001', accountNumber: '123' },
    { id: ACCOUNT_B_ID, companyId: COMPANY_B_ID, name: 'Acc B', bankName: 'Bank', bankCode: '001', accountNumber: '456' }
  ]);

  await db.insert(categories).values([
    { id: CATEGORY_A_ID, companyId: COMPANY_A_ID, name: 'Aluguel', type: 'expense' }
  ]);

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  const pastDateStr = pastDate.toISOString().split('T')[0];

  // Insert past transaction in Company A using raw SQL (schema may have columns not yet in DB)
  await db.execute(sql`
    INSERT INTO financeai_transactions (account_id, category_id, description, amount, type, transaction_date, confidence)
    VALUES (${ACCOUNT_A_ID}, ${CATEGORY_A_ID}, 'PAGAMENTO ALUGUEL SALA 101', -1000.00, 'debit', ${pastDateStr}, 100.00)
  `);

  console.log('Data seeded. Testing isolation...');

  // Test: Try to categorize a similar transaction for Company B
  const context = {
    description: 'PAGAMENTO ALUGUEL SALA 101',
    amount: -1000.00,
    memo: ''
  };

  const resultB = await TransactionCategorizationService.categorize(context, {
    companyId: COMPANY_B_ID,
    skipCache: true,
    skipRules: true,
    skipAI: true, // Only test history
    confidenceThreshold: 70
  });

  console.log(`Company B Result: Source=${resultB.source}, Category=${resultB.categoryName}, Confidence=${resultB.confidence}`);

  let passed = true;

  if (resultB.source === 'history') {
    console.error('❌ FAILED: Company B pulled history from Company A!');
    passed = false;
  } else {
    console.log('✅ PASS: Company B did NOT pull history from Company A.');
  }

  // Test: Try for Company A (should find history)
  const resultA = await TransactionCategorizationService.categorize(context, {
    companyId: COMPANY_A_ID,
    skipCache: true,
    skipRules: true,
    skipAI: true,
    confidenceThreshold: 70
  });

  console.log(`Company A Result: Source=${resultA.source}, Category=${resultA.categoryName}, Confidence=${resultA.confidence}`);

  if (resultA.source === 'history' && resultA.categoryName === 'Aluguel') {
    console.log('✅ PASS: Company A found its own history.');
  } else {
    console.error('❌ FAILED: Company A did not find its own history.');
    passed = false;
  }

  // Clean up
  await cleanup();

  if (!passed) {
    console.error('\n❌ Some tests FAILED!');
    process.exit(1);
  }

  console.log('\n✅ All history isolation tests PASSED!');
  console.log('--- Isolation Test Complete ---');
}

runTest().catch(err => {
  console.error(err);
  cleanup().finally(() => process.exit(1));
});
