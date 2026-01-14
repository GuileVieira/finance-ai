
import 'dotenv/config';
import { db } from '@/lib/db/connection';
import { transactions, categories } from '@/lib/db/schema';
import { like, ilike, desc, eq, sql } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';

async function findSaldoArtifacts() {
    await initializeDatabase();

    console.log('🔍 Searching for transactions with "SALDO"...');

    const results = await db
        .select({
            id: transactions.id,
            description: transactions.description,
            amount: transactions.amount,
            date: transactions.transactionDate,
            category: categories.name,
            type: transactions.type
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(ilike(transactions.description, '%SALDO%'))
        .orderBy(desc(transactions.transactionDate))
        .limit(50);

    console.log(`Found ${results.length} transactions:`);
    results.forEach(t => {
        console.log(`[${t.date}] ${t.description} | R$ ${t.amount} (${t.type}) | Cat: ${t.category}`);
    });

    // Aggregate by description to find patterns
    const patterns = await db
        .select({
            description: transactions.description,
            count: sql<number>`count(*)`
        })
        .from(transactions)
        .where(ilike(transactions.description, '%SALDO%'))
        .groupBy(transactions.description)
        .orderBy(desc(sql`count(*)`));

    console.log('\n📊 Patterns found:');
    patterns.forEach(p => {
        console.log(`- "${p.description}": ${p.count} occurrences`);
    });

    process.exit(0);
}

findSaldoArtifacts();
