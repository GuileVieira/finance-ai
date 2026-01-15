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
    const { eq, and, desc, sql } = await import('drizzle-orm');

    // 1. Buscar a categoria TARIFAS BANCÁRIAS
    const allCats = await db.select().from(categories);
    const tarifas = allCats.find(c => c.name === 'TARIFAS BANCÁRIAS');

    if (!tarifas) {
        console.log('❌ Categoria TARIFAS BANCÁRIAS não encontrada!');
        console.log('\nCategorias disponíveis com "TARIFA" no nome:');
        allCats.filter(c => c.name.toUpperCase().includes('TARIFA')).forEach(c => {
            console.log(`  - ${c.name} (ID: ${c.id})`);
        });
        process.exit(1);
    }

    console.log('=== CATEGORIA ENCONTRADA ===');
    console.log('ID:', tarifas.id);
    console.log('Nome:', tarifas.name);
    console.log('Type:', tarifas.type);
    console.log('categoryGroup:', tarifas.categoryGroup);
    console.log('dreGroup:', tarifas.dreGroup);
    console.log('companyId:', tarifas.companyId);

    // 2. Buscar transações diretamente pelo categoryId
    console.log('\n=== TRANSAÇÕES COM categoryId = TARIFAS ===\n');

    const txnsSimple = await db.select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        categoryId: transactions.categoryId,
        transactionDate: transactions.transactionDate,
        accountId: transactions.accountId
    })
        .from(transactions)
        .where(eq(transactions.categoryId, tarifas.id))
        .orderBy(desc(transactions.transactionDate))
        .limit(10);

    console.log(`Total encontrado (direto): ${txnsSimple.length}`);
    txnsSimple.forEach(t => {
        console.log(`  - ${t.description} | ${t.amount} | ${t.transactionDate}`);
    });

    // 3. Buscar com LEFT JOIN igual ao service
    console.log('\n=== TRANSAÇÕES COM JOIN (igual ao service) ===\n');

    const txnsWithJoin = await db.select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        categoryId: transactions.categoryId,
        transactionDate: transactions.transactionDate,
        accountId: transactions.accountId,
        accountName: accounts.name,
        bankName: accounts.bankName,
        companyId: accounts.companyId,
        categoryName: categories.name
    })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(companies, eq(accounts.companyId, companies.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(eq(transactions.categoryId, tarifas.id))
        .orderBy(desc(transactions.transactionDate))
        .limit(10);

    console.log(`Total encontrado (com join): ${txnsWithJoin.length}`);
    txnsWithJoin.forEach(t => {
        console.log(`  - ${t.description} | ${t.amount} | companyId=${t.companyId}`);
    });

    // 4. Verificar se há filtro de companyId falhando
    console.log('\n=== VERIFICANDO companyId ===\n');

    // Pegar o companyId da categoria
    const categoryCompanyId = tarifas.companyId;
    console.log('companyId da categoria:', categoryCompanyId);

    // Pegar os companyIds das transações
    const companyIds = [...new Set(txnsWithJoin.map(t => t.companyId))];
    console.log('companyIds das transações:', companyIds);

    // 5. Simular a query completa do service com companyId
    if (companyIds.length > 0) {
        const testCompanyId = companyIds[0];
        console.log(`\nTestando com companyId = ${testCompanyId}:`);

        const txnsWithCompany = await db.select({
            id: transactions.id,
            description: transactions.description,
        })
            .from(transactions)
            .leftJoin(accounts, eq(transactions.accountId, accounts.id))
            .leftJoin(companies, eq(accounts.companyId, companies.id))
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(and(
                eq(transactions.categoryId, tarifas.id),
                eq(accounts.companyId, testCompanyId!)
            ))
            .limit(10);

        console.log(`Resultado com filtro companyId: ${txnsWithCompany.length} transações`);
    }

    // 6. Ver todas as categorias da empresa
    console.log('\n=== CATEGORIAS POR companyId ===\n');

    const companiesList = await db.select().from(companies);
    for (const company of companiesList) {
        const catsForCompany = allCats.filter(c => c.companyId === company.id);
        const tarifasCat = catsForCompany.find(c => c.name === 'TARIFAS BANCÁRIAS');
        console.log(`Empresa: ${company.name} (${company.id})`);
        console.log(`  Total de categorias: ${catsForCompany.length}`);
        console.log(`  Tem TARIFAS BANCÁRIAS: ${tarifasCat ? 'SIM' : 'NÃO'}`);
        if (tarifasCat) {
            console.log(`    ID: ${tarifasCat.id}`);
        }
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
