
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { db } from '@/lib/db/drizzle';
import { companies, accounts, categories, transactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing PR1: History Isolation (No Leaking) ---');

  // 1. Setup two companies
  const companyAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const companyBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  // Cleanup if exists
  await db.delete(transactions).execute();
  await db.delete(categories).execute();
  await db.delete(accounts).execute();
  await db.delete(companies).where(eq(companies.id, companyAId)).execute();
  await db.delete(companies).where(eq(companies.id, companyBId)).execute();

  console.log('Creating Test Data...');
  await db.insert(companies).values([
    { id: companyAId, name: 'Company A' },
    { id: companyBId, name: 'Company B' }
  ]);

  const accountAId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  const accountBId = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';

  await db.insert(accounts).values([
    { id: accountAId, companyId: companyAId, name: 'Acc A', bankName: 'Bank', bankCode: '001', accountNumber: '123' },
    { id: accountBId, companyId: companyBId, name: 'Acc B', bankName: 'Bank', bankCode: '001', accountNumber: '456' }
  ]);

  const categoryAId = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1';
  await db.insert(categories).values([
    { id: categoryAId, companyId: companyAId, name: 'Aluguel', type: 'expense' }
  ]);

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  const pastDateStr = pastDate.toISOString().split('T')[0];

  // Insert past transaction in Company A
  await db.insert(transactions).values([
    {
      accountId: accountAId,
      categoryId: categoryAId,
      description: 'PAGAMENTO ALUGUEL SALA 101',
      amount: '-1000.00',
      type: 'debit',
      transactionDate: pastDateStr,
      confidence: '100.00'
    }
  ]);

  console.log('Data seeded. Testing isolation...');

  // Test: Try to categorize a similar transaction for Company B
  const context = {
    description: 'PAGAMENTO ALUGUEL SALA 101',
    amount: -1000.00,
    memo: ''
  };

  const resultB = await TransactionCategorizationService.categorize(context, {
    companyId: companyBId,
    skipCache: true,
    skipRules: true,
    skipAI: true, // Only test history
    confidenceThreshold: 70
  });

  console.log(`Company B Result: Source=${resultB.source}, Category=${resultB.categoryName}, Confidence=${resultB.confidence}`);

  if (resultB.source === 'history') {
    console.error('❌ FAILED: Company B pulled history from Company A!');
    process.exit(1);
  } else {
    console.log('✅ PASS: Company B did NOT pull history from Company A.');
  }

  // Test: Try for Company A (should find history)
  const resultA = await TransactionCategorizationService.categorize(context, {
    companyId: companyAId,
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
    process.exit(1);
  }

  console.log('--- Isolation Test Complete ---');
  
  // Clean up
  await db.delete(transactions).execute();
  await db.delete(categories).execute();
  await db.delete(accounts).execute();
  await db.delete(companies).where(eq(companies.id, companyAId)).execute();
  await db.delete(companies).where(eq(companies.id, companyBId)).execute();
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
