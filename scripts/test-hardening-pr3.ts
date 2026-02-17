
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { RuleScoringService, TransactionContext } from '@/lib/services/rule-scoring.service';
import { db } from '@/lib/db/drizzle';
import { categoryRules, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing PR3: Remove Confidence Floor ---');

  const company = await db.query.companies.findFirst();
  if (!company) throw new Error('Company not found');

  // 1. Create a Category
  const [category] = await db.insert(categories).values({
    companyId: company.id,
    name: 'TEST_PR3_CATEGORY',
    type: 'variable_cost',
    colorHex: '#000000',
    description: 'Temp category for PR3 test'
  }).returning();

  // 2. Create a "Weak" rule
  // Rule with very low confidence score (0.10) and matching 'contains' (0.85 weight)
  // Expected Score via formula: 
  // (0.85 * 0.4) + (0.10 * 0.5) + (0 * 0.1) 
  // = 0.34 + 0.05 + 0 = 0.39 -> 39%
  // If there is ANY floor or default boosting, this might be higher.
  
  await db.insert(categoryRules).values({
    companyId: company.id,
    categoryId: category.id,
    rulePattern: 'WEAK_RULE_PATTERN',
    ruleType: 'contains',
    active: true,
    status: 'active',
    confidenceScore: '0.10'
  });

  console.log('Created weak rule with confidenceScore=0.10');

  const context: TransactionContext = {
    description: 'SOME WEAK_RULE_PATTERN HERE',
    amount: -100.00,
    memo: ''
  };

  const result = await TransactionCategorizationService.categorize(context, {
    companyId: company.id,
    skipCache: true,
    skipHistory: true,
    skipAI: true,
    confidenceThreshold: 10 // Very low threshold to ensure we get a result
  });

  console.log(`Result: Category=${result.categoryName}, Confidence=${result.confidence}`);

  // Assertion
  // Requirement: "Permitir confidence real (ex: 0.3)"
  // If the logic forces a floor (e.g. 75), this will fail if we assert < 50.
  
  if (result.confidence > 50) {
      console.error(`❌ Failed: Confidence too high (${result.confidence}). Expected ~39.`);
      console.log('Logic likely implies artificial boosting or default floor.');
      process.exit(1);
  } else {
      console.log(`✅ Passed: Confidence is low (${result.confidence}). System allows low confidence.`);
  }

  // Cleanup
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, category.id));
  await db.delete(categories).where(eq(categories.id, category.id));
  
  if (result.confidence <= 50) process.exit(0);
}

runTest().catch(console.error);
