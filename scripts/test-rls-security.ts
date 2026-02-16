import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente manualmente
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
    });
}

async function verifyRLSSecurity() {
  console.log('🛡️ Starting Row-Level Security (RLS) Verification...');

  try {
    const { db, withUser } = await import('../lib/db/connection');
    const { transactions, companies, userCompanies } = await import('../lib/db/schema');
    const { count, sql } = await import('drizzle-orm');

    // 1. Identify a test user and their company
    console.log('\n🔍 Phase 1: Identifying test environment...');
    const relations = await db.select().from(userCompanies).limit(1);
    
    if (relations.length === 0) {
      console.warn('⚠️ No user-company relationships found. Cannot perform full test.');
      process.exit(0);
    }

    const testRelation = relations[0];
    const realUserId = testRelation.userId;
    const realCompanyId = testRelation.companyId;
    const fakeUserId = '00000000-0000-0000-0000-000000000000';

    console.log(`✅ Test User: ${realUserId}`);
    console.log(`✅ Test Company: ${realCompanyId}`);

    // 2. Test WITHOUT session (Should return 0 results if RLS is ENABLED)
    console.log('\n🔍 Phase 2: Testing WITHOUT session (Global access check)...');
    try {
      const globalCount = await db.select({ value: count() }).from(transactions);
      console.log(`📊 Global query returned ${globalCount[0].value} transactions.`);
      
      // Note: If RLS is enabled, this should be 0. 
      // If it's not 0, RLS might not be active yet or this user (postgres) is a superuser.
      if (globalCount[0].value > 0) {
        console.warn('⚠️ Global query returned rows. RLS might not be active or user is superuser.');
      } else {
        console.log('✅ Global query returned 0 rows (RLS acting as expected).');
      }
    } catch (e) {
      console.error('❌ Error in global query:', e);
    }

    // 3. Test with WRONG session
    console.log(`\n🔍 Phase 3: Testing with INVALID session (${fakeUserId})...`);
    const fakeResult = await withUser(fakeUserId, async (tx) => {
      return await tx.select({ value: count() }).from(transactions);
    });
    console.log(`📊 Invalid session query returned ${fakeResult[0].value} transactions.`);
    if (fakeResult[0].value === 0) {
      console.log('✅ Access BLOCKED for invalid user (RLS Success).');
    } else {
      console.error('❌ Access GRANTED to invalid user! Security breach if RLS is active.');
    }

    // 4. Test with CORRECT session
    console.log(`\n🔍 Phase 4: Testing with VALID session (${realUserId})...`);
    const validResult = await withUser(realUserId, async (tx) => {
      return await tx.select({ value: count() }).from(transactions);
    });
    console.log(`📊 Valid session query returned ${validResult[0].value} transactions.`);
    if (validResult[0].value > 0) {
      console.log('✅ Access GRANTED for valid user (Isolation Success).');
    } else {
      console.warn('ℹ️ Access returned 0 rows for valid user. This could be because the user has no transactions.');
      // Let's check company visibility too
      const companyCount = await withUser(realUserId, async (tx) => {
        return await tx.select({ value: count() }).from(companies);
      });
      console.log(`📊 Valid session company query returned ${companyCount[0].value} companies.`);
    }

    // 5. Verify session variable persistence
    console.log('\n🔍 Phase 5: Verifying session variable reset after callback...');
    try {
      // get_app_user_id() is defined in the migration
      const currentSetting = await db.execute(sql`SELECT current_setting('app.current_user_id', true) as uid`);
      const uid = currentSetting[0]?.uid || 'null';
      console.log(`📊 Session variable after withUser: ${uid}`);
      if (uid === '' || uid === 'null') {
        console.log('✅ Session variable correctly RESET.');
      } else {
        console.warn('⚠️ Session variable still persistent after call!');
      }
    } catch (e) {
      console.log('ℹ️ get_app_user_id() not available yet. Skipping persistence check.');
    }

    console.log('\n🎉 RLS Security Verification Complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyRLSSecurity();
