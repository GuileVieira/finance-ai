
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { db } from '@/lib/db/drizzle';
import { categories, categoryRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing PR5: Hard Validation (Accounting Consistency) ---');

  const company = await db.query.companies.findFirst();
  if (!company) throw new Error('Company not found');

  // 1. Create Category: Expense
  const [catExpense] = await db.insert(categories).values({
    companyId: company.id,
    name: 'TEST_PR5_EXPENSE',
    type: 'fixed_cost',
    colorHex: '#FF0000',
    description: 'Expense category for PR5 test'
  }).returning();

  // 2. Create Rule: Matches "PR5_TEST" -> Expense
  await db.insert(categoryRules).values({
    companyId: company.id,
    categoryId: catExpense.id,
    rulePattern: 'TARIFA BANCARIA TEST PR5',
    ruleType: 'contains',
    confidenceScore: '0.95',
    active: true,
    status: 'active'
  });

  // 3. Test Transaction: POSITIVE amount (+100) -> Expense
  // Strategy: Use a description that triggers "financeiro" (which ALLOWS expense in PR4)
  // but use a POSITIVE amount (which violates Expense nature in PR5).
  
  console.log('Categorizing transaction: "TARIFA BANCARIA TEST PR5" with POSITIVE amount...');
  const context = {
    description: 'TARIFA BANCARIA TEST PR5', // Triggers 'financeiro'
    amount: 100, // Positive -> Validation should fail!
    date: new Date()
  };

  const result = await TransactionCategorizationService.categorize(context, {
    companyId: company.id,
    skipCache: true,
    skipHistory: true,
    skipAI: true
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  // Assertions
  let passed = true;

  if (!result.needsReview) {
      console.error('❌ Failed: Should need review due to accounting violation');
      passed = false;
  }

  if (result.confidence > 60) {
      console.error(`❌ Failed: Confidence should be downgraded (<= 60), got ${result.confidence}`);
      passed = false;
  }

  // EXPECTED REASON CODE: ACCOUNTING_CONSISTENCY_VIOLATION
  if (result.reason?.code !== 'ACCOUNTING_CONSISTENCY_VIOLATION') {
      console.error(`❌ Failed: Reason code should be 'ACCOUNTING_CONSISTENCY_VIOLATION', got '${result.reason?.code}'`);
      passed = false;
  } else {
      console.log('✅ Passed: Reason code is correct');
  }

  // Cleanup
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, catExpense.id));
  await db.delete(categories).where(eq(categories.id, catExpense.id));

  if (!passed) process.exit(1);
}

runTest().catch(console.error);
