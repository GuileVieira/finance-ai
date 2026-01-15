import fs from 'fs';
import path from 'path';

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
 * Categoriza as transações restantes sem categoria
 * Usa regras baseadas na descrição da transação
 */

// Regras de categorização baseadas em palavras-chave
const CATEGORIZATION_RULES: Array<{
    patterns: RegExp[];
    categoryName: string;
}> = [
    // Tarifas bancárias
    {
        patterns: [/tarifa/i, /tar /i, /tar\./i, /tar\//i, /taxa/i, /anuidade/i, /custas cobr/i],
        categoryName: 'TARIFAS BANCÁRIAS'
    },
    // SISPAG Tributos (pagamentos de impostos via SISPAG)
    {
        patterns: [/sispag tributos/i],
        categoryName: 'OUTROS TRIBUTOS'
    },
    // IOF
    {
        patterns: [/\biof\b/i],
        categoryName: 'IOF'
    },
    // Juros
    {
        patterns: [/juros/i, /jrs /i, /prorrog/i],
        categoryName: 'JUROS/PRORROGAÇÃO'
    },
    // Transferências
    {
        patterns: [/transf/i, /ted /i, /pix /i, /doc /i],
        categoryName: 'TRANSFERÊNCIAS (+)'
    },
    // Salários
    {
        patterns: [/salario/i, /folha/i, /pagto func/i],
        categoryName: 'SALARIOS'
    },
    // FGTS
    {
        patterns: [/fgts/i],
        categoryName: 'FGTS'
    },
    // INSS
    {
        patterns: [/inss/i, /gps /i],
        categoryName: 'INSS'
    },
    // Impostos/Tributos
    {
        patterns: [/darf/i, /icms/i, /iss /i, /pis /i, /cofins/i, /simples/i],
        categoryName: 'OUTROS TRIBUTOS'
    },
    // Fornecedores/Matéria Prima
    {
        patterns: [/fornec/i, /compra/i, /nf /i, /nota fiscal/i],
        categoryName: 'MATÉRIA PRIMA'
    },
    // Energia
    {
        patterns: [/celesc/i, /cpfl/i, /eletro/i, /energia/i, /luz /i],
        categoryName: 'ENERGIA ELETRICA'
    },
    // Água
    {
        patterns: [/casan/i, /sabesp/i, /agua/i, /saneamento/i],
        categoryName: 'ÁGUA E ESGOTO'
    },
    // Telefone/Internet
    {
        patterns: [/claro/i, /vivo/i, /tim /i, /oi /i, /telefo/i, /internet/i],
        categoryName: 'TELEFONE / INTERNET'
    },
    // Aluguel
    {
        patterns: [/aluguel/i, /locacao/i],
        categoryName: 'ALUGUEL'
    },
    // Combustível
    {
        patterns: [/combust/i, /gasolina/i, /diesel/i, /posto /i, /shell/i, /ipiranga/i, /br /i],
        categoryName: 'COMBUSTIVEIS/LUBRIFICANTES'
    },
    // Faturamento/Vendas
    {
        patterns: [/venda/i, /receb/i, /cliente/i, /faturamento/i],
        categoryName: 'FATURAMENTO'
    },
    // Empréstimos
    {
        patterns: [/emprest/i, /financ/i, /parcela/i],
        categoryName: 'EMPRÉSTIMOS (-)'
    },
    // Saldo Inicial
    {
        patterns: [/saldo inicial/i, /saldo anterior/i],
        categoryName: 'SALDO INICIAL'
    },
    // Receitas Financeiras
    {
        patterns: [/rendimento/i, /aplicacao/i, /resgate/i, /cdb /i, /lci /i, /lca /i],
        categoryName: 'RECEITAS FINANCEIRAS'
    },
];

async function run() {
    const { db } = await import('../lib/db/connection');
    const { categories, transactions } = await import('../lib/db/schema');
    const { eq, isNull, desc } = await import('drizzle-orm');

    const dryRun = process.argv.includes('--dry-run');

    console.log('=== CATEGORIZAÇÃO DE TRANSAÇÕES PENDENTES ===\n');
    console.log(`Modo: ${dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    // Buscar transações sem categoria
    const uncategorized = await db.select({
        id: transactions.id,
        description: transactions.description,
        rawDescription: transactions.rawDescription,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate
    })
        .from(transactions)
        .where(isNull(transactions.categoryId))
        .orderBy(desc(transactions.transactionDate));

    console.log(`Transações sem categoria: ${uncategorized.length}\n`);

    if (uncategorized.length === 0) {
        console.log('✅ Todas as transações já estão categorizadas!');
        process.exit(0);
    }

    // Buscar todas as categorias
    const allCategories = await db.select().from(categories);
    const categoryByName = new Map(allCategories.map(c => [c.name.toUpperCase(), c]));

    // Categorizar cada transação
    const results: Array<{
        txn: typeof uncategorized[0];
        category: string | null;
        reason: string;
    }> = [];

    for (const txn of uncategorized) {
        const desc = (txn.description || txn.rawDescription || '').toUpperCase();
        let matchedCategory: string | null = null;
        let matchedReason = '';

        // Tentar cada regra
        for (const rule of CATEGORIZATION_RULES) {
            for (const pattern of rule.patterns) {
                if (pattern.test(desc)) {
                    matchedCategory = rule.categoryName;
                    matchedReason = `Padrão: ${pattern.toString()}`;
                    break;
                }
            }
            if (matchedCategory) break;
        }

        results.push({
            txn,
            category: matchedCategory,
            reason: matchedReason || 'Nenhuma regra aplicável'
        });
    }

    // Mostrar resultados
    const categorized = results.filter(r => r.category);
    const uncategorizedResults = results.filter(r => !r.category);

    console.log(`=== RESULTADO DA ANÁLISE ===\n`);
    console.log(`Categorizáveis: ${categorized.length}`);
    console.log(`Não categorizáveis: ${uncategorizedResults.length}\n`);

    // Agrupar por categoria
    const byCategory = new Map<string, typeof results>();
    for (const r of categorized) {
        if (!byCategory.has(r.category!)) {
            byCategory.set(r.category!, []);
        }
        byCategory.get(r.category!)!.push(r);
    }

    console.log('--- Por categoria ---\n');
    for (const [catName, items] of byCategory) {
        console.log(`${catName} (${items.length}):`);
        items.slice(0, 3).forEach(item => {
            console.log(`  - ${item.txn.description || item.txn.rawDescription}`);
        });
        if (items.length > 3) {
            console.log(`  ... e mais ${items.length - 3}`);
        }
        console.log('');
    }

    if (uncategorizedResults.length > 0) {
        console.log('--- Não categorizáveis ---\n');
        uncategorizedResults.forEach(r => {
            console.log(`  - ${r.txn.description || r.txn.rawDescription} (${r.txn.amount})`);
        });
    }

    // Executar categorização
    if (!dryRun && categorized.length > 0) {
        console.log('\n=== EXECUTANDO CATEGORIZAÇÃO ===\n');

        let successCount = 0;
        let errorCount = 0;

        for (const r of categorized) {
            const category = categoryByName.get(r.category!.toUpperCase());

            if (!category) {
                console.log(`  ⚠️ Categoria não encontrada: ${r.category}`);
                errorCount++;
                continue;
            }

            await db.update(transactions)
                .set({
                    categoryId: category.id,
                    updatedAt: new Date()
                })
                .where(eq(transactions.id, r.txn.id));

            successCount++;
        }

        console.log(`\n✅ ${successCount} transações categorizadas`);
        if (errorCount > 0) {
            console.log(`⚠️ ${errorCount} erros`);
        }
    } else if (dryRun) {
        console.log('\n⚠️ Este foi um DRY RUN. Nenhuma alteração foi feita.');
        console.log('   Execute sem --dry-run para aplicar as mudanças.');
    }

    // Verificação final
    if (!dryRun) {
        const stillUncategorized = await db.select({ id: transactions.id })
            .from(transactions)
            .where(isNull(transactions.categoryId));

        console.log(`\nTransações ainda sem categoria: ${stillUncategorized.length}`);
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
