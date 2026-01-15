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
 * Limpa para manter apenas as 149 transações originais do upload OFX
 */

async function run() {
    const { db } = await import('../lib/db/connection');
    const { transactions, accounts, uploads } = await import('../lib/db/schema');
    const { eq, count, isNull, ne } = await import('drizzle-orm');

    const dryRun = process.argv.includes('--dry-run');

    console.log('=== LIMPEZA PARA 149 TRANSAÇÕES ORIGINAIS ===\n');
    console.log(`Modo: ${dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    // Identificar o upload original
    const allUploads = await db.select().from(uploads);
    const originalUpload = allUploads.find(u => u.originalName?.includes('Extrato_0507'));

    if (!originalUpload) {
        console.log('❌ Upload original não encontrado!');
        process.exit(1);
    }

    console.log(`Upload original: ${originalUpload.originalName}`);
    console.log(`Upload ID: ${originalUpload.id}`);

    // Contar transações do upload original
    const originalTxns = await db.select({ total: count(transactions.id) })
        .from(transactions)
        .where(eq(transactions.uploadId, originalUpload.id));

    console.log(`Transações do upload original: ${originalTxns[0]?.total || 0}`);

    // Contar transações SEM upload (extras)
    const extraTxns = await db.select({ total: count(transactions.id) })
        .from(transactions)
        .where(isNull(transactions.uploadId));

    console.log(`Transações sem upload (a deletar): ${extraTxns[0]?.total || 0}`);

    // Contar transações de outros uploads
    const otherUploadTxns = await db.select({ total: count(transactions.id) })
        .from(transactions)
        .where(ne(transactions.uploadId, originalUpload.id));

    // Subtrair as que são null
    const otherTxnsWithUpload = Number(otherUploadTxns[0]?.total || 0) - Number(extraTxns[0]?.total || 0);
    console.log(`Transações de outros uploads: ${otherTxnsWithUpload}`);

    // Listar contas
    console.log('\n--- CONTAS ---\n');
    const allAccounts = await db.select().from(accounts);

    // Identificar a conta do upload original
    const sampleTxn = await db.select({ accountId: transactions.accountId })
        .from(transactions)
        .where(eq(transactions.uploadId, originalUpload.id))
        .limit(1);

    const originalAccountId = sampleTxn[0]?.accountId;
    const originalAccount = allAccounts.find(a => a.id === originalAccountId);

    console.log(`Conta original: ${originalAccount?.name} (${originalAccount?.bankName})`);

    const contasParaDeletar = allAccounts.filter(a => a.id !== originalAccountId);
    console.log(`\nContas a DELETAR:`);
    for (const account of contasParaDeletar) {
        const txnCount = await db.select({ total: count(transactions.id) })
            .from(transactions)
            .where(eq(transactions.accountId, account.id));
        console.log(`  - ${account.name}: ${txnCount[0]?.total || 0} transações`);
    }

    if (!dryRun) {
        console.log('\n=== EXECUTANDO ===\n');

        // 1. Deletar transações sem uploadId (na conta Itaú)
        const deletedNoUpload = await db.delete(transactions)
            .where(isNull(transactions.uploadId));
        console.log(`✓ Transações sem upload deletadas`);

        // 2. Deletar transações das outras contas
        for (const account of contasParaDeletar) {
            await db.delete(transactions)
                .where(eq(transactions.accountId, account.id));
            console.log(`✓ Transações de "${account.name}" deletadas`);

            // Deletar a conta
            await db.delete(accounts).where(eq(accounts.id, account.id));
            console.log(`✓ Conta "${account.name}" deletada`);
        }

        // Verificação final
        console.log('\n=== VERIFICAÇÃO FINAL ===\n');

        const remainingAccounts = await db.select().from(accounts);
        console.log(`Contas: ${remainingAccounts.length}`);
        remainingAccounts.forEach(a => console.log(`  - ${a.name} (${a.bankName})`));

        const remainingTxns = await db.select({ total: count(transactions.id) }).from(transactions);
        console.log(`\nTransações: ${remainingTxns[0]?.total || 0}`);

    } else {
        console.log('\n⚠️ Este foi um DRY RUN. Nenhuma alteração foi feita.');
        console.log('   Execute sem --dry-run para aplicar as mudanças.');
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
