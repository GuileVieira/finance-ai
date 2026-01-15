import 'dotenv/config';
import { db } from '@/lib/db/connection';
import { categories, transactions, categoryRules, companies } from '@/lib/db/schema';
import { eq, ilike, and, like, inArray } from 'drizzle-orm';
import { initializeDatabase } from '@/lib/db/init-db';
import { v4 as uuidv4 } from 'uuid';

async function fixSaldoAnterior() {
    await initializeDatabase();
    console.log('🔧 Starting "SALDO ANTERIOR" reclassification...\n');

    // 1. Find or Create "Saldo Inicial" Category (Standard Company)
    // assuming we are fixing for the default company found in other scripts
    const company = await db.query.companies.findFirst({
        where: like(companies.name, '%Empresa Teste%')
    });

    if (!company) {
        console.error('❌ Default company not found.');
        process.exit(1);
    }

    let targetCategory = await db.query.categories.findFirst({
        where: and(
            eq(categories.companyId, company.id),
            ilike(categories.name, 'Saldo Inicial')
        )
    });

    if (!targetCategory) {
        console.log('🆕 Creating "Saldo Inicial" category...');
        const [newCat] = await db.insert(categories).values({
            companyId: company.id,
            name: 'Saldo Inicial',
            description: 'Ajustes de saldo inicial e correções de balanço',
            type: 'non_operational', // Critical: Non-operational to avoid P&L impact
            colorHex: '#94A3B8', // Slate-400 (Neutral color)
            icon: '🏁',
            isSystem: false,
            active: true
        }).returning();
        targetCategory = newCat;
        console.log(`✅ Created category: ${targetCategory.name} (${targetCategory.id})`);
    } else {
        console.log(`✅ Found existing category: ${targetCategory.name} (${targetCategory.id})`);

        // Ensure it is non_operational
        if (targetCategory.type !== 'non_operational') {
            console.log(`⚠️ Updating category type from ${targetCategory.type} to non_operational...`);
            await db.update(categories)
                .set({ type: 'non_operational' })
                .where(eq(categories.id, targetCategory.id));
        }
    }

    // 2. Find Transactions to Update
    const txToUpdate = await db
        .select()
        .from(transactions)
        .where(
            and(
                ilike(transactions.description, '%SALDO ANTERIOR%'),
                // Only update if not already in correct category
                // eq(transactions.categoryId, targetCategory.id) // exclusion below
            )
        );

    const filteredTx = txToUpdate.filter(t => t.categoryId !== targetCategory!.id);

    console.log(`\n🔎 Found ${filteredTx.length} transactions to reclassify.`);

    if (filteredTx.length > 0) {
        // 3. Update Transactions (Bulk update)
        await db.update(transactions)
            .set({
                categoryId: targetCategory.id,
                categorizationSource: 'manual_fix',
                updatedAt: new Date()
            })
            .where(inArray(transactions.id, filteredTx.map(t => t.id)));

        console.log('✅ Transactions updated successfully.');
    } else {
        console.log('✅ All transactions are already correctly classified.');
    }

    // 4. Create/Update Rule for future transactions
    const existingRule = await db.query.categoryRules.findFirst({
        where: and(
            eq(categoryRules.companyId, company.id),
            eq(categoryRules.rulePattern, 'SALDO ANTERIOR')
        )
    });

    if (!existingRule) {
        console.log('\n📏 Creating rule for future occurrences...');
        await db.insert(categoryRules).values({
            companyId: company.id,
            categoryId: targetCategory.id,
            rulePattern: 'SALDO ANTERIOR',
            ruleType: 'contains',
            confidenceScore: '1.00',
            active: true,
            sourceType: 'manual',
            matchFields: ['description']
        });
        console.log('✅ Rule created: "SALDO ANTERIOR" -> "Saldo Inicial"');
    } else {
        console.log('\n📏 Rule already exists. Checking target category...');
        if (existingRule.categoryId !== targetCategory.id) {
            console.log('Updating rule target category...');
            await db.update(categoryRules)
                .set({
                    categoryId: targetCategory.id,
                    active: true,
                    updatedAt: new Date()
                })
                .where(eq(categoryRules.id, existingRule.id));
            console.log('✅ Rule updated.');
        } else {
            console.log('✅ Rule is already correct.');
        }
    }

    console.log('\n🎉 Finished.');
    process.exit(0);
}

fixSaldoAnterior().catch(console.error);
