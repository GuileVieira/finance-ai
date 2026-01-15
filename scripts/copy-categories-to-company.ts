import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * Script para copiar categorias de uma empresa para outra e atualizar as transações.
 *
 * Problema encontrado:
 * - "Minha Empresa" tem 86 transações mas 0 categorias próprias
 * - As transações estão usando categoryIds da "Empresa Teste"
 * - Isso causa mismatch quando a API filtra por companyId
 *
 * Solução:
 * - Copiar todas as categorias da "Empresa Teste" para "Minha Empresa"
 * - Atualizar as transações de "Minha Empresa" para usar as novas categorias
 */

interface CategoryRow {
    id: string;
    name: string;
    type: string | null;
    colorHex: string | null;
    icon: string | null;
    description: string | null;
    companyId: string | null;
    isActive: boolean | null;
    categoryGroup: string | null;
    dreGroup: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

async function run() {
    const { db } = await import('../lib/db/connection');
    const { categories, transactions, accounts, companies } = await import('../lib/db/schema');
    const { eq, and, sql, count, inArray } = await import('drizzle-orm');

    const dryRun = process.argv.includes('--dry-run');

    console.log('=== CÓPIA DE CATEGORIAS ENTRE EMPRESAS ===\n');
    console.log(`Modo: ${dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    // Identificar empresas
    const empresaTeste = (await db.select().from(companies).where(eq(companies.name, 'Empresa Teste')))[0];
    const minhaEmpresa = (await db.select().from(companies).where(eq(companies.name, 'Minha Empresa')))[0];

    if (!empresaTeste || !minhaEmpresa) {
        console.log('❌ Empresas não encontradas!');
        process.exit(1);
    }

    console.log(`Origem: ${empresaTeste.name} (${empresaTeste.id})`);
    console.log(`Destino: ${minhaEmpresa.name} (${minhaEmpresa.id})`);

    // Buscar categorias da Empresa Teste
    const sourceCategories = await db.select().from(categories).where(eq(categories.companyId, empresaTeste.id));
    console.log(`\nCategorias na origem: ${sourceCategories.length}`);

    // Verificar quais categorias são usadas por transações da Minha Empresa
    const usedCategoryIds = await db.selectDistinct({ categoryId: transactions.categoryId })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(
            eq(accounts.companyId, minhaEmpresa.id),
            sql`${transactions.categoryId} IS NOT NULL`
        ));

    const usedIds = new Set(usedCategoryIds.map(r => r.categoryId).filter((id): id is string => id !== null));
    console.log(`Categorias usadas por transações de ${minhaEmpresa.name}: ${usedIds.size}`);

    // Filtrar apenas as categorias que são usadas
    const categoriesToCopy = sourceCategories.filter(c => usedIds.has(c.id));
    console.log(`Categorias a copiar: ${categoriesToCopy.length}`);

    // Verificar se já existem categorias na Minha Empresa
    const existingCategories = await db.select().from(categories).where(eq(categories.companyId, minhaEmpresa.id));
    const existingNames = new Set(existingCategories.map(c => c.name.toUpperCase()));

    // Categorias que já existem (não precisam ser copiadas)
    const alreadyExist = categoriesToCopy.filter(c => existingNames.has(c.name.toUpperCase()));
    const toCreate = categoriesToCopy.filter(c => !existingNames.has(c.name.toUpperCase()));

    console.log(`\n  Já existem: ${alreadyExist.length}`);
    console.log(`  A criar: ${toCreate.length}`);

    // Criar mapeamento old ID -> new ID
    const idMapping = new Map<string, string>();

    // Para categorias que já existem, mapear para a existente
    for (const cat of alreadyExist) {
        const existing = existingCategories.find(e => e.name.toUpperCase() === cat.name.toUpperCase());
        if (existing) {
            idMapping.set(cat.id, existing.id);
        }
    }

    // Para categorias novas, gerar novo ID
    for (const cat of toCreate) {
        idMapping.set(cat.id, uuidv4());
    }

    console.log('\n=== PLANO DE MIGRAÇÃO ===\n');

    console.log('Categorias a criar:');
    toCreate.forEach(c => console.log(`  + ${c.name} (${c.id} -> ${idMapping.get(c.id)})`));

    if (toCreate.length === 0) {
        console.log('  (nenhuma)');
    }

    console.log('\nCategorias a remapear (já existem):');
    alreadyExist.forEach(c => {
        const newId = idMapping.get(c.id);
        const existing = existingCategories.find(e => e.id === newId);
        console.log(`  = ${c.name}: ${c.id} -> ${newId}`);
    });

    if (alreadyExist.length === 0) {
        console.log('  (nenhuma)');
    }

    // Contar transações a atualizar
    let totalTxnsToUpdate = 0;
    for (const [oldId] of idMapping) {
        const txnCount = await db.select({ count: count(transactions.id) })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(and(
                eq(transactions.categoryId, oldId),
                eq(accounts.companyId, minhaEmpresa.id)
            ));
        totalTxnsToUpdate += Number(txnCount[0]?.count || 0);
    }

    console.log(`\nTotal de transações a atualizar: ${totalTxnsToUpdate}`);

    if (!dryRun) {
        console.log('\n=== EXECUTANDO ===\n');

        // 1. Criar novas categorias
        if (toCreate.length > 0) {
            console.log('Criando categorias...');
            for (const cat of toCreate) {
                const newId = idMapping.get(cat.id)!;
                await db.insert(categories).values({
                    id: newId,
                    name: cat.name,
                    type: cat.type,
                    colorHex: cat.colorHex,
                    icon: cat.icon,
                    description: cat.description,
                    companyId: minhaEmpresa.id,
                    isActive: cat.isActive ?? true,
                    categoryGroup: cat.categoryGroup,
                    dreGroup: cat.dreGroup,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`  ✓ Criada: ${cat.name}`);
            }
        }

        // 2. Atualizar transações
        console.log('\nAtualizando transações...');

        // Buscar todas as contas da Minha Empresa
        const minhaEmpresaAccounts = await db.select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.companyId, minhaEmpresa.id));
        const accountIds = minhaEmpresaAccounts.map(a => a.id);

        if (accountIds.length === 0) {
            console.log('  ⚠️ Nenhuma conta encontrada para Minha Empresa');
        } else {
            for (const [oldId, newId] of idMapping) {
                // Só atualizar se o ID mudou
                if (oldId !== newId) {
                    const result = await db.update(transactions)
                        .set({ categoryId: newId, updatedAt: new Date() })
                        .where(and(
                            eq(transactions.categoryId, oldId),
                            inArray(transactions.accountId, accountIds)
                        ));
                    console.log(`  ✓ Atualizado: ${oldId} -> ${newId}`);
                }
            }
        }

        console.log('\n✅ Migração concluída!');

        // Verificação final
        console.log('\n=== VERIFICAÇÃO FINAL ===\n');

        const finalCategories = await db.select({ count: count(categories.id) })
            .from(categories)
            .where(eq(categories.companyId, minhaEmpresa.id));

        console.log(`Categorias em ${minhaEmpresa.name}: ${finalCategories[0]?.count || 0}`);

        // Verificar mismatch
        const mismatch = await db.select({ count: count(transactions.id) })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .innerJoin(categories, eq(transactions.categoryId, categories.id))
            .where(sql`${categories.companyId} != ${accounts.companyId}`);

        console.log(`Transações com mismatch de companyId: ${mismatch[0]?.count || 0}`);

    } else {
        console.log('\n⚠️ Este foi um DRY RUN. Nenhuma alteração foi feita.');
        console.log('   Execute sem --dry-run para aplicar as mudanças.');
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
