
import { RuleGenerationService } from '@/lib/services/rule-generation.service';
import { db } from '@/lib/db/drizzle';
import { categories, categoryRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing PR3: Generation Confidence Boosting ---');

  const company = await db.query.companies.findFirst();
  if (!company) throw new Error('Company not found');

  // 1. Create a Category
  const [category] = await db.insert(categories).values({
    companyId: company.id,
    name: 'TEST_PR3_GEN_CATEGORY',
    type: 'variable_cost',
    colorHex: '#000000',
    description: 'Temp category for PR3 generation test'
  }).returning();

  console.log(`Created category: ${category.name}`);

  // 2. Try to generate a rule with LOW AI confidence (e.g. 40%)
  // Currently, shouldCreateRule blocks < 75. 
  // If we try 40, it should fail to create.
  // If we try 76, it might be boosted to 0.75+ range if logic is mapped.
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomSuffix = Array.from({length: 5}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  
  // Let's try 40 first. It should now SUCCEED (threshold is 20)
  console.log(`Attempting to create rule with 40% confidence (Suffix: ${randomSuffix})...`);
  const resultLow = await RuleGenerationService.generateAndCreateRule(
      `TEST LOW CONFIDENCE PATTERN 40-${randomSuffix}`,
      category.name,
      company.id,
      40,
      'Test reasoning'
  );

  if (resultLow.success) {
      console.log(`✅ Passed: Created rule with 40% confidence. Stored: ${resultLow.rule?.confidence}`);
      if (Math.abs((resultLow.rule?.confidence || 0) - 0.40) > 0.01) {
           console.error(`❌ Failed: Stored confidence should be ~0.40, got ${resultLow.rule?.confidence}`);
           process.exit(1);
      }
  } else {
      console.error(`❌ Failed: Should have created rule with 40% confidence. Reason: ${resultLow.error}`);
      process.exit(1);
  }

  // 3. Try with 75%
  // Should return exactly 0.75
  
  const randomSuffix2 = Array.from({length: 5}, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  console.log(`Attempting to create rule with 75% confidence (Suffix: ${randomSuffix2})...`);
  const resultMid = await RuleGenerationService.generateAndCreateRule(
      `TEST DISTINCT PATTERN 75-${randomSuffix2}`,
      category.name,
      company.id,
      75,
      'Test reasoning'
  );

  if (resultMid.success) {
      console.log(`Created rule with 75% input. Stored Confidence: ${resultMid.rule?.confidence}`);
      if (Math.abs((resultMid.rule?.confidence || 0) - 0.75) > 0.01) {
           console.error(`❌ Failed: Stored confidence should be ~0.75, got ${resultMid.rule?.confidence}`);
           process.exit(1);
      }
      console.log('✅ Passed: accurate confidence storage');
  } else {
      console.error(`Failed to create rule with 75% confidence: ${resultMid.error}`);
      process.exit(1);
  }
  
  // Cleanup
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, category.id));
  await db.delete(categories).where(eq(categories.id, category.id));
}

runTest().catch(console.error);
