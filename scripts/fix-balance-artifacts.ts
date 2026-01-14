
import 'dotenv/config';
import { db } from '@/lib/db/connection';
import { transactions, categories, categoryRules, companies } from '@/lib/db/schema';
import { eq, ilike, and, not, inArray, sql } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import { nanoid } from 'nanoid';

async function fixBalanceArtifacts() {
    await initializeDatabase();

    console.log('🏁 Starting Smart Balance Artifact Cleanup...');

    // 1. Get Default Company ID
    const [defaultCompany] = await db.select().from(companies).limit(1);
    if (!defaultCompany) {
        console.error('❌ No company found. Run migrations/seed first.');
        process.exit(1);
    }
    console.log(`🏢 Using company: ${defaultCompany.name} (${defaultCompany.id})`);

    // 2. Ensure "Saldo Inicial" Category Exists
    const existingCats = await db.select().from(categories).where(eq(categories.name, 'Saldo Inicial')).limit(1);
    let saldoCategoryId;

    if (existingCats.length === 0) {
        console.log('🆕 Creating "Saldo Inicial" category...');
        const result = await db.insert(categories).values({
            id: nanoid(),
            name: 'Saldo Inicial',
            type: 'non_operational',
            colorHex: '#9CA3AF',
            icon: '💰',
            description: 'Categoria para ajustes de saldo inicial e checkpoints de saldo (ignorado em relatórios)',
            active: true,
            isSystem: false,
            companyId: defaultCompany.id
        }).returning();
        saldoCategoryId = result[0].id;
    } else {
        saldoCategoryId = existingCats[0].id;
        console.log(`✅ "Saldo Inicial" category found: ${saldoCategoryId}`);

        // Ensure it is non_operational
        if (existingCats[0].type !== 'non_operational') {
            console.log('🔄 Fixing type to non_operational...');
            await db.update(categories).set({ type: 'non_operational' }).where(eq(categories.id, saldoCategoryId));
        }
    }

    // 3. Identify Balance Checkpoints
    const checkpoints = await db.select().from(transactions).where(
        and(
            ilike(transactions.description, '%SALDO%'),
            not(ilike(transactions.description, '%JUROS%')),
            not(ilike(transactions.description, '%TARIF%')),
            not(ilike(transactions.description, '%IOF%')),
            not(ilike(transactions.description, '%RESG%')),
            not(ilike(transactions.description, '%APLIC%'))
        )
    );

    console.log(`🎯 Found ${checkpoints.length} potential balance checkpoints.`);

    if (checkpoints.length > 0) {
        const idsToUpdate = checkpoints.map(t => t.id);
        // Drizzle update with inArray
        await db.update(transactions)
            .set({
                categoryId: saldoCategoryId,
                categorizationSource: 'script_fix_balance',
                verified: true
            })
            .where(inArray(transactions.id, idsToUpdate));
        console.log(`✅ Updated ${idsToUpdate.length} transactions.`);
    }

    // 4. Create Rules
    const rulePatterns = [
        'SALDO ANTERIOR',
        'SALDO TOTAL DISPONÍVEL',
        'SALDO TOTAL',
        'SALDO DIA',
        'SDO CTO'
    ];

    for (const pattern of rulePatterns) {
        const existing = await db.select().from(categoryRules).where(eq(categoryRules.rulePattern, pattern)).limit(1);
        if (existing.length === 0) {
            await db.insert(categoryRules).values({
                id: nanoid(),
                categoryId: saldoCategoryId,
                rulePattern: pattern,
                ruleType: 'contains',
                active: true,
                confidenceScore: '1.00',
                status: 'active',
                sourceType: 'manual',
                companyId: defaultCompany.id
            });
            console.log(`➕ Added rule for "${pattern}"`);
        } else {
            console.log(`ℹ️ Rule for "${pattern}" already exists.`);
        }
    }

    console.log('🏁 Done!');
    process.exit(0);
}

fixBalanceArtifacts().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
