
import fs from 'fs';
import path from 'path';
import { eq, ilike, or } from 'drizzle-orm';

// --- ENV SETUP ---
const envPath = path.resolve(process.cwd(), '.env');
// ... env setup ...
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
if (!process.env.DATABASE_URL) { process.exit(1); }

async function reclassifyCategories() {
    const { db } = await import('../lib/db/drizzle');
    const { categories } = await import('../lib/db/schema');
    const { sql } = await import('drizzle-orm');

    console.log('🔄 Starting Category Reclassification...');

    // 1. Reclassify "Antecipação de Recebíveis"
    const result = await db.update(categories)
        .set({ type: 'financial_movement' })
        .where(ilike(categories.name, '%Antecipação de Recebíveis%'))
        .returning({ id: categories.id, name: categories.name, type: categories.type });

    console.log(`✅ Updated ${result.length} categories for 'Antecipação de Recebíveis' to 'financial_movement'.`);

    // 2. Check for "SISPAG" transfers that might be internal
    // For now, we only flag them, we don't move them automatically unless user confirms.
    // The Consultant Audit (Phase 4) revealed these are huge, so maybe we SHOULD move them to 'non_operating' or similar
    // to sanitize the "Operating Margin", but they are still cash outflows.

    // Let's create a special category for SISPAG if it doesn't exist properly
    // ... Actually, let's just stick to the Factoring fix first.

    process.exit(0);
}

reclassifyCategories().catch((err) => {
    console.error(err);
    process.exit(1);
});
