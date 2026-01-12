
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

async function inspectDuplicates() {
    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    console.log('🔍 Inspecting specific duplicate candidates...\n');

    // Pick one specific large transaction from the previous audit found
    // Description: 'TED 363.0001.ATLANTA F D ATLANTA FIDC DE RESPONSABILIDADE LIMITADA 11.468.186/0001-24'
    // Amount: 176729.66
    // Date: 2025-11-03

    const targetAmount = 176729.66;
    const targetDate = '2025-11-03';

    console.log(`Checking transactions with Amount: ${targetAmount} on ${targetDate}...`);

    const results = await db.execute(sql`
        SELECT 
            t.id, 
            t.description, 
            t.amount, 
            t.transaction_date, 
            t.upload_id, 
            t.created_at,
            u.filename as upload_filename,
            u.uploaded_at as upload_date
        FROM financeai_transactions t
        LEFT JOIN financeai_uploads u ON t.upload_id = u.id
        WHERE t.amount = ${targetAmount}
          AND date(t.transaction_date) = ${targetDate}
    `);

    console.table(results.rows.map((row: any) => ({
        id: row.id,
        amount: row.amount,
        upload_id: row.upload_id ? row.upload_id.substring(0, 8) + '...' : 'NULL',
        filename: row.upload_filename,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : 'N/A'
    })));

    console.log('\n--- Analysis ---');
    if (results.rows.length > 1) {
        const uploadIds = new Set(results.rows.map((r: any) => r.upload_id));
        if (uploadIds.size > 1) {
            console.log('❌ Duplicates come from DIFFERENT uploads. Likely re-uploaded the same file.');
        } else {
            console.log('❓ Duplicates come from the SAME upload. Logic error in processing?');
        }
    } else {
        console.log('✅ No duplicates found for this specific case (maybe audit query was too broad?)');
    }

    process.exit(0);
}

inspectDuplicates().catch((err) => {
    console.error(err);
    process.exit(1);
});
