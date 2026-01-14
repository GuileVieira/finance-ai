import 'dotenv/config';
import { db } from '@/lib/db/connection';
import { companies, accounts, transactions, categories } from '@/lib/db/schema';
import { eq, like, inArray, and, sql, not, ilike, or } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';

async function analyzeCategories() {
    await initializeDatabase();

    console.log('🔍 Analyzing transactions for generic categories and sampling data...\n');

    // 1. Check for Generic Categories
    const genericTerms = ['%outros%', '%geral%', '%diversos%', '%uncategorized%', '%não categorizado%'];
    const whereClause = or(...genericTerms.map(term => ilike(categories.name, term)));

    const genericTxs = await db
        .select({
            description: transactions.description,
            amount: transactions.amount,
            categoryName: categories.name,
            date: transactions.transactionDate,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(whereClause)
        .limit(20);

    if (genericTxs.length > 0) {
        console.log(`⚠️ Found transactions in GENERIC categories (often valid but worth reviewing):`);
        genericTxs.forEach(t => {
            console.log(`  - ${t.description} (${t.categoryName}) - R$ ${t.amount}`);
        });
        console.log('...\n');
    } else {
        console.log('✅ No transactions found in Generic/Undefined categories.\n');
    }

    // 2. Dump a sample or any big outliers (e.g. huge amount)
    const bigTxs = await db
        .select({
            description: transactions.description,
            amount: transactions.amount,
            categoryName: categories.name,
            type: transactions.type
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .orderBy(sql`${transactions.amount} DESC`)
        .limit(5);

    console.log('💰 Top 5 Highest Value Transactions (Check if categorization makes sense):');
    bigTxs.forEach(t => {
        console.log(`  - R$ ${t.amount} (${t.type}): ${t.description} -> ${t.categoryName}`);
    });

    process.exit(0);
}

analyzeCategories().catch(console.error);
