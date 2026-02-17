/**
 * Test Script: PR1 - Status filter in applyRulesToTransaction
 *
 * Verifica que applyRulesToTransaction filtra regras por status,
 * rejeitando regras 'candidate' e aceitando apenas 'active', 'refined', 'consolidated'.
 */

import { db } from '@/lib/db/drizzle';
import { categoryRules, categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { CategoryRulesService } from '@/lib/services/category-rules.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TEST_PATTERN = '__TEST_PR1_STATUS_FILTER__';

async function cleanup(companyId: string) {
  await db
    .delete(categoryRules)
    .where(
      and(
        eq(categoryRules.rulePattern, TEST_PATTERN),
        eq(categoryRules.companyId, companyId)
      )
    );
}

async function runTest() {
  console.log('=== Test: PR1 - applyRulesToTransaction status filter ===\n');

  const company = await db.query.companies.findFirst();
  if (!company) throw new Error('No company found in database');

  const category = await db.query.categories.findFirst({
    where: eq(categories.companyId, company.id)
  });
  if (!category) throw new Error('No category found in database');

  const companyId = company.id;
  await cleanup(companyId);

  let passed = 0;
  let failed = 0;

  // TEST 1: Candidate rule should NOT be returned
  console.log('TEST 1: Candidate rule should NOT be matched');
  await db.insert(categoryRules).values({
    rulePattern: TEST_PATTERN,
    ruleType: 'contains',
    categoryId: category.id,
    companyId,
    confidenceScore: '0.90',
    active: true, // even with active=true, status filter should block it
    status: 'candidate',
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const candidateMatch = await CategoryRulesService.applyRulesToTransaction(
    TEST_PATTERN,
    companyId
  );

  if (candidateMatch === null) {
    console.log('  PASS: Candidate rule correctly filtered out\n');
    passed++;
  } else {
    console.log('  FAIL: Candidate rule was returned (should be filtered)\n');
    failed++;
  }

  // Clean and recreate as active
  await cleanup(companyId);

  // TEST 2: Active rule SHOULD be returned
  console.log('TEST 2: Active rule should be matched');
  await db.insert(categoryRules).values({
    rulePattern: TEST_PATTERN,
    ruleType: 'contains',
    categoryId: category.id,
    companyId,
    confidenceScore: '0.90',
    active: true,
    status: 'active',
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const activeMatch = await CategoryRulesService.applyRulesToTransaction(
    TEST_PATTERN,
    companyId
  );

  if (activeMatch !== null) {
    console.log(`  PASS: Active rule matched (category: ${activeMatch.categoryName})\n`);
    passed++;
  } else {
    console.log('  FAIL: Active rule was NOT matched\n');
    failed++;
  }

  // Clean and recreate as refined
  await cleanup(companyId);

  // TEST 3: Refined rule SHOULD be returned
  console.log('TEST 3: Refined rule should be matched');
  await db.insert(categoryRules).values({
    rulePattern: TEST_PATTERN,
    ruleType: 'contains',
    categoryId: category.id,
    companyId,
    confidenceScore: '0.90',
    active: true,
    status: 'refined',
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const refinedMatch = await CategoryRulesService.applyRulesToTransaction(
    TEST_PATTERN,
    companyId
  );

  if (refinedMatch !== null) {
    console.log(`  PASS: Refined rule matched (category: ${refinedMatch.categoryName})\n`);
    passed++;
  } else {
    console.log('  FAIL: Refined rule was NOT matched\n');
    failed++;
  }

  // Cleanup
  await cleanup(companyId);

  // Summary
  console.log('=== Results ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);
  console.log(failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
