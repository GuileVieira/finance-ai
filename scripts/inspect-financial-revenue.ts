
import fs from 'fs';
import path from 'path';

// Manually read .env (without local) because that's where DATABASE_URL is
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

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
}

// Dynamic import
async function inspectFinancialRevenue() {
    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    console.log('🔍 Inspecting "Receitas Financeiras"...');

    // 1. Get Category ID (Raw SQL)
    const catResult = await db.execute(sql`
        SELECT id, name FROM financeai_categories WHERE name = 'Receitas Financeiras' LIMIT 1
    `);

    if (!catResult.rows.length) {
        console.error('❌ Category "Receitas Financeiras" not found');
        return;
    }

    const catId = catResult.rows[0].id;
    console.log(`📂 Category: ${catResult.rows[0].name} (ID: ${catId})`);

    // 2. Get Top 50 Transactions (Raw SQL)
    // Note: ensure we cast amount to numeric if needed, though pg driver usually handles it
    const transResult = await db.execute(sql`
        SELECT date(transaction_date) as date, description, amount 
        FROM financeai_transactions 
        WHERE category_id = ${catId} 
          AND EXTRACT(MONTH FROM transaction_date) = 11 
          AND EXTRACT(YEAR FROM transaction_date) = 2025
        ORDER BY amount DESC 
        LIMIT 50
    `);

    console.log(`\n💰 Top 50 Transactions in Nov 2025 (Total: ${transResult.rows.length}):`);
    console.table(transResult.rows.map((row: any) => ({
        Date: new Date(row.date).toISOString().split('T')[0],
        Description: row.description,
        Amount: parseFloat(row.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    })));

    // 3. Calculate Total from result
    const total = transResult.rows.reduce((sum: number, row: any) => sum + parseFloat(row.amount), 0);
    console.log(`\n💵 Total showing in top 50: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

    process.exit(0);
}

inspectFinancialRevenue().catch((err) => {
    console.error(err);
    process.exit(1);
});
