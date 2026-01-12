
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

async function compareUploads() {
    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    // Upload IDs from previous step
    const suspectUploadIds = [
        'd7446d4d-52ef-46c5-9273-04b1263c9b60', // Adjusted from truncated ID in logs
        'e68b13ec-70e6-4298-b86a-7429188d30e0', // Note: I need the full IDs. 
        '6b2a3457-3f33-4f51-b844-48283a0026e6'  // guessing these are UUIDs, I will search by LIKE
    ];

    // Better strategy: Search by the truncated IDs we saw
    const partialIds = ['d7446d4d', 'e68b13ec', '6b2a3457'];

    console.log('🔍 Comparing Uploads...');

    for (const pid of partialIds) {
        const uploadResult = await db.execute(sql`
            SELECT id, filename, uploaded_at, total_transactions 
            FROM financeai_uploads 
            WHERE id::text LIKE ${pid + '%'}
        `);

        if (uploadResult.rows.length === 0) continue;
        const upload = uploadResult.rows[0];

        console.log(`\n📄 Upload: ${upload.filename} (ID: ${upload.id})`);
        console.log(`   Date: ${new Date(upload.uploaded_at).toISOString()}`);
        console.log(`   Total Tx: ${upload.total_transactions}`);

        // Get Sum
        const sumResult = await db.execute(sql`
            SELECT SUM(amount) as total_amount, COUNT(*) as count 
            FROM financeai_transactions 
            WHERE upload_id = ${upload.id}
        `);
        console.log(`   Real Tx Count: ${sumResult.rows[0].count}`);
        console.log(`   Sum Amount: ${parseFloat(sumResult.rows[0].total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    }

    process.exit(0);
}

compareUploads().catch((err) => {
    console.error(err);
    process.exit(1);
});
