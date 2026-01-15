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
 * Remove as transações extras que vieram de "Minha Empresa"
 * Mantém apenas as 149 transações originais da conta Itaú
 */

async function run() {
    const { db } = await import('../lib/db/connection');
    const { transactions, accounts } = await import('../lib/db/schema');
    const { eq, count, inArray, not } = await import('drizzle-orm');

    const dryRun = process.argv.includes('--dry-run');

    console.log('=== LIMPEZA DE TRANSAÇÕES EXTRAS ===\n');
    console.log(`Modo: ${dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    // Listar todas as contas
    const allAccounts = await db.select().from(accounts);
    console.log('CONTAS EXISTENTES:');

    for (const account of allAccounts) {
        const txnCount = await db.select({ total: count(transactions.id) })
            .from(transactions)
            .where(eq(transactions.accountId, account.id));
        console.log(`  - ${account.name} (${account.bankName}): ${txnCount[0]?.total || 0} transações`);
    }

    // Identificar a conta Itaú original (que tinha as 149 transações)
    const contaItau = allAccounts.find(a => a.bankName?.includes('Itaú'));

    if (!contaItau) {
        console.log('\n❌ Conta Itaú não encontrada!');
        process.exit(1);
    }

    console.log(`\nConta a MANTER: ${contaItau.name} (${contaItau.id})`);

    // Contas a deletar (todas menos Itaú)
    const contasParaDeletar = allAccounts.filter(a => a.id !== contaItau.id);

    console.log('\nContas a DELETAR:');
    for (const account of contasParaDeletar) {
        const txnCount = await db.select({ total: count(transactions.id) })
            .from(transactions)
            .where(eq(transactions.accountId, account.id));
        console.log(`  - ${account.name}: ${txnCount[0]?.total || 0} transações`);
    }

    // Contar total a deletar
    const accountIdsToDelete = contasParaDeletar.map(a => a.id);

    if (accountIdsToDelete.length === 0) {
        console.log('\n✅ Nenhuma conta para deletar.');
        process.exit(0);
    }

    let totalTxnsToDelete = 0;
    for (const accountId of accountIdsToDelete) {
        const txnCount = await db.select({ total: count(transactions.id) })
            .from(transactions)
            .where(eq(transactions.accountId, accountId));
        totalTxnsToDelete += Number(txnCount[0]?.total || 0);
    }

    console.log(`\nTotal de transações a deletar: ${totalTxnsToDelete}`);

    if (!dryRun) {
        console.log('\n=== EXECUTANDO ===\n');

        // 1. Deletar transações das contas extras
        for (const account of contasParaDeletar) {
            const result = await db.delete(transactions)
                .where(eq(transactions.accountId, account.id));
            console.log(`  ✓ Transações de "${account.name}" deletadas`);
        }

        // 2. Deletar as contas extras
        for (const account of contasParaDeletar) {
            await db.delete(accounts).where(eq(accounts.id, account.id));
            console.log(`  ✓ Conta "${account.name}" deletada`);
        }

        // Verificação final
        console.log('\n=== VERIFICAÇÃO FINAL ===\n');

        const remainingAccounts = await db.select().from(accounts);
        console.log(`Contas restantes: ${remainingAccounts.length}`);
        remainingAccounts.forEach(a => console.log(`  - ${a.name} (${a.bankName})`));

        const remainingTxns = await db.select({ total: count(transactions.id) }).from(transactions);
        console.log(`\nTransações restantes: ${remainingTxns[0]?.total || 0}`);

    } else {
        console.log('\n⚠️ Este foi um DRY RUN. Nenhuma alteração foi feita.');
        console.log('   Execute sem --dry-run para aplicar as mudanças.');
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
