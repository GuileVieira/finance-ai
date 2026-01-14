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

async function run() {
    const { db } = await import('../lib/db/connection');
    const { categories, transactions } = await import('../lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const dryRun = process.argv.includes('--dry-run');

    console.log('\n=== LIMPEZA DE CATEGORIAS ANTIGAS ===\n');
    console.log(`Modo: ${dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    // 1. Buscar todas as categorias
    const allCategories = await db.select().from(categories);

    // 2. Separar categorias antigas (sem categoryGroup)
    const oldCategories = allCategories.filter(c => !c.categoryGroup);
    const newCategories = allCategories.filter(c => c.categoryGroup);

    console.log(`Total de categorias: ${allCategories.length}`);
    console.log(`  - Antigas (sem categoryGroup): ${oldCategories.length}`);
    console.log(`  - Novas (com categoryGroup): ${newCategories.length}\n`);

    if (oldCategories.length === 0) {
        console.log('✅ Nenhuma categoria antiga encontrada!');
        console.log('   Todas as categorias já têm categoryGroup.');
        process.exit(0);
    }

    // 3. Buscar transações para verificar quais categorias antigas têm transações
    const allTransactions = await db.select({
        id: transactions.id,
        categoryId: transactions.categoryId
    }).from(transactions);

    // Contar transações por categoria antiga
    const txnCountByOldCat = new Map<string, number>();
    for (const txn of allTransactions) {
        if (txn.categoryId) {
            const cat = oldCategories.find(c => c.id === txn.categoryId);
            if (cat) {
                txnCountByOldCat.set(cat.id, (txnCountByOldCat.get(cat.id) || 0) + 1);
            }
        }
    }

    // 4. Separar categorias antigas em: com transações e sem transações
    const oldCatsWithTxns = oldCategories.filter(c => (txnCountByOldCat.get(c.id) || 0) > 0);
    const oldCatsWithoutTxns = oldCategories.filter(c => (txnCountByOldCat.get(c.id) || 0) === 0);

    console.log(`Categorias antigas com transações: ${oldCatsWithTxns.length}`);
    console.log(`Categorias antigas SEM transações (para deletar): ${oldCatsWithoutTxns.length}\n`);

    // 5. Mostrar categorias que AINDA têm transações (NÃO serão deletadas)
    if (oldCatsWithTxns.length > 0) {
        console.log('--- CATEGORIAS ANTIGAS COM TRANSAÇÕES (NÃO SERÃO DELETADAS) ---\n');
        for (const cat of oldCatsWithTxns) {
            const txnCount = txnCountByOldCat.get(cat.id) || 0;
            console.log(`⚠️  "${cat.name}" (${txnCount} transações) - tipo: ${cat.type}`);
        }
        console.log('\n⚠️  ATENÇÃO: Essas categorias antigas ainda têm transações!');
        console.log('   Execute o script de migração primeiro para mover as transações.\n');
    }

    // 6. Mostrar categorias que serão deletadas
    if (oldCatsWithoutTxns.length === 0) {
        console.log('✅ Nenhuma categoria antiga sem transações para deletar!');
        process.exit(0);
    }

    console.log('--- CATEGORIAS PARA DELETAR ---\n');
    for (const cat of oldCatsWithoutTxns) {
        console.log(`✗ "${cat.name}" (tipo: ${cat.type})`);
    }

    // 7. Executar deleção se não for dry-run
    if (!dryRun) {
        console.log('\n--- DELETANDO CATEGORIAS ---\n');

        let deletedCount = 0;
        for (const cat of oldCatsWithoutTxns) {
            console.log(`Deletando "${cat.name}"...`);
            await db.delete(categories).where(eq(categories.id, cat.id));
            deletedCount++;
        }

        console.log(`\n✅ ${deletedCount} categorias deletadas com sucesso!`);
    } else {
        console.log(`\n⚠️  Este foi um DRY RUN. Nenhuma categoria foi deletada.`);
        console.log(`   Execute sem --dry-run para deletar ${oldCatsWithoutTxns.length} categorias.`);
    }

    process.exit(0);
}

run().catch(e => {
    console.error('Erro:', e);
    process.exit(1);
});
