
import { db } from '@/lib/db/drizzle';
import { transactions, categories, accounts, companies } from '@/lib/db/schema';
import ExecutiveDashboardService from '@/lib/services/executive-dashboard.service';
import { eq, ilike, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function runTest() {
    console.log('🧪 Starting PR1 Verification: Signed DRE Values');

    // 1. Setup Data
    console.log('📝 Setting up test data...');
    
    // Get or create a test company
    let company = await db.query.companies.findFirst({
        where: eq(companies.name, 'TEST_COMPANY_PR1')
    });

    if (!company) {
        const res = await db.insert(companies).values({
            name: 'TEST_COMPANY_PR1',
            cnpj: '00000000000000'
        }).returning();
        company = res[0];
    }
    
    console.log('Company:', company);

    // Get or create account
    let account = await db.query.accounts.findFirst({
        where: eq(accounts.companyId, company.id)
    });


    if (!account) {
        [account] = await db.insert(accounts).values({
            companyId: company.id,
            name: 'TEST_ACCOUNT',
            bankName: 'TEST',
            bankCode: '000',
            accountNumber: '123'
        }).returning();
    }

    // Create Categories with specific DRE groups
    const catRevenue = await createOrGetCategory(company.id, 'Test Revenue', 'RoB', 'revenue');
    const catCost = await createOrGetCategory(company.id, 'Test Cost', 'CF', 'fixed_cost');

    // Create Transactions
    const today = new Date().toISOString().split('T')[0];
    
    // Cleanup previous test txs
    await db.delete(transactions).where(ilike(transactions.description, 'TEST_PR1_%'));

    await db.insert(transactions).values([
        {
            accountId: account.id,
            categoryId: catRevenue.id,
            amount: '1000.00',
            type: 'credit', // Revenue is credit
            transactionDate: today,
            description: 'TEST_PR1_REVENUE',
        },
        {
            accountId: account.id,
            categoryId: catCost.id,
            amount: '500.00',
            type: 'debit', // Cost is debit
            transactionDate: today,
            description: 'TEST_PR1_COST',
        }
    ]);

    // 2. Run Service
    console.log('🚀 Calling ExecutiveDashboardService.getDashboardData...');
    const result = await ExecutiveDashboardService.getDashboardData({
        companyId: company.id,
        period: 'today'
    });

    // 3. Verify Results
    console.log('🔍 Verifying Results...');
    
    const robRow = result.dreTable.find(r => r.group === 'RoB');
    const cfRow = result.dreTable.find(r => r.group === 'CF');

    console.log('RoB Row:', robRow);
    console.log('CF Row:', cfRow);

    let failed = false;

    // Check Revenue (Should be positive 1000)
    if (robRow?.actual !== 1000) {
        console.error(`❌ FAILED: RoB should be 1000, got ${robRow?.actual}`);
        failed = true;
    } else {
        console.log('✅ RoB Sign Correct (+1000)');
    }

    // Check Cost (Should be NEGATIVE -500)
    if (cfRow?.actual !== -500) {
        console.error(`❌ FAILED: CF should be -500, got ${cfRow?.actual}. (Did you remove Math.abs?)`);
        failed = true;
    } else {
        console.log('✅ CF Sign Correct (-500)');
    }

    // Check Labels
    if (robRow?.label !== 'Receita Operacional Bruta') {
         console.error(`❌ FAILED: RoB Label mismatch. Got '${robRow?.label}'`);
         failed = true;
    } else {
        console.log('✅ RoB Label Correct');
    }

    if (failed) {
        console.error('💥 Test Failed');
        process.exit(1);
    } else {
        console.log('🎉 Test Passed: Signals are correct!');
        process.exit(0);
    }
}

async function createOrGetCategory(companyId: string, name: string, dreGroup: string, type: string) {
    console.log(`[createOrGetCategory] Called with: companyId=${companyId} (${typeof companyId}), name=${name}`);
    if (!companyId) throw new Error('companyId is missing!');

async function createOrGetCategory(companyId: string, name: string, dreGroup: string, type: string) {
    console.log(`[createOrGetCategory] Called with: companyId=${companyId} (${typeof companyId}), name=${name}`);
    if (!companyId) throw new Error('companyId is missing!');

    const [cat] = await db.select().from(categories).where(and(
        eq(categories.companyId, companyId),
        eq(categories.name, name)
    )).limit(1);

    if (!cat) { // Insert if not exists
        const [newCat] = await db.insert(categories).values({
            companyId,
            name,
            type,
            dreGroup,
            active: true
        }).returning();
        return newCat;
    }
    return cat;
}
}

runTest().catch(console.error);
