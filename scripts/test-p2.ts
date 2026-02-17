
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/drizzle';
import { transactions, accounts, companies, categories } from '@/lib/db/schema';
import { ReviewService } from '@/lib/services/review.service';
import { eq } from 'drizzle-orm';

async function runTest() {
  console.log('--- Testing ReviewService ---');
  console.log('DB URL present:', !!process.env.DATABASE_URL);
  
  try {
    // 1. Get Setup Data
    console.log('Querying companies...');
    const company = await db.query.companies.findFirst();
    console.log('Company found:', !!company);
    
    if (!company) {
        console.log('Skipping test: No company found in DB');
        return;
    }
  
  const account = await db.query.accounts.findFirst({
      where: eq(accounts.companyId, company.id)
  });
  if (!account) {
    console.log('Skipping test: No account found in DB');
    return;
  }

  const category = await db.query.categories.findFirst({
      where: eq(categories.companyId, company.id)
  });
   if (!category) {
    console.log('Skipping test: No category found in DB');
    return;
   }


  // 2. Create Test Transaction
  console.log('Creating test transaction...');

      const [tx] = await db.insert(transactions).values({
          accountId: account.id,
          amount: '-123.45',
          description: 'TEST REVIEW TX ' + Date.now(),
          transactionDate: new Date().toISOString(), // String format for date in simple insert
          type: 'debit',
          needsReview: true,
          reasoning: JSON.stringify({ code: 'TEST_REASON', message: 'Testing review queue' }),
          confidence: '50.00'
      }).returning();

      console.log(`Created transaction ${tx.id} with needsReview=true`);

      // 3. Test Get Queue
      console.log('Fetching review queue...');
      const queue = await ReviewService.getReviewQueue(company.id);
      const found = queue.find(i => i.id === tx.id);
      
      if (found) {
          console.log(`[PASS] Transaction found in review queue.`);
          // Check reason parsing
          if (found.reason && typeof found.reason === 'object' && found.reason.code === 'TEST_REASON') {
             console.log(`[PASS] Reason JSON parsed correctly.`);
          } else {
             console.log(`[WARN] Reason parsing mismatch:`, found.reason);
          }
      } else {
          console.error(`[FAIL] Transaction NOT found in review queue.`);
      }

      // 4. Test Resolve
      console.log('Resolving review...');
      await ReviewService.resolveReview(tx.id, category.id, category.name, company.id, false);

      const [updatedTx] = await db.select().from(transactions).where(eq(transactions.id, tx.id));
      
      if (!updatedTx.needsReview && updatedTx.categoryId === category.id) {
           console.log(`[PASS] Transaction resolved (needsReview=false, category set).`);
      } else {
           console.error(`[FAIL] Transaction resolution failed.`);
           console.log('State:', { needsReview: updatedTx.needsReview, categoryId: updatedTx.categoryId });
      }

      // Cleanup
      console.log('Cleaning up...');
      await db.delete(transactions).where(eq(transactions.id, tx.id));
      console.log('Done.');

  } catch (err) {
      console.error('Test Failed:', err);
  }
}

runTest().then(() => process.exit(0)).catch(() => process.exit(1));
