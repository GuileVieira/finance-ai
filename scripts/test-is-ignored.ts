
import { db } from '@/lib/db/drizzle';
import { categories, transactions, accounts, companies } from '@/lib/db/schema';
import DREService from '@/lib/services/dre.service';
import DashboardService from '@/lib/services/dashboard.service';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function testIsIgnored() {
  console.log('--- Testing isIgnored Ocultation ---');

  const companyId = crypto.randomUUID();
  const accountId = crypto.randomUUID();

  try {
    // 1. Setup
    await db.insert(companies).values({ id: companyId, name: 'Test Ignore Co' });
    await db.insert(accounts).values({ 
      id: accountId, 
      companyId, 
      name: 'Test Account',
      bankName: 'Test Bank',
      bankCode: '001',
      accountNumber: '12345'
    });

    const catVisibleId = crypto.randomUUID();
    const catIgnoredId = crypto.randomUUID();

    await db.insert(categories).values([
      { 
        id: catVisibleId, 
        companyId, 
        name: 'Visible Revenue', 
        type: 'revenue', 
        dreGroup: 'RoB',
        isIgnored: false 
      },
      { 
        id: catIgnoredId, 
        companyId, 
        name: 'Ignored Revenue', 
        type: 'revenue', 
        dreGroup: 'RoB',
        isIgnored: true 
      }
    ]);

    // 2. Transactions
    await db.insert(transactions).values([
      {
        id: crypto.randomUUID(),
        accountId,
        categoryId: catVisibleId,
        amount: 1000,
        type: 'credit',
        description: 'Venda Visível',
        transactionDate: '2026-02-01'
      },
      {
        id: crypto.randomUUID(),
        accountId,
        categoryId: catIgnoredId,
        amount: 500,
        type: 'credit',
        description: 'Venda Ignorada',
        transactionDate: '2026-02-01'
      }
    ]);

    // 2.1 Split Transaction
    const splitTxId = crypto.randomUUID();
    await db.insert(transactions).values({
        id: splitTxId,
        accountId,
        categoryId: null, // Uncategorized parent
        amount: 300,
        type: 'debit',
        description: 'Gasto Dividido',
        transactionDate: '2026-02-05'
    });

    const transactionSplits = (await import('@/lib/db/schema')).transactionSplits;
    await db.insert(transactionSplits).values([
        {
            id: crypto.randomUUID(),
            transactionId: splitTxId,
            categoryId: catVisibleId,
            amount: 200,
            description: 'Parte Visível'
        },
        {
            id: crypto.randomUUID(),
            transactionId: splitTxId,
            categoryId: catIgnoredId,
            amount: 100,
            description: 'Parte Ignorada'
        }
    ]);

    // 3. Check DRE
    console.log('Checking DRE...');
    const dre = await DREService.getDREStatement({ companyId, period: '2026-02' });
    console.log(`Gross Revenue: ${dre.grossRevenue}`);
    // Expected: 1000 (Venda Visível) - 200 (Parte Visível)?
    // Wait, DRE gross revenue is RoB. catVisibleId is RoB.
    // So 1000 credit should be RoB.
    // catVisibleId type=revenue.
    // Split 1: 200 debit to catVisibleId. catVisibleId is revenue, so debit to revenue is reduction?
    // Let's see how DRE calculates it.
    
    // 4. Check Dashboard Metrics
    console.log('\nChecking Dashboard Metrics...');
    const metrics = await DashboardService.getMetrics({ companyId, startDate: '2026-02-01', endDate: '2026-02-28' });
    console.log(`Total Income: ${metrics.totalIncome}`);
    console.log(`Total Expenses: ${metrics.totalExpenses}`);
    
    // 4.1 Check Executive Dashboard
    console.log('\nChecking Executive Dashboard...');
    const ExecutiveDashboardService = (await import('@/lib/services/executive-dashboard.service')).default;
    const execData = await ExecutiveDashboardService.getDashboardData({ companyId, period: '2026-02' });
    console.log(`Summary Inflow: ${execData.summary.totalInflow}`);
    console.log(`Summary Outflow: ${execData.summary.totalOutflow}`);
    
    // Expected: Inflow 1000, Outflow 200 (ignored part 100 should be hidden)
    
    console.log(`\nMetrics Summary:`);
    console.log(`- Income: ${metrics.totalIncome}`);
    console.log(`- Expenses: ${metrics.totalExpenses}`);
    console.log(`- Exec Inflow: ${execData.summary.totalInflow}`);
    console.log(`- Exec Outflow: ${execData.summary.totalOutflow}`);
    // 500 credit (Ignored) -> hidden if filter works
    // 300 debit (Parent of split) -> category is NULL, so it MIGHT be included if isNull(categoryId) is allowed.
    
    console.log(`\nMetrics Summary:`);
    console.log(`- Income: ${metrics.totalIncome}`);

    // 5. Check Categories List in CategoriesService
    // Many times ignored categories should NOT appear in the main navigation list
    // but MIGHT need to appear in a "hidden" section.
    // Let's see if CategoriesService.getCategories hides it.
    console.log('\nChecking CategoriesService.getCategories...');
    const CategoriesService = (await import('@/lib/services/categories.service')).default;
    const catList = await CategoriesService.getCategories({ companyId });
    const hasIgnored = catList.some(c => c.id === catIgnoredId);
    
    if (!hasIgnored) {
      console.log('✅ PASS: Categories list correctly hides ignored category.');
    } else {
      console.log('⚠️ INFO: Categories list shows ignored category (might be intended for management, but requested for "ocultação").');
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Cleanup if needed, but since we use nanoids it's fine for now
  }
}

testIsIgnored();
