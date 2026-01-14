
import 'dotenv/config';
import { db } from '@/lib/db/connection';
import { companies, accounts, transactions } from '@/lib/db/schema';
import { eq, like, inArray, and, sql } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';

async function checkRevenue() {
    await initializeDatabase();

    // 1. Find the company
    const company = await db.query.companies.findFirst({
        where: like(companies.name, '%Empresa Padrão%')
    });

    if (!company) {
        console.log('❌ Company "Empresa Padrão" not found.');
        return;
    }

    console.log(`🏢 Company found: ${company.name} (${company.id})`);

    // 2. Find accounts
    const companyAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.companyId, company.id));

    console.log(`🏦 Accounts found: ${companyAccounts.length}`);
    companyAccounts.forEach(acc => console.log(`   - ${acc.name} (${acc.id})`));

    if (companyAccounts.length === 0) {
        console.log('⚠️ No accounts linked to this company.');
        return;
    }

    const accountIds = companyAccounts.map(a => a.id);

    // 3. Check ALL transactions to see if they exist anywhere
    const allTransactionsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(transactions);

    console.log(`\n🔎 Total transactions in DB: ${allTransactionsCount[0].count}`);

    if (Number(allTransactionsCount[0].count) > 0) {
        const sampleTransactions = await db
            .select({
                id: transactions.id,
                amount: transactions.amount,
                type: transactions.type,
                accountId: transactions.accountId,
                accountName: accounts.name,
                companyName: companies.name
            })
            .from(transactions)
            .leftJoin(accounts, eq(transactions.accountId, accounts.id))
            .leftJoin(companies, eq(accounts.companyId, companies.id))
            .limit(5);

        console.log('📝 Sample transactions:');
        sampleTransactions.forEach(t => {
            console.log(`   - ${t.type} R$ ${t.amount} | Account: ${t.accountName} | Company: ${t.companyName}`);
        });
    }

    process.exit(0);
}

checkRevenue().catch(console.error);
