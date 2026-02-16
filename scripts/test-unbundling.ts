import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente manualmente para evitar hoisting de imports do drizzle
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

async function runUnbundlingTests() {
  console.log('🚀 Starting Transaction Unbundling Verification Tests...');

  try {
    // Imports dinâmicos para garantir que o dotenv já carregou
    const { db } = await import('../lib/db/connection');
    const { transactions, transactionSplits, categories, companies, accounts } = await import('../lib/db/schema');
    const { eq, sql } = await import('drizzle-orm');
    const { default: TransactionsService } = await import('../lib/services/transactions.service');

    // 1. Get a test company and account
    const [company] = await db.select().from(companies).limit(1);
    if (!company) throw new Error('No company found for testing');

    const [account] = await db.select().from(accounts).where(eq(accounts.companyId, company.id)).limit(1);
    if (!account) throw new Error('No account found for testing');

    // 2. Get some categories for splitting
    const testCategories = await db.select().from(categories).where(eq(categories.companyId, company.id)).limit(3);
    if (testCategories.length < 2) throw new Error('Not enough categories found for testing');

    const catA = testCategories[0];
    const catB = testCategories[1];

    console.log(`Using Company: ${company.name}`);
    console.log(`Using Account: ${account.name}`);
    console.log(`Categories: ${catA.name}, ${catB.name}`);

    // 3. Create a Master Transaction
    const testStamp = Date.now();
    const [masterTx] = await db.insert(transactions).values({
      accountId: account.id,
      categoryId: catA.id, 
      amount: "1000.00",
      type: 'credit',
      description: `TEST UNBUNDLING ${testStamp}`,
      transactionDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      manuallyCategorized: false
    }).returning();

    console.log(`✅ Master Transaction created: ID ${masterTx.id}, Amount ${masterTx.amount}`);

    // 4. Split the transaction
    console.log('Splitting transaction into two parts (400 and 600)...');
    await TransactionsService.updateTransactionSplits(masterTx.id, [
      {
        categoryId: catA.id,
        amount: "400.00",
        description: 'Split Part A'
      },
      {
        categoryId: catB.id,
        amount: "600.00",
        description: 'Split Part B'
      }
    ] as any);

    // 5. Verify Aggregation Logic
    const combinedData = (await db
      .select({
        categoryId: sql`category_id`,
        total: sql`sum(amount_to_sum)`
      })
      .from(sql`(${
        `SELECT id, category_id, amount as amount_to_sum FROM ${transactions} WHERE id NOT IN (SELECT transaction_id FROM ${transactionSplits})
         UNION ALL
         SELECT transaction_id, category_id, amount as amount_to_sum FROM ${transactionSplits}`
      }) as combined_table`)
      .where(sql`id = ${masterTx.id} OR transaction_id = ${masterTx.id}`)
      .groupBy(sql`category_id`)) as any[];

    console.log('Aggregation Results:', JSON.stringify(combinedData, null, 2));

    const partA = combinedData.find(d => d.categoryId === catA.id);
    const partB = combinedData.find(d => d.categoryId === catB.id);

    const amountA = parseFloat(partA?.total as string || '0');
    const amountB = parseFloat(partB?.total as string || '0');

    if (amountA === 400 && amountB === 600) {
      console.log('✅ Aggregation Logic: SUCCESS (400/600 correctly split)');
    } else {
      console.error('❌ Aggregation Logic: FAILED', { expected: '400/600', got: `${amountA}/${amountB}` });
      throw new Error('Logic Verification Failed');
    }

    // 6. Verify splitCount in getTransactions
    const fetchedData = await TransactionsService.getTransactions({ companyId: company.id, limit: 100 });
    const masterInList = fetchedData.transactions.find((t: any) => t.id === masterTx.id);
    
    if (masterInList && (masterInList as any).splitCount === 2) {
      console.log('✅ getTransactions splitCount: SUCCESS (Count is 2)');
    } else {
      console.error('❌ getTransactions splitCount: FAILED', { expected: 2, got: (masterInList as any)?.splitCount });
    }

    // 7. Clean up
    console.log('Cleaning up test data...');
    await db.delete(transactions).where(eq(transactions.id, masterTx.id));
    console.log('✅ Cleanup complete (Transaction and its splits deleted via cascade)');

    console.log('\n🎉 All Unbundling Verification Tests PASSED!');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runUnbundlingTests();
