
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { db } from '@/lib/db/drizzle';
import { categories, categoryRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing PR4: Movement Type Restrictions ---');

  const company = await db.query.companies.findFirst();
  if (!company) throw new Error('Company not found');

  // 1. Create Categories
  console.log('Creating categories...');
  const [catOperational] = await db.insert(categories).values({
    companyId: company.id,
    name: 'TEST_PR4_OPERATIONAL',
    type: 'fixed_cost',
    dreGroup: 'DO', // Despesa Operacional
    colorHex: '#FF0000',
    description: 'Should not be allowed for Loans'
  }).returning();

  const [catFinancial] = await db.insert(categories).values({
    companyId: company.id,
    name: 'TEST_PR4_FINANCIAL',
    type: 'expense',
    dreGroup: 'DF', // Despesa Financeira
    colorHex: '#00FF00',
    description: 'Allowed for Loans'
  }).returning();

  // 2. Create Rules
  // Rule A (Bad, Specific): "IOF TEST_PR4" -> Operational (Higher confidence to force selection if not filtered)
  await db.insert(categoryRules).values({
    companyId: company.id,
    categoryId: catOperational.id,
    rulePattern: 'IOF TEST_PR4',
    ruleType: 'contains',
    confidenceScore: '0.95', // High confidence
    active: true,
    status: 'active'
  });

  // Rule B (Good, Generic): "IOF" -> Financial (Lower confidence)
  await db.insert(categoryRules).values({
    companyId: company.id,
    categoryId: catFinancial.id,
    rulePattern: 'IOF',
    ruleType: 'contains',
    confidenceScore: '0.80',
    active: true,
    status: 'active'
  });

  // 3. Test Transaction
  // Description: "IOF TEST_PR4"
  // Movement Type: "financeiro" (detects IOF)
  // Expected: 
  // - "IOF TEST_PR4" rule matches but targets Operational (DO).
  // - "IOF" rule matches and targets Financial (DF).
  // - Because MovementType=financeiro, Operational should be restricted.
  // - Result should be Financial (Rule B).
  
  console.log('Categorizing transaction: "IOF TEST_PR4"...');
  const context = {
    description: 'IOF TEST_PR4', // "IOF" triggers isFinancial + rules
    amount: -100,
    date: new Date()
  };

  const result = await TransactionCategorizationService.categorize(context, {
    companyId: company.id,
    skipCache: true,
    skipHistory: true,
    skipAI: true // Focus on rules
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  // Assertions
  let passed = true;

  if (result.movementType !== 'financeiro') {
      console.error('❌ Failed: Movement type not detected as financeiro');
      passed = false;
  }

  if (result.categoryId === catOperational.id) {
      console.error('❌ Failed: Selected Operational category (Rule A) despite movement type restriction');
      passed = false;
  } else if (result.categoryId === catFinancial.id) {
      console.log('✅ Passed: Selected Financial category (Rule B), honoring restriction');
  } else {
      console.error('❌ Failed: Selected unknown result');
      passed = false;
  }

  // Cleanup
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, catOperational.id));
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, catFinancial.id));
  await db.delete(categories).where(eq(categories.id, catOperational.id));
  await db.delete(categories).where(eq(categories.id, catFinancial.id));

  if (!passed) process.exit(1);
}

runTest().catch(console.error);
