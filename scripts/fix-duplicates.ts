
import fs from 'fs';
import path from 'path';

// Manually read .env
const envPath = path.resolve(process.cwd(), '.env');
// ... env loading logic reduced for brevity ...
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                let cleanValue = value.trim();
                // ...
                if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
                    (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
                    cleanValue = cleanValue.slice(1, -1);
                }
                process.env[key.trim()] = cleanValue;
            }
        }
    });
}
if (!process.env.DATABASE_URL) { process.exit(1); }

async function surgicalDeduplication() {
    console.log('✂️  Starting Surgical Deduplication...');
    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    // 1. Identify Master vs Redundant Candidates
    // Master: 6b2a3457... (Largest, most complete)
    // Candidates: d7446d4d..., e68b13ec...

    // We fetch IDs dynamically to be safe
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
        console.log('❌ Could not identify master or candidates.');
        return;
    }

    console.log(`👑 Master Upload: ${master.id}`);

    let totalDeleted = 0;

    for (const cand of candidates) {
        console.log(`\n🕵️ Processing Candidate: ${cand.id} (${cand.filename})`);

        // Find transactions in Candidate that match Master (exact duplicates)
        // Criteria: Amount + Date + Description
        const duplicates = await db.execute(sql`
            SELECT c.id
            FROM financeai_transactions c
            INNER JOIN financeai_transactions m ON 
                m.upload_id = ${master.id} AND
                m.amount = c.amount AND
                date(m.transaction_date) = date(c.transaction_date) AND
                m.description = c.description
            WHERE c.upload_id = ${cand.id}
        `);

        const duplicateIds = duplicates.rows.map((r: any) => r.id);

        if (duplicateIds.length > 0) {
            console.log(`   ⚠️ Found ${duplicateIds.length} EXACT duplicates.`);

            // Chunk deletions to avoid limits
            const chunkSize = 50;
            for (let i = 0; i < duplicateIds.length; i += chunkSize) {
                const chunk = duplicateIds.slice(i, i + chunkSize);
                // Safe Delete with proper quoting
                const idList = chunk.map((id: string) => `'${id}'`).join(',');
                await db.execute(sql.raw(`
                    DELETE FROM financeai_transactions 
                    WHERE id IN (${idList})
                `));
            }
            console.log(`   ✅ Deleted ${duplicateIds.length} redundant transactions.`);
            totalDeleted += duplicateIds.length;
        } else {
            console.log('   ✅ No exact duplicates found.');
        }
    }

    console.log(`\n🎉 Deduplication Complete. Total purged: ${totalDeleted}`);
    process.exit(0);
}

surgicalDeduplication().catch((err) => {
    console.error(err);
    process.exit(1);
});
