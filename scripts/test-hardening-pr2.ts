
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { TransactionContext } from '@/lib/services/rule-scoring.service';
import { db } from '@/lib/db/drizzle';
import { categoryRules, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing PR2: Protect against Candidate Rules ---');

  const company = await db.query.companies.findFirst();
  if (!company) throw new Error('Company not found');

  // 1. Create a Category for testing
  const [category] = await db.insert(categories).values({
    companyId: company.id,
    name: 'TEST_PR2_CATEGORY',
    type: 'variable_cost',
    colorHex: '#000000',
    description: 'Temp category for PR2 test'
  }).returning();

  console.log(`Created temporary category: ${category.name} (${category.id})`);

  // 2. Create a "Candidate" rule
  // This rule matches "TEST_PR2_CANDIDATE"
  await db.insert(categoryRules).values({
    companyId: company.id,
    categoryId: category.id,
    rulePattern: 'TEST_PR2_CANDIDATE',
    ruleType: 'contains',
    active: true, // It is active, but status is candidate
    status: 'candidate',
    confidenceScore: '0.90' // High confidence, so it WOULD apply if not for status check
  });
  
  // 3. Create an "Active" rule
  // This rule matches "TEST_PR2_ACTIVE"
  await db.insert(categoryRules).values({
    companyId: company.id,
    categoryId: category.id,
    rulePattern: 'TEST_PR2_ACTIVE',
    ruleType: 'contains',
    active: true,
    status: 'active',
    confidenceScore: '0.90'
  });

  console.log('Created rules: 1 candidate (should fail), 1 active (should pass)');

  // Test Case A: Candidate Rule
  const contextCandidate: TransactionContext = {
    description: 'PAYMENT TEST_PR2_CANDIDATE 123',
    amount: -100.00,
    memo: ''
  };

  const resultCandidate = await TransactionCategorizationService.categorize(contextCandidate, {
    companyId: company.id,
    skipCache: true,
    skipHistory: true,
    skipAI: true,
    confidenceThreshold: 80
  });

  console.log(`Candidate Result: Source=${resultCandidate.source}, Category=${resultCandidate.categoryName}`);

  // Test Case B: Active Rule
  const contextActive: TransactionContext = {
    description: 'PAYMENT TEST_PR2_ACTIVE 123',
    amount: -100.00,
    memo: ''
  };

  const resultActive = await TransactionCategorizationService.categorize(contextActive, {
    companyId: company.id,
    skipCache: true,
    skipHistory: true,
    skipAI: true,
    confidenceThreshold: 80
  });

  console.log(`Active Result: Source=${resultActive.source}, Category=${resultActive.categoryName}`);

  // Assertions
  let passed = true;

  if (resultCandidate.source === 'rule' && resultCandidate.categoryName === 'TEST_PR2_CATEGORY') {
      console.error('❌ Failed: Candidate rule was applied!');
      passed = false;
  } else {
      console.log('✅ Passed: Candidate rule was NOT applied');
  }

  if (resultActive.source === 'rule' && resultActive.categoryName === 'TEST_PR2_CATEGORY') {
      console.log('✅ Passed: Active rule was applied');
  } else {
      console.error('❌ Failed: Active rule WAS NOT applied (it should have been)');
       passed = false;
  }
  
  // Cleanup
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, category.id));
  await db.delete(categories).where(eq(categories.id, category.id));
  console.log('Cleanup done.');

  if (!passed) process.exit(1);
}

runTest().catch(console.error);
