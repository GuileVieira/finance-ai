
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

// Now import connection
async function run() {
    const { db } = await import('../lib/db/connection');
    const { users, userCompanies, companies, categories, transactions } = await import('../lib/db/schema');
    const { eq, and, inArray, sql } = await import('drizzle-orm');

    console.log('--- Debugging DRE ---');
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

    // 1. Get User and Company
    const userEmail = 'empresa@teste.com';
    const user = await db.query.users.findFirst({
        where: eq(users.email, userEmail)
    });

    if (!user) {
        console.log('User not found:', userEmail);
        return;
    }
    console.log(`User found: ${user.name} (${user.id})`);

    const userCompany = await db.query.userCompanies.findFirst({
        where: eq(userCompanies.userId, user.id)
    });

    if (!userCompany) {
        console.log('User has no company linked.');
        return;
    }
    const companyId = userCompany.companyId;
    console.log(`Company ID: ${companyId}`);

    // 2. Check ALL Categories for verify types
    const allCats = await db.select().from(categories).where(eq(categories.companyId, companyId));
    console.log(`\nTotal categories: ${allCats.length}`);

    // Group by type
    const byType: Record<string, number> = {};
    const varCostCats: any[] = [];

    for (const c of allCats) {
        byType[c.type] = (byType[c.type] || 0) + 1;
        if (c.type === 'variable_cost' || c.type === 'expense_variable' || c.type === 'costs' || c.type === 'cost') {
            varCostCats.push(c);
        }
    }
    console.log('Category Types Distribution:', byType);

    if (varCostCats.length === 0) {
        console.log('⚠ NO variable cost categories found (looked for variable_cost, expense_variable, etc)');
    } else {
        console.log(`Found ${varCostCats.length} potential variable cost categories.`);

        // 3. Transactions in those categories
        const ids = varCostCats.map(c => c.id);
        const costTransactions = await db.select({
            count: sql<number>`count(*)`,
            totalAmount: sql<number>`sum(${transactions.amount})`
        })
            .from(transactions)
            .where(
                and(
                    inArray(transactions.categoryId, ids),
                    sql`${transactions.transactionDate} >= '2025-11-01' AND ${transactions.transactionDate} <= '2025-11-30'`
                )
            );
        console.log('\nTransactions in Variable Cost Categories (Nov 2025):');
        console.log(JSON.stringify(costTransactions, null, 2));

        // 4. Analyze Transaction Distribution for Nov 2025
        console.log('\n--- Transaction Distribution (Nov 2025) ---');

        const distribution = await db.select({
            type: categories.type,
            categoryName: categories.name,
            count: sql<number>`count(*)`,
            total: sql<number>`sum(${transactions.amount})`
        })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(sql`${transactions.transactionDate} >= '2025-11-01' AND ${transactions.transactionDate} <= '2025-11-30'`)
            .groupBy(categories.type, categories.name)
            .orderBy(sql`sum(${transactions.amount}) desc`);

        console.table(distribution.map(d => ({
            type: d.type || 'UNCATEGORIZED',
            category: d.categoryName || 'Unknown',
            count: d.count,
            total: d.total
        })));

        // Summary by Type
        const summaryByType = await db.select({
            type: categories.type,
            total: sql<number>`sum(${transactions.amount})`
        })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(sql`${transactions.transactionDate} >= '2025-11-01' AND ${transactions.transactionDate} <= '2025-11-30'`)
            .groupBy(categories.type);

        console.log('\nSummary by Type:');
        console.table(summaryByType);
        console.log('\n--- Checking Transaction Types for MATERIAL DE EMBALAGEM ---');
        // Find category ID for 'MATERIAL DE EMBALAGEM'
        const specificCat = await db.query.categories.findFirst({
            where: and(
                eq(categories.companyId, companyId),
                eq(categories.name, 'MATERIAL DE EMBALAGEM')
            )
        });

        if (specificCat) {
            const txns = await db.select({
                id: transactions.id,
                amount: transactions.amount,
                type: transactions.type,
                date: transactions.transactionDate,
                description: transactions.description
            })
                .from(transactions)
                .where(eq(transactions.categoryId, specificCat.id))
                .limit(5);

            console.table(txns);
        } else {
            console.log("Category 'MATERIAL DE EMBALAGEM' not found in this company.");
        }

    }
}

run().catch(console.error);
