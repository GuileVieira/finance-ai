import fs from 'fs';
import path from 'path';

// Manually load env vars
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value.replace(/^["']|["']$/g, ''); // Remove quotes
        }
    });
}

async function fixTransactionSigns() {
    try {
        // Dynamic import to ensure env vars are loaded first
        const { db } = await import('../lib/db/connection');
        const { transactions, categories } = await import('../lib/db/schema');
        const { eq, and, inArray, gt, sql } = await import('drizzle-orm');

        console.log('--- Fixing Transaction Signs ---');

        const companyId = '61f7043e-7d42-4f8e-9bd1-0b7c9f2499aa'; // From previous debug
        // Or dynamic fetch... let's trust the one we found or fetch again to be safe.

        // 1. Identification: Find COST categories
        const costTypes = ['variable_cost', 'fixed_cost', 'expense_variable', 'expense_fixed', 'non_operational'];

        const costCategories = await db.select().from(categories).where(
            and(
                eq(categories.companyId, companyId),
                inArray(categories.type, costTypes)
            )
        );

        const costCategoryIds = costCategories.map(c => c.id);
        console.log(`Found ${costCategoryIds.length} cost categories.`);

        if (costCategoryIds.length === 0) {
            console.log('No cost categories found. Aborting.');
            return;
        }

        const dbUrl = process.env.DATABASE_URL;
        console.log(`DATABASE_URL (masked): ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ':***@') : 'MISSING'}`);

        console.log('Running distribution query to find where the heck these transactions are...');
        const distribution = await db.select({
            type: categories.type,
            categoryName: categories.name,
            categoryId: categories.id,
            count: sql<number>`count(*)`,
            total: sql<number>`sum(${transactions.amount})`
        })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(
                // Broaden the search, remove date filter to see EVERYTHING
                // sql`${transactions.transactionDate} >= '2025-11-01' AND ${transactions.transactionDate} <= '2025-11-30'`
                inArray(categories.type, ['variable_cost', 'fixed_cost', 'non_operational'])
            )
            .groupBy(categories.type, categories.name, categories.id)
            .having(sql`sum(${transactions.amount}) > 0`) // Only show the problematic ones
            .orderBy(sql`sum(${transactions.amount}) desc`);

        console.table(distribution);

        if (distribution.length > 0) {
            const targetCat = distribution.find(d => d.categoryName === 'MATERIAL DE EMBALAGEM');
            if (targetCat) {
                console.log(`Found target category in distribution with ID: ${targetCat.categoryId}`);
                // update costCategoryIds to include just these problem ones for now to be precise
                costCategoryIds.push(targetCat.categoryId); // Typescript might complain about const, but this is debug logic inside.
                // Actually relying on "badTransactions" query below.
            }
        }

        const badTransactions = await db.select({
            id: transactions.id,
            description: transactions.description,
            amount: transactions.amount,
            category: categories.name,
            type: categories.type
        })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(
                and(
                    inArray(transactions.categoryId, costCategoryIds),
                    sql`${transactions.amount} > 0` // Try SQL raw check
                )
            );

        console.log(`Found ${badTransactions.length} positive transactions in cost categories.`);

        if (badTransactions.length === 0) {
            console.log('No bad transactions found. System assumes costs are already negative.');
            return;
        }

        // List a few for confirmation
        console.log('Sample of transactions to be fixed:');
        badTransactions.slice(0, 5).forEach(t => {
            console.log(`[${t.type}] ${t.category} - ${t.description}: ${t.amount}`);
        });

        // 3. Fix them (Invert sign and set type to 'debit')
        console.log('Applying fixes...');

        // We can do a bulk update using a WHERE clause
        const result = await db.update(transactions)
            .set({
                amount: sql`${transactions.amount} * -1`,
                type: 'debit',
                updatedAt: new Date()
            })
            .where(
                and(
                    inArray(transactions.categoryId, costCategoryIds),
                    gt(transactions.amount, '0')
                )
            )
            .returning({ id: transactions.id, amount: transactions.amount });

        console.log(`Successfully updated ${result.length} transactions.`);
        console.log('First 5 updated values:');
        result.slice(0, 5).forEach(r => console.log(`ID ${r.id}: ${r.amount}`));

    } catch (error) {
        console.error('Error fixing transactions:', error);
    } finally {
        process.exit(0);
    }
}

fixTransactionSigns();
