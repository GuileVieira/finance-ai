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
 * Script para corrigir o companyId das categorias.
 *
 * Problema encontrado:
 * - As categorias foram criadas com companyId = "Empresa Teste"
 * - As transações pertencem a contas da empresa "Minha Empresa"
 * - Quando o usuário logado é "Minha Empresa", ele vê categorias de "Empresa Teste"
 *   mas a API filtra transações por companyId da sessão, causando resultados vazios.
 *
 * Solução:
 * - Identificar a empresa com transações reais
 * - Migrar todas as categorias para essa empresa
 */

async function run() {
    const { db } = await import('../lib/db/connection');
    const { categories, transactions, accounts, companies } = await import('../lib/db/schema');
    const { eq, sql, count } = await import('drizzle-orm');

    const dryRun = process.argv.includes('--dry-run');

    console.log('=== CORREÇÃO DE companyId DAS CATEGORIAS ===\n');
    console.log(`Modo: ${dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    // 1. Identificar a empresa com mais transações (provavelmente a empresa correta)
    const txnsByCompany = await db.select({
        companyId: accounts.companyId,
        companyName: companies.name,
        txnCount: count(transactions.id)
    })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .innerJoin(companies, eq(accounts.companyId, companies.id))
        .groupBy(accounts.companyId, companies.name)
        .orderBy(sql`count(${transactions.id}) DESC`);

    console.log('=== TRANSAÇÕES POR EMPRESA ===\n');
    txnsByCompany.forEach(row => {
        console.log(`  ${row.companyName}: ${row.txnCount} transações`);
    });

    if (txnsByCompany.length === 0) {
        console.log('❌ Nenhuma transação encontrada!');
        process.exit(1);
    }

    // A empresa com mais transações é a "correta"
    const targetCompany = txnsByCompany[0];
    console.log(`\n✓ Empresa alvo: ${targetCompany.companyName} (${targetCompany.companyId})`);

    // 2. Buscar todas as categorias que NÃO são dessa empresa
    const allCategories = await db.select().from(categories);
    const wrongCompanyCategories = allCategories.filter(c => c.companyId !== targetCompany.companyId);

    console.log(`\n=== CATEGORIAS A MIGRAR ===\n`);
    console.log(`Total de categorias: ${allCategories.length}`);
    console.log(`Categorias na empresa errada: ${wrongCompanyCategories.length}`);

    if (wrongCompanyCategories.length === 0) {
        console.log('\n✅ Todas as categorias já estão na empresa correta!');
        process.exit(0);
    }

    // Agrupar por empresa atual
    const catsByCurrentCompany = new Map<string, typeof wrongCompanyCategories>();
    for (const cat of wrongCompanyCategories) {
        const companyId = cat.companyId || 'null';
        if (!catsByCurrentCompany.has(companyId)) {
            catsByCurrentCompany.set(companyId, []);
        }
        catsByCurrentCompany.get(companyId)!.push(cat);
    }

    for (const [companyId, cats] of catsByCurrentCompany) {
        const companyName = companyId === 'null' ? '(sem empresa)' :
            (await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)))[0]?.name || '(desconhecida)';
        console.log(`\n  De "${companyName}" (${cats.length} categorias):`);
        cats.slice(0, 5).forEach(c => console.log(`    - ${c.name}`));
        if (cats.length > 5) {
            console.log(`    ... e mais ${cats.length - 5} categorias`);
        }
    }

    // 3. Verificar se não há conflito de nomes (categorias com mesmo nome na empresa alvo)
    const targetCompanyCategories = allCategories.filter(c => c.companyId === targetCompany.companyId);
    const targetCategoryNames = new Set(targetCompanyCategories.map(c => c.name.toUpperCase()));

    const conflicts = wrongCompanyCategories.filter(c => targetCategoryNames.has(c.name.toUpperCase()));

    if (conflicts.length > 0) {
        console.log(`\n⚠️ CONFLITOS DETECTADOS: ${conflicts.length} categorias já existem na empresa alvo:`);
        conflicts.forEach(c => console.log(`    - ${c.name}`));
        console.log('\n   Essas categorias serão DELETADAS (suas transações apontam para as da empresa correta)');
    }

    // 4. Executar migração
    if (!dryRun) {
        console.log('\n=== EXECUTANDO MIGRAÇÃO ===\n');

        // 4a. Deletar categorias conflitantes
        if (conflicts.length > 0) {
            for (const cat of conflicts) {
                // Primeiro, verificar se há transações apontando para essa categoria
                const txnsForCat = await db.select({ count: count(transactions.id) })
                    .from(transactions)
                    .where(eq(transactions.categoryId, cat.id));

                const txnCount = Number(txnsForCat[0]?.count || 0);

                if (txnCount > 0) {
                    // Encontrar a categoria correspondente na empresa alvo
                    const targetCat = targetCompanyCategories.find(c => c.name.toUpperCase() === cat.name.toUpperCase());
                    if (targetCat) {
                        console.log(`  Migrando ${txnCount} transações de "${cat.name}" para a categoria correta...`);
                        await db.update(transactions)
                            .set({ categoryId: targetCat.id, updatedAt: new Date() })
                            .where(eq(transactions.categoryId, cat.id));
                    }
                }

                // Deletar a categoria conflitante
                await db.delete(categories).where(eq(categories.id, cat.id));
                console.log(`  ✓ Deletada categoria conflitante: ${cat.name}`);
            }
        }

        // 4b. Migrar categorias que não conflitam
        const nonConflictCategories = wrongCompanyCategories.filter(c => !targetCategoryNames.has(c.name.toUpperCase()));

        if (nonConflictCategories.length > 0) {
            console.log(`\n  Migrando ${nonConflictCategories.length} categorias para ${targetCompany.companyName}...`);

            for (const cat of nonConflictCategories) {
                await db.update(categories)
                    .set({ companyId: targetCompany.companyId, updatedAt: new Date() })
                    .where(eq(categories.id, cat.id));
            }

            console.log(`  ✓ ${nonConflictCategories.length} categorias migradas`);
        }

        console.log('\n✅ Migração concluída!');
    } else {
        console.log('\n⚠️ Este foi um DRY RUN. Nenhuma alteração foi feita.');
        console.log('   Execute sem --dry-run para aplicar as mudanças.');
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
