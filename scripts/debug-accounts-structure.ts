import fs from 'fs';
import path from 'path';

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

async function run() {
    const { db } = await import('../lib/db/connection');
    const { categories, transactions, accounts, companies } = await import('../lib/db/schema');
    const { eq, sql, count, isNull, isNotNull } = await import('drizzle-orm');

    console.log('=== ESTRUTURA COMPLETA DO BANCO ===\n');

    // 1. Empresas
    const allCompanies = await db.select().from(companies);
    console.log('EMPRESAS:');
    allCompanies.forEach(c => console.log(`  - ${c.name} (${c.id})`));

    // 2. Contas por empresa
    console.log('\nCONTAS POR EMPRESA:');
    const allAccounts = await db.select({
        id: accounts.id,
        name: accounts.name,
        bankName: accounts.bankName,
        companyId: accounts.companyId,
        companyName: companies.name
    })
        .from(accounts)
        .leftJoin(companies, eq(accounts.companyId, companies.id));

    for (const company of allCompanies) {
        const companyAccounts = allAccounts.filter(a => a.companyId === company.id);
        console.log(`\n  ${company.name}:`);
        if (companyAccounts.length === 0) {
            console.log('    (nenhuma conta)');
        } else {
            companyAccounts.forEach(a => {
                console.log(`    - ${a.name} (${a.bankName}) - ID: ${a.id}`);
            });
        }
    }

    // 3. Transações por conta
    console.log('\n\nTRANSAÇÕES POR CONTA:');
    for (const account of allAccounts) {
        const txnCount = await db.select({ count: count(transactions.id) })
            .from(transactions)
            .where(eq(transactions.accountId, account.id));

        const categorizedCount = await db.select({ count: count(transactions.id) })
            .from(transactions)
            .where(sql`${transactions.accountId} = ${account.id} AND ${transactions.categoryId} IS NOT NULL`);

        const uncategorizedCount = await db.select({ count: count(transactions.id) })
            .from(transactions)
            .where(sql`${transactions.accountId} = ${account.id} AND ${transactions.categoryId} IS NULL`);

        console.log(`\n  ${account.name} (${account.companyName}):`);
        console.log(`    Total: ${txnCount[0]?.count || 0} transações`);
        console.log(`    Categorizadas: ${categorizedCount[0]?.count || 0}`);
        console.log(`    Sem categoria: ${uncategorizedCount[0]?.count || 0}`);
    }

    // 4. Categorias por empresa
    console.log('\n\nCATEGORIAS POR EMPRESA:');
    for (const company of allCompanies) {
        const catCount = await db.select({ count: count(categories.id) })
            .from(categories)
            .where(eq(categories.companyId, company.id));
        console.log(`  ${company.name}: ${catCount[0]?.count || 0} categorias`);
    }

    // 5. Verificar integridade: transações com categoria de empresa diferente
    console.log('\n\n=== VERIFICAÇÃO DE INTEGRIDADE ===\n');

    const mismatch = await db.select({
        txnId: transactions.id,
        txnDesc: transactions.description,
        accountId: transactions.accountId,
        accountCompanyId: accounts.companyId,
        accountCompanyName: sql<string>`acc_company.name`,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryCompanyId: categories.companyId,
        categoryCompanyName: sql<string>`cat_company.name`
    })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .innerJoin(sql`companies as acc_company`, sql`acc_company.id = ${accounts.companyId}`)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .innerJoin(sql`companies as cat_company`, sql`cat_company.id = ${categories.companyId}`)
        .where(sql`${accounts.companyId} != ${categories.companyId}`)
        .limit(10);

    if (mismatch.length === 0) {
        console.log('✅ Todas as transações categorizadas têm categoria da mesma empresa da conta');
    } else {
        console.log(`⚠️ ${mismatch.length}+ transações com mismatch de empresa:`);
        mismatch.forEach(m => {
            console.log(`  - ${m.txnDesc}`);
            console.log(`    Conta em: ${m.accountCompanyName}`);
            console.log(`    Categoria em: ${m.categoryCompanyName}`);
        });
    }

    // 6. Resumo final
    console.log('\n\n=== RESUMO ===\n');

    const totalTxns = await db.select({ count: count(transactions.id) }).from(transactions);
    const categorizedTxns = await db.select({ count: count(transactions.id) })
        .from(transactions)
        .where(isNotNull(transactions.categoryId));
    const uncategorizedTxns = await db.select({ count: count(transactions.id) })
        .from(transactions)
        .where(isNull(transactions.categoryId));

    console.log(`Total de transações: ${totalTxns[0]?.count || 0}`);
    console.log(`Categorizadas: ${categorizedTxns[0]?.count || 0}`);
    console.log(`Sem categoria: ${uncategorizedTxns[0]?.count || 0}`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
