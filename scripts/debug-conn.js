require('dotenv').config({ path: '.env' });
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20));

const { drizzle } = require('drizzle-orm/node-postgres');
const { companies } = require('./lib/db/schema');

async function test() {
  try {
    const db = drizzle(process.env.DATABASE_URL);
    const result = await db.select().from(companies).limit(1);
    console.log('✅ Connection successful. Found company:', result[0]?.name);
  } catch (err) {
    console.error('❌ Connection failed:', err);
  } finally {
    process.exit(0);
  }
}

test();
