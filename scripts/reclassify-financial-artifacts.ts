
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

async function reclassifyFinancialArtifacts() {
    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    console.log('🔄 Starting reclassification of non-revenue items...');

    // 1. Ensure target categories exist
    // "Transferências Internas" for Balance snapshots/Internal transfers (Should be ignored in DRE)
    // "Antecipação de Recebíveis" for FIDC/Loans (Non-operating inflow, debt)

    const categories = [
        { name: 'Transferências Internas', type: 'non_operating', icon: '🔄' }, // Using a generic icon
        { name: 'Antecipação de Recebíveis', type: 'non_operating', icon: '🏦' }
    ];

    const categoryIds: Record<string, string> = {};

    for (const cat of categories) {
        let res = await db.execute(sql`SELECT id FROM financeai_categories WHERE name = ${cat.name} LIMIT 1`);
        if (res.rows.length === 0) {
            console.log(`➕ Creating category: ${cat.name}`);
            res = await db.execute(sql`
                INSERT INTO financeai_categories (name, type, icon, active, is_system) 
                VALUES (${cat.name}, ${cat.type}, ${cat.icon}, true, false) 
                RETURNING id
            `);
        }
        categoryIds[cat.name] = res.rows[0].id;
    }

    const transferId = categoryIds['Transferências Internas'];
    const antecipacaoId = categoryIds['Antecipação de Recebíveis'];

    // 2. Reclassify "SALDO TOTAL..." and "TRANSFERÊNCIA..." to Transferências Internas
    // These are currently in "Receitas Financeiras" (we need to confirm we only touch those or just touch distinct descriptions?)
    // Safer to touch based on description pattern + current Category if needed, but description is strong enough here.

    console.log('\n🧹 Moving "SALDO TOTAL" and "TRANSFERÊNCIA" to "Transferências Internas"...');

    const saldoResult = await db.execute(sql`
        UPDATE financeai_transactions 
        SET category_id = ${transferId}, updated_at = NOW()
        WHERE description ILIKE '%SALDO TOTAL DISPONÍVEL DIA%' 
           OR description ILIKE '%TRANSFERÊNCIA RECEBIDA CF%'
           OR description ILIKE '%RENDIMENTOS REND PAGO%'
           OR description ILIKE '%REND PAGO APLIC%'
           OR description ILIKE '%RESGATE AUTOMATICO%'
        RETURNING id
    `);
    console.log(`✅ Moved ${saldoResult.rows.length} transactions to "Transferências Internas".`);

    // 3. Reclassify "TED ... FIDC" / "GROWTH" / "FACTORING" to Antecipação de Recebíveis
    // Searching for keywords identified in inspection

    console.log('\n🏦 Moving FIDC/Securitizadora/Loans to "Antecipação de Recebíveis"...');

    const fidcResult = await db.execute(sql`
        UPDATE financeai_transactions 
        SET category_id = ${antecipacaoId}, updated_at = NOW()
        WHERE (
            description ILIKE '%FIDC%' 
            OR description ILIKE '%SECURITIZADORA%'
            OR description ILIKE '%ATLANTA%'
            OR description ILIKE '%GROWTH%'
            OR description ILIKE '%PLANIAGRO%'
            OR description ILIKE '%FACTORING%'
        )
        AND category_id != ${antecipacaoId} -- Avoid re-processing if already correct
        RETURNING id
    `);
    console.log(`✅ Moved ${fidcResult.rows.length} transactions to "Antecipação de Recebíveis".`);

    console.log('\n✨ Reclassification complete.');
    process.exit(0);
}

reclassifyFinancialArtifacts().catch(console.error);
