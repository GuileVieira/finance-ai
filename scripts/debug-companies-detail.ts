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
    const { eq, sql, count, and } = await import('drizzle-orm');

    console.log('=== DIAGNÓSTICO COMPLETO ===\n');

    // 1. Listar todas as empresas
    const allCompanies = await db.select().from(companies);
    console.log('EMPRESAS:');
    allCompanies.forEach(c => console.log(`  - ${c.name} (${c.id})`));

    // 2. Transações por empresa
    console.log('\nTRANSAÇÕES POR EMPRESA:');
    for (const company of allCompanies) {
        const txns = await db.select({ count: count(transactions.id) })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(eq(accounts.companyId, company.id));
        console.log(`  ${company.name}: ${txns[0]?.count || 0} transações`);
    }

    // 3. Categorias por empresa
    console.log('\nCATEGORIAS POR EMPRESA:');
    for (const company of allCompanies) {
        const cats = await db.select({ count: count(categories.id) })
            .from(categories)
            .where(eq(categories.companyId, company.id));
        console.log(`  ${company.name}: ${cats[0]?.count || 0} categorias`);
    }

    // 4. Buscar TARIFAS BANCÁRIAS em todas as empresas
    console.log('\nCATEGORIA "TARIFAS BANCÁRIAS" POR EMPRESA:');
    const tarifasCats = await db.select({
        id: categories.id,
        name: categories.name,
        companyId: categories.companyId,
        companyName: companies.name
    })
        .from(categories)
        .leftJoin(companies, eq(categories.companyId, companies.id))
        .where(eq(categories.name, 'TARIFAS BANCÁRIAS'));

    tarifasCats.forEach(c => console.log(`  - ${c.companyName}: ${c.id}`));

    // 5. Verificar se existe categoria TARIFAS em "Minha Empresa"
    const minhaEmpresa = allCompanies.find(c => c.name === 'Minha Empresa');
    if (minhaEmpresa) {
        console.log(`\n=== ANÁLISE: Minha Empresa (${minhaEmpresa.id}) ===\n`);

        // Verificar se tem categoria TARIFAS
        const tarifasMinhaEmpresa = await db.select()
            .from(categories)
            .where(and(
                eq(categories.companyId, minhaEmpresa.id),
                eq(categories.name, 'TARIFAS BANCÁRIAS')
            ));

        console.log(`Categoria TARIFAS nesta empresa: ${tarifasMinhaEmpresa.length > 0 ? 'SIM' : 'NÃO'}`);

        // Verificar quantas transações de TARIFAS existem nesta empresa
        const tarifasId = tarifasCats[0]?.id; // Pegar o ID da categoria TARIFAS (da Empresa Teste)
        if (tarifasId) {
            const txnsTarifas = await db.select({ count: count(transactions.id) })
                .from(transactions)
                .innerJoin(accounts, eq(transactions.accountId, accounts.id))
                .where(and(
                    eq(transactions.categoryId, tarifasId),
                    eq(accounts.companyId, minhaEmpresa.id)
                ));
            console.log(`Transações de TARIFAS nesta empresa: ${txnsTarifas[0]?.count || 0}`);
        }

        // Listar algumas categorias que TÊM transações nesta empresa
        console.log('\nCategorias COM transações em "Minha Empresa":');
        const catsWithTxns = await db.select({
            categoryId: transactions.categoryId,
            categoryName: categories.name,
            count: count(transactions.id)
        })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(eq(accounts.companyId, minhaEmpresa.id))
            .groupBy(transactions.categoryId, categories.name)
            .orderBy(sql`count(${transactions.id}) DESC`);

        catsWithTxns.forEach(c => {
            console.log(`  - ${c.categoryName || 'SEM CATEGORIA'}: ${c.count} transações`);
        });
    }

    // 6. Verificar se há problema de mismatch entre categoria.companyId e transaction.account.companyId
    console.log('\n=== MISMATCH DE companyId ===\n');

    // Encontrar transações onde o companyId da categoria é diferente do companyId da conta
    const mismatchQuery = await db.select({
        categoryName: categories.name,
        categoryCompanyId: categories.companyId,
        accountCompanyId: accounts.companyId,
        count: count(transactions.id)
    })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(sql`${categories.companyId} != ${accounts.companyId}`)
        .groupBy(categories.name, categories.companyId, accounts.companyId)
        .orderBy(sql`count(${transactions.id}) DESC`);

    if (mismatchQuery.length === 0) {
        console.log('✅ Nenhum mismatch encontrado');
    } else {
        console.log(`⚠️ ${mismatchQuery.length} grupos de transações com mismatch:`);
        mismatchQuery.forEach(m => {
            console.log(`  - ${m.categoryName}: ${m.count} transações`);
            console.log(`    Categoria em: ${m.categoryCompanyId}`);
            console.log(`    Conta em: ${m.accountCompanyId}`);
        });
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
