
import fs from 'fs';
import path from 'path';

// Manually load env vars
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
    });
}

async function reclassifySuppliers() {
    try {
        const { db } = await import('../lib/db/connection');
        const { transactions, categories } = await import('../lib/db/schema');
        const { eq, and, sql, ilike, or } = await import('drizzle-orm');

        console.log('--- Reclassifying Suppliers to Variable Cost ---');

        // 1. Find or Create "FORNECEDORES" category
        let supplierCategory = await db.query.categories.findFirst({
            where: and(
                eq(categories.name, 'FORNECEDORES'),
                eq(categories.companyId, '61f7043e-7d42-4f8e-9bd1-0b7c9f2499aa')
            )
        });

        if (!supplierCategory) {
            console.log('Creating "FORNECEDORES" category...');
            const [newCat] = await db.insert(categories).values({
                name: 'FORNECEDORES',
                type: 'variable_cost',
                companyId: '61f7043e-7d42-4f8e-9bd1-0b7c9f2499aa',
                colorHex: '#ef4444', // Red for cost
                active: true
            }).returning();
            supplierCategory = newCat;
        } else {
            console.log(`Found "FORNECEDORES" category: ${supplierCategory.id}`);
            // Ensure it is variable_cost
            if (supplierCategory.type !== 'variable_cost') {
                console.log('Updating "FORNECEDORES" to variable_cost...');
                await db.update(categories)
                    .set({ type: 'variable_cost' })
                    .where(eq(categories.id, supplierCategory.id));
            }
        }

        // 2. Find "OUTRAS DESPESAS NOP"
        // 2. Find "OUTRAS DESPESAS NOP"
        // Using ID found in audit: ffdece17-782a-4e3e-9710-9a8a8cc8696a
        const nopId = 'ffdece17-782a-4e3e-9710-9a8a8cc8696a';

        const nopCategory = await db.query.categories.findFirst({
            where: eq(categories.id, nopId)
        });

        if (!nopCategory) {
            console.log('Could not find "OUTRAS DESPESAS NOP". Aborting.');
            return;
        }
        console.log(`Found NOP Category: ${nopCategory.name} (${nopCategory.id})`);

        // Debug: List one transaction to see description format
        const sampleTx = await db.query.transactions.findFirst({
            where: eq(transactions.categoryId, nopCategory.id)
        });
        if (sampleTx) console.log(`Sample Transaction Description: "${sampleTx.description}"`);

        // Check count manually
        const [countResult] = await db.select({ count: sql`count(*)` })
            .from(transactions)
            .where(eq(transactions.categoryId, nopCategory.id));
        console.log(`Transactions in NOP (Count): ${countResult.count}`);

        // 3. Move Transactions
        console.log('Moving transactions...');
        const result = await db.update(transactions)
            .set({ categoryId: supplierCategory.id })
            .where(
                and(
                    eq(transactions.categoryId, nopCategory.id),
                    // Using simple like %SISPAG% to catch variations
                    or(
                        sql`${transactions.description} LIKE '%SISPAG%'`,
                        sql`${transactions.description} LIKE '%FORNECEDORES%'`
                    )
                )
            )
            .returning({ id: transactions.id, amount: transactions.amount });

        const totalMoved = result.reduce((sum, t) => sum + Number(t.amount), 0);
        console.log(`Moved ${result.length} transactions.`);
        console.log(`Total Value Moved: ${totalMoved.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

    } catch (error) {
        console.error('Reclassification failed:', error);
    } finally {
        process.exit(0);
    }
}

reclassifySuppliers();
