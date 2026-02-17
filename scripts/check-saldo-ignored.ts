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

async function check() {
    const { db } = await import('../lib/db/drizzle');
    const { categories, transactions } = await import('../lib/db/schema');
    const { eq, ilike, or, and, gte, lte } = await import('drizzle-orm');

    // 1. Check "Saldo Inicial" category
    const saldoCats = await db.select({
        id: categories.id,
        name: categories.name,
        isIgnored: categories.isIgnored,
        active: categories.active,
        type: categories.type,
        dreGroup: categories.dreGroup,
    }).from(categories)
    .where(ilike(categories.name, '%saldo%'));

    console.log('=== CATEGORIAS COM "SALDO" NO NOME ===');
    console.table(saldoCats);

    // 2. Check transactions with saldo in description (Nov 2025)
    const saldoTxns = await db.select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        categoryId: transactions.categoryId,
    }).from(transactions)
    .where(and(
        gte(transactions.transactionDate, '2025-11-01'),
        lte(transactions.transactionDate, '2025-11-30'),
        or(
            ilike(transactions.description, '%saldo%'),
            ilike(transactions.description, '%S A L D O%')
        )
    ));

    console.log(`\n=== TRANSACOES "SALDO" EM NOV/2025: ${saldoTxns.length} ===`);
    for (const t of saldoTxns) {
        const inSaldoCat = saldoCats.find(c => c.id === t.categoryId);
        console.log(`  ${t.transactionDate} | R$ ${parseFloat(String(t.amount)).toLocaleString('pt-BR', {minimumFractionDigits: 2})} | cat: ${inSaldoCat ? `${inSaldoCat.name} (isIgnored=${inSaldoCat.isIgnored})` : '(sem cat)'} | ${t.description}`);
    }

    // 3. Check if financial-exclusion would filter them
    // Simulate: does getTransactionDescriptionExclusionClause cover all these?
    const patterns = ['SALDO TOTAL', 'SALDO DISPONIVEL', 'SALDO DO DIA', 'SALDO EM', 'S A L D O'];
    console.log('\n=== COBERTURA DOS PADROES DE EXCLUSAO ===');
    for (const t of saldoTxns) {
        const desc = t.description.toUpperCase();
        const matchedPattern = patterns.find(p => desc.includes(p));
        console.log(`  ${matchedPattern ? 'COBERTO' : 'NAO COBERTO'} | ${t.description} ${matchedPattern ? `(pattern: ${matchedPattern})` : ''}`);
    }

    // 4. Check OTHER months for different saldo patterns
    const allSaldoTxns = await db.select({
        description: transactions.description,
        transactionDate: transactions.transactionDate,
    }).from(transactions)
    .where(or(
        ilike(transactions.description, '%saldo%'),
        ilike(transactions.description, '%S A L D O%')
    ));

    const uniqueDescs = [...new Set(allSaldoTxns.map(t => t.description))];
    console.log(`\n=== TODAS AS DESCRICOES COM "SALDO" (${uniqueDescs.length} unicas) ===`);
    for (const d of uniqueDescs) {
        const upper = d.toUpperCase();
        const matched = patterns.find(p => upper.includes(p));
        console.log(`  ${matched ? 'COBERTO' : 'NAO COBERTO'} | ${d}`);
    }

    process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
