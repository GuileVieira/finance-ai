
import DREService from '@/lib/services/dre.service';
import { db } from '@/lib/db/drizzle';
import { companies, accounts, categories, transactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function runTest() {
  console.log('--- Testing PR4: DRE Unclassified Isolation ---');

  const companyId = uuidv4();
  const accountId = uuidv4();

  try {
    // 1. Setup
    await db.insert(companies).values({
      id: companyId,
      name: 'Test Company PR4',
    });

    await db.insert(accounts).values({
      id: accountId,
      companyId,
      name: 'Main Account',
      bankName: 'Test Bank',
      bankCode: '001',
      accountNumber: '12345-6',
      active: true,
    });

    const categoryId = uuidv4();
    await db.insert(categories).values({
      id: categoryId,
      companyId,
      name: 'Official Sales',
      type: 'revenue',
      dreGroup: 'RoB',
      active: true,
    });

    // 2. Insert Transactions
    // Classified Revenue: 1000
    await db.insert(transactions).values({
      id: uuidv4(),
      accountId,
      categoryId,
      amount: '1000.00',
      type: 'credit',
      description: 'Monthly Fee',
      transactionDate: new Date().toISOString().split('T')[0],
      verified: true,
    });

    // Unclassified Revenue: 500
    await db.insert(transactions).values({
      id: uuidv4(),
      accountId,
      categoryId: null, // Unclassified
      amount: '500.00',
      type: 'credit',
      description: 'Unknown Incoming',
      transactionDate: new Date().toISOString().split('T')[0],
      verified: false,
    });

    // Unclassified Expense: 200
    await db.insert(transactions).values({
      id: uuidv4(),
      accountId,
      categoryId: null, // Unclassified
      amount: '-200.00',
      type: 'debit',
      description: 'Unknown Expense',
      transactionDate: new Date().toISOString().split('T')[0],
      verified: false,
    });

    // 3. Run DRE
    const dre = await DREService.getDREStatement({ companyId, period: 'current' });

    console.log(`Period: ${dre.period}`);
    console.log(`Gross Revenue (RoB): ${dre.grossRevenue}`);
    console.log(`Unclassified Balance: ${dre.unclassified}`);

    // Assertions
    if (dre.grossRevenue === 1000) {
      console.log('✅ PASS: Gross Revenue only includes classified items (1000).');
    } else {
      console.error(`❌ FAILED: Gross Revenue is ${dre.grossRevenue}, expected 1000.`);
      process.exit(1);
    }

    if (dre.unclassified === 300) { // 500 - 200
      console.log('✅ PASS: Unclassified balance is correct (300).');
    } else {
      console.error(`❌ FAILED: Unclassified balance is ${dre.unclassified}, expected 300.`);
      process.exit(1);
    }

    if (dre.lineDetails?.unclassified && dre.lineDetails.unclassified.length === 2) {
      console.log('✅ PASS: Unclassified items present in lineDetails.');
    } else {
      console.error('❌ FAILED: lineDetails.unclassified missing or incorrect length.');
      process.exit(1);
    }

  } finally {
    // Cleanup
    await db.delete(transactions).where(eq(transactions.accountId, accountId)).execute();
    await db.delete(accounts).where(eq(accounts.id, accountId)).execute();
    await db.delete(categories).where(eq(categories.companyId, companyId)).execute();
    await db.delete(companies).where(eq(companies.id, companyId)).execute();
  }

  console.log('--- DRE Unclassified Isolation Test Complete ---');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
