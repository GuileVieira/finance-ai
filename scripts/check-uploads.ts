
import { db } from '../lib/db/connection';
import { uploads } from '../lib/db/schema';

async function checkUploads() {
    try {
        console.log('Checking uploads in database...');
        const result = await db.select().from(uploads);

        if (result.length === 0) {
            console.log('No uploads found.');
        } else {
            console.log(`Found ${result.length} uploads:`);
            console.log(JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error('Error querying uploads:', error);
    } finally {
        process.exit(0);
    }
}

checkUploads();
