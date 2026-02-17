import fs from 'fs';
import path from 'path';

// Load .env
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
    console.error('DATABASE_URL not set');
    process.exit(1);
}

async function compareDre() {
    const { db } = await import('../lib/db/drizzle');
    const { transactions, accounts, categories } = await import('../lib/db/schema');
    const { eq, and, gte, lte, sql, inArray, isNull, not } = await import('drizzle-orm');

    console.log('=== COMPARACAO DRE NOVEMBRO/2025 vs BANCO DE DADOS ===\n');

    // 1. Find the account (Itau 0507317600)
    const accts = await db.select().from(accounts)
        .where(eq(accounts.accountNumber, '0507317600'));

    if (accts.length === 0) {
        console.log('Conta 0507317600 nao encontrada. Buscando todas as contas...');
        const allAccts = await db.select({
            id: accounts.id,
            name: accounts.name,
            bankCode: accounts.bankCode,
            accountNumber: accounts.accountNumber,
        }).from(accounts);
        console.table(allAccts);

        // Try with all accounts for Nov 2025
        console.log('\nBuscando transacoes de Nov/2025 em todas as contas...');
    }

    const accountId = accts.length > 0 ? accts[0].id : undefined;
    console.log(`Conta encontrada: ${accts.length > 0 ? `${accts[0].name} (${accts[0].id})` : 'TODAS'}\n`);

    // 2. Get all transactions for Nov 2025
    const startDate = '2025-11-01';
    const endDate = '2025-11-30';

    const conditions = [
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
    ];
    if (accountId) {
        conditions.push(eq(transactions.accountId, accountId));
    }

    const allTxns = await db.select({
        id: transactions.id,
        description: transactions.description,
        memo: transactions.memo,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        categoryName: categories.name,
        categoryType: categories.type,
        dreGroup: categories.dreGroup,
        isIgnored: categories.isIgnored,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(transactions.transactionDate);

    console.log(`Total de transacoes no banco (Nov/2025): ${allTxns.length}`);

    // 3. Separar transacoes ignoradas (saldo snapshots, etc)
    const ignoredTxns = allTxns.filter(t => t.isIgnored === true);
    const saldoTxns = allTxns.filter(t =>
        t.description?.toLowerCase().includes('saldo') ||
        t.memo?.toLowerCase().includes('saldo')
    );

    console.log(`Transacoes ignoradas (saldo/snapshots): ${ignoredTxns.length}`);
    if (saldoTxns.length > 0) {
        const sumIgnored = saldoTxns.reduce((s, t) => s + parseFloat(String(t.amount)), 0);
        console.log(`  Soma dos snapshots de saldo: R$ ${sumIgnored.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (excluidos dos totais)`);
    }

    // Filtrar transacoes validas (excluir ignoradas)
    const validTxns = allTxns.filter(t => t.isIgnored !== true);
    console.log(`Transacoes validas (apos filtro): ${validTxns.length}\n`);

    // 4. Totais usando apenas transacoes validas
    const credits = validTxns.filter(t => t.type === 'credit');
    const debits = validTxns.filter(t => t.type === 'debit');

    const sumCredits = credits.reduce((s, t) => s + parseFloat(String(t.amount)), 0);
    const sumDebits = debits.reduce((s, t) => s + Math.abs(parseFloat(String(t.amount))), 0);

    console.log('--- TOTAIS DO BANCO (sem ignoradas) ---');
    console.log(`Credits (entradas):  R$ ${sumCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`Debits (saidas):     R$ ${sumDebits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`Resultado:           R$ ${(sumCredits - sumDebits).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

    console.log('\n--- VALORES DO DRE (OFX) ---');
    console.log(`Entradas OFX:  R$ 3.821.272,50`);
    console.log(`Saidas OFX:    R$ 6.420.896,33`);
    console.log(`Resultado OFX: R$ -2.599.623,83`);

    const diffCredits = sumCredits - 3821272.50;
    const diffDebits = sumDebits - 6420896.33;
    console.log(`\n--- DIFERENCAS ---`);
    console.log(`Diff Entradas: R$ ${diffCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${Math.abs(diffCredits) < 1 ? 'OK' : 'DIVERGE'}`);
    console.log(`Diff Saidas:   R$ ${diffDebits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${Math.abs(diffDebits) < 1 ? 'OK' : 'DIVERGE'}`);
    console.log(`Diff Resultado: R$ ${((sumCredits - sumDebits) - (-2599623.83)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${Math.abs((sumCredits - sumDebits) - (-2599623.83)) < 1 ? 'OK' : 'DIVERGE'}`)

    // 5. Breakdown by category type (DRE groups)
    console.log('\n--- BREAKDOWN POR GRUPO DRE ---');
    const byDreGroup: Record<string, { count: number; total: number; items: string[] }> = {};

    for (const t of validTxns) {
        const group = t.dreGroup || t.categoryType || '(sem categoria)';
        if (!byDreGroup[group]) byDreGroup[group] = { count: 0, total: 0, items: [] };
        byDreGroup[group].count++;
        byDreGroup[group].total += parseFloat(String(t.amount));
    }

    const sortedGroups = Object.entries(byDreGroup).sort((a, b) => b[1].total - a[1].total);
    for (const [group, data] of sortedGroups) {
        console.log(`  ${group.padEnd(20)} | ${String(data.count).padStart(4)} txns | R$ ${data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(18)}`);
    }

    // 6. Breakdown by category name
    console.log('\n--- BREAKDOWN POR CATEGORIA ---');
    const byCat: Record<string, { count: number; total: number }> = {};

    for (const t of validTxns) {
        const cat = t.categoryName || '(sem categoria)';
        if (!byCat[cat]) byCat[cat] = { count: 0, total: 0 };
        byCat[cat].count++;
        byCat[cat].total += parseFloat(String(t.amount));
    }

    const sortedCats = Object.entries(byCat).sort((a, b) => b[1].total - a[1].total);
    for (const [cat, data] of sortedCats) {
        console.log(`  ${cat.padEnd(40)} | ${String(data.count).padStart(3)} txns | R$ ${data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(18)}`);
    }

    // 7. Detailed comparison - DRE categories
    console.log('\n--- COMPARACAO DETALHADA COM DRE ---');

    // DRE expected values (from OFX analysis)
    const dreExpected = {
        'Recebimentos de Clientes': 1243398.98,
        'Antecipacao FIDC': 2066304.42,
        'Transferencias CF': 441762.70,
        'Devolucoes TED': 62899.40,
        'Rendimentos': 15.92,
        'Estorno DARF': 6891.08,
        'Fornecedores': -4997522.28,
        'Salarios': -1364110.50,
        'Tributos': -50896.54,
        'DARF': -6891.08,
        'Tarifas Bancarias': -1475.93,
    };

    // Map DB transactions to DRE categories
    const dreFromDb: Record<string, number> = {};

    for (const t of validTxns) {
        const amt = parseFloat(String(t.amount));
        const desc = (t.description || t.memo || '').toUpperCase();

        let dreCat = '(outros)';

        if (desc.includes('SISPAG FORNECEDORES')) dreCat = 'Fornecedores';
        else if (desc.includes('SISPAG SALARIOS')) dreCat = 'Salarios';
        else if (desc.includes('SISPAG TRIBUTOS')) dreCat = 'Tributos';
        else if (desc.includes('DARF')) dreCat = amt > 0 ? 'Estorno DARF' : 'DARF';
        else if (desc.includes('TAR ') || desc.includes('TAR/') || desc.includes('TAR CTA')) dreCat = 'Tarifas Bancarias';
        else if (desc.includes('ATLANTA') || desc.includes('GROWTH SEC')) dreCat = 'Antecipacao FIDC';
        else if (desc.includes('TRANSFERÊNCIA RECEBIDA') || desc.includes('TRANSFERENCIA RECEBIDA')) dreCat = 'Transferencias CF';
        else if (desc.includes('DEV TED')) dreCat = 'Devolucoes TED';
        else if (desc.includes('RENDIMENTOS') || desc.includes('REND PAGO')) dreCat = 'Rendimentos';
        else if (amt > 0) dreCat = 'Recebimentos de Clientes';
        else dreCat = '(outros debitos)';

        dreFromDb[dreCat] = (dreFromDb[dreCat] || 0) + amt;
    }

    console.log(`${'Categoria DRE'.padEnd(30)} | ${'OFX (esperado)'.padStart(18)} | ${'Banco (real)'.padStart(18)} | ${'Diferenca'.padStart(14)}`);
    console.log('-'.repeat(90));

    for (const [cat, expected] of Object.entries(dreExpected)) {
        const actual = dreFromDb[cat] || 0;
        const diff = actual - expected;
        const status = Math.abs(diff) < 1 ? 'OK' : 'DIVERGE';
        console.log(
            `${cat.padEnd(30)} | R$ ${expected.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(15)} | R$ ${actual.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(15)} | ${status === 'OK' ? 'OK' : `R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}`
        );
    }

    // Show any DB-only categories
    for (const [cat, total] of Object.entries(dreFromDb)) {
        if (!dreExpected[cat as keyof typeof dreExpected] && cat !== '(outros)' && cat !== '(outros debitos)') {
            console.log(`${cat.padEnd(30)} | ${'(n/a no DRE)'.padStart(18)} | R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(15)} | NOVO`);
        }
    }

    // 8. Count uncategorized
    const uncategorized = validTxns.filter(t => !t.categoryName);
    console.log(`\n--- TRANSACOES SEM CATEGORIA: ${uncategorized.length} ---`);
    if (uncategorized.length > 0 && uncategorized.length <= 20) {
        uncategorized.forEach(t => {
            console.log(`  ${t.transactionDate} | ${t.type} | R$ ${parseFloat(String(t.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | ${t.description}`);
        });
    }

    console.log('\n=== FIM DA COMPARACAO ===');
    process.exit(0);
}

compareDre().catch(err => {
    console.error('Erro:', err);
    process.exit(1);
});
