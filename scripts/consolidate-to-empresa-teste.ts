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

/**
 * Consolida tudo para "Empresa Teste":
 * 1. Move contas de "Minha Empresa" para "Empresa Teste"
 * 2. Atualiza transações para usar categorias de "Empresa Teste"
 * 3. Deleta categorias de "Minha Empresa"
 * 4. Deleta "Minha Empresa" e "Empresa Padrão"
 */

async function run() {
    const { db } = await import('../lib/db/connection');
    const { categories, transactions, accounts, companies } = await import('../lib/db/schema');
    const { eq, and, inArray, isNotNull } = await import('drizzle-orm');

    const dryRun = process.argv.includes('--dry-run');

    console.log('=== CONSOLIDAÇÃO PARA EMPRESA TESTE ===\n');
    console.log(`Modo: ${dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    // Identificar empresas
    const empresaTeste = (await db.select().from(companies).where(eq(companies.name, 'Empresa Teste')))[0];
    const minhaEmpresa = (await db.select().from(companies).where(eq(companies.name, 'Minha Empresa')))[0];
    const empresaPadrao = (await db.select().from(companies).where(eq(companies.name, 'Empresa Padrão')))[0];

    if (!empresaTeste) {
        console.log('❌ Empresa Teste não encontrada!');
        process.exit(1);
    }

    console.log(`Empresa destino: ${empresaTeste.name} (${empresaTeste.id})`);

    // 1. Mover contas de "Minha Empresa" para "Empresa Teste"
    if (minhaEmpresa) {
        const minhaEmpresaAccounts = await db.select().from(accounts).where(eq(accounts.companyId, minhaEmpresa.id));
        console.log(`\n1. CONTAS DE "Minha Empresa" a mover: ${minhaEmpresaAccounts.length}`);
        minhaEmpresaAccounts.forEach(a => console.log(`   - ${a.name} (${a.bankName})`));

        if (!dryRun && minhaEmpresaAccounts.length > 0) {
            // Verificar se já existe conta com mesmo nome/banco na Empresa Teste
            const empresaTesteAccounts = await db.select().from(accounts).where(eq(accounts.companyId, empresaTeste.id));

            for (const account of minhaEmpresaAccounts) {
                const duplicate = empresaTesteAccounts.find(a =>
                    a.bankName === account.bankName &&
                    a.accountNumber === account.accountNumber
                );

                if (duplicate) {
                    // Mover transações para a conta existente
                    console.log(`   Movendo transações de "${account.name}" para conta existente...`);
                    await db.update(transactions)
                        .set({ accountId: duplicate.id, updatedAt: new Date() })
                        .where(eq(transactions.accountId, account.id));

                    // Deletar a conta duplicada
                    await db.delete(accounts).where(eq(accounts.id, account.id));
                    console.log(`   ✓ Conta duplicada deletada`);
                } else {
                    // Mover a conta para Empresa Teste
                    await db.update(accounts)
                        .set({ companyId: empresaTeste.id, updatedAt: new Date() })
                        .where(eq(accounts.id, account.id));
                    console.log(`   ✓ Movida: ${account.name}`);
                }
            }
        }

        // 2. Atualizar transações para usar categorias de "Empresa Teste"
        const minhaEmpresaCats = await db.select().from(categories).where(eq(categories.companyId, minhaEmpresa.id));
        const empresaTesteCats = await db.select().from(categories).where(eq(categories.companyId, empresaTeste.id));

        console.log(`\n2. CATEGORIAS DE "Minha Empresa" a remapear: ${minhaEmpresaCats.length}`);

        if (!dryRun && minhaEmpresaCats.length > 0) {
            for (const cat of minhaEmpresaCats) {
                // Encontrar categoria equivalente na Empresa Teste
                const targetCat = empresaTesteCats.find(c => c.name.toUpperCase() === cat.name.toUpperCase());

                if (targetCat) {
                    // Atualizar transações para usar a categoria da Empresa Teste
                    await db.update(transactions)
                        .set({ categoryId: targetCat.id, updatedAt: new Date() })
                        .where(eq(transactions.categoryId, cat.id));
                    console.log(`   ✓ Remapeada: ${cat.name}`);
                } else {
                    console.log(`   ⚠️ Sem equivalente: ${cat.name}`);
                }
            }

            // Deletar categorias de "Minha Empresa"
            await db.delete(categories).where(eq(categories.companyId, minhaEmpresa.id));
            console.log(`   ✓ Categorias de "Minha Empresa" deletadas`);
        }

        // 3. Deletar "Minha Empresa"
        console.log(`\n3. DELETANDO "Minha Empresa"...`);
        if (!dryRun) {
            await db.delete(companies).where(eq(companies.id, minhaEmpresa.id));
            console.log(`   ✓ Deletada`);
        }
    }

    // 4. Deletar "Empresa Padrão"
    if (empresaPadrao) {
        console.log(`\n4. DELETANDO "Empresa Padrão"...`);

        // Deletar conta dessa empresa primeiro
        const empresaPadraoAccounts = await db.select().from(accounts).where(eq(accounts.companyId, empresaPadrao.id));
        if (empresaPadraoAccounts.length > 0) {
            console.log(`   Deletando ${empresaPadraoAccounts.length} conta(s)...`);
            if (!dryRun) {
                await db.delete(accounts).where(eq(accounts.companyId, empresaPadrao.id));
            }
        }

        if (!dryRun) {
            await db.delete(companies).where(eq(companies.id, empresaPadrao.id));
            console.log(`   ✓ Deletada`);
        }
    }

    // Verificação final
    if (!dryRun) {
        console.log('\n\n=== VERIFICAÇÃO FINAL ===\n');

        const remainingCompanies = await db.select().from(companies);
        console.log(`Empresas restantes: ${remainingCompanies.length}`);
        remainingCompanies.forEach(c => console.log(`  - ${c.name}`));

        const remainingAccounts = await db.select({
            name: accounts.name,
            bankName: accounts.bankName,
            companyId: accounts.companyId
        }).from(accounts);
        console.log(`\nContas: ${remainingAccounts.length}`);
        remainingAccounts.forEach(a => console.log(`  - ${a.name} (${a.bankName})`));

        const remainingCats = await db.select().from(categories);
        console.log(`\nCategorias: ${remainingCats.length}`);

        const totalTxns = await db.select().from(transactions);
        console.log(`\nTransações: ${totalTxns.length}`);
    } else {
        console.log('\n⚠️ Este foi um DRY RUN. Nenhuma alteração foi feita.');
        console.log('   Execute sem --dry-run para aplicar as mudanças.');
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
