
import 'dotenv/config';
import { db } from '@/lib/db/connection';
import { transactions, categories, categoryRules } from '@/lib/db/schema';
import { eq, like, ilike, and, not, inArray } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import { v4 as uuidv4 } from 'uuid';

async function fixBalanceArtifacts() {
    await initializeDatabase();

    console.log('🏁 Starting Smart Balance Artifact Cleanup...');

    // 1. Ensure "Saldo Inicial" Category Exists
    const saldoCategory = await db.query.categories.findFirst({
        where: (categories, { eq }) => eq(categories.name, 'Saldo Inicial')
    });

    let saldoCategoryId;

    if (!saldoCategory) {
        console.log('🆕 Creating "Saldo Inicial" category...');
        const [statsCat] = await db.insert(categories).values({
            name: 'Saldo Inicial',
            type: 'non_operational',
            colorHex: '#9CA3AF', // Gray
            icon: '💰',
            description: 'Categoria para ajustes de saldo inicial e checkpoints de saldo (ignorado em relatórios)'
        }).returning();
        saldoCategoryId = statsCat.id;
    } else {
        console.log('✅ "Saldo Inicial" category already exists.');
        saldoCategoryId = saldoCategory.id;

        // Ensure it is non_operational
        if (saldoCategory.type !== 'non_operational') {
            console.log('🔄 Fixing "Saldo Inicial" type to non_operational...');
            await db.update(categories)
                .set({ type: 'non_operational' })
                .where(eq(categories.id, saldoCategoryId));
        }
    }

    // 2. Identify Balance Checkpoints vs Financial Movements
    console.log('🔍 Identifying transactions to reclassify...');

    const checkpoints = await db
        .select()
        .from(transactions)
        .where(
            and(
                ilike(transactions.description, '%SALDO%'),
                // EXCLUDE genuine financial movements (Juros, Tarifas, etc)
                not(ilike(transactions.description, '%JUROS%')),
                not(ilike(transactions.description, '%TARIF%')),
                not(ilike(transactions.description, '%IOF%')),
                not(ilike(transactions.description, '%RESG%')),
                not(ilike(transactions.description, '%APLIC%'))
            )
        );

    console.log(`🎯 Found ${checkpoints.length} potential balance checkpoints.`);

    if (checkpoints.length === 0) {
        console.log('🎉 No artifacts found to fix.');
        process.exit(0);
    }

    // 3. Reclassify
    const idsToUpdate = checkpoints.map(t => t.id);

    await db.update(transactions)
        .set({
            categoryId: saldoCategoryId,
            categorizationSource: 'script_fix_balance',
            verified: true
        })
        .where(inArray(transactions.id, idsToUpdate));

    console.log(`✅ Reclassified ${idsToUpdate.length} transactions to "Saldo Inicial".`);

    // 4. Create Rules for Future Imports
    const rulePatterns = [
        'SALDO ANTERIOR',
        'SALDO TOTAL DISPONÍVEL',
        'SALDO TOTAL',
        'SALDO DIA',
        'SDO CTO'
    ];

    console.log('📏 Creating/Updating rules...');

    for (const pattern of rulePatterns) {
        // Check if rule exists
        const existingRule = await db.query.categoryRules.findFirst({
            where: (rules, { eq, and }) => and(
                eq(rules.pattern, pattern),
                eq(rules.category, 'Saldo Inicial')
            )
        });

        if (!existingRule) {
            await db.insert(categoryRules).values({
                category: 'Saldo Inicial',
                pattern: pattern,
                type: 'contains',
                accuracy: 100,
                status: 'active'
            });
            console.log(`➕ Rule added: "${pattern}" -> Saldo Inicial`);
        } else {
            console.log(`ℹ️ Rule already exists: "${pattern}"`);
        }
    }

    console.log('🏁 Verification complete. Please check Dashboard.');
    process.exit(0);
}

fixBalanceArtifacts();
