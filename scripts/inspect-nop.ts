
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
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
    });
}

async function inspectNOP() {
    try {
        const { db } = await import('../lib/db/connection');
        const { transactions, categories } = await import('../lib/db/schema');
        const { eq, and, sql, desc, like } = await import('drizzle-orm');

        console.log('--- Inspecting "OUTRAS DESPESAS NOP" (Nov 2025) ---');

        // 1. Find the Category ID
        const targetCategory = await db.query.categories.findFirst({
            where: and(
                // eq(categories.name, 'OUTRAS DESPESAS NOP'), // Exact match might be tricky with encoding? Let's try likely match
                like(categories.name, '%OUTRAS DESPESAS NOP%')
            )
        });

        if (!targetCategory) {
            console.error('Category "OUTRAS DESPESAS NOP" not found!');
            return;
        }

        console.log(`Found Category: ${targetCategory.name} (${targetCategory.type})`);

        // 2. Get Top Transactions/Patterns
        const txns = await db.select({
            description: transactions.description,
            amount: transactions.amount,
            date: transactions.transactionDate
        })
            .from(transactions)
            .where(
                and(
                    eq(transactions.categoryId, targetCategory.id),
                    sql`${transactions.transactionDate} >= '2025-11-01'`,
                    sql`${transactions.transactionDate} <= '2025-11-30'`
                )
            )
            .orderBy(sql`${transactions.amount} ASC`) // Most negative first (Largest expenses)
            .limit(20);

        console.log(`\nTop 20 Expenses in this category:`);
        console.table(txns.map(t => ({
            Description: t.description.substring(0, 50), // Truncate for display
            Amount: Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            Date: new Date(t.date).toLocaleDateString('pt-BR')
        })));

        // 3. Group by "Description Pattern" (simple grouping) to see recurrent vendors
        // This is a rough heuristic: group by first 15 chars
        const grouped = await db.select({
            vendor: sql<string>`substring(${transactions.description} from 1 for 20)`,
            total: sql<number>`sum(${transactions.amount})`,
            count: sql<number>`count(*)`
        })
            .from(transactions)
            .where(
                and(
                    eq(transactions.categoryId, targetCategory.id),
                    sql`${transactions.transactionDate} >= '2025-11-01'`,
                    sql`${transactions.transactionDate} <= '2025-11-30'`
                )
            )
            .groupBy(sql`substring(${transactions.description} from 1 for 20)`)
            .orderBy(sql`sum(${transactions.amount}) ASC`)
            .limit(10);

        console.log(`\nTop Vendors/Patterns (Grouped):`);
        console.table(grouped.map(g => ({
            Vendor_Pattern: g.vendor,
            Total: Number(g.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            Count: g.count
        })));


    } catch (error) {
        console.error('Inspection failed:', error);
    } finally {
        process.exit(0);
    }
}

inspectNOP();
