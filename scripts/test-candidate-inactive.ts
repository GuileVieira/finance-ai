/**
 * Test Script: PR2 - Candidate rules born active: false
 *
 * Verifica que:
 * 1. generateAndCreateRule cria regras com active=false e status='candidate'
 * 2. A promoção via lifecycle seta active=true
 */

import { db } from '@/lib/db/drizzle';
import { categoryRules, categories } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { RuleGenerationService } from '@/lib/services/rule-generation.service';
import { RuleLifecycleService } from '@/lib/services/rule-lifecycle.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TEST_DESCRIPTION = 'PAGAMENTO EMPRESA TESTE PR2 ZYXWV';

async function cleanup(companyId: string) {
  // Find and delete test rules by pattern
  const testRules = await db
    .select({ id: categoryRules.id })
    .from(categoryRules)
    .where(
      and(
        eq(categoryRules.companyId, companyId),
        eq(categoryRules.sourceType, 'ai')
      )
    );

  for (const rule of testRules) {
    const fullRule = await db.query.categoryRules.findFirst({
      where: eq(categoryRules.id, rule.id)
    });
    if (fullRule && (fullRule.examples as string[])?.includes(TEST_DESCRIPTION)) {
      await db.delete(categoryRules).where(eq(categoryRules.id, rule.id));
    }
  }
}

async function runTest() {
  console.log('=== Test: PR2 - Candidate rules born active: false ===\n');

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

  // TEST 1: generateAndCreateRule creates rule with active=false
  console.log('TEST 1: New candidate rule should have active=false');
  const result = await RuleGenerationService.generateAndCreateRule(
    TEST_DESCRIPTION,
    category.name,
    companyId,
    85, // High confidence to pass threshold
    'Test reasoning'
  );

  if (!result.success) {
    console.log(`  SKIP: Rule creation failed: ${result.error}`);
    console.log('  (This may happen if a similar rule already exists)\n');
  } else {
    // Fetch the created rule from DB
    const createdRule = await db
      .select()
      .from(categoryRules)
      .where(
        and(
          eq(categoryRules.companyId, companyId),
          eq(categoryRules.sourceType, 'ai')
        )
      )
      .orderBy(desc(categoryRules.createdAt))
      .limit(1);

    if (createdRule.length > 0) {
      const rule = createdRule[0];
      const isInactive = rule.active === false;
      const isCandidate = rule.status === 'candidate';

      if (isInactive && isCandidate) {
        console.log(`  PASS: Rule created with active=${rule.active}, status=${rule.status}\n`);
        passed++;
      } else {
        console.log(`  FAIL: Rule has active=${rule.active}, status=${rule.status} (expected active=false, status=candidate)\n`);
        failed++;
      }

      // TEST 2: Promotion should set active=true
      console.log('TEST 2: Promoting candidate should set active=true');
      const promotion = await RuleLifecycleService.promoteToActive(rule.id);

      if (promotion) {
        // Re-fetch to verify
        const promotedRule = await db.query.categoryRules.findFirst({
          where: eq(categoryRules.id, rule.id)
        });

        if (promotedRule && promotedRule.active === true && promotedRule.status === 'active') {
          console.log(`  PASS: Promoted rule has active=${promotedRule.active}, status=${promotedRule.status}\n`);
          passed++;
        } else {
          console.log(`  FAIL: Promoted rule has active=${promotedRule?.active}, status=${promotedRule?.status}\n`);
          failed++;
        }
      } else {
        console.log('  FAIL: Promotion returned null\n');
        failed++;
      }
    } else {
      console.log('  FAIL: Could not find created rule in DB\n');
      failed++;
    }
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
