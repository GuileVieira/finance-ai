
import fs from 'fs';
import path from 'path';

// Manually read .env (without local) because that's where DATABASE_URL is
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
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
}

// Colors for console
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};

async function logResult(checkName: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
    const color = status === 'PASS' ? colors.green : (status === 'FAIL' ? colors.red : colors.yellow);
    console.log(`${color}[${status}] ${checkName}${colors.reset}`);
    console.log(`  ${message}`);
    if (details) {
        console.log(`  Details:`, details);
    }
    console.log('---------------------------------------------------');
}

async function auditFinancialHealth() {
    console.log(`${colors.cyan}💰 Starting Financial Health Audit...${colors.reset}\n`);

    const { db } = await import('../lib/db/drizzle');
    const { sql } = await import('drizzle-orm');

    // 1. Check for Orphaned Transactions (Invalid Category)
    // ----------------------------------------------------
    const orphanCategoryResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM financeai_transactions t
        LEFT JOIN financeai_categories c ON t.category_id = c.id
        WHERE c.id IS NULL AND t.category_id IS NOT NULL
    `);
    const orphanCatCount = Number(orphanCategoryResult.rows[0].count);

    if (orphanCatCount > 0) {
        logResult('Orphan Categories', 'FAIL', `Found ${orphanCatCount} transactions with invalid category_id`);
        // Get sample
        const orphans = await db.execute(sql`
            SELECT id, description, category_id 
            FROM financeai_transactions t
            LEFT JOIN financeai_categories c ON t.category_id = c.id
            WHERE c.id IS NULL AND t.category_id IS NOT NULL
            LIMIT 5
        `);
        console.table(orphans.rows);
    } else {
        logResult('Orphan Categories', 'PASS', 'All transactions have valid categories (or null)');
    }

    // 2. Check for Orphaned Transactions (Invalid Account)
    // ---------------------------------------------------
    const orphanAccountResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM financeai_transactions t
        LEFT JOIN financeai_accounts a ON t.account_id = a.id
        WHERE a.id IS NULL
    `);
    const orphanAccCount = Number(orphanAccountResult.rows[0].count);

    if (orphanAccCount > 0) {
        logResult('Orphan Accounts', 'FAIL', `Found ${orphanAccCount} transactions linked to non-existent accounts`);
    } else {
        logResult('Orphan Accounts', 'PASS', 'All transactions link to valid accounts');
    }

    // 3. Consistency Check: Type vs Sign
    // ----------------------------------
    // Expenses/Debits should generally be negative, Revenue/Credits positive. 
    // Checking for positive debits or negative credits.

    // Check Positive Debits
    const positiveDebitResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM financeai_transactions
        WHERE type = 'debit' AND amount > 0
    `);
    const posDebitCount = Number(positiveDebitResult.rows[0].count);

    // Check Negative Credits
    const negativeCreditResult = await db.execute(sql`
        SELECT COUNT(*) as count, SUM(amount) as total_impact
        FROM financeai_transactions
        WHERE type = 'credit' AND amount < 0
    `);
    const negCreditCount = Number(negativeCreditResult.rows[0].count);

    if (posDebitCount > 0 || negCreditCount > 0) {
        logResult('Sign Consistency', 'WARN', `Found potential sign mismatches:`, {
            positiveDebits: posDebitCount,
            negativeCredits: negCreditCount,
            note: 'This might be valid (e.g. refunds), but verify logic.'
        });
    } else {
        logResult('Sign Consistency', 'PASS', 'Transaction signs match their types (Debit < 0, Credit > 0)');
    }

    // 4. "Ghost" Transactions (Null Category)
    // ---------------------------------------
    const nullCatResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM financeai_transactions
        WHERE category_id IS NULL
    `);
    const nullCatCount = Number(nullCatResult.rows[0].count);

    if (nullCatCount > 0) {
        logResult('Uncategorized Transactions', 'WARN', `Found ${nullCatCount} transactions without any category`);
    } else {
        logResult('Uncategorized Transactions', 'PASS', 'All transactions are categorized');
    }

    // 5. Duplicate Candidate Check
    // ----------------------------
    // Same amount, same date, same description
    const duplicatesResult = await db.execute(sql`
        SELECT transaction_date, amount, description, COUNT(*) as count
        FROM financeai_transactions
        GROUP BY transaction_date, amount, description
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 10
    `);

    if (duplicatesResult.rows.length > 0) {
        logResult('Duplicate Candidates', 'WARN', `Found ${duplicatesResult.rows.length} groups of potential duplicates`);
        console.table(duplicatesResult.rows.map((row: any) => ({
            ...row,
            transaction_date: new Date(row.transaction_date).toISOString().split('T')[0]
        })));
    } else {
        logResult('Duplicate Candidates', 'PASS', 'No exact duplicates found');
    }

    // 6. Bank Name Check (Migration Validation)
    // -----------------------------------------
    const bankCheckResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM financeai_accounts
        WHERE bank_name = 'Banco Não Identificado'
    `);
    const unknownBankCount = Number(bankCheckResult.rows[0].count);

    if (unknownBankCount > 0) {
        logResult('Bank Names', 'WARN', `Still have ${unknownBankCount} accounts with "Banco Não Identificado"`);
    } else {
        logResult('Bank Names', 'PASS', 'All accounts have valid bank names');
    }

    console.log(`\n${colors.cyan}Audit Complete.${colors.reset}`);
    process.exit(0);
}

auditFinancialHealth().catch((err) => {
    console.error(err);
    process.exit(1);
});
