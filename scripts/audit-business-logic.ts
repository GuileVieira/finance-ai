
import fs from 'fs';
import path from 'path';

// --- ENV SETUP ---
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                let cleanValue = value.trim();
                // Remove quotes
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
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
}

// --- HELPERS ---
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m"
};

function formatMoney(amount: number) {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number) {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
}

// --- AUDIT LOGIC ---
async function auditBusinessLogic() {
    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    console.log(`${colors.cyan}${colors.bold}🧠 Starting Business Logic Audit (Financial Consultant Mode)...${colors.reset}\n`);

    // Target Range: Nov 2025 (We know we have data there)
    const startDate = '2025-11-01';
    const endDate = '2025-11-30';
    console.log(`📅 Period Analyzed: Nov 2025\n`);

    // 1. Fetch Aggregated Data
    const dataset = await db.execute(sql`
        SELECT 
            c.name as category_name,
            c.type as category_type,
            SUM(CASE WHEN t.type = 'credit' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN t.type = 'debit' THEN ABS(amount) ELSE 0 END) as expense,
            COUNT(*) as tx_count
        FROM financeai_transactions t
        LEFT JOIN financeai_categories c ON t.category_id = c.id
        WHERE t.transaction_date >= ${startDate} AND t.transaction_date <= ${endDate}
        GROUP BY c.name, c.type
    `);

    // 2. Process into buckets
    let totalRevenue = 0;
    let totalExpense = 0;
    let uncategorizedAmount = 0;
    let taxAmount = 0;

    // Heuristic lists (simplified from dre.service.ts)
    const taxKeywords = ['imposto', 'iss', 'pis', 'cofins', 'icms', 'simples nacional', 'das'];

    dataset.rows.forEach((row: any) => {
        const net = parseFloat(row.income) - parseFloat(row.expense);
        const name = row.category_name?.toLowerCase() || 'uncategorized';
        const type = row.category_type;

        // Debug Log
        if (Math.abs(net) > 500000) {
            console.log(`Debug: Category '${name}' Type: '${type}' Net: ${net}`);
        }

        // Uncategorized check
        if (!row.category_name) {
            uncategorizedAmount += Math.abs(net);
        }

        // Tax check
        if (taxKeywords.some(k => name.includes(k))) {
            taxAmount += parseFloat(row.expense); // Taxes are expenses
        }

        // Revenue vs Expense (Simplified P&L)
        // Note: Some categories are 'revenue' type but might have refunds (debits).
        // For this high-level audit, we sum NET per category type.

        if (type === 'revenue') {
            totalRevenue += net;
        } else if (['fixed_cost', 'variable_cost', 'non_operational'].includes(type) || !type) {
            // Expenses are usually negative net, so simple subtraction
            // But here we want the magnitude of expense
            if (net < 0) totalExpense += Math.abs(net);
        }
    });

    // 3. ANALYSIS & WARNINGS

    // A. Profit Margin
    const netIncome = totalRevenue - totalExpense;
    const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    console.log(`${colors.bold}📊 High-Level P&L (Estimate):${colors.reset}`);
    console.log(`   Revenue:    ${formatMoney(totalRevenue)}`);
    console.log(`   Expenses:   ${formatMoney(totalExpense)}`);
    console.log(`   Net Income: ${formatMoney(netIncome)}`);
    console.log(`   Margin:     ${formatPercent(margin)}`);

    if (margin > 60) {
        console.log(`${colors.yellow}   ⚠️  Suspiciously High Margin (>60%). Are expenses missing?${colors.reset}`);
    } else if (margin < -20) {
        console.log(`${colors.yellow}   ⚠️  Negative Margin (<-20%). Burn rate is high.${colors.reset}`);
    } else {
        console.log(`${colors.green}   ✅ Margin seems realistic (-20% to 60%).${colors.reset}`);
    }

    // B. Tax Rate
    const taxRate = totalRevenue > 0 ? (taxAmount / totalRevenue) * 100 : 0;
    console.log(`\n${colors.bold}🏛️  Tax Analysis:${colors.reset}`);
    console.log(`   Identified Taxes: ${formatMoney(taxAmount)}`);
    console.log(`   Effective Tax Rate: ${formatPercent(taxRate)}`);

    if (taxRate < 1) {
        console.log(`${colors.red}   ❌ Tax Rate too low (<1%). Valid taxes might be categorized generically (e.g. 'Despesas Bancárias' or 'Outros').${colors.reset}`);
    } else {
        console.log(`${colors.green}   ✅ Tax Rate detected.${colors.reset}`);
    }

    // C. Categorization Quality
    const totalVolume = totalRevenue + totalExpense;
    const uncategorizedShare = totalVolume > 0 ? (uncategorizedAmount / totalVolume) * 100 : 0;

    console.log(`\n${colors.bold}🏷️  Categorization Quality:${colors.reset}`);
    console.log(`   Uncategorized Volume: ${formatMoney(uncategorizedAmount)}`);
    console.log(`   Share of Total: ${formatPercent(uncategorizedShare)}`);

    if (uncategorizedShare > 5) {
        console.log(`${colors.red}   ❌ Too much uncategorized data (>5%). DRE is unreliable.${colors.reset}`);
    } else {
        console.log(`${colors.green}   ✅ Categorization is healthy.${colors.reset}`);
    }

    // 4. Detailed Top Expenses (to spot weird stuff)
    console.log(`\n${colors.bold}📉 Top 5 Largest Expenses (Check for misclassification):${colors.reset}`);
    const expenses = await db.execute(sql`
        SELECT t.description, amount, date(transaction_date) as date, c.name as category
        FROM financeai_transactions t
        LEFT JOIN financeai_categories c ON t.category_id = c.id
        WHERE t.type = 'debit' AND t.transaction_date >= ${startDate} AND t.transaction_date <= ${endDate}
        ORDER BY ABS(amount) DESC
        LIMIT 5
    `);
    console.table(expenses.rows.map((r: any) => ({
        ...r,
        amount: formatMoney(parseFloat(r.amount)),
        date: new Date(r.date).toISOString().split('T')[0]
    })));

    process.exit(0);
}

auditBusinessLogic().catch((err) => {
    console.error(err);
    process.exit(1);
});
