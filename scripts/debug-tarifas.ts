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
    const { categories, transactions } = await import('../lib/db/schema');

    // Buscar categoria TARIFAS BANCÁRIAS
    const cats = await db.select().from(categories);
    const tarifas = cats.filter(c => c.name.includes('TARIFAS'));

    console.log('=== CATEGORIAS COM "TARIFAS" NO NOME ===\n');
    for (const c of tarifas) {
        console.log('ID:', c.id);
        console.log('Nome:', c.name);
        console.log('categoryGroup:', c.categoryGroup);
        console.log('dreGroup:', c.dreGroup);
        console.log('');
    }

    // Buscar todas as transações
    const allTxns = await db.select({
        id: transactions.id,
        categoryId: transactions.categoryId,
        description: transactions.description
    }).from(transactions);

    console.log('=== CONTAGEM DE TRANSAÇÕES ===\n');
    for (const c of tarifas) {
        const txns = allTxns.filter(t => t.categoryId === c.id);
        console.log(`${c.name}: ${txns.length} transações`);
        if (txns.length > 0 && txns.length <= 5) {
            txns.forEach(t => console.log(`  - ${t.description}`));
        }
    }

    // Verificar se há transações órfãs (categoryId aponta para categoria deletada)
    const catIds = new Set(cats.map(c => c.id));
    const orphanTxns = allTxns.filter(t => {
        if (!t.categoryId) return false;
        return !catIds.has(t.categoryId);
    });

    console.log('\n=== TRANSAÇÕES ÓRFÃS ===');
    console.log(`Total: ${orphanTxns.length} transações com categoryId que não existe`);

    if (orphanTxns.length > 0) {
        const orphanCatIds = [...new Set(orphanTxns.map(t => t.categoryId))];
        console.log('\nIDs de categorias inexistentes:');
        for (const catId of orphanCatIds) {
            const count = orphanTxns.filter(t => t.categoryId === catId).length;
            console.log(`  ${catId}: ${count} transações`);
            // Mostrar uma amostra
            const sample = orphanTxns.filter(t => t.categoryId === catId).slice(0, 2);
            sample.forEach(t => console.log(`    - ${t.description}`));
        }
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
