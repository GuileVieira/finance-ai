
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
            process.env[key.trim()] = value.replace(/^["']|["']$/g, ''); // Remove quotes
        }
    });
}

// Now import connection
async function run() {
    const { db } = await import('../lib/db/connection');
    const { users, userCompanies } = await import('../lib/db/schema');
    const { eq } = await import('drizzle-orm');
    const { default: DREService } = await import('../lib/services/dre.service');

    console.log('--- Debugging DRE with Service ---');
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

    // 1. Get User and Company
    let user = await db.query.users.findFirst({
        where: eq(users.email, 'empresa@teste.com')
    });

    if (!user) {
        console.log('User empresa@teste.com not found. Listing all users:');
        const allUsers = await db.select().from(users).limit(5);
        if (allUsers.length > 0) {
            user = allUsers[0];
            console.log(`Using first user: ${user.email}`);
        } else {
            console.log('No users found in DB.');
            return;
        }
    }
    console.log(`User found: ${user.name} (${user.id})`);

    const userCompany = await db.query.userCompanies.findFirst({
        where: eq(userCompanies.userId, user.id)
    });

    let companyId;
    if (!userCompany) {
        const anyCompany = await db.query.companies.findFirst();
        if (anyCompany) {
            companyId = anyCompany.id;
        } else {
            return;
        }
    } else {
        companyId = userCompany.companyId;
    }
    console.log(`Company ID: ${companyId}`);

    // 2. Run DRE Service for November 2025
    console.log('\n--- Generating DRE for Nov 2025 ---');

    const dre = await DREService.getDREStatement({
        period: 'custom',
        startDate: '2025-11-01',
        endDate: '2025-11-30',
        companyId: companyId
    });

    console.log('--- DRE Analysis ---');
    console.log(`Gross Revenue:        ${dre.grossRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`Taxes:                ${dre.taxes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`Net Revenue:          ${dre.netRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`Variable Costs:       ${dre.variableCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`Contribution Margin:  ${dre.contributionMargin.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${dre.contributionMargin.percentage.toFixed(2)}%)`);
    console.log(`Fixed Costs:          ${dre.fixedCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`Operational Result:   ${dre.operationalResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`Financial Result:     ${dre.financialResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`Non-Op Result:        ${dre.nonOperational.netResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    console.log(`NET RESULT:           ${dre.netResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

    console.log('\n--- Top 10 Categories included in DRE ---');
    dre.categories.slice(0, 10).forEach(cat => {
        console.log(`${cat.name} [${cat.type}]: ${cat.actual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    });
}

run().catch(console.error);
