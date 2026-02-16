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

async function deployRLS() {
  console.log('🚀 Deploying Row-Level Security (RLS) policies to database...');

  try {
    const { db } = await import('../lib/db/connection');
    const { sql } = await import('drizzle-orm');

    const migrationPath = path.resolve(process.cwd(), 'lib/db/migrations/0003_enable_rls.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at ${migrationPath}`);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📝 Reading and executing 0003_enable_rls.sql...');
    
    // Split combined statements to avoid execution errors in some drivers, 
    // but standard SET/ALTER in postgres usually works fine in one block.
    // For safety, let's try raw execution.
    await db.execute(sql.raw(migrationSql));

    console.log('✅ RLS Policies deployed successfully!');

  } catch (error) {
    console.error('❌ RLS Deployment failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

deployRLS();
