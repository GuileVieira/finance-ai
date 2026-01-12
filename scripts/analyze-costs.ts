
import fs from 'fs';
import path from 'path';

// 1. Manually read .env and set process.env before any imports
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                let cleanValue = value.trim();
                if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
                    (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
                    cleanValue = cleanValue.slice(1, -1);
                }
                process.env[key.trim()] = cleanValue;
            }
        }
    });
}

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
}

// 2. Main function with dynamic imports
async function analyzeCosts() {
    const { db } = await import('../lib/db/drizzle');
    const { categories, transactions } = await import('../lib/db/schema');
    const { eq, and, desc, sql } = await import('drizzle-orm');

    console.log('📊 Analyzing Variable Costs Breakdown for Nov 2025...');

    // Get variable cost categories
    const costCats = await db.select()
        .from(categories)
        .where(eq(categories.type, 'variable_cost'));

    const catIds = costCats.map(c => c.id);

    if (catIds.length === 0) {
        console.log('No variable cost categories found.');
        return;
    }

    const results = await db.select({
        categoryName: categories.name,
        amount: sql<string>`SUM(${transactions.amount})`,
        count: sql<string>`COUNT(*)`
    })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
            and(
                eq(categories.type, 'variable_cost'),
                sql`EXTRACT(MONTH FROM ${transactions.transactionDate}) = 11`,
                sql`EXTRACT(YEAR FROM ${transactions.transactionDate}) = 2025`
            )
        )
        .groupBy(categories.name)
        .orderBy(sql`SUM(${transactions.amount}) ASC`); // Negative values first (costs)

    console.table(results.map(r => ({
        Category: r.categoryName,
        Amount: parseFloat(r.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Count: r.count
    })));

    const totalVariable = results.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    console.log(`\n📉 Total Variable Costs: ${totalVariable.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

    process.exit(0);
}

analyzeCosts().catch(console.error);
