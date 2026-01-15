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

async function run() {
    const { db } = await import('../lib/db/connection');
    const { categories } = await import('../lib/db/schema');
    const { isNotNull, isNull, sql } = await import('drizzle-orm');
    
    console.log('--- Verificando categoryGroup nas categorias ---\n');
    
    // Total de categorias
    const allCats = await db.select().from(categories);
    console.log(`Total de categorias: ${allCats.length}`);
    
    // Com categoryGroup
    const withGroup = allCats.filter(c => c.categoryGroup);
    console.log(`Com categoryGroup: ${withGroup.length}`);
    
    // Sem categoryGroup
    const withoutGroup = allCats.filter(c => !c.categoryGroup);
    console.log(`Sem categoryGroup: ${withoutGroup.length}`);
    
    // Mostrar algumas sem grupo
    if (withoutGroup.length > 0) {
        console.log('\n--- Exemplos sem categoryGroup (primeiras 10): ---');
        withoutGroup.slice(0, 10).forEach(c => {
            console.log(`  - ${c.name} (type: ${c.type}, dreGroup: ${c.dreGroup || 'null'})`);
        });
    }
    
    // Mostrar grupos únicos
    if (withGroup.length > 0) {
        const groups = [...new Set(withGroup.map(c => c.categoryGroup))];
        console.log('\n--- Grupos encontrados: ---');
        groups.forEach(g => console.log(`  - ${g}`));
    }
    
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
