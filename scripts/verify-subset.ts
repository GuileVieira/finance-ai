
import fs from 'fs';
import path from 'path';

// Manually read .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                let cleanValue = value.trim();
                if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
                    (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
                    cleanValue = cleanValue.slice(1, -1);
                }
                process.env[key.trim()] = cleanValue;
            }
        }
    });
}

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
}

async function verifySubset() {
    console.log('🔍 Connecting to database...');
    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    // Define the "Master" and "Subsets"
    // Master: 6b2a3457 (149 txs)
    // Candidates: d7446d4d (23 txs), e68b13ec (18 txs)
    // Using simple substring matching for safety

    const uploads = await db.execute(sql`
        SELECT id, filename 
        FROM financeai_uploads 
        WHERE id::text LIKE '6b2a3457%' 
           OR id::text LIKE 'd7446d4d%' 
           OR id::text LIKE 'e68b13ec%'
    `);

    const master = uploads.rows.find((u: any) => u.id.startsWith('6b2a3457'));
    const candidates = uploads.rows.filter((u: any) => !u.id.startsWith('6b2a3457'));

    if (!master || candidates.length === 0) {
        console.log('❌ Could not identify master or candidates from IDs');
        console.log('Found uploads:', uploads.rows.map((u: any) => u.id));
        return;
    }

    console.log(`👑 Master Upload: ${master.filename} (${master.id})`);

    for (const cand of candidates) {
        console.log(`\n🕵️ Checking Candidate: ${cand.filename} (${cand.id})`);

        // Count transactions in candidate
        const countResult = await db.execute(sql`SELECT COUNT(*) as c FROM financeai_transactions WHERE upload_id = ${cand.id}`);
        const totalCand = Number(countResult.rows[0].c);
        console.log(`   Total Transactions: ${totalCand}`);

        // Count missing matches in master
        const result = await db.execute(sql`
            WITH candidate_txs AS (
                SELECT amount, date(transaction_date) as tdate, description
                FROM financeai_transactions WHERE upload_id = ${cand.id}
            ),
            master_txs AS (
                SELECT amount, date(transaction_date) as tdate, description
                FROM financeai_transactions WHERE upload_id = ${master.id}
            )
            SELECT COUNT(*) as missing_count
            FROM candidate_txs c
            WHERE NOT EXISTS (
                SELECT 1 FROM master_txs m 
                WHERE m.amount = c.amount 
                  AND m.tdate = c.tdate 
                  AND m.description = c.description
            )
        `);

        const missingCount = Number(result.rows[0].missing_count);
        if (missingCount === 0) {
            console.log(`   ✅ SUBSET CONFIRMED: All ${totalCand} transactions present in Master.`);
        } else {
            console.log(`   ❌ NOT A SUBSET: ${missingCount} transactions are unique to this upload.`);

            // Show examples of missing
            const missing = await db.execute(sql`
                WITH master_txs AS (
                    SELECT amount, date(transaction_date) as tdate, description
                    FROM financeai_transactions WHERE upload_id = ${master.id}
                )
                SELECT c.amount, date(c.transaction_date) as tdate, c.description
                FROM financeai_transactions c
                WHERE c.upload_id = ${cand.id}
                  AND NOT EXISTS (
                    SELECT 1 FROM master_txs m 
                    WHERE m.amount = c.amount 
                      AND m.tdate = date(c.transaction_date)
                      AND m.description = c.description
                )
                LIMIT 5
            `);

            console.table(missing.rows.map((r: any) => ({
                Date: new Date(r.tdate).toISOString().split('T')[0],
                Amount: r.amount,
                Description: r.description
            })));
        }
    }

    process.exit(0);
}

verifySubset().catch((err) => {
    console.error(err);
    process.exit(1);
});
