
import fs from 'fs';
import path from 'path';

// --- ENV SETUP ---
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                let cleanValue = value.trim();
                // Remove quotes
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

async function inspectCategoryTypes() {
    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    console.log('🔍 Inspecting Category Types for Anomalies...\n');

    // Names from previous audit
    const targetNames = [
        'Antecipação de Recebíveis',
        'SALARIOS',
        'FORNECEDORES',
        'SISPAG SALARIOS', // In case the category name is actually this
        'SISPAG FORNECEDORES'
    ];

    // Using ILIKE for flexibility
    for (const name of targetNames) {
        const result = await db.execute(sql`
            SELECT id, name, type, color_hex
            FROM financeai_categories
            WHERE name ILIKE ${'%' + name + '%'}
        `);

        if (result.rows.length > 0) {
            console.log(`✅ Found "${name}":`);
            console.table(result.rows);
        } else {
            console.log(`❌ Not found in categories table: "${name}"`);
        }
    }

    // Also check if they are being accessed via ID from transactions
    // (Optimization: sometimes name in transaction description != category name)

    process.exit(0);
}

inspectCategoryTypes().catch((err) => {
    console.error(err);
    process.exit(1);
});
