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

// Mapeamento de categorias antigas → novas (por nome similar ou função)
const CATEGORY_MAPPING: Record<string, string> = {
    // Receitas
    'Vendas de Produtos': 'FATURAMENTO',
    'Vendas de Serviços': 'FATURAMENTO',
    'Receitas Financeiras': 'RECEITAS FINANCEIRAS',
    'Juros Recebidos': 'JUROS APLIC FINANCEIRA',
    'Multas Recebidas': 'OUTRAS RECEITAS NÃO OPERACIONAIS',
    'Outras Receitas': 'OUTRAS RECEITAS NÃO OPERACIONAIS',

    // Custos Variáveis
    'Custos de Produtos Vendidos': 'PRODUTO ACABADO',
    'Matéria Prima': 'MATÉRIA PRIMA',
    'Embalagens': 'MATERIAL DE EMBALAGEM',
    'Comissões sobre Vendas': 'COMISSÕES',
    'Fretes sobre Vendas': 'FRETES E CARRETOS',
    'Fretes e Carretos': 'FRETES E CARRETOS',

    // Custos Fixos - Pessoal
    'Salários': 'SALARIOS',
    'Salários e Encargos': 'SALARIOS',
    'INSS': 'INSS',
    'FGTS': 'FGTS',
    '13º Salário': '13º SALARIO',
    'Férias': 'FÉRIAS',
    'Vale Transporte': 'VALE TRANSPORTE',
    'Vale Alimentação': 'VALE ALIMENTAÇÃO',
    'Vale Refeição': 'VALE REFEIÇÃO / RESTAURANTE',
    'Plano de Saúde': 'ASSISTÊNCIA MÉDICA / ODONTOLÓGICA',
    'Benefícios': 'ASSISTÊNCIA MÉDICA / ODONTOLÓGICA',
    'Rescisões': 'RESCISÕES E INDENIZAÇÕES',
    'Pró-Labore': 'PRO LABORE',

    // Custos Fixos - Ocupação
    'Aluguel': 'ALUGUEL',
    'Aluguel Comercial': 'ALUGUEL',
    'Aluguel e Ocupação': 'ALUGUEL',
    'Condomínio': 'CONDOMINIO',
    'IPTU': 'IPTU',

    // Custos Fixos - Utilidades
    'Energia Elétrica': 'ENERGIA ELETRICA',
    'Água': 'ÁGUA E ESGOTO',
    'Água e Esgoto': 'ÁGUA E ESGOTO',
    'Gás': 'GÁS',
    'Telefone': 'TELEFONE / INTERNET',
    'Internet': 'TELEFONE / INTERNET',
    'Telefone e Internet': 'TELEFONE / INTERNET',

    // Custos Fixos - Veículos
    'Combustível': 'COMBUSTIVEIS/LUBRIFICANTES',
    'Manutenção de Veículos': 'DESPESAS DE VEÍCULOS',
    'Seguro de Veículos': 'SEGURO DE VEÍCULOS',
    'IPVA': 'IPVA/LICENCIAMENTO',

    // Custos Fixos - Serviços
    'Contabilidade': 'ASSESSORIA /CONSULTORIA',
    'Serviços Contábeis': 'ASSESSORIA /CONSULTORIA',
    'Advocacia': 'SERVIÇOS DE ADVOCACIA',
    'Serviços Jurídicos': 'SERVIÇOS DE ADVOCACIA',
    'Consultoria': 'ASSESSORIA /CONSULTORIA',
    'Marketing': 'COMUNICAÇÃO E MKT',
    'Publicidade': 'COMUNICAÇÃO E MKT',
    'Limpeza': 'CONSERVAÇÃO E LIMPEZA',
    'Segurança': 'ALARME E SEGURANÇA PATRIMONIAL',
    'Software': 'DESPESAS COM TI',
    'Sistemas': 'DESPESAS COM TI',
    'TI': 'DESPESAS COM TI',
    'Tecnologia': 'DESPESAS COM TI',

    // Custos Fixos - Manutenção
    'Manutenção': 'MANUTENÇÃO DE EQUIPAMENTOS',
    'Manutenção Predial': 'MANUTENÇÃO PREDIAL',
    'Reparos': 'MANUTENÇÃO DE EQUIPAMENTOS',

    // Custos Fixos - Outros
    'Material de Escritório': 'MATERIAL DE CONSUMO',
    'Material de Consumo': 'MATERIAL DE CONSUMO',
    'Copa e Cozinha': 'COPA E COZINHA',
    'Viagens': 'DESPESAS COM VIAGENS',
    'Despesas com Viagens': 'DESPESAS COM VIAGENS',
    'Seguros': 'SEGUROS GERAIS',
    'Seguros Gerais': 'SEGUROS GERAIS',
    'Despesas Administrativas': 'DESPESAS ADMINISTRATIVAS',
    'Despesas Diversas': 'OUTROS CUSTOS FIXOS',
    'Outras Despesas': 'OUTROS CUSTOS FIXOS',

    // Tributos (TDCF)
    'Impostos': 'OUTROS TRIBUTOS',
    'Tributos': 'OUTROS TRIBUTOS',
    'PIS': 'PIS',
    'COFINS': 'COFINS',
    'ISS': 'ISS',
    'ICMS': 'ICMS',
    'IR': 'IRRF',
    'IRPJ': 'IRRF',
    'CSLL': 'DARF',
    'Simples Nacional': 'DARF',

    // Custos Financeiros (TDCF)
    'Tarifas Bancárias': 'TARIFAS BANCÁRIAS',
    'Taxas Bancárias': 'TARIFAS BANCÁRIAS',
    'IOF': 'IOF',
    'Juros Pagos': 'JUROS/PRORROGAÇÃO',
    'Juros sobre Empréstimos': 'JUROS/PRORROGAÇÃO',
    'Despesas Financeiras': 'TARIFAS BANCÁRIAS',
    'Custos Financeiros': 'TARIFAS BANCÁRIAS',

    // Despesas Não Operacionais
    'Multas': 'MULTAS/AUTOS DE INFRAÇÃO',
    'Multas e Juros': 'MULTAS/AUTOS DE INFRAÇÃO',
    'Perdas': 'INADIMPLENCIA / RECOMPRAS',
    'Inadimplência': 'INADIMPLENCIA / RECOMPRAS',

    // Movimentações Financeiras
    'Empréstimos': 'EMPRÉSTIMOS (+)',
    'Empréstimos Recebidos': 'EMPRÉSTIMOS (+)',
    'Pagamento de Empréstimos': 'EMPRÉSTIMOS (-)',
    'Transferências': 'TRANSFERÊNCIAS (+)',
    'Transferências Internas': 'TRANSFERÊNCIAS (+)',
    'Transferências Entre Contas': 'TRANSFERÊNCIAS (+)',
    'Aplicações Financeiras': 'TRANSFERÊNCIAS (-)',
    'Resgates': 'TRANSFERÊNCIAS (+)',

    // Categorias especiais
    'Saldo Inicial': 'TRANSFERÊNCIAS (+)',
    'Fornecedores': 'MATÉRIA PRIMA',
    'FORNECEDORES': 'MATÉRIA PRIMA',
    'Antecipação De Recebíveis': 'DUPLICATA DESCONTADA',
    'Antecipação de Recebíveis': 'DUPLICATA DESCONTADA',

    // Categorias adicionais encontradas na migração
    'OUTRAS DESPESAS NOP': 'JUROS DIVERSOS',
    'LEASING / FINAME': 'FINANCIAMENTO DE VEÍCULOS',
    'SERVIÇOS PRESTADOS PF': 'FOLHA PJ',
    'OPERADORES LOGÍSTICOS': 'FRETES E CARRETOS',
    'CUSTAS JUDICIAIS': 'CARTÓRIO',
};

interface CategoryRow {
    id: string;
    name: string;
    type: string | null;
    categoryGroup: string | null;
    dreGroup: string | null;
}

interface TransactionRow {
    id: string;
    categoryId: string | null;
}

async function run() {
    const { db } = await import('../lib/db/connection');
    const { categories, transactions } = await import('../lib/db/schema');
    const { eq, isNull, isNotNull, count } = await import('drizzle-orm');

    const dryRun = process.argv.includes('--dry-run');

    console.log('\n=== MIGRAÇÃO DE TRANSAÇÕES PARA NOVAS CATEGORIAS ===\n');
    console.log(`Modo: ${dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    // 1. Buscar todas as categorias
    const allCategories = await db.select().from(categories);

    // Separar categorias antigas (sem categoryGroup) e novas (com categoryGroup)
    const oldCategories = allCategories.filter(c => !c.categoryGroup);
    const newCategories = allCategories.filter(c => c.categoryGroup);

    console.log(`Total de categorias: ${allCategories.length}`);
    console.log(`  - Antigas (sem categoryGroup): ${oldCategories.length}`);
    console.log(`  - Novas (com categoryGroup): ${newCategories.length}\n`);

    // 2. Buscar transações e contar por categoria antiga
    const allTransactions = await db.select({
        id: transactions.id,
        categoryId: transactions.categoryId
    }).from(transactions);

    // Contar transações por categoria antiga
    const txnCountByOldCat = new Map<string, number>();
    for (const txn of allTransactions) {
        if (txn.categoryId) {
            const cat = oldCategories.find(c => c.id === txn.categoryId);
            if (cat) {
                txnCountByOldCat.set(cat.id, (txnCountByOldCat.get(cat.id) || 0) + 1);
            }
        }
    }

    // Filtrar apenas categorias antigas que têm transações
    const oldCatsWithTxns = oldCategories
        .filter(c => txnCountByOldCat.has(c.id))
        .map(c => ({
            ...c,
            txnCount: txnCountByOldCat.get(c.id) || 0
        }))
        .sort((a, b) => b.txnCount - a.txnCount);

    if (oldCatsWithTxns.length === 0) {
        console.log('✅ Nenhuma categoria antiga com transações encontrada!');
        console.log('   Todas as transações já estão em categorias novas.');
        process.exit(0);
    }

    console.log(`Encontradas ${oldCatsWithTxns.length} categorias antigas com transações:\n`);

    // 3. Criar mapa de novas categorias para lookup
    const newCatsByName = new Map<string, CategoryRow>();
    for (const cat of newCategories) {
        newCatsByName.set(cat.name.toUpperCase(), cat);
    }

    // 4. Para cada categoria antiga, encontrar a nova correspondente
    let totalMigrated = 0;
    let totalSkipped = 0;
    const migrations: Array<{
        oldCat: typeof oldCatsWithTxns[0];
        newCat: CategoryRow;
        txnCount: number;
    }> = [];

    const unmapped: typeof oldCatsWithTxns = [];

    for (const oldCat of oldCatsWithTxns) {
        // Tentar encontrar mapeamento direto
        const mappedName = CATEGORY_MAPPING[oldCat.name];
        let newCat = mappedName ? newCatsByName.get(mappedName.toUpperCase()) : undefined;

        // Se não encontrou, tentar por nome exato
        if (!newCat) {
            newCat = newCatsByName.get(oldCat.name.toUpperCase());
        }

        // Se ainda não encontrou, tentar por nome parcial
        if (!newCat) {
            for (const [name, cat] of newCatsByName) {
                if (name.includes(oldCat.name.toUpperCase()) ||
                    oldCat.name.toUpperCase().includes(name)) {
                    newCat = cat;
                    break;
                }
            }
        }

        if (newCat) {
            migrations.push({
                oldCat,
                newCat,
                txnCount: oldCat.txnCount
            });
            totalMigrated += oldCat.txnCount;
        } else {
            unmapped.push(oldCat);
            totalSkipped += oldCat.txnCount;
        }
    }

    // 5. Mostrar plano de migração
    console.log('--- PLANO DE MIGRAÇÃO ---\n');

    for (const m of migrations) {
        console.log(`✓ "${m.oldCat.name}" → "${m.newCat.name}" (${m.newCat.dreGroup} > ${m.newCat.categoryGroup})`);
        console.log(`  ${m.txnCount} transações serão migradas\n`);
    }

    if (unmapped.length > 0) {
        console.log('\n--- CATEGORIAS SEM MAPEAMENTO ---\n');
        for (const cat of unmapped) {
            console.log(`✗ "${cat.name}" (${cat.txnCount} transações) - tipo: ${cat.type}`);
        }
    }

    console.log('\n--- RESUMO ---\n');
    console.log(`Total de transações a migrar: ${totalMigrated}`);
    console.log(`Total de transações sem mapeamento: ${totalSkipped}`);
    console.log(`Categorias mapeadas: ${migrations.length}/${oldCatsWithTxns.length}`);

    // 6. Executar migração se não for dry-run
    if (!dryRun && migrations.length > 0) {
        console.log('\n--- EXECUTANDO MIGRAÇÃO ---\n');

        for (const m of migrations) {
            console.log(`Migrando "${m.oldCat.name}" → "${m.newCat.name}"...`);

            await db
                .update(transactions)
                .set({
                    categoryId: m.newCat.id,
                    updatedAt: new Date()
                })
                .where(eq(transactions.categoryId, m.oldCat.id));

            console.log(`  ✓ ${m.txnCount} transações migradas`);
        }

        console.log('\n✅ Migração concluída!');
    } else if (dryRun) {
        console.log('\n⚠️  Este foi um DRY RUN. Nenhuma transação foi migrada.');
        console.log('   Execute sem --dry-run para aplicar as mudanças.');
    }

    process.exit(0);
}

run().catch(e => {
    console.error('Erro:', e);
    process.exit(1);
});
