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
    const { transactions, accounts, uploads } = await import('../lib/db/schema');
    const { eq, count, sql, desc } = await import('drizzle-orm');

    console.log('=== ANÁLISE DE ORIGEM DAS TRANSAÇÕES ===\n');

    // Listar todas as contas com transações
    const allAccounts = await db.select().from(accounts);

    for (const account of allAccounts) {
        const txns = await db.select({
            id: transactions.id,
            description: transactions.description,
            transactionDate: transactions.transactionDate,
            uploadId: transactions.uploadId,
            createdAt: transactions.createdAt
        })
            .from(transactions)
            .where(eq(transactions.accountId, account.id))
            .orderBy(desc(transactions.transactionDate))
            .limit(5);

        const txnCount = await db.select({ total: count(transactions.id) })
            .from(transactions)
            .where(eq(transactions.accountId, account.id));

        console.log(`\n========================================`);
        console.log(`CONTA: ${account.name} (${account.bankName})`);
        console.log(`Total: ${txnCount[0]?.total || 0} transações`);
        console.log(`========================================`);

        if (txns.length > 0) {
            console.log('\nAmostra de transações:');
            txns.forEach(t => {
                console.log(`  - ${t.transactionDate} | ${t.description}`);
                console.log(`    Upload ID: ${t.uploadId || 'N/A'}`);
            });
        }
    }

    // Verificar uploads
    console.log('\n\n========================================');
    console.log('UPLOADS REGISTRADOS');
    console.log('========================================\n');

    const allUploads = await db.select().from(uploads);

    for (const upload of allUploads) {
        const txnCount = await db.select({ total: count(transactions.id) })
            .from(transactions)
            .where(eq(transactions.uploadId, upload.id));

        console.log(`- ${upload.originalName || upload.filename}`);
        console.log(`  ID: ${upload.id}`);
        console.log(`  Transações: ${txnCount[0]?.total || 0}`);
        console.log(`  Data: ${upload.createdAt}`);
        console.log('');
    }

    // Transações por data de criação
    console.log('\n========================================');
    console.log('TRANSAÇÕES POR DATA DE CRIAÇÃO');
    console.log('========================================\n');

    const byCreatedAt = await db.select({
        date: sql<string>`DATE(${transactions.createdAt})`,
        total: count(transactions.id)
    })
        .from(transactions)
        .groupBy(sql`DATE(${transactions.createdAt})`)
        .orderBy(sql`DATE(${transactions.createdAt})`);

    byCreatedAt.forEach(row => {
        console.log(`  ${row.date}: ${row.total} transações`);
    });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
