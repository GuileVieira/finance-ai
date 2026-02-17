import ExecutiveDashboardService from '@/lib/services/executive-dashboard.service';
import { db } from '@/lib/db/drizzle';
import { companies, accounts, categories } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TEST_COMPANY_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const TEST_ACCOUNT_ID = 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
const TEST_CATEGORY_ID = 'd2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2';

async function cleanup() {
  await db.execute(sql`DELETE FROM financeai_transactions WHERE account_id = ${TEST_ACCOUNT_ID}`);
  await db.delete(categories).where(eq(categories.id, TEST_CATEGORY_ID)).execute();
  await db.delete(accounts).where(eq(accounts.id, TEST_ACCOUNT_ID)).execute();
  await db.delete(companies).where(eq(companies.id, TEST_COMPANY_ID)).execute();
}

async function runTest() {
  console.log('--- Testing DRE Unclassified (NC) Hardening ---');

  // Cleanup before test
  await cleanup();

  // 1. Create test company + account + category (RoB)
  console.log('Creating test data...');
  await db.insert(companies).values({
    id: TEST_COMPANY_ID,
    name: 'DRE Test Company',
  });

  await db.insert(accounts).values({
    id: TEST_ACCOUNT_ID,
    companyId: TEST_COMPANY_ID,
    name: 'DRE Test Account',
    bankName: 'TestBank',
    bankCode: '999',
    accountNumber: '999999',
  });

  await db.insert(categories).values({
    id: TEST_CATEGORY_ID,
    companyId: TEST_COMPANY_ID,
    name: 'Receita de Vendas',
    type: 'income',
    dreGroup: 'RoB',
    active: true,
    isIgnored: false,
  });

  // 2. Insert transactions using raw SQL (schema may have columns not yet in DB)
  const transactionDate = '2026-01-15';

  // Classified credit transaction (RoB) - 1000
  await db.execute(sql`
    INSERT INTO financeai_transactions (account_id, category_id, description, amount, type, transaction_date)
    VALUES (${TEST_ACCOUNT_ID}, ${TEST_CATEGORY_ID}, 'VENDA PRODUTO X', 1000.00, 'credit', ${transactionDate})
  `);

  // Unclassified credit transaction - 500 (no category)
  await db.execute(sql`
    INSERT INTO financeai_transactions (account_id, category_id, description, amount, type, transaction_date)
    VALUES (${TEST_ACCOUNT_ID}, NULL, 'DEPOSITO AVULSO', 500.00, 'credit', ${transactionDate})
  `);

  // Unclassified debit transaction - 200 (no category)
  await db.execute(sql`
    INSERT INTO financeai_transactions (account_id, category_id, description, amount, type, transaction_date)
    VALUES (${TEST_ACCOUNT_ID}, NULL, 'PAGAMENTO DIVERSO', 200.00, 'debit', ${transactionDate})
  `);

  console.log('Test data created. Calling getDashboardData...');

  // 3. Call the dashboard service
  const result = await ExecutiveDashboardService.getDashboardData({
    companyId: TEST_COMPANY_ID,
    period: '2026-01',
  });

  const dreTable = result.dreTable;
  console.log('DRE Table:', JSON.stringify(dreTable, null, 2));

  let passed = true;

  // 4. Assert: RoB line has actual: 1000
  const robLine = dreTable.find(r => r.group === 'RoB');
  if (robLine && robLine.actual === 1000) {
    console.log('✅ PASS: RoB line = 1000');
  } else {
    console.error(`❌ FAIL: RoB expected 1000, got ${robLine?.actual}`);
    passed = false;
  }

  // 5. Assert: NC line exists with actual: 300 (500 credit - 200 debit)
  const ncLine = dreTable.find(r => r.group === 'NC');
  if (ncLine && ncLine.actual === 300) {
    console.log('✅ PASS: NC (Não classificado) line = 300');
  } else {
    console.error(`❌ FAIL: NC expected 300, got ${ncLine?.actual ?? 'NOT FOUND'}`);
    passed = false;
  }

  // 6. Assert: RO does NOT include the 300 from unclassified
  // RO = RoB + TDCF = 1000 + 0 = 1000
  const roLine = dreTable.find(r => r.group === 'RO');
  if (roLine && roLine.actual === 1000) {
    console.log('✅ PASS: RO = 1000 (unclassified NOT included)');
  } else {
    console.error(`❌ FAIL: RO expected 1000, got ${roLine?.actual ?? 'NOT FOUND'}`);
    passed = false;
  }

  // 7. Assert: derived lines (MC, EBIT, LLE) also don't include NC
  const mcLine = dreTable.find(r => r.group === 'MC');
  if (mcLine && mcLine.actual === 1000) {
    console.log('✅ PASS: MC = 1000 (unclassified NOT included)');
  } else {
    console.error(`❌ FAIL: MC expected 1000, got ${mcLine?.actual ?? 'NOT FOUND'}`);
    passed = false;
  }

  const ebitLine = dreTable.find(r => r.group === 'EBIT');
  if (ebitLine && ebitLine.actual === 1000) {
    console.log('✅ PASS: EBIT = 1000 (unclassified NOT included)');
  } else {
    console.error(`❌ FAIL: EBIT expected 1000, got ${ebitLine?.actual ?? 'NOT FOUND'}`);
    passed = false;
  }

  const lleLine = dreTable.find(r => r.group === 'LLE');
  if (lleLine && lleLine.actual === 1000) {
    console.log('✅ PASS: LLE = 1000 (unclassified NOT included)');
  } else {
    console.error(`❌ FAIL: LLE expected 1000, got ${lleLine?.actual ?? 'NOT FOUND'}`);
    passed = false;
  }

  // Cleanup
  await cleanup();

  if (!passed) {
    console.error('\n❌ Some tests FAILED!');
    process.exit(1);
  }

  console.log('\n✅ All DRE NC hardening tests PASSED!');
  console.log('--- DRE NC Test Complete ---');
}

runTest().catch(err => {
  console.error('Test error:', err);
  cleanup().finally(() => process.exit(1));
});
