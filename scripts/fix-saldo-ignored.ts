import fs from 'fs';
import path from 'path';

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

async function fix() {
    const { db } = await import('../lib/db/drizzle');
    const { categories } = await import('../lib/db/schema');
    const { eq } = await import('drizzle-orm');

    // Set isIgnored = true on "Saldo Inicial"
    const result = await db.update(categories)
        .set({ isIgnored: true })
        .where(eq(categories.name, 'Saldo Inicial'))
        .returning({ id: categories.id, name: categories.name, isIgnored: categories.isIgnored });

    console.log('Categoria atualizada:');
    console.table(result);

    // Verify
    const verify = await db.select({
        id: categories.id,
        name: categories.name,
        isIgnored: categories.isIgnored,
    }).from(categories)
    .where(eq(categories.name, 'Saldo Inicial'));

    console.log('\nVerificacao:');
    console.table(verify);

    process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });
