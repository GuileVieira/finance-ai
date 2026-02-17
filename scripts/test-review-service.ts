
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { ReviewService } from '@/lib/services/review.service';
import { RuleLifecycleService } from '@/lib/services/rule-lifecycle.service';
import { db } from '@/lib/db/drizzle';
import { categories, categoryRules, transactions, accounts, companies, ruleFeedback } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing Review Service & Rule Governance ---');

  // 0. Setup
  const company = await db.query.companies.findFirst();
  if (!company) throw new Error('Company not found');

  const account = await db.query.accounts.findFirst({
      where: eq(accounts.companyId, company.id)
  });
  if (!account) throw new Error('Account not found');

  // 1. Create Badge Categories
  // Expense (Blocked for Positive Amount)
  const [catExpense] = await db.insert(categories).values({
    companyId: company.id,
    name: 'TEST_REVIEW_EXPENSE',
    type: 'fixed_cost',
    colorHex: '#FF0000',
    description: 'Expense category for Review test'
  }).returning();

  // Revenue (Correct Category)
  const [catRevenue] = await db.insert(categories).values({
    companyId: company.id,
    name: 'TEST_REVIEW_REVENUE',
    type: 'revenue',
    colorHex: '#00FF00',
    description: 'Revenue category for Review test'
  }).returning();

  // 2. Create Bad Rule: "REVIEW_TEST" -> Expense
  // We need this rule to exist so we can link the transaction to it and test feedback
  const [rule] = await db.insert(categoryRules).values({
    companyId: company.id,
    categoryId: catExpense.id,
    rulePattern: 'REVIEW_TEST_TARIFA', 
    ruleType: 'contains',
    confidenceScore: '0.95',
    active: true,
    status: 'active'
  }).returning();

  console.log('Setup complete. Rule created:', rule.id);

  try {
      // 3. Manual Injection of Result
      // We skip actual categorization (which correctly filters the bad rule) 
      // and force a result that simulates a "Rule Applied but Hard Validation Failed" scenario
      // or "Rule Applied but forced into Review" to test the Review Service downstream logic.
      
      console.log('Simulating Hard Validation Failure...');
      const context = {
        description: 'REVIEW_TEST_TARIFA',
        amount: 100, // Positive
        date: new Date()
      };

      const forcedReason = {
        code: 'ACCOUNTING_CONSISTENCY_VIOLATION',
        message: 'Regra Contábil: Receita não pode ser Expense',
        metadata: { originalReason: { code: 'RULE_APPLIED' } }
      };
      
      const result = {
          categoryId: catExpense.id,
          confidence: 60,
          needsReview: true,
          reason: forcedReason,
          reasoning: JSON.stringify(forcedReason),
          source: 'rule',
          ruleId: rule.id,
          movementType: 'operacional_receita'
      };

      // 4. Simulate Saving to DB (BatchProcessingService logic)
      console.log('Saving transaction to DB...');
      const [tx] = await db.insert(transactions).values({
          accountId: account.id,
          categoryId: result.categoryId,
          description: context.description,
          amount: context.amount.toString(),
          type: 'credit',
          transactionDate: context.date.toISOString(),
          confidence: result.confidence.toString(),
          needsReview: result.needsReview,
          // CRITICAL: Saving JSON stringified reason
          reasoning: result.reason ? JSON.stringify(result.reason) : result.reasoning,
          categorizationSource: result.source,
          ruleId: result.ruleId,
          movementType: result.movementType
      }).returning();

      // 5. Check Review Queue
      console.log('Checking Review Queue...');
      const queue = await ReviewService.getReviewQueue(company.id);
      const item = queue.find(i => i.id === tx.id);

      if (!item) throw new Error('Transaction not found in review queue');
      
      console.log('Queue Item Reason:', item.reason);
      if (item.reason?.code !== 'ACCOUNTING_CONSISTENCY_VIOLATION') {
          throw new Error('Queue item does not have correct structured reason');
      }

      // 6. Resolve Review (Correcting to Revenue)
      console.log('Resolving Review (Correcting to Revenue)...');
      await ReviewService.resolveReview(
          tx.id,
          catRevenue.id,
          catRevenue.name,
          company.id,
          false // Don't create new rule for now
      );

      // 7. Verify Transaction Updated
      const [updatedTx] = await db.select().from(transactions).where(eq(transactions.id, tx.id));
      if (updatedTx.needsReview) throw new Error('Transaction still needs review');
      if (updatedTx.categoryId !== catRevenue.id) throw new Error('Transaction category not updated');

      // 8. Verify Rule Feedback (Negative)
      // Since we corrected it, it should be recorded as negative feedback for the bad rule
      const feedbacks = await db.query.ruleFeedback.findMany({
          where: eq(ruleFeedback.ruleId, rule.id)
      });

      console.log('Rule Feedbacks:', feedbacks);
      const correction = feedbacks.find(f => f.feedbackType === 'correction' && f.transactionId === tx.id);
      
      if (!correction) throw new Error('Correction feedback not recorded');
      if (correction.newCategoryId !== catRevenue.id) throw new Error('Correction recorded wrong new category');

      console.log('✅ TEST PASSED: Full Review Loop verified');

  } finally {
      // Cleanup
      await db.delete(categoryRules).where(eq(categoryRules.categoryId, catExpense.id));
      await db.delete(categories).where(eq(categories.id, catExpense.id));
      await db.delete(categories).where(eq(categories.id, catRevenue.id));
      if (catExpense?.id) {
          // Cascade delete might fail if ruleFeedback exists, better clean feed backs too if needed
          await db.delete(ruleFeedback).where(eq(ruleFeedback.ruleId, rule.id));
      }
      // Transaction deletion
       await db.delete(transactions).where(eq(transactions.description, 'REVIEW_TEST_TARIFA'));
  }
}

runTest().catch(console.error);
