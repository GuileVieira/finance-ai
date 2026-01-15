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
    const { eq, sql, count, and, isNull, isNotNull } = await import('drizzle-orm');

    console.log('=== ESTRUTURA ATUAL ===\n');

    // Empresas
    const allCompanies = await db.select().from(companies);

    for (const company of allCompanies) {
        console.log(`\n========================================`);
        console.log(`EMPRESA: ${company.name}`);
        console.log(`ID: ${company.id}`);
        console.log(`========================================`);

        // Contas dessa empresa
        const companyAccounts = await db.select().from(accounts).where(eq(accounts.companyId, company.id));
        console.log(`\nCONTAS (${companyAccounts.length}):`);

        for (const account of companyAccounts) {
            // Contar transações dessa conta
            const txnCount = await db.select({
                total: count(transactions.id)
            })
                .from(transactions)
                .where(eq(transactions.accountId, account.id));

            const categorizedCount = await db.select({
                total: count(transactions.id)
            })
                .from(transactions)
                .where(and(
                    eq(transactions.accountId, account.id),
                    isNotNull(transactions.categoryId)
                ));

            console.log(`  - ${account.name} (${account.bankName})`);
            console.log(`    Total: ${txnCount[0]?.total || 0} transações`);
            console.log(`    Categorizadas: ${categorizedCount[0]?.total || 0}`);
        }

        // Categorias dessa empresa
        const companyCats = await db.select({ total: count(categories.id) })
            .from(categories)
            .where(eq(categories.companyId, company.id));
        console.log(`\nCATEGORIAS: ${companyCats[0]?.total || 0}`);
    }

    // Verificar mismatch (empresa da conta != empresa da categoria)
    console.log('\n\n========================================');
    console.log('VERIFICAÇÃO DE INTEGRIDADE');
    console.log('========================================\n');

    // Buscar todas transações categorizadas
    const allCategorizedTxns = await db.select({
        txnId: transactions.id,
        txnDesc: transactions.description,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId
    })
        .from(transactions)
        .where(isNotNull(transactions.categoryId));

    // Para cada transação, verificar se empresa da conta = empresa da categoria
    let mismatchCount = 0;
    const mismatches: Array<{ desc: string; accountCompany: string; categoryCompany: string }> = [];

    for (const txn of allCategorizedTxns) {
        const account = await db.select({ companyId: accounts.companyId })
            .from(accounts)
            .where(eq(accounts.id, txn.accountId));

        const category = await db.select({ companyId: categories.companyId })
            .from(categories)
            .where(eq(categories.id, txn.categoryId!));

        if (account[0]?.companyId !== category[0]?.companyId) {
            mismatchCount++;
            if (mismatches.length < 5) {
                const accCompany = allCompanies.find(c => c.id === account[0]?.companyId);
                const catCompany = allCompanies.find(c => c.id === category[0]?.companyId);
                mismatches.push({
                    desc: txn.txnDesc || 'Sem descrição',
                    accountCompany: accCompany?.name || 'Desconhecida',
                    categoryCompany: catCompany?.name || 'Desconhecida'
                });
            }
        }
    }

    if (mismatchCount === 0) {
        console.log('✅ Todas as transações estão OK (categoria pertence à mesma empresa da conta)');
    } else {
        console.log(`⚠️ ${mismatchCount} transações com problema de empresa:`);
        mismatches.forEach(m => {
            console.log(`  - "${m.desc}"`);
            console.log(`    Conta em: ${m.accountCompany}`);
            console.log(`    Categoria em: ${m.categoryCompany}`);
        });
        if (mismatchCount > 5) {
            console.log(`  ... e mais ${mismatchCount - 5} transações`);
        }
    }

    // Resumo
    console.log('\n\n========================================');
    console.log('RESUMO GERAL');
    console.log('========================================\n');

    const totalTxns = await db.select({ total: count(transactions.id) }).from(transactions);
    const totalCategorized = await db.select({ total: count(transactions.id) })
        .from(transactions)
        .where(isNotNull(transactions.categoryId));
    const totalUncategorized = await db.select({ total: count(transactions.id) })
        .from(transactions)
        .where(isNull(transactions.categoryId));

    console.log(`Total de transações: ${totalTxns[0]?.total || 0}`);
    console.log(`Categorizadas: ${totalCategorized[0]?.total || 0}`);
    console.log(`Sem categoria: ${totalUncategorized[0]?.total || 0}`);
    console.log(`Com problema de empresa: ${mismatchCount}`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
