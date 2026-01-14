
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

async function auditCategories() {
    try {
        const { db } = await import('../lib/db/connection');
        const { transactions, categories } = await import('../lib/db/schema');
        const { eq, and, sql, desc, inArray } = await import('drizzle-orm');

        console.log('--- Auditing Expense Categories (Nov 2025) ---');

        // Define date range for Nov 2025
        const startDate = new Date('2025-11-01T00:00:00.000Z');
        const endDate = new Date('2025-11-30T23:59:59.999Z');

        const audit = await db.select({
            categoryName: categories.name,
            categoryId: categories.id,
            currentType: categories.type,
            transactionCount: sql<number>`count(${transactions.id})`,
            // We want NET amount (Sum of all). 
            // Expenses are usually Negative (Debit). 
            // We sort by ASC amount (most negative first = highest expense).
            netAmount: sql<number>`sum(${transactions.amount})`
        })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(
                and(
                    // sql`${transactions.transactionDate} >= ${startDate} AND ${transactions.transactionDate} <= ${endDate}`,
                    // Simplified date check or remove to see all-time if needed. Let's stick to Nov 2025 logic approximation or just check everything to find patterns.
                    // Using string comparison for simplicity if date objects verify hard
                    // Correct way to query dates in Drizzle/Postgres
                    sql`${transactions.transactionDate} >= '2025-11-01' AND ${transactions.transactionDate} <= '2025-11-30'`,
                    inArray(categories.type, ['fixed_cost', 'variable_cost', 'non_operational'])
                )
            )
            .groupBy(categories.name, categories.type, categories.id)
            .orderBy(sql`sum(${transactions.amount}) asc`); // Ascending because large expenses are negative numbers (e.g. -1,000,000)

        // Enhance output formatting
        console.table(audit.map(item => ({
            ID: item.categoryId,
            Category: item.categoryName,
            Type: item.currentType,
            'Count': item.transactionCount,
            'Total (R$)': Number(item.netAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        })));

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        process.exit(0);
    }
}

auditCategories();
