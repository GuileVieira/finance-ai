
import 'dotenv/config';
import { db } from '@/lib/db/connection';
import { transactions, accounts, companies, categories } from '@/lib/db/schema';
import TransactionsService from '@/lib/services/transactions.service';
import { eq, sql } from 'drizzle-orm';

async function verify() {
    console.log('🔄 Starting verification...');

    // 1. Setup Data
    const companyId = '550e8400-e29b-41d4-a716-446655440000'; // Mock/Stable UUID
    const accountId = '550e8400-e29b-41d4-a716-446655440001';
    const categoryId = '550e8400-e29b-41d4-a716-446655440002';

    // Clean up previous runs
    await db.delete(transactions).where(eq(transactions.description, 'TEST_SALDO_INICIAL'));
    await db.delete(categories).where(eq(categories.id, categoryId));
    await db.delete(accounts).where(eq(accounts.id, accountId));
    await db.delete(companies).where(eq(companies.id, companyId));

    // Create dependencies
    await db.insert(companies).values({
        id: companyId,
        name: 'Test Company',
    }).onConflictDoNothing();

    await db.insert(accounts).values({
        id: accountId,
        companyId,
        name: 'Test Account',
        bankName: 'Test Bank',
        bankCode: '000',
        accountNumber: '123',
    }).onConflictDoNothing();

    // Create categories using raw SQL to avoid schema mismatch
    await db.execute(sql`
    INSERT INTO financeai_categories (id, company_id, name, type)
    VALUES (${categoryId}, ${companyId}, 'Saldo Inicial', 'non_operational')
    ON CONFLICT (id) DO NOTHING
  `);

    console.log('✅ Test data created (Dependencies).');

    // 2. Measure Baseline (No Saldo Inicial)
    const baselineStats = await TransactionsService.getTransactionStats({
        companyId,
        startDate: '2000-01-01',
        endDate: '2099-12-31'
    });
    console.log('📊 Baseline Stats:', { totalCreditsValue: baselineStats.totalCreditsValue });

    // 3. Insert "Saldo Inicial" transaction
    await db.insert(transactions).values({
        accountId,
        categoryId,
        description: 'TEST_SALDO_INICIAL',
        amount: '1000.00',
        type: 'credit',
        transactionDate: new Date().toISOString().split('T')[0],
    });
    console.log('✅ "Saldo Inicial" transaction created.');

    // 4. Measure New Stats
    const newStats = await TransactionsService.getTransactionStats({
        companyId,
        startDate: '2000-01-01',
        endDate: '2099-12-31'
    });
    console.log('📊 New Stats:', { totalCreditsValue: newStats.totalCreditsValue });

    // 5. Assertions
    const diff = newStats.totalCreditsValue - baselineStats.totalCreditsValue;

    if (diff === 0) {
        console.log('✅ SUCCESS: "Saldo Inicial" excluded from credits (Diff is 0).');
    } else if (diff === 1000) {
        console.log('❌ FAILURE: "Saldo Inicial" included in credits (Diff is 1000).');
    } else {
        console.log(`⚠️ UNEXPECTED: Diff is ${diff}`);
    }

    // Cleanup
    await db.delete(transactions).where(eq(transactions.description, 'TEST_SALDO_INICIAL'));
    await db.delete(categories).where(eq(categories.id, categoryId));
    await db.delete(accounts).where(eq(accounts.id, accountId));
    await db.delete(companies).where(eq(companies.id, companyId));
}

verify().catch(console.error).finally(() => process.exit(0));
