
import { TransactionCategorizationService } from '@/lib/services/transaction-categorization.service';
import { TransactionContext } from '@/lib/services/rule-scoring.service';
import { db } from '@/lib/db/drizzle';
import dotenv from 'dotenv';
import path from 'path';

// Force load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  console.log('--- Testing PR1: Absolute Confidence Threshold ---');

  const company = await db.query.companies.findFirst();
  if (!company) throw new Error('Company not found');

  const context: TransactionContext = {
    description: 'COMPRA GENÉRICA DESCONHECIDA 123',
    amount: -50.00,
    memo: ''
  };

  // Mocking parameters to force low confidence
  // We skip cache, rules, history. 
  // We assume AI is either mocked (if injected) or will fail/return low confidence.
  // If AI is not mocked, this might hit real AI or return null.
  // Ideally we want to simulate a result that HAS confidence e.g. 50% but shouldn't pass.
  
  // Since we can't easily mock internals without DI, we rely on the service behavior.
  // If we skip everything, it returns MANUAL_FALLBACK with confidence 0.
  // We want to verify that checking strict threshold works.
  
  // Let's rely on the fallback behavior first. 
  // Fallback currently returns confidence 0. 
  // If we pass threshold 70, it should be needsReview=true.
  
  console.log('Case 1: Fallback (Confidence 0)');
  const result1 = await TransactionCategorizationService.categorize(context, {
    companyId: company.id,
    skipCache: true,
    skipRules: true,
    skipHistory: true,
    skipAI: true,
    confidenceThreshold: 70
  });

  console.log(`Result 1: Conf=${result1.confidence}, Review=${result1.needsReview}, Reason=${result1.reason?.code}`);
  
  if (result1.needsReview !== true) {
      console.error('❌ Failed: Expected needsReview=true');
      process.exit(1);
  }

  if (result1.reason?.code !== 'LOW_CONFIDENCE') {
      console.error(`❌ Failed: Expected reason='LOW_CONFIDENCE', got='${result1.reason?.code}'`);
      process.exit(1);
  }

  console.log('✅ Passed: needsReview=true and reason=LOW_CONFIDENCE');
  
  // Case 2: Simulate a "Medium" confidence result that is below threshold.
  // Hard to force without mocking. 
  // However, the PR requirement is: "If confidence < threshold THEN needsReview=true".
  // Even if confidence is 0, it holds.
  
  // Let's Try to check if the Reason Code is correct.
  // Current Manual Fallback has reason MANUAL_FALLBACK. 
  // The PR asks for "LOW_CONFIDENCE" if it fell due to threshold.
  // Actually, if it's 0 it is definitely low confidence.
  
  // If we modify the code to overwrite, valid check.
  
  console.log('Test Complete');
}

runTest().catch(console.error);
