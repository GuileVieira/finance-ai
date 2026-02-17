import { db } from '../lib/db/drizzle';
import { transactions, categories, accounts, transactionSplits } from '../lib/db/schema';
import { eq, and, sql, sum, count } from 'drizzle-orm';
import { getFinancialExclusionClause } from '../lib/services/financial-exclusion';

async function debug() {
  console.log('--- Debugging isIgnored Ocultation ---');
  
  const companyId = 'b4a0950f-5a27-4851-a83e-3a311a5bce37';
  
  await db.transaction(async (tx) => {
    // Setup
    const [accountId] = await tx.insert(accounts).values({
      id: crypto.randomUUID(),
      companyId: companyId,
      name: 'Debug Account',
      bankName: 'Debug Bank',
      bankCode: '000',
      accountNumber: 'debug-acc',
      type: 'checking',
      active: true,
    }).returning({ id: accounts.id });

    const [normalCatId] = await tx.insert(categories).values({
      id: crypto.randomUUID(),
      companyId: companyId,
      name: 'Normal Category',
      type: 'revenue',
      isIgnored: false,
      active: true,
    }).returning({ id: categories.id });

    const [ignoredCatId] = await tx.insert(categories).values({
      id: crypto.randomUUID(),
      companyId: companyId,
      name: 'Ignored Category',
      type: 'revenue',
      isIgnored: true,
      active: true,
    }).returning({ id: categories.id });

    const splitTxId = crypto.randomUUID();
    await tx.insert(transactions).values({
      id: splitTxId,
      accountId: accountId.id,
      categoryId: normalCatId.id,
      amount: 1000,
      type: 'credit',
      description: 'Split Transaction Base',
      transactionDate: '2026-02-15',
    });

    await tx.insert(transactionSplits).values([
      { transactionId: splitTxId, categoryId: normalCatId.id, amount: 800, description: 'Normal Split' },
      { transactionId: splitTxId, categoryId: ignoredCatId.id, amount: 200, description: 'Ignored Split' }
    ]);

    // Subquery matching DashboardService
    const subquery = sql`(
      SELECT t.id as transaction_id, t.category_id as category_id, t.amount as amount_to_sum, t.type as type_to_sum, t.transaction_date, t.account_id, t.description
      FROM ${transactions} t
      WHERE t.id NOT IN (SELECT transaction_id FROM ${transactionSplits})
      UNION ALL
      SELECT ts.transaction_id, ts.category_id, ts.amount as amount_to_sum, t.type as type_to_sum, t.transaction_date, t.account_id, COALESCE(ts.description, t.description) as description
      FROM ${transactionSplits} ts JOIN ${transactions} t ON ts.transaction_id = t.id
    ) as combined_transactions`;

    // Test query matching DashboardService.getMetrics
    const query = tx.select({
      totalIncome: sum(sql`CASE WHEN type_to_sum = 'credit' THEN amount_to_sum ELSE 0 END`).mapWith(Number),
      transactionCount: count(sql`transaction_id`).mapWith(Number),
      rows: sql`json_agg(json_build_object('amount', amount_to_sum, 'is_ignored', ${categories.isIgnored}, 'cat_name', ${categories.name}))`
    })
    .from(subquery)
    .leftJoin(accounts, eq(sql`combined_transactions.account_id`, accounts.id))
    .leftJoin(categories, eq(sql`combined_transactions.category_id`, categories.id))
    .where(and(
      eq(accounts.companyId, companyId),
      getFinancialExclusionClause({ descriptionColumn: sql`combined_transactions.description` })
    ));

    const result = await query;
    console.log('SQL:', query.toSQL());
    console.log('Result:', result[0]);

    tx.rollback();
  });
}

debug().catch(console.error);
